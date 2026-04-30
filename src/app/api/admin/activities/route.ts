import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { createClient } from "@supabase/supabase-js";
import { loadAdminCategoryMaps, withCategoryIds, withCategoryNames } from "@/lib/admin-taxonomy-db";
import { toHourMinute } from "@/lib/utils";

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
    serviceRoleKey,
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

function normalizeActivityPayload(input: Record<string, unknown>, categoryMaps: Awaited<ReturnType<typeof loadAdminCategoryMaps>>) {
  const payload = withCategoryIds(input, categoryMaps);

  const hasTypeLevel1 = "type_lvl_1" in payload || "type_id" in payload;
  const typeLevel1 = payload.type_lvl_1 ?? payload.type_id ?? null;
  if (hasTypeLevel1) {
    payload.type_lvl_1 = typeLevel1;
  }
  delete payload.type_id;

  const hasTypeLevel2 = "type_lvl_2" in payload || "subtype_id" in payload;
  const typeLevel2 = payload.type_lvl_2 ?? payload.subtype_id ?? null;
  if (hasTypeLevel2) {
    payload.type_lvl_2 = typeLevel2;
  }
  delete payload.subtype_id;

  const hasCategoryLevel1 = "category_lvl_1" in payload || "main_category" in payload;
  const categoryLevel1 = payload.category_lvl_1 ?? payload.main_category ?? null;
  if (hasCategoryLevel1) {
    payload.category_lvl_1 = categoryLevel1;
  }
  delete payload.main_category;

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

  if ("time_start" in payload) {
    payload.time_start = typeof payload.time_start === "string"
      ? (toHourMinute(payload.time_start) || null)
      : null;
  }

  if ("time_end" in payload) {
    payload.time_end = typeof payload.time_end === "string"
      ? (toHourMinute(payload.time_end) || null)
      : null;
  }

  return payload;
}

function withLegacyActivityTaxonomy(input: Record<string, unknown>) {
  const payload = { ...input };

  if ("type_lvl_1" in payload) {
    payload.type_id = payload.type_lvl_1 ?? null;
    delete payload.type_lvl_1;
  }

  if ("type_lvl_2" in payload) {
    payload.subtype_id = payload.type_lvl_2 ?? null;
    delete payload.type_lvl_2;
  }

  if ("category_lvl_1" in payload) {
    payload.main_category = payload.category_lvl_1 ?? null;
    delete payload.category_lvl_1;
  }

  if ("category_lvl_2" in payload) {
    payload.category = payload.category_lvl_2 ?? null;
    delete payload.category_lvl_2;
  }

  if ("category_lvl_3" in payload) {
    payload.subcategory = payload.category_lvl_3 ?? null;
    delete payload.category_lvl_3;
  }

  return payload;
}

function normalizeActivityRecord(record: Record<string, unknown>) {
  const typeLevel1 = record.type_lvl_1 ?? record.type_id ?? null;
  const typeLevel2 = record.type_lvl_2 ?? record.subtype_id ?? null;
  const categoryLevel1 = record.category_lvl_1 ?? record.main_category ?? null;
  const categoryLevel2 = record.category_lvl_2 ?? record.category ?? null;
  const categoryLevel3 = record.category_lvl_3 ?? record.subcategory ?? null;
  const organizerData = record.organizer_data as Record<string, unknown> | null | undefined;
  const organizer = typeof organizerData?.organizer_name === "string" && organizerData.organizer_name.trim().length > 0
    ? organizerData.organizer_name
    : (typeof organizerData?.name === "string" && organizerData.name.trim().length > 0
      ? organizerData.name
      : (typeof record.organizer === "string" ? record.organizer : ""));

  return {
    ...record,
    type_lvl_1: typeLevel1,
    type_lvl_2: typeLevel2,
    type_id: typeLevel1,
    subtype_id: typeLevel2,
    category_lvl_1: categoryLevel1,
    category_lvl_2: categoryLevel2,
    category_lvl_3: categoryLevel3,
    main_category: categoryLevel1,
    category: categoryLevel2,
    subcategory: categoryLevel3,
    organizer,
    organizer_data: organizerData ?? null,
  };
}

function isMissingNewActivityTaxonomyColumn(message: string | undefined) {
  if (!message) return false;

  return [
    "type_lvl_1",
    "type_lvl_2",
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

async function insertActivityWithFallback(db: ReturnType<typeof getDb>, payload: Record<string, unknown>) {
  let currentPayload = { ...payload };
  let attemptedLegacyMapping = false;

  for (let attempt = 0; attempt < 8; attempt += 1) {
    const result = await db.from("activities").insert(currentPayload).select().single();
    if (!result.error) return result;

    const missingColumn = getMissingSchemaColumn(result.error.message);
    if (missingColumn && ["category_lvl_1", "category_lvl_2", "category_lvl_3"].includes(missingColumn)) {
      delete currentPayload[missingColumn];
      continue;
    }

    if (!attemptedLegacyMapping && isMissingNewActivityTaxonomyColumn(result.error.message)) {
      currentPayload = withLegacyActivityTaxonomy(currentPayload);
      attemptedLegacyMapping = true;
      continue;
    }

    if (!missingColumn || !(missingColumn in currentPayload)) {
      return result;
    }

    delete currentPayload[missingColumn];
  }

  return db.from("activities").insert(currentPayload).select().single();
}

async function updateActivityWithFallback(db: ReturnType<typeof getDb>, id: unknown, updates: Record<string, unknown>) {
  let currentUpdates = { ...updates };
  let attemptedLegacyMapping = false;

  for (let attempt = 0; attempt < 8; attempt += 1) {
    const result = await db.from("activities").update(currentUpdates).eq("id", id).select();
    if (!result.error) return result;

    const missingColumn = getMissingSchemaColumn(result.error.message);
    if (missingColumn && ["category_lvl_1", "category_lvl_2", "category_lvl_3"].includes(missingColumn)) {
      delete currentUpdates[missingColumn];
      continue;
    }

    if (!attemptedLegacyMapping && isMissingNewActivityTaxonomyColumn(result.error.message)) {
      currentUpdates = withLegacyActivityTaxonomy(currentUpdates);
      attemptedLegacyMapping = true;
      continue;
    }

    if (!missingColumn || !(missingColumn in currentUpdates)) {
      return result;
    }

    delete currentUpdates[missingColumn];
  }

  return db.from("activities").update(currentUpdates).eq("id", id).select();
}

function pickActivityFields(input: Record<string, unknown>) {
  return {
    title: input.title,
    description_short: input.description_short,
    description_long: input.description_long,
    image_cover: input.image_cover ?? input.image_url,
    image_thumb: input.image_thumb ?? null,
    image_set: input.image_set ?? null,
    type_lvl_1: input.type_lvl_1 ?? input.type_id ?? null,
    type_lvl_2: input.type_lvl_2 ?? input.subtype_id ?? null,
    category_lvl_1: input.category_lvl_1 ?? input.main_category ?? null,
    category_lvl_2: input.category_lvl_2 ?? input.category ?? null,
    category_lvl_3: input.category_lvl_3 ?? input.subcategory ?? null,
    days_of_week: input.days_of_week,
    date_start: input.date_start,
    date_end: input.date_end,
    time_start: input.time_start,
    time_end: input.time_end,
    age_min: input.age_min,
    age_max: input.age_max,
    price_from: input.price_from,
    price_to: input.price_to,
    district: input.district,
    street: input.street,
    postcode: input.postcode,
    city: input.city,
    lat: input.lat,
    lng: input.lng,
    note: input.note,
    organizer_id: input.organizer_id ?? null,
    source_url: input.source_url,
    facebook_url: input.facebook_url,
    status: input.status,
    likes: input.likes,
    dislikes: input.dislikes,
  };
}

export async function GET() {
  const db = getDb();
  const categoryMaps = await loadAdminCategoryMaps(db);
  const { data, error } = await db.from("activities").select("*, organizer_data:organizer_id(*)").order("title", { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(Array.isArray(data) ? data.map((record) => normalizeActivityRecord(withCategoryNames(record as Record<string, unknown>, categoryMaps))) : []);
}

export async function POST(request: NextRequest) {
  const db = getDb();
  const body = (await request.json()) as Record<string, unknown>;
  const categoryMaps = await loadAdminCategoryMaps(db);
  const slug = toSlug(typeof body.title === "string" ? body.title : "nowe-zajecia");

  const payload = {
    ...pickActivityFields(normalizeActivityPayload(body, categoryMaps)),
    slug,
    status: "draft",
  };

  const { data, error } = await insertActivityWithFallback(db, payload);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  revalidatePath("/");
  revalidatePath("/zajecia");
  revalidatePath("/admin/zajecia");

  return NextResponse.json(normalizeActivityRecord(withCategoryNames(data as Record<string, unknown>, categoryMaps)));
}

const ALLOWED_ACTIVITY_FIELDS = new Set([
  "title", "description_short", "description_long",
  "image_url", "image_cover", "image_thumb", "image_set",
  "type_lvl_1", "type_lvl_2", "type_id", "subtype_id",
  "category_lvl_1", "category_lvl_2", "category_lvl_3", "main_category", "category", "subcategory",
  "days_of_week",
  "date_start", "date_end", "time_start", "time_end",
  "age_min", "age_max", "price_from", "price_to",
  "district", "street", "postcode", "city", "lat", "lng", "note", "organizer_id",
  "source_url", "facebook_url", "status", "likes", "dislikes",
]);

export async function PATCH(request: NextRequest) {
  const db = getDb();
  const body = (await request.json()) as Record<string, unknown>;
  const { id, ...updates } = body;
  const categoryMaps = await loadAdminCategoryMaps(db);

  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  const patch = Object.fromEntries(
    Object.entries(normalizeActivityPayload(updates, categoryMaps)).filter(([k, v]) => ALLOWED_ACTIVITY_FIELDS.has(k) && v !== undefined)
  );

  const { data, error } = await updateActivityWithFallback(db, id, patch);
  if (error) return NextResponse.json({ error: error.message, details: error }, { status: 500 });
  if (!data || data.length === 0) return NextResponse.json({ error: "No rows updated - check id or RLS" }, { status: 404 });

  revalidatePath("/");
  revalidatePath("/zajecia");
  revalidatePath("/admin/zajecia");

  return NextResponse.json({ ok: true, updated: normalizeActivityRecord(withCategoryNames(data[0] as Record<string, unknown>, categoryMaps)) });
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