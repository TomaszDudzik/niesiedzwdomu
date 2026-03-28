import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

function getDb() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );
}

// GET /api/admin/places — list all places
export async function GET() {
  const db = getDb();
  const { data, error } = await db
    .from("places")
    .select("*")
    .order("title", { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

// PATCH /api/admin/places — update a place
export async function PATCH(request: NextRequest) {
  const db = getDb();
  const body = await request.json();
  const { id, ...updates } = body;

  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  const { error } = await db.from("places").update(updates).eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}

// DELETE /api/admin/places — delete a place
export async function DELETE(request: NextRequest) {
  const db = getDb();
  const { id } = await request.json();

  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  const { error } = await db.from("places").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}
