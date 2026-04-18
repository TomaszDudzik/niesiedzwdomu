import { createClient } from "@supabase/supabase-js";
import {
  loadAdminCategoryMaps,
  type AdminCategoryMaps,
  withCategoryNames,
} from "@/lib/admin-taxonomy-db";
import type { Activity, Camp, Event, Place } from "@/types/database";

/**
 * Server-side data fetching from Supabase.
 * Uses anon key — RLS only returns published events.
 * Used by Server Components (homepage, listings, detail pages).
 */

function getDb() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}

function getTaxonomyDb() {
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (serviceRoleKey) {
    return createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      serviceRoleKey,
    );
  }

  return getDb();
}

let categoryMapsPromise: Promise<AdminCategoryMaps> | null = null;

function getCategoryMaps() {
  if (!categoryMapsPromise) {
    categoryMapsPromise = loadAdminCategoryMaps(getTaxonomyDb());
  }

  return categoryMapsPromise;
}

function pickString(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function normalizeImageFields(row: Record<string, unknown>) {
  const imageUrl = pickString(row.image_url);
  const imageCover = pickString(row.image_cover);
  const effectiveCover = imageCover ?? imageUrl;
  const imageThumb = pickString(row.image_thumb)
    ?? (effectiveCover?.includes("-cover.webp") ? effectiveCover.replace("-cover.webp", "-thumb.webp") : null);

  return {
    image_url: effectiveCover,
    image_cover: imageCover ?? effectiveCover,
    image_thumb: imageThumb,
  };
}

function normalizeEventLocationFields(row: Record<string, unknown>) {
  const street = pickString(row.street);
  const postcode = pickString(row.postcode);
  const city = pickString(row.city);

  if (street || postcode || city) {
    return {
      street: street ?? "",
      postcode: postcode ?? null,
      city: city ?? "Kraków",
    };
  }

  const legacyAddress = pickString(row.venue_address);
  if (!legacyAddress) {
    return {
      street: "",
      postcode: null,
      city: "Kraków",
    };
  }

  const parts = legacyAddress.split(",").map((part) => part.trim()).filter(Boolean);
  if (parts.length >= 2) {
    return {
      street: parts.slice(0, -1).join(", "),
      postcode: null,
      city: parts[parts.length - 1] ?? "Kraków",
    };
  }

  return {
    street: legacyAddress,
    postcode: null,
    city: "Kraków",
  };
}

function normalizeCategoryFields(row: Record<string, unknown>, maps: AdminCategoryMaps): Record<string, unknown> {
  const normalized = withCategoryNames(row, maps);

  const categoryLevel1 = pickString(normalized.category_lvl_1) ?? pickString(normalized.main_category);
  const categoryLevel2 = pickString(normalized.category_lvl_2) ?? pickString(normalized.category);
  const categoryLevel3 = pickString(normalized.category_lvl_3) ?? pickString(normalized.subcategory);

  return {
    ...normalized,
    ...normalizeImageFields(normalized),
    category_lvl_1: categoryLevel1,
    category_lvl_2: categoryLevel2,
    category_lvl_3: categoryLevel3,
    main_category: categoryLevel1,
    category: categoryLevel2 ?? categoryLevel1,
    subcategory: categoryLevel3,
  };
}

function getUncategorizedLabel(value: string | null | undefined) {
  return value ?? "Bez kategorii";
}

/** Map a Supabase row to the Event type expected by components */
function toEvent(row: Record<string, unknown>, maps: AdminCategoryMaps): Event {
  const normalized = normalizeCategoryFields(row, maps);
  const displayCategory =
    pickString(normalized.category_lvl_2) ??
    pickString(normalized.category_lvl_1) ??
    pickString(normalized.category) ??
    "Bez kategorii";
  const location = normalizeEventLocationFields(normalized);
  const organizerData = row.organizer_data as Record<string, unknown> | null | undefined;
  const organizer = typeof organizerData?.name === "string" && organizerData.name.trim().length > 0
    ? organizerData.name
    : pickString(row.organizer);
  const priceFrom = typeof row.price_from === "number" ? row.price_from : null;
  const priceTo = typeof row.price_to === "number" ? row.price_to : null;
  const isFree = Boolean(row.is_free) || priceFrom === 0 || priceTo === 0;

  return {
    ...normalized,
    ...location,
    content_type: "event",
    main_category: pickString(normalized.category_lvl_1),
    category: displayCategory,
    price_from: priceFrom,
    price_to: priceTo,
    is_free: isFree,
    organizer,
    organizer_data: organizerData ?? null,
  } as unknown as Event;
}

function toPlace(row: Record<string, unknown>, maps: AdminCategoryMaps): Place {
  const normalized = normalizeCategoryFields(row, maps);
  const placeType = pickString(normalized.category_lvl_1) ?? "Bez kategorii";

  return {
    ...normalized,
    content_type: "place",
    place_type: placeType,
    main_category: getUncategorizedLabel(pickString(normalized.category_lvl_1)),
    category: pickString(normalized.category_lvl_2),
    subcategory: pickString(normalized.category_lvl_3),
  } as unknown as Place;
}

function toCamp(row: Record<string, unknown>, maps: AdminCategoryMaps): Camp {
  const normalized = normalizeCategoryFields(row, maps);
  const priceFrom = typeof row.price_from === "number" ? row.price_from : null;
  const priceSingle = typeof row.price === "number" ? row.price : null;
  const priceTo = typeof row.price_to === "number" ? row.price_to : null;
  const organizerData = row.organizer_data as Record<string, unknown> | null | undefined;
  const location = normalizeEventLocationFields(normalized);
  const organizer = pickString(organizerData?.organizer_name) ?? pickString(organizerData?.name) ?? String(row.organizer || "");
  const derivedAddress = [location.street, location.postcode, location.city].filter(Boolean).join(", ");

  return {
    ...normalized,
    ...location,
    content_type: "camp",
    image_url: typeof row.image_cover === "string" && row.image_cover.trim().length > 0
      ? row.image_cover
      : (typeof row.image_url === "string" ? row.image_url : null),
    main_category: pickString(normalized.category_lvl_1) ?? pickString(normalized.main_category) ?? "Bez kategorii",
    category: pickString(normalized.category_lvl_2),
    subcategory: pickString(normalized.category_lvl_3),
    organizer,
    venue_name: organizer || null,
    venue_address: derivedAddress || null,
    price_from: priceFrom ?? priceSingle ?? null,
    price_to: priceTo,
    price: priceFrom ?? priceSingle ?? null,
    is_free: Boolean(row.is_free) || priceFrom === 0 || priceTo === 0 || priceSingle === 0,
    organizer_data: organizerData ?? null,
  } as unknown as Camp;
}

function toActivity(row: Record<string, unknown>, maps: AdminCategoryMaps): Activity {
  const normalized = normalizeCategoryFields(row, maps);
  const activityType =
    pickString(normalized.category_lvl_1) ??
    pickString(normalized.activity_type) ??
    "Bez kategorii";
  const organizerData = row.organizer_data as Record<string, unknown> | null | undefined;
  const organizer = pickString(organizerData?.organizer_name) ?? pickString(organizerData?.name) ?? String(row.organizer || "");
  const location = normalizeEventLocationFields(normalized);
  const timeStart = pickString(row.time_start);
  const timeEnd = pickString(row.time_end);
  const daySummary = Array.isArray(row.days_of_week) ? row.days_of_week.map(String).join(", ") : "";
  const timeSummary = timeStart && timeEnd ? `${timeStart.slice(0, 5)}-${timeEnd.slice(0, 5)}` : (timeStart ? timeStart.slice(0, 5) : "");
  const scheduleSummary = [daySummary, timeSummary].filter(Boolean).join(" · ") || null;
  const derivedAddress = [location.street, location.postcode, location.city].filter(Boolean).join(", ");
  const priceFrom = typeof row.price_from === "number" ? row.price_from : null;
  const priceTo = typeof row.price_to === "number" ? row.price_to : null;

  return {
    ...normalized,
    ...location,
    content_type: "activity",
    image_url: typeof row.image_cover === "string" && row.image_cover.trim().length > 0
      ? row.image_cover
      : (typeof row.image_url === "string" ? row.image_url : null),
    activity_type: activityType,
    schedule_summary: scheduleSummary,
    main_category: pickString(normalized.category_lvl_1) ?? activityType,
    category: pickString(normalized.category_lvl_2),
    subcategory: pickString(normalized.category_lvl_3),
    days_of_week: Array.isArray(row.days_of_week) ? row.days_of_week.map(String) : [],
    price_from: priceFrom,
    price_to: priceTo,
    is_free: Boolean(row.is_free) || priceFrom === 0 || priceTo === 0,
    organizer,
    venue_name: organizer || null,
    venue_address: derivedAddress || null,
    organizer_data: organizerData ?? null,
  } as unknown as Activity;
}

export async function getPublishedEvents(limit = 50): Promise<Event[]> {
  const db = getDb();
  const maps = await getCategoryMaps();
  const today = new Date().toISOString().slice(0, 10);
  const { data } = await db
    .from("events")
    .select("*, organizer_data:organizer_id(*)")
    .eq("status", "published")
    .or(`date_start.gte.${today},date_end.gte.${today}`)
    .order("date_start", { ascending: true })
    .limit(limit);
  return (data || []).map((row) => toEvent(row, maps));
}

export async function getFeaturedEvent(): Promise<Event | null> {
  const db = getDb();
  const maps = await getCategoryMaps();
  const today = new Date().toISOString().slice(0, 10);
  const { data } = await db
    .from("events")
    .select("*, organizer_data:organizer_id(*)")
    .eq("status", "published")
    .eq("is_featured", true)
    .or(`date_start.gte.${today},date_end.gte.${today}`)
    .order("date_start", { ascending: true })
    .limit(1)
    .single();
  return data ? toEvent(data, maps) : null;
}

export async function getFreeEvents(limit = 3): Promise<Event[]> {
  const db = getDb();
  const maps = await getCategoryMaps();
  const today = new Date().toISOString().slice(0, 10);
  const { data } = await db
    .from("events")
    .select("*, organizer_data:organizer_id(*)")
    .eq("status", "published")
    .eq("is_free", true)
    .or(`date_start.gte.${today},date_end.gte.${today}`)
    .order("date_start", { ascending: true })
    .limit(limit);
  return (data || []).map((row) => toEvent(row, maps));
}

export async function getEventBySlug(slug: string): Promise<Event | null> {
  const db = getDb();
  const maps = await getCategoryMaps();
  const { data } = await db
    .from("events")
    .select("*, organizer_data:organizer_id(*)")
    .eq("slug", slug)
    .eq("status", "published")
    .single();
  return data ? toEvent(data, maps) : null;
}

export async function getRelatedEvents(event: Event, limit = 3): Promise<Event[]> {
  const db = getDb();
  const maps = await getCategoryMaps();
  const today = new Date().toISOString().slice(0, 10);
  const eventRow = event as Event & {
    category_lvl_1_id?: string | null;
    category_lvl_2_id?: string | null;
  };
  const relatedConditions = [`district.eq.${event.district}`];

  if (eventRow.category_lvl_2_id) {
    relatedConditions.unshift(`category_lvl_2_id.eq.${eventRow.category_lvl_2_id}`);
  } else if (eventRow.category_lvl_1_id) {
    relatedConditions.unshift(`category_lvl_1_id.eq.${eventRow.category_lvl_1_id}`);
  }

  const { data } = await db
    .from("events")
    .select("*, organizer_data:organizer_id(*)")
    .eq("status", "published")
    .neq("id", event.id)
    .or(`date_start.gte.${today},date_end.gte.${today}`)
    .or(relatedConditions.join(","))
    .order("date_start", { ascending: true })
    .limit(limit);
  return (data || []).map((row) => toEvent(row, maps));
}

// ── Places ──

export async function getPublishedPlaces(limit = 50): Promise<Place[]> {
  const db = getDb();
  const maps = await getCategoryMaps();
  const { data } = await db
    .from("places")
    .select("*")
    .eq("status", "published")
    .order("likes", { ascending: false })
    .order("title", { ascending: true })
    .limit(limit);
  return (data || []).map((row) => toPlace(row, maps));
}

export async function getPlaceBySlug(slug: string): Promise<Place | null> {
  const db = getDb();
  const maps = await getCategoryMaps();
  const { data } = await db
    .from("places")
    .select("*")
    .eq("slug", slug)
    .eq("status", "published")
    .single();
  return data ? toPlace(data, maps) : null;
}

// ── Camps ──

export async function getPublishedCamps(limit = 80): Promise<Camp[]> {
  const db = getDb();
  const maps = await getCategoryMaps();
  const today = new Date().toISOString().slice(0, 10);
  const { data } = await db
    .from("camps")
    .select("*, organizer_data:organizer_id(*)")
    .eq("status", "published")
    .or(`date_start.gte.${today},date_end.gte.${today}`)
    .order("date_start", { ascending: true })
    .limit(limit);
  return (data || []).map((row) => toCamp(row, maps));
}

export async function getCampBySlug(slug: string): Promise<Camp | null> {
  const db = getDb();
  const maps = await getCategoryMaps();
  const { data } = await db
    .from("camps")
    .select("*, organizer_data:organizer_id(*)")
    .eq("slug", slug)
    .eq("status", "published")
    .single();
  return data ? toCamp(data, maps) : null;
}

export async function getCampSessionsByOrganizer(organizerId: string | null | undefined, organizer: string, excludeId: string): Promise<Camp[]> {
  if (!organizerId) {
    return [];
  }

  const db = getDb();
  const maps = await getCategoryMaps();
  let query = db
    .from("camps")
    .select("*, organizer_data:organizer_id(*)")
    .eq("status", "published")
    .neq("id", excludeId)
    .order("date_start", { ascending: true });

  query = query.eq("organizer_id", organizerId);

  const { data } = await query;
  return (data || []).map((row) => toCamp(row, maps));
}

// ── Activities ──

export async function getPublishedActivities(limit = 120): Promise<Activity[]> {
  const db = getDb();
  const maps = await getCategoryMaps();
  const today = new Date().toISOString().slice(0, 10);
  const { data } = await db
    .from("activities")
    .select("*, organizer_data:organizer_id(*)")
    .eq("status", "published")
    .or(`date_end.is.null,date_end.gte.${today}`)
    .order("is_featured", { ascending: false })
    .order("date_start", { ascending: true })
    .order("title", { ascending: true })
    .limit(limit);
  return (data || []).map((row) => toActivity(row, maps));
}
