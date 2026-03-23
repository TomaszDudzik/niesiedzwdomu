import { createClient } from "@supabase/supabase-js";
import type { Event } from "@/types/database";

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

export async function getPublishedEvents(limit = 50): Promise<Event[]> {
  const db = getDb();
  const today = new Date().toISOString().slice(0, 10);
  const { data } = await db
    .from("events")
    .select("*")
    .eq("status", "published")
    .gte("date_start", today)
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
    .gte("date_start", today)
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
    .gte("date_start", today)
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
    .gte("date_start", today)
    .or(`category.eq.${event.category},district.eq.${event.district}`)
    .order("date_start", { ascending: true })
    .limit(limit);
  return (data || []).map(toEvent);
}
