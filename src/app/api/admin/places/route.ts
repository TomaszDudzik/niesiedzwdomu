import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { revalidatePath } from "next/cache";

function getDb() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );
}

function withLegacyPlacesTaxonomy(input: Record<string, unknown>) {
  const payload = { ...input };

  if ("type_lvl_1_id" in payload) {
    payload.type_id = payload.type_lvl_1_id ?? null;
    delete payload.type_lvl_1_id;
  }

  if ("type_lvl_2_id" in payload) {
    payload.subtype_id = payload.type_lvl_2_id ?? null;
    delete payload.type_lvl_2_id;
  }

  if ("category_lvl_1" in payload) {
    payload.main_category = payload.category_lvl_1 ?? null;
    payload.place_type = payload.category_lvl_1 ?? null;
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

function normalizePlacesPayload(input: Record<string, unknown>) {
  const payload = { ...input };

  const typeLevel1 = payload.type_lvl_1_id ?? payload.type_id ?? null;
  if (typeLevel1 !== null) {
    payload.type_lvl_1_id = typeLevel1;
    payload.type_id = typeLevel1;
  }

  const typeLevel2 = payload.type_lvl_2_id ?? payload.subtype_id ?? null;
  if (typeLevel2 !== null) {
    payload.type_lvl_2_id = typeLevel2;
    payload.subtype_id = typeLevel2;
  }

  const categoryLevel1 = payload.category_lvl_1 ?? payload.main_category ?? payload.place_type ?? null;
  if (categoryLevel1 !== null) {
    payload.category_lvl_1 = categoryLevel1;
    payload.main_category = categoryLevel1;
    payload.place_type = categoryLevel1;
  }

  const categoryLevel2 = payload.category_lvl_2 ?? payload.category ?? null;
  if (categoryLevel2 !== null) {
    payload.category_lvl_2 = categoryLevel2;
    payload.category = categoryLevel2;
  }

  const categoryLevel3 = payload.category_lvl_3 ?? payload.subcategory ?? null;
  if (categoryLevel3 !== null) {
    payload.category_lvl_3 = categoryLevel3;
    payload.subcategory = categoryLevel3;
  }

  return payload;
}

function normalizePlaceRecord(record: Record<string, unknown>) {
  const typeLevel1 = record.type_lvl_1_id ?? record.type_id ?? null;
  const typeLevel2 = record.type_lvl_2_id ?? record.subtype_id ?? null;
  const categoryLevel1 = record.category_lvl_1 ?? record.main_category ?? record.place_type ?? null;
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
    place_type: categoryLevel1,
  };
}

function isMissingNewPlacesTaxonomyColumn(message: string | undefined) {
  if (!message) return false;

  return [
    "type_lvl_1_id",
    "type_lvl_2_id",
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

async function insertPlaceWithFallback(db: ReturnType<typeof getDb>, payload: Record<string, unknown>) {
  let currentPayload = { ...payload };
  let attemptedLegacyMapping = false;

  for (let attempt = 0; attempt < 8; attempt += 1) {
    const result = await db.from("places").insert(currentPayload).select().single();
    if (!result.error) return result;

    if (!attemptedLegacyMapping && isMissingNewPlacesTaxonomyColumn(result.error.message)) {
      currentPayload = withLegacyPlacesTaxonomy(currentPayload);
      attemptedLegacyMapping = true;
      continue;
    }

    const missingColumn = getMissingSchemaColumn(result.error.message);
    if (!missingColumn || !(missingColumn in currentPayload)) {
      return result;
    }

    delete currentPayload[missingColumn];
  }

  return db.from("places").insert(currentPayload).select().single();
}

async function updatePlaceWithFallback(db: ReturnType<typeof getDb>, id: unknown, updates: Record<string, unknown>) {
  let currentUpdates = { ...updates };
  let attemptedLegacyMapping = false;

  for (let attempt = 0; attempt < 8; attempt += 1) {
    const result = await db.from("places").update(currentUpdates).eq("id", id).select();
    if (!result.error) return result;

    if (!attemptedLegacyMapping && isMissingNewPlacesTaxonomyColumn(result.error.message)) {
      currentUpdates = withLegacyPlacesTaxonomy(currentUpdates);
      attemptedLegacyMapping = true;
      continue;
    }

    const missingColumn = getMissingSchemaColumn(result.error.message);
    if (!missingColumn || !(missingColumn in currentUpdates)) {
      return result;
    }

    delete currentUpdates[missingColumn];
  }

  return db.from("places").update(currentUpdates).eq("id", id).select();
}

// GET /api/admin/places — list all places
export async function GET() {
  const db = getDb();
  const { data, error } = await db
    .from("places")
    .select("*")
    .order("title", { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(Array.isArray(data) ? data.map((record) => normalizePlaceRecord(record as Record<string, unknown>)) : []);
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

  const initialPayload = normalizePlacesPayload({ ...body, slug, status: "draft" });

  const { data, error } = await insertPlaceWithFallback(db, initialPayload);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

// PATCH /api/admin/places — update a place
export async function PATCH(request: NextRequest) {
  const db = getDb();
  const body = await request.json();
  const { id, ...updates } = body;

  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  const { data, error } = await updatePlaceWithFallback(db, id, normalizePlacesPayload(updates as Record<string, unknown>));

  if (error) return NextResponse.json({ error: error.message, details: error }, { status: 500 });
  if (!data || data.length === 0) return NextResponse.json({ error: "No rows updated — check id or RLS" }, { status: 404 });

  revalidatePath("/");
  revalidatePath("/miejsca");

  return NextResponse.json({ ok: true, updated: normalizePlaceRecord(data[0] as Record<string, unknown>) });
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
