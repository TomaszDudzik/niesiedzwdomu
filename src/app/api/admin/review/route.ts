import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

async function geocodeAddress(address: string): Promise<{ lat: number; lng: number } | null> {
  try {
    const query = address.toLowerCase().includes("kraków") ? address : `${address}, Kraków`;
    const url = `https://nominatim.openstreetmap.org/search?${new URLSearchParams({
      q: query, format: "json", limit: "1", countrycodes: "pl",
    })}`;
    const res = await fetch(url, {
      headers: { "User-Agent": "rodzic-w-tarapatach/1.0" },
    });
    const data = await res.json();
    if (data?.[0]) {
      return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) };
    }
  } catch (e) {
    console.warn("[geocode] Failed for:", address, e);
  }
  return null;
}

// Use raw supabase client (no typed Database) for pipeline tables
// which aren't in the generated types yet
function getDb() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );
}

// GET /api/admin/review — list scraped events for review
export async function GET(request: NextRequest) {
  const db = getDb();
  const status = request.nextUrl.searchParams.get("status") || "review";
  const sourceId = request.nextUrl.searchParams.get("source_id");

  const showPast = request.nextUrl.searchParams.get("show_past") === "true";
  const today = new Date().toISOString().slice(0, 10);  // YYYY-MM-DD

  let query = db
    .from("scraped_events")
    .select("id, canonical_event_id, title, description_short, description_long, start_at, end_at, venue_name, venue_address, district, categories, tags, age_min, age_max, price_from, price_to, is_free, confidence_score, status, source_url, source_id, organizer_name, image_url, registration_url, is_new, source_first_seen, source_last_seen, last_change_at, created_at, scrape_sources(name)")
    .eq("status", status)
    .order("start_at", { ascending: true })
    .limit(200);

  if (sourceId) {
    query = query.eq("source_id", sourceId);
  }

  const { data, error } = await query;

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Filter out past events unless show_past=true
  if (!showPast && data) {
    const filtered = data.filter((e: Record<string, unknown>) => {
      const endDate = e.end_at as string | null;
      const startDate = e.start_at as string | null;
      // Use end_at if available, otherwise start_at
      const relevantDate = (endDate || startDate || "").slice(0, 10);
      if (!relevantDate) return true; // no date = keep
      return relevantDate >= today;
    });
    return NextResponse.json(filtered);
  }

  return NextResponse.json(data);
}

// POST /api/admin/review — approve or reject an event
export async function POST(request: NextRequest) {
  const db = getDb();
  const body = await request.json();
  const { id, action } = body as { id: string; action: "approve" | "reject" | "restore" | "delete" };

  if (!id || !action) {
    return NextResponse.json({ error: "id and action required" }, { status: 400 });
  }

  if (action === "delete") {
    const { error } = await db
      .from("scraped_events")
      .delete()
      .eq("id", id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  }

  if (action === "restore") {
    const { error } = await db
      .from("scraped_events")
      .update({ status: "review" })
      .eq("id", id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  }

  if (action === "reject") {
    const { error } = await db
      .from("scraped_events")
      .update({ status: "rejected", is_new: false })
      .eq("id", id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  }

  if (action === "approve") {
    // Fetch the scraped event
    const { data: scraped, error: fetchErr } = await db
      .from("scraped_events")
      .select("*")
      .eq("id", id)
      .single();
    if (fetchErr || !scraped) {
      return NextResponse.json({ error: "Event not found" }, { status: 404 });
    }

    if (!scraped.start_at) {
      return NextResponse.json({ error: "Cannot publish event without start date" }, { status: 400 });
    }

    // Generate slug
    const slug = makeSlug(scraped.title);

    // Geocode venue address
    let lat: number | null = scraped.lat ?? null;
    let lng: number | null = scraped.lng ?? null;
    if (!lat && scraped.venue_address) {
      const coords = await geocodeAddress(scraped.venue_address);
      if (coords) {
        lat = coords.lat;
        lng = coords.lng;
        // Save coordinates back to scraped_events for future use
        await db.from("scraped_events").update({ lat, lng }).eq("id", id);
      }
    }

    // Push to canonical events table
    const canonical = {
      title: scraped.title,
      slug,
      description_short: scraped.description_short || "",
      description_long: scraped.description_long || "",
      image_url: scraped.image_url,
      date_start: scraped.start_at.slice(0, 10),
      date_end: scraped.end_at?.slice(0, 10) || null,
      age_min: scraped.age_min,
      age_max: scraped.age_max,
      price: scraped.price_from,
      is_free: scraped.is_free || false,
      category: (scraped.categories as string[])?.[0] || "inne",
      district: scraped.district || "Inne",
      venue_name: scraped.venue_name || "",
      venue_address: scraped.venue_address || "",
      source_url: scraped.source_url,
      organizer: scraped.organizer_name,
      lat,
      lng,
      status: "published",
    };

    const { data: published, error: pubErr } = await db
      .from("events")
      .insert(canonical)
      .select()
      .single();

    if (pubErr) return NextResponse.json({ error: pubErr.message }, { status: 500 });

    // Update scraped event status
    await db
      .from("scraped_events")
      .update({
        status: "published",
        canonical_event_id: published.id,
        is_new: false,
      })
      .eq("id", id);

    return NextResponse.json({ ok: true, canonical_id: published.id });
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}

// PATCH /api/admin/review — edit scraped event fields before approval
export async function PATCH(request: NextRequest) {
  const db = getDb();
  const { id, ...updates } = await request.json();

  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  const allowed = [
    "title", "description_short", "description_long",
    "start_at", "end_at", "venue_name", "venue_address", "district",
    "categories", "tags", "age_min", "age_max",
    "price_from", "price_to", "is_free",
    "organizer_name", "image_url", "registration_url",
  ];
  const safe: Record<string, unknown> = {};
  for (const key of allowed) {
    if (key in updates) safe[key] = updates[key];
  }

  const { error } = await db.from("scraped_events").update(safe).eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

function makeSlug(title: string): string {
  const base = title
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/[\s-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
  const hash = Array.from(title).reduce((h, c) => ((h << 5) - h + c.charCodeAt(0)) | 0, 0);
  const hex = Math.abs(hash).toString(16).slice(0, 6);
  return `${base}-${hex}`;
}
