import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

function getDb() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  );
}

// GET /api/admin/sources — list all sources
export async function GET() {
  const db = getDb();
  const { data, error } = await db
    .from("scrape_sources")
    .select("*")
    .order("name", { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

// POST /api/admin/sources — create a new source
export async function POST(request: NextRequest) {
  const db = getDb();
  const body = await request.json();

  // Set scrape_config JSONB as well for backward compat
  body.scrape_config = body.scrape_config || {};
  body.extractor_type = body.extractor_type || "llm";

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
