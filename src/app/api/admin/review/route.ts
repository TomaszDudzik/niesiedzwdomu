import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

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

  const { data, error } = await db
    .from("scraped_events")
    .select("id, title, description_short, description_long, start_at, end_at, venue_name, venue_address, district, categories, tags, age_min, age_max, price_from, price_to, is_free, confidence_score, status, source_url, organizer_name, image_url, registration_url, created_at, scrape_sources(name)")
    .eq("status", status)
    .order("confidence_score", { ascending: true })
    .limit(100);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

// POST /api/admin/review — approve or reject an event
export async function POST(request: NextRequest) {
  const db = getDb();
  const body = await request.json();
  const { id, action } = body as { id: string; action: "approve" | "reject" | "restore" };

  if (!id || !action) {
    return NextResponse.json({ error: "id and action required" }, { status: 400 });
  }

  if (action === "restore") {
    const { error } = await db
      .from("scraped_events")
      .update({ status: "review", reviewed_at: null })
      .eq("id", id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  }

  if (action === "reject") {
    const { error } = await db
      .from("scraped_events")
      .update({ status: "rejected", reviewed_at: new Date().toISOString() })
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
        reviewed_at: new Date().toISOString(),
        published_at: new Date().toISOString(),
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
