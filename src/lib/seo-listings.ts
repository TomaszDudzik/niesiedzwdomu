import type { DiscoveryItem } from "@/types/database";
import type { SeoListingConfig } from "@/types/seo";
import { getPublishedCamps, getPublishedEvents, getPublishedPlaces } from "./data";

/**
 * Resolves a SeoListingConfig into actual items from live data.
 */
export async function resolveListingItems(config: SeoListingConfig): Promise<DiscoveryItem[]> {
  const limit = config.limit ?? 6;

  if (config.contentType === "mixed") {
    const [events, camps, places] = await Promise.all([
      getPublishedEvents(limit),
      getPublishedCamps(limit),
      getPublishedPlaces(limit),
    ]);

    let items: DiscoveryItem[] = [...events, ...camps, ...places]
      .sort((a, b) => (b.likes ?? 0) - (a.likes ?? 0));

    if (config.filterFree) items = items.filter((i) => i.is_free);
    return items.slice(0, limit);
  }

  if (config.contentType === "event") {
    let items = await getPublishedEvents(Math.max(limit * 3, 24));
    if (config.filterCategory) items = items.filter((e) => (e.category_lvl_2 ?? e.category) === config.filterCategory);
    if (config.filterFree) items = items.filter((e) => e.is_free);
    return items.slice(0, limit);
  }

  if (config.contentType === "camp") {
    let items = await getPublishedCamps(Math.max(limit * 3, 24));
    if (config.filterCampType) items = items.filter((c) => (c.category_lvl_1 ?? c.main_category) === config.filterCampType);
    if (config.filterFree) items = items.filter((c) => c.is_free);
    return items.slice(0, limit);
  }

  if (config.contentType === "place") {
    let items = await getPublishedPlaces(Math.max(limit * 3, 24));
    if (config.filterPlaceType) items = items.filter((p) => (p.category_lvl_1 ?? p.main_category ?? p.place_type) === config.filterPlaceType);
    if (config.filterFree) items = items.filter((p) => p.is_free);
    if (config.filterIndoor !== undefined) items = items.filter((p) => p.is_indoor === config.filterIndoor);
    return items.slice(0, limit);
  }

  return [];
}
