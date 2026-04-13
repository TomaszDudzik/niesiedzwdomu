import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

function getDb() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

function pickFields(input: Record<string, unknown>) {
  return {
    name: input.name,
    description_short: input.description_short,
    description_long: input.description_long,
    image_url: input.image_url,
    source_url: input.source_url,
    facebook_url: input.facebook_url,
  };
}

export async function GET() {
  const db = getDb();
  const { data, error } = await db
    .from("organizers")
    .select("*")
    .order("name", { ascending: true });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function POST(request: NextRequest) {
  const db = getDb();
  const body = (await request.json()) as Record<string, unknown>;
  const { data, error } = await db
    .from("organizers")
    .insert(pickFields(body))
    .select()
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function PATCH(request: NextRequest) {
  const db = getDb();
  const body = (await request.json()) as Record<string, unknown>;
  const { id, ...updates } = body;
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });
  const { data, error } = await db
    .from("organizers")
    .update(pickFields(updates))
    .eq("id", id)
    .select()
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, updated: data });
}

export async function DELETE(request: NextRequest) {
  const db = getDb();
  const { id } = await request.json();
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });
  const { error } = await db.from("organizers").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
