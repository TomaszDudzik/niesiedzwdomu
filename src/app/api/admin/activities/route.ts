import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { createClient } from "@supabase/supabase-js";

function getDb() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  );
}

function toSlug(value: string) {
  return (
    value
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "") +
    "-" +
    Date.now().toString(36)
  );
}

function pickActivityFields(input: Record<string, unknown>) {
  return {
    title: input.title,
    description_short: input.description_short,
    description_long: input.description_long,
    image_url: input.image_url,
    type_lvl_1_id: input.type_lvl_1_id ?? input.type_id ?? null,
    type_lvl_2_id: input.type_lvl_2_id ?? input.subtype_id ?? null,
    category_lvl_1: input.category_lvl_1 ?? input.main_category ?? null,
    category_lvl_2: input.category_lvl_2 ?? input.category ?? null,
    category_lvl_3: input.category_lvl_3 ?? input.subcategory ?? null,
    activity_type: input.activity_type,
    schedule_summary: input.schedule_summary,
    days_of_week: input.days_of_week,
    date_start: input.date_start,
    date_end: input.date_end,
    time_start: input.time_start,
    time_end: input.time_end,
    age_min: input.age_min,
    age_max: input.age_max,
    price_from: input.price_from,
    price_to: input.price_to,
    is_free: input.is_free,
    district: input.district,
    venue_name: input.venue_name,
    venue_address: input.venue_address,
    organizer: input.organizer,
    source_url: input.source_url,
    facebook_url: input.facebook_url,
    is_featured: input.is_featured,
    status: input.status,
    likes: input.likes,
    dislikes: input.dislikes,
  };
}

export async function GET() {
  const db = getDb();
  const { data, error } = await db.from("activities").select("*").order("title", { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function POST(request: NextRequest) {
  const db = getDb();
  const body = (await request.json()) as Record<string, unknown>;
  const slug = toSlug(typeof body.title === "string" ? body.title : "nowe-zajecia");

  const payload = {
    ...pickActivityFields(body),
    slug,
    status: "draft",
  };

  const { data, error } = await db.from("activities").insert(payload).select().single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  revalidatePath("/");
  revalidatePath("/zajecia");
  revalidatePath("/admin/zajecia");

  return NextResponse.json(data);
}

const ALLOWED_ACTIVITY_FIELDS = new Set([
  "title", "description_short", "description_long",
  "image_url", "image_cover", "image_thumb", "image_set",
  "type_lvl_1_id", "type_lvl_2_id", "type_id", "subtype_id",
  "category_lvl_1", "category_lvl_2", "category_lvl_3", "main_category", "category", "subcategory",
  "activity_type", "schedule_summary", "days_of_week",
  "date_start", "date_end", "time_start", "time_end",
  "age_min", "age_max", "price_from", "price_to", "is_free",
  "district", "venue_name", "venue_address", "organizer",
  "source_url", "facebook_url", "is_featured", "status", "likes", "dislikes",
]);

export async function PATCH(request: NextRequest) {
  const db = getDb();
  const body = (await request.json()) as Record<string, unknown>;
  const { id, ...updates } = body;

  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  const patch = Object.fromEntries(
    Object.entries(updates).filter(([k, v]) => ALLOWED_ACTIVITY_FIELDS.has(k) && v !== undefined)
  );

  const { data, error } = await db.from("activities").update(patch).eq("id", id).select();
  if (error) return NextResponse.json({ error: error.message, details: error }, { status: 500 });
  if (!data || data.length === 0) return NextResponse.json({ error: "No rows updated - check id or RLS" }, { status: 404 });

  revalidatePath("/");
  revalidatePath("/zajecia");
  revalidatePath("/admin/zajecia");

  return NextResponse.json({ ok: true, updated: data[0] });
}

export async function DELETE(request: NextRequest) {
  const db = getDb();
  const { id } = await request.json();

  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  const { error } = await db.from("activities").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  revalidatePath("/");
  revalidatePath("/zajecia");
  revalidatePath("/admin/zajecia");

  return NextResponse.json({ ok: true });
}