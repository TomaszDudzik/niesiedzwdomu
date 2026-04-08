import { createClient } from "@supabase/supabase-js";
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

/** Map a Supabase row to the Event type expected by components */
function toEvent(row: Record<string, unknown>): Event {
  return { ...row, content_type: "event" } as Event;
}

function toPlace(row: Record<string, unknown>): Place {
  return { ...row, content_type: "place" } as Place;
}

function toCamp(row: Record<string, unknown>): Camp {
  const priceFrom = typeof row.price_from === "number" ? row.price_from : null;
  const priceSingle = typeof row.price === "number" ? row.price : null;
  return {
    ...row,
    content_type: "camp",
    price: priceFrom ?? priceSingle ?? null,
  } as Camp;
}

function toActivity(row: Record<string, unknown>): Activity {
  return {
    ...row,
    content_type: "activity",
    days_of_week: Array.isArray(row.days_of_week) ? row.days_of_week.map(String) : [],
    price_from: typeof row.price_from === "number" ? row.price_from : null,
    price_to: typeof row.price_to === "number" ? row.price_to : null,
  } as Activity;
}

export async function getPublishedEvents(limit = 50): Promise<Event[]> {
  const db = getDb();
  const today = new Date().toISOString().slice(0, 10);
  const { data } = await db
    .from("events")
    .select("*")
    .eq("status", "published")
    .or(`date_start.gte.${today},date_end.gte.${today}`)
    .order("date_start", { ascending: true })
    .limit(limit);
  return (data || []).map(toEvent);
}

export async function getFeaturedEvent(): Promise<Event | null> {
  const db = getDb();
  const today = new Date().toISOString().slice(0, 10);
  const { data } = await db
    .from("events")
    .select("*")
    .eq("status", "published")
    .eq("is_featured", true)
    .or(`date_start.gte.${today},date_end.gte.${today}`)
    .order("date_start", { ascending: true })
    .limit(1)
    .single();
  return data ? toEvent(data) : null;
}

export async function getFreeEvents(limit = 3): Promise<Event[]> {
  const db = getDb();
  const today = new Date().toISOString().slice(0, 10);
  const { data } = await db
    .from("events")
    .select("*")
    .eq("status", "published")
    .eq("is_free", true)
    .or(`date_start.gte.${today},date_end.gte.${today}`)
    .order("date_start", { ascending: true })
    .limit(limit);
  return (data || []).map(toEvent);
}

export async function getEventBySlug(slug: string): Promise<Event | null> {
  const db = getDb();
  const { data } = await db
    .from("events")
    .select("*")
    .eq("slug", slug)
    .eq("status", "published")
    .single();
  return data ? toEvent(data) : null;
}

export async function getRelatedEvents(event: Event, limit = 3): Promise<Event[]> {
  const db = getDb();
  const today = new Date().toISOString().slice(0, 10);
  const { data } = await db
    .from("events")
    .select("*")
    .eq("status", "published")
    .neq("id", event.id)
    .or(`date_start.gte.${today},date_end.gte.${today}`)
    .or(`category.eq.${event.category},district.eq.${event.district}`)
    .order("date_start", { ascending: true })
    .limit(limit);
  return (data || []).map(toEvent);
}

// ── Places ──

export async function getPublishedPlaces(limit = 50): Promise<Place[]> {
  const db = getDb();
  const { data } = await db
    .from("places")
    .select("*")
    .eq("status", "published")
    .order("likes", { ascending: false })
    .order("title", { ascending: true })
    .limit(limit);
  return (data || []).map(toPlace);
}

export async function getPlaceBySlug(slug: string): Promise<Place | null> {
  const db = getDb();
  const { data } = await db
    .from("places")
    .select("*")
    .eq("slug", slug)
    .eq("status", "published")
    .single();
  return data ? toPlace(data) : null;
}

// ── Camps ──

export async function getPublishedCamps(limit = 80): Promise<Camp[]> {
  const db = getDb();
  const today = new Date().toISOString().slice(0, 10);
  const { data } = await db
    .from("camps")
    .select("*")
    .eq("status", "published")
    .or(`date_start.gte.${today},date_end.gte.${today}`)
    .order("date_start", { ascending: true })
    .limit(limit);
  return (data || []).map(toCamp);
}

export async function getCampBySlug(slug: string): Promise<Camp | null> {
  const db = getDb();
  const { data } = await db
    .from("camps")
    .select("*")
    .eq("slug", slug)
    .eq("status", "published")
    .single();
  return data ? toCamp(data) : null;
}

// ── Activities ──

export async function getPublishedActivities(limit = 120): Promise<Activity[]> {
  const db = getDb();
  const today = new Date().toISOString().slice(0, 10);
  const { data } = await db
    .from("activities")
    .select("*")
    .eq("status", "published")
    .or(`date_end.is.null,date_end.gte.${today}`)
    .order("is_featured", { ascending: false })
    .order("date_start", { ascending: true })
    .order("title", { ascending: true })
    .limit(limit);
  return (data || []).map(toActivity);
}
