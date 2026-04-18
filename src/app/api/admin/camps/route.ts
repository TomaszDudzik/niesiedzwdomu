import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { revalidatePath } from "next/cache";
import { loadAdminCategoryMaps, withCategoryIds, withCategoryNames } from "@/lib/admin-taxonomy-db";

function getDb() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SERVICE_ROLE;

  if (!supabaseUrl || !serviceRoleKey) {
    const missing: string[] = [];
    if (!supabaseUrl) missing.push("NEXT_PUBLIC_SUPABASE_URL lub SUPABASE_URL");
    if (!serviceRoleKey) missing.push("SUPABASE_SERVICE_ROLE_KEY lub SUPABASE_SERVICE_ROLE");
    throw new Error(`Brak konfiguracji Supabase: ustaw ${missing.join(", ")}.`);
  }

  return createClient(
    supabaseUrl,
    serviceRoleKey
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

function normalizeCampPayload(input: Record<string, unknown>, categoryMaps: Awaited<ReturnType<typeof loadAdminCategoryMaps>>) {
  const payload = withCategoryIds(input, categoryMaps);

  const hasTypeLevel1 = "type_lvl_1_id" in payload || "type_id" in payload;
  const typeLevel1 = payload.type_lvl_1_id ?? payload.type_id ?? null;
  if (hasTypeLevel1) {
    payload.type_lvl_1_id = typeLevel1;
  }
  delete payload.type_id;

  const hasTypeLevel2 = "type_lvl_2_id" in payload || "subtype_id" in payload;
  const typeLevel2 = payload.type_lvl_2_id ?? payload.subtype_id ?? null;
  if (hasTypeLevel2) {
    payload.type_lvl_2_id = typeLevel2;
  }
  delete payload.subtype_id;

  const hasCategoryLevel1 = "category_lvl_1" in payload || "main_category" in payload || "camp_type" in payload;
  const categoryLevel1 = payload.category_lvl_1 ?? payload.main_category ?? payload.camp_type ?? null;
  if (hasCategoryLevel1) {
    payload.category_lvl_1 = categoryLevel1;
  }
  delete payload.main_category;
  delete payload.camp_type;

  const hasCategoryLevel2 = "category_lvl_2" in payload || "category" in payload;
  const categoryLevel2 = payload.category_lvl_2 ?? payload.category ?? null;
  if (hasCategoryLevel2) {
    payload.category_lvl_2 = categoryLevel2;
  }
  delete payload.category;

  const hasCategoryLevel3 = "category_lvl_3" in payload || "subcategory" in payload;
  const categoryLevel3 = payload.category_lvl_3 ?? payload.subcategory ?? null;
  if (hasCategoryLevel3) {
    payload.category_lvl_3 = categoryLevel3;
  }
  delete payload.subcategory;

  return payload;
}

function withLegacyCampTaxonomy(input: Record<string, unknown>) {
  const payload = { ...input };

  if ("type_lvl_1_id" in payload) {
    payload.type_id = payload.type_lvl_1_id ?? null;
    delete payload.type_lvl_1_id;
  }

  if ("type_lvl_2_id" in payload) {
    payload.subtype_id = payload.type_lvl_2_id ?? null;
    delete payload.type_lvl_2_id;
  }

  delete payload.category_lvl_1_id;
  if ("category_lvl_1" in payload) {
    payload.main_category = payload.category_lvl_1 ?? null;
    payload.camp_type = payload.category_lvl_1 ?? null;
    delete payload.category_lvl_1;
  }

  delete payload.category_lvl_2_id;
  if ("category_lvl_2" in payload) {
    payload.category = payload.category_lvl_2 ?? null;
    delete payload.category_lvl_2;
  }

  delete payload.category_lvl_3_id;
  if ("category_lvl_3" in payload) {
    payload.subcategory = payload.category_lvl_3 ?? null;
    delete payload.category_lvl_3;
  }

  return payload;
}

function normalizeCampRecord(record: Record<string, unknown>) {
  const typeLevel1 = record.type_lvl_1_id ?? record.type_id ?? null;
  const typeLevel2 = record.type_lvl_2_id ?? record.subtype_id ?? null;
  const categoryLevel1 = record.category_lvl_1 ?? record.main_category ?? record.camp_type ?? null;
  const categoryLevel2 = record.category_lvl_2 ?? record.category ?? null;
  const categoryLevel3 = record.category_lvl_3 ?? record.subcategory ?? null;

  return {
    ...record,
    type_lvl_1_id: typeLevel1,
    type_lvl_2_id: typeLevel2,
    type_id: typeLevel1,
    subtype_id: typeLevel2,
    category_lvl_1: categoryLevel1,
    category_lvl_2: categoryLevel2,
    category_lvl_3: categoryLevel3,
    main_category: categoryLevel1,
    category: categoryLevel2,
    subcategory: categoryLevel3,
    camp_type: categoryLevel1,
  };
}

function isMissingNewCampTaxonomyColumn(message: string | undefined) {
  if (!message) return false;

  return [
    "type_lvl_1_id",
    "type_lvl_2_id",
    "category_lvl_1_id",
    "category_lvl_2_id",
    "category_lvl_3_id",
    "category_lvl_1",
    "category_lvl_2",
    "category_lvl_3",
  ].some((columnName) => message.includes(`'${columnName}'`) || message.includes(`\"${columnName}\"`));
}

function getMissingSchemaColumn(message: string | undefined) {
  if (!message) return null;

  const singleQuoteMatch = message.match(/'([^']+)' column/);
  if (singleQuoteMatch?.[1]) return singleQuoteMatch[1];

  const doubleQuoteMatch = message.match(/"([^"]+)" column/);
  if (doubleQuoteMatch?.[1]) return doubleQuoteMatch[1];

  return null;
}

async function insertCampWithFallback(db: ReturnType<typeof getDb>, payload: Record<string, unknown>) {
  let currentPayload = { ...payload };
  let attemptedLegacyMapping = false;

  for (let attempt = 0; attempt < 8; attempt += 1) {
    const result = await db.from("camps").insert(currentPayload).select().single();
    if (!result.error) return result;

    const missingColumn = getMissingSchemaColumn(result.error.message);
    if (missingColumn && ["category_lvl_1", "category_lvl_2", "category_lvl_3"].includes(missingColumn)) {
      delete currentPayload[missingColumn];
      continue;
    }

    if (!attemptedLegacyMapping && isMissingNewCampTaxonomyColumn(result.error.message)) {
      currentPayload = withLegacyCampTaxonomy(currentPayload);
      attemptedLegacyMapping = true;
      continue;
    }

    if (!missingColumn || !(missingColumn in currentPayload)) {
      return result;
    }

    delete currentPayload[missingColumn];
  }

  return db.from("camps").insert(currentPayload).select().single();
}

async function updateCampWithFallback(db: ReturnType<typeof getDb>, id: unknown, updates: Record<string, unknown>) {
  let currentUpdates = { ...updates };
  let attemptedLegacyMapping = false;

  for (let attempt = 0; attempt < 8; attempt += 1) {
    const result = await db.from("camps").update(currentUpdates).eq("id", id).select();
    if (!result.error) return result;

    const missingColumn = getMissingSchemaColumn(result.error.message);
    if (missingColumn && ["category_lvl_1", "category_lvl_2", "category_lvl_3"].includes(missingColumn)) {
      delete currentUpdates[missingColumn];
      continue;
    }

    if (!attemptedLegacyMapping && isMissingNewCampTaxonomyColumn(result.error.message)) {
      currentUpdates = withLegacyCampTaxonomy(currentUpdates);
      attemptedLegacyMapping = true;
      continue;
    }

    if (!missingColumn || !(missingColumn in currentUpdates)) {
      return result;
    }

    delete currentUpdates[missingColumn];
  }

  return db.from("camps").update(currentUpdates).eq("id", id).select();
}

function pickCampFields(input: Record<string, unknown>) {
  return {
    title: input.title,
    description_short: input.description_short,
    description_long: input.description_long,
    image_url: input.image_url,
    type_lvl_1_id: input.type_lvl_1_id ?? input.type_id ?? null,
    type_lvl_2_id: input.type_lvl_2_id ?? input.subtype_id ?? null,
    category_lvl_1_id: input.category_lvl_1_id ?? null,
    category_lvl_2_id: input.category_lvl_2_id ?? null,
    category_lvl_3_id: input.category_lvl_3_id ?? null,
    date_start: input.date_start,
    date_end: input.date_end,
    category_lvl_1: input.category_lvl_1 ?? input.main_category,
    category_lvl_2: input.category_lvl_2 ?? input.category ?? null,
    category_lvl_3: input.category_lvl_3 ?? input.subcategory ?? null,
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
  const categoryMaps = await loadAdminCategoryMaps(db);
  const { data, error } = await db
    .from("camps")
    .select("*, organizer_data:organizer_id(*)")
    .order("date_start", { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(Array.isArray(data) ? data.map((record) => normalizeCampRecord(withCategoryNames(record as Record<string, unknown>, categoryMaps))) : []);
}

export async function POST(request: NextRequest) {
  const db = getDb();
  const body = (await request.json()) as Record<string, unknown>;
  const categoryMaps = await loadAdminCategoryMaps(db);
  const slug = toSlug(typeof body.title === "string" ? body.title : "nowa-kolonia");

  const payload = {
    ...pickCampFields(normalizeCampPayload(body, categoryMaps)),
    slug,
    status: "draft",
  };

  const { data, error } = await insertCampWithFallback(db, payload);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(normalizeCampRecord(withCategoryNames(data as Record<string, unknown>, categoryMaps)));
}

const ALLOWED_CAMP_FIELDS = new Set([
  "title", "description_short", "description_long",
  "image_url", "image_cover", "image_thumb", "image_set",
  "type_lvl_1_id", "type_lvl_2_id", "type_id", "subtype_id",
  "category_lvl_1_id", "category_lvl_2_id", "category_lvl_3_id",
  "date_start", "date_end", "category_lvl_1", "category_lvl_2", "category_lvl_3", "main_category", "category", "subcategory", "season",
  "duration_days", "meals_included", "transport_included",
  "age_min", "age_max", "price_from", "price_to", "is_free",
  "district", "venue_name", "venue_address", "organizer", "organizer_id",
  "source_url", "facebook_url", "is_featured", "status", "likes", "dislikes",
]);

export async function PATCH(request: NextRequest) {
  const db = getDb();
  const body = (await request.json()) as Record<string, unknown>;
  const { id, ...updates } = body;
  const categoryMaps = await loadAdminCategoryMaps(db);

  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  // Only update fields explicitly present in the request — never overwrite with undefined → null
  const patch = Object.fromEntries(
    Object.entries(normalizeCampPayload(updates, categoryMaps)).filter(([k, v]) => ALLOWED_CAMP_FIELDS.has(k) && v !== undefined)
  );

  const { data, error } = await updateCampWithFallback(db, id, patch);
  if (error) return NextResponse.json({ error: error.message, details: error }, { status: 500 });
  if (!data || data.length === 0) return NextResponse.json({ error: "No rows updated - check id or RLS" }, { status: 404 });

  revalidatePath("/");
  revalidatePath("/kolonie");

  return NextResponse.json({ ok: true, updated: normalizeCampRecord(withCategoryNames(data[0] as Record<string, unknown>, categoryMaps)) });
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
