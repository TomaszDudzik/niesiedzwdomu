import type { DiscoveryItem } from "@/types/database";
import type { SeoListingConfig } from "@/types/seo";
import { mockEvents, mockCamps, mockPlaces, getDiscoveryFeed } from "./mock-data";

/**
 * Resolves a SeoListingConfig into actual items from mock data.
 * In production, replace this with Supabase queries.
 */
export function resolveListingItems(config: SeoListingConfig): DiscoveryItem[] {
  const limit = config.limit ?? 6;

  if (config.contentType === "mixed") {
    let items = getDiscoveryFeed();
    if (config.filterFree) items = items.filter((i) => i.is_free);
    return items.slice(0, limit);
  }

  if (config.contentType === "event") {
    let items = mockEvents
      .filter((e) => e.status === "published")
      .sort((a, b) => a.date_start.localeCompare(b.date_start));
    if (config.filterCategory) items = items.filter((e) => (e.category_lvl_2 ?? e.category) === config.filterCategory);
    if (config.filterFree) items = items.filter((e) => e.is_free);
    return items.slice(0, limit);
  }

  if (config.contentType === "camp") {
    let items = mockCamps.filter((c) => c.status === "published");
    if (config.filterCampType) items = items.filter((c) => (c.category_lvl_1 ?? c.main_category) === config.filterCampType);
    if (config.filterFree) items = items.filter((c) => c.is_free);
    return items.slice(0, limit);
  }

  if (config.contentType === "place") {
    let items = mockPlaces.filter((p) => p.status === "published");
    if (config.filterPlaceType) items = items.filter((p) => p.place_type === config.filterPlaceType);
    if (config.filterFree) items = items.filter((p) => p.is_free);
    if (config.filterIndoor !== undefined) items = items.filter((p) => p.is_indoor === config.filterIndoor);
    return items.slice(0, limit);
  }

  return [];
}
