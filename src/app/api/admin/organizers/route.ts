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
  "name",
  "business_name",
  "street",
  "postcode",
  "city",
  "email",
  "phone",
  "website_url",
  "note",
  "status",
]);

function pickFields(input: Record<string, unknown>) {
  return Object.fromEntries(
    Object.entries(input).filter(([k, v]) => ALLOWED_FIELDS.has(k) && v !== undefined)
  );
}

export async function GET() {
  const db = getDb();
  const { data, error } = await db
    .from("companies")
    .select("*")
    .order("name", { ascending: true });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function POST(request: NextRequest) {
  const db = getDb();
  const body = (await request.json()) as Record<string, unknown>;
  const payload = pickFields(body);
  if (!payload.name || String(payload.name).trim().length === 0) {
    return NextResponse.json({ error: "name required" }, { status: 400 });
  }
  if (!payload.status) payload.status = "draft";
  if (!payload.city) payload.city = "Kraków";

  const { data, error } = await db
    .from("companies")
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
  if ("name" in patch && (!patch.name || String(patch.name).trim().length === 0)) {
    return NextResponse.json({ error: "name required" }, { status: 400 });
  }
  const { data, error } = await db
    .from("companies")
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
  const { error } = await db.from("companies").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
