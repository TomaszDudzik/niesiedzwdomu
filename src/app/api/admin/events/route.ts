import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { revalidatePath } from "next/cache";
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

function sanitizeEventPayload(input: unknown): Record<string, unknown> {
  if (!input || typeof input !== "object") return {};

  const {
    id: _id,
    content_type: _contentType,
    created_at: _createdAt,
    updated_at: _updatedAt,
    ...safe
  } = input as Record<string, unknown>;

  return safe;
}

function splitLegacyEventAddress(value: unknown) {
  if (typeof value !== "string") {
    return { street: null, city: null };
  }

  const trimmed = value.trim();
  if (!trimmed) {
    return { street: null, city: null };
  }

  const parts = trimmed.split(",").map((part) => part.trim()).filter(Boolean);
  if (parts.length >= 2) {
    return {
      street: parts.slice(0, -1).join(", "),
      city: parts[parts.length - 1] ?? "Kraków",
    };
  }

  return { street: trimmed, city: "Kraków" };
}

function normalizeEventPayload(input: unknown, categoryMaps: Awaited<ReturnType<typeof loadAdminCategoryMaps>>) {
  const payload = withCategoryIds(sanitizeEventPayload(input), categoryMaps);

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

  const legacyLocation = splitLegacyEventAddress(payload.venue_address);
  if ("street" in payload || "city" in payload || "venue_address" in payload) {
    payload.street = typeof payload.street === "string" ? payload.street.trim() : legacyLocation.street ?? "";
    payload.city = typeof payload.city === "string" && payload.city.trim().length > 0
      ? payload.city.trim()
      : legacyLocation.city ?? "Kraków";
  }

  delete payload.venue_name;
  delete payload.venue_address;

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

function withLegacyEventTaxonomy(input: Record<string, unknown>) {
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

function normalizeEventRecord(record: Record<string, unknown>) {
  const typeLevel1 = record.type_lvl_1 ?? record.type_id ?? null;
  const typeLevel2 = record.type_lvl_2 ?? record.subtype_id ?? null;
  const categoryLevel1 = record.category_lvl_1 ?? record.main_category ?? null;
  const categoryLevel2 = record.category_lvl_2 ?? record.category ?? null;
  const categoryLevel3 = record.category_lvl_3 ?? record.subcategory ?? null;
  const legacyLocation = splitLegacyEventAddress(record.venue_address);
  const street = typeof record.street === "string" && record.street.trim().length > 0 ? record.street : legacyLocation.street ?? "";
  const city = typeof record.city === "string" && record.city.trim().length > 0 ? record.city : legacyLocation.city ?? "Kraków";
  const organizer = typeof record.organizer === "string" ? record.organizer : null;

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
    street,
    city,
    organizer,
  };
}

function isMissingNewEventTaxonomyColumn(message: string | undefined) {
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

function slugifySegment(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function isSlugUniqueViolation(error: { message?: string; code?: string } | null) {
  if (!error) return false;

  const message = error.message ?? "";
  if (error.code === "23505" && message.toLowerCase().includes("slug")) {
    return true;
  }

  return /duplicate key value .*slug/i.test(message);
}

function buildUniqueEventSlug(payload: Record<string, unknown>, attempt: number) {
  const slugFromPayload = typeof payload.slug === "string" ? slugifySegment(payload.slug.trim()) : "";
  const title = typeof payload.title === "string" ? payload.title.trim() : "";
  const baseSlug = slugFromPayload || slugifySegment(title) || "wydarzenie";

  const dateToken = typeof payload.date_start === "string"
    ? payload.date_start.replace(/[^0-9]/g, "")
    : "";
  const timeToken = typeof payload.time_start === "string"
    ? payload.time_start.replace(/[^0-9]/g, "")
    : "";

  const semanticSuffix = [dateToken, timeToken].filter(Boolean).join("-");
  const uniqueTail = `${Date.now().toString(36)}-${attempt + 1}`;
  const suffix = semanticSuffix ? `${semanticSuffix}-${uniqueTail}` : uniqueTail;

  return `${baseSlug}-${suffix}`;
}

async function insertEventWithFallback(db: ReturnType<typeof getDb>, payload: Record<string, unknown>) {
  let currentPayload = { ...payload };
  let attemptedLegacyMapping = false;

  for (let attempt = 0; attempt < 8; attempt += 1) {
    const result = await db.from("events").insert(currentPayload).select().single();
    if (!result.error) return result;

    if (isSlugUniqueViolation(result.error)) {
      currentPayload.slug = buildUniqueEventSlug(currentPayload, attempt);
      continue;
    }

    const missingColumn = getMissingSchemaColumn(result.error.message);
    if (missingColumn && ["category_lvl_1", "category_lvl_2", "category_lvl_3"].includes(missingColumn)) {
      delete currentPayload[missingColumn];
      continue;
    }

    if (!attemptedLegacyMapping && isMissingNewEventTaxonomyColumn(result.error.message)) {
      currentPayload = withLegacyEventTaxonomy(currentPayload);
      attemptedLegacyMapping = true;
      continue;
    }

    if (!missingColumn || !(missingColumn in currentPayload)) {
      return result;
    }

    delete currentPayload[missingColumn];
  }

  return db.from("events").insert(currentPayload).select().single();
}

async function updateEventWithFallback(db: ReturnType<typeof getDb>, id: unknown, updates: Record<string, unknown>) {
  let currentUpdates = { ...updates };
  let attemptedLegacyMapping = false;

  for (let attempt = 0; attempt < 8; attempt += 1) {
    const result = await db.from("events").update(currentUpdates).eq("id", id).select();
    if (!result.error) return result;

    if (isSlugUniqueViolation(result.error)) {
      currentUpdates.slug = buildUniqueEventSlug(currentUpdates, attempt);
      continue;
    }

    const missingColumn = getMissingSchemaColumn(result.error.message);
    if (missingColumn && ["category_lvl_1", "category_lvl_2", "category_lvl_3"].includes(missingColumn)) {
      delete currentUpdates[missingColumn];
      continue;
    }

    if (!attemptedLegacyMapping && isMissingNewEventTaxonomyColumn(result.error.message)) {
      currentUpdates = withLegacyEventTaxonomy(currentUpdates);
      attemptedLegacyMapping = true;
      continue;
    }

    if (!missingColumn || !(missingColumn in currentUpdates)) {
      return result;
    }

    delete currentUpdates[missingColumn];
  }

  return db.from("events").update(currentUpdates).eq("id", id).select();
}

// GET /api/admin/events — list all events (all statuses)
export async function GET() {
  const db = getDb();
  const categoryMaps = await loadAdminCategoryMaps(db);
  const { data, error } = await db
    .from("events")
    .select("*")
    .order("date_start", { ascending: false })
    .limit(200);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(Array.isArray(data) ? data.map((record) => normalizeEventRecord(withCategoryNames(record as Record<string, unknown>, categoryMaps))) : []);
}

// POST /api/admin/events — create a new event
export async function POST(request: NextRequest) {
  const db = getDb();
  const categoryMaps = await loadAdminCategoryMaps(db);
  const body = normalizeEventPayload(await request.json(), categoryMaps);

  const { data, error } = await insertEventWithFallback(db, body);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(normalizeEventRecord(withCategoryNames(data as Record<string, unknown>, categoryMaps)));
}

// PATCH /api/admin/events — update event fields
export async function PATCH(request: NextRequest) {
  const db = getDb();
  const { id, ...updatesRaw } = await request.json();
  const categoryMaps = await loadAdminCategoryMaps(db);
  const updates = normalizeEventPayload(updatesRaw, categoryMaps);

  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });
  if (Object.keys(updates).length === 0) return NextResponse.json({ error: "no update fields provided" }, { status: 400 });

  const { data, error } = await updateEventWithFallback(db, id, updates);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!data || data.length === 0) return NextResponse.json({ error: "No rows updated — check RLS or event id" }, { status: 404 });

  revalidatePath("/");
  revalidatePath("/wydarzenia");

  return NextResponse.json({ ok: true, updated: normalizeEventRecord(withCategoryNames(data[0] as Record<string, unknown>, categoryMaps)) });
}

// DELETE /api/admin/events — permanently delete an event
export async function DELETE(request: NextRequest) {
  const db = getDb();
  const { id } = await request.json();

  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  const { error } = await db.from("events").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  revalidatePath("/");
  revalidatePath("/wydarzenia");

  return NextResponse.json({ ok: true });
}
