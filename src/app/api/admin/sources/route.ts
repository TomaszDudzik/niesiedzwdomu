import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

function getDb() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  );
}

// GET /api/admin/sources — list all sources with event counts
export async function GET() {
  const db = getDb();
  const { data: sources, error } = await db
    .from("scrape_sources")
    .select("*")
    .order("name", { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Fetch scraped events for counting
  const { data: scrapedRows } = await db
    .from("scraped_events")
    .select("source_id, status, start_at, end_at, canonical_event_id");

  // Fetch canonical events to know which are manually hidden (draft)
  const { data: canonRows } = await db
    .from("events")
    .select("id, status");

  const today = new Date().toISOString().slice(0, 10);
  const draftCanonIds = new Set(
    (canonRows || []).filter((e: { status: string }) => e.status !== "published").map((e: { id: string }) => e.id)
  );

  const counts: Record<string, { review: number; published_active: number; published_past: number; rejected: number }> = {};
  for (const row of scrapedRows || []) {
    const sid = row.source_id as string;
    if (!counts[sid]) counts[sid] = { review: 0, published_active: 0, published_past: 0, rejected: 0 };

    if (row.status === "review") {
      // Only count future review items (matches what the list shows)
      const d = ((row.end_at || row.start_at || "") as string).slice(0, 10);
      if (!d || d >= today) counts[sid].review++;
    } else if (row.status === "published") {
      const d = ((row.end_at || row.start_at || "") as string).slice(0, 10);
      const isPast = d && d < today;
      const isManuallyHidden = row.canonical_event_id && draftCanonIds.has(row.canonical_event_id as string);
      if (isPast || isManuallyHidden) {
        counts[sid].published_past++;
      } else {
        counts[sid].published_active++;
      }
    } else if (row.status === "rejected") {
      // Only count future rejected items
      const d = ((row.end_at || row.start_at || "") as string).slice(0, 10);
      if (!d || d >= today) counts[sid].rejected++;
    }
  }

  // Attach counts to each source
  const enriched = (sources || []).map((s: Record<string, unknown>) => ({
    ...s,
    _counts: counts[s.id as string] || { review: 0, published_active: 0, published_past: 0, rejected: 0 },
  }));

  return NextResponse.json(enriched);
}

// POST /api/admin/sources — create a new source
export async function POST(request: NextRequest) {
  const db = getDb();
  const body = await request.json();

  body.extractor_type = body.extractor_type || "generic";

  const { data, error } = await db.from("scrape_sources").insert(body).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

// PATCH /api/admin/sources — update source fields
export async function PATCH(request: NextRequest) {
  const db = getDb();
  const { id, ...updates } = await request.json();

  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  const { data, error } = await db
    .from("scrape_sources")
    .update(updates)
    .eq("id", id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!data) return NextResponse.json({ error: "Source not found" }, { status: 404 });
  return NextResponse.json(data);
}

// DELETE /api/admin/sources — delete a source
export async function DELETE(request: NextRequest) {
  const db = getDb();
  const { id } = await request.json();

  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  const { error } = await db.from("scrape_sources").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
