import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

function getDb() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  );
}

// GET /api/admin/events — list all events (all statuses)
export async function GET() {
  const db = getDb();
  const { data, error } = await db
    .from("events")
    .select("*")
    .order("date_start", { ascending: false })
    .limit(200);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

// POST /api/admin/events — create a new event
export async function POST(request: NextRequest) {
  const db = getDb();
  const body = await request.json();

  const { data, error } = await db.from("events").insert(body).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

// PATCH /api/admin/events — update event fields
export async function PATCH(request: NextRequest) {
  const db = getDb();
  const { id, ...updates } = await request.json();

  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  const { data, error } = await db.from("events").update(updates).eq("id", id).select();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!data || data.length === 0) return NextResponse.json({ error: "No rows updated — check RLS or event id" }, { status: 404 });
  return NextResponse.json({ ok: true });
}

// DELETE /api/admin/events — delete an event
export async function DELETE(request: NextRequest) {
  const db = getDb();
  const { id } = await request.json();

  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  const { error } = await db.from("events").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
