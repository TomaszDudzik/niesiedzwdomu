import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { revalidatePath } from "next/cache";

function getDb() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

const ALLOWED_FIELDS = new Set([
  "name", "description_short", "description_long",
  "source_url", "facebook_url", "status", "content_types",
]);

function pickFields(input: Record<string, unknown>) {
  return Object.fromEntries(
    Object.entries(input).filter(([k, v]) => ALLOWED_FIELDS.has(k) && v !== undefined)
  );
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
  const payload = pickFields(body);
  if (!payload.status) payload.status = "draft";
  if (!payload.content_types) payload.content_types = [];

  const { data, error } = await db
    .from("organizers")
    .insert(payload)
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

  const patch = pickFields(updates);
  const { data, error } = await db
    .from("organizers")
    .update(patch)
    .eq("id", id)
    .select()
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  revalidatePath("/admin/organizatorzy");
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
