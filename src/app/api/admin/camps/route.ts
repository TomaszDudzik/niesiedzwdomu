import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { revalidatePath } from "next/cache";

function getDb() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
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

function pickCampFields(input: Record<string, unknown>) {
  return {
    title: input.title,
    description_short: input.description_short,
    description_long: input.description_long,
    image_url: input.image_url,
    date_start: input.date_start,
    date_end: input.date_end,
    camp_type: input.camp_type,
    category: input.category ?? null,
    season: input.season,
    duration_days: input.duration_days,
    meals_included: input.meals_included,
    transport_included: input.transport_included,
    age_min: input.age_min,
    age_max: input.age_max,
    price_from: input.price_from,
    price_to: input.price_to,
    is_free: input.is_free,
    district: input.district,
    venue_name: input.venue_name,
    venue_address: input.venue_address,
    organizer: input.organizer,
    organizer_id: input.organizer_id ?? null,
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
  const { data, error } = await db
    .from("camps")
    .select("*, organizer_data:organizer_id(*)")
    .order("date_start", { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function POST(request: NextRequest) {
  const db = getDb();
  const body = (await request.json()) as Record<string, unknown>;
  const slug = toSlug(typeof body.title === "string" ? body.title : "nowa-kolonia");

  const payload = {
    ...pickCampFields(body),
    slug,
    status: "draft",
  };

  const { data, error } = await db.from("camps").insert(payload).select().single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function PATCH(request: NextRequest) {
  const db = getDb();
  const body = (await request.json()) as Record<string, unknown>;
  const { id, ...updates } = body;

  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  const { data, error } = await db.from("camps").update(pickCampFields(updates)).eq("id", id).select();
  if (error) return NextResponse.json({ error: error.message, details: error }, { status: 500 });
  if (!data || data.length === 0) return NextResponse.json({ error: "No rows updated - check id or RLS" }, { status: 404 });

  revalidatePath("/");
  revalidatePath("/kolonie");

  return NextResponse.json({ ok: true, updated: data[0] });
}

// Used after bulk import to apply geocoded lat/lng/district without touching other fields
export async function PUT(request: NextRequest) {
  const db = getDb();
  const body = (await request.json()) as { id: string; lat: number; lng: number; district: string };
  const { id, lat, lng, district } = body;

  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  const { error } = await db.from("camps").update({ lat, lng, district }).eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}

export async function DELETE(request: NextRequest) {
  const db = getDb();
  const { id } = await request.json();

  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  const { error } = await db.from("camps").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}
