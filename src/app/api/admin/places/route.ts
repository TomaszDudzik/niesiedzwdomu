import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { revalidatePath } from "next/cache";

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

// POST /api/admin/places — create a new place
export async function POST(request: NextRequest) {
  const db = getDb();
  const body = await request.json();

  // Generate slug from title
  const slug = (body.title || "nowe-miejsce")
    .toLowerCase()
    .replace(/[ąà]/g, "a").replace(/[ćč]/g, "c").replace(/[ęè]/g, "e")
    .replace(/[łľ]/g, "l").replace(/[ńň]/g, "n").replace(/[óò]/g, "o")
    .replace(/[śš]/g, "s").replace(/[źžż]/g, "z")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    + "-" + Date.now().toString(36);

  const { data, error } = await db
    .from("places")
    .insert({ ...body, slug, status: "draft" })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

// PATCH /api/admin/places — update a place
export async function PATCH(request: NextRequest) {
  const db = getDb();
  const body = await request.json();
  const { id, ...updates } = body;

  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  const { data, error } = await db.from("places").update(updates).eq("id", id).select();
  if (error) return NextResponse.json({ error: error.message, details: error }, { status: 500 });
  if (!data || data.length === 0) return NextResponse.json({ error: "No rows updated — check id or RLS" }, { status: 404 });

  revalidatePath("/");
  revalidatePath("/miejsca");

  return NextResponse.json({ ok: true, updated: data[0] });
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
