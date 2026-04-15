import type { DiscoveryItem, ContentType } from "@/types/database";
import { CONTENT_TYPE_LABELS, CONTENT_TYPE_ICONS, CONTENT_TYPE_COLORS, CATEGORY_LABELS, CATEGORY_ICONS, CAMP_MAIN_CATEGORY_LABELS, CAMP_MAIN_CATEGORY_ICONS, PLACE_TYPE_LABELS, PLACE_TYPE_ICONS, ACTIVITY_TYPE_LABELS, ACTIVITY_TYPE_ICONS } from "./mock-data";
import { formatDateShort, formatPrice, formatAgeRange } from "./utils";

function getPlaceCategoryLabel(value: string | null | undefined) {
  if (!value) return "Miejsce";
  return PLACE_TYPE_LABELS[value as keyof typeof PLACE_TYPE_LABELS] ?? value;
}

function getPlaceCategoryIcon(value: string | null | undefined) {
  if (!value) return "📍";
  return PLACE_TYPE_ICONS[value as keyof typeof PLACE_TYPE_ICONS] ?? "📍";
}

/** Get the URL path for a discovery item */
export function getItemHref(item: DiscoveryItem): string {
  switch (item.content_type) {
    case "event": return `/wydarzenia/${item.slug}`;
    case "camp": return `/kolonie/${item.slug}`;
    case "place": return `/miejsca/${item.slug}`;
    case "activity": return `/zajecia/${item.slug}`;
  }
}

/** Get the type badge label (e.g., "Wydarzenie", "Kolonie") */
export function getTypeBadgeLabel(item: DiscoveryItem): string {
  return CONTENT_TYPE_LABELS[item.content_type];
}

/** Get the type badge icon */
export function getTypeBadgeIcon(item: DiscoveryItem): string {
  return CONTENT_TYPE_ICONS[item.content_type];
}

/** Get the type badge colors */
export function getTypeBadgeColors(type: ContentType) {
  return CONTENT_TYPE_COLORS[type];
}

/** Get the sub-category label (event category, camp type, place type) */
export function getSubcategoryLabel(item: DiscoveryItem): string {
  switch (item.content_type) {
    case "event": return CATEGORY_LABELS[item.category_lvl_2 ?? item.category];
    case "camp": return CAMP_MAIN_CATEGORY_LABELS[item.category_lvl_1 ?? item.main_category];
    case "place": return getPlaceCategoryLabel(item.category_lvl_1 ?? item.main_category ?? item.place_type);
    case "activity": return ACTIVITY_TYPE_LABELS[item.activity_type];
  }
}

/** Get the sub-category icon */
export function getSubcategoryIcon(item: DiscoveryItem): string {
  switch (item.content_type) {
    case "event": return CATEGORY_ICONS[item.category_lvl_2 ?? item.category];
    case "camp": return CAMP_MAIN_CATEGORY_ICONS[item.category_lvl_1 ?? item.main_category];
    case "place": return getPlaceCategoryIcon(item.category_lvl_1 ?? item.main_category ?? item.place_type);
    case "activity": return ACTIVITY_TYPE_ICONS[item.activity_type];
  }
}

/** Get the primary location text */
export function getLocationText(item: DiscoveryItem): string {
  switch (item.content_type) {
    case "event": return item.venue_name;
    case "camp": return item.venue_name;
    case "place": return [item.street, item.city].filter(Boolean).join(", ");
    case "activity": return item.venue_name;
  }
}

/** Get the primary date/time text */
export function getDateText(item: DiscoveryItem): string {
  switch (item.content_type) {
    case "event": {
      let s = formatDateShort(item.date_start);
      if (item.date_end && item.date_end !== item.date_start) {
        s += ` – ${formatDateShort(item.date_end)}`;
      }
      if (item.time_start) s += ` · ${item.time_start}`;
      return s;
    }
    case "camp": {
      return `${formatDateShort(item.date_start)} – ${formatDateShort(item.date_end)}`;
    }
    case "place": {
      return item.opening_hours || "Sprawdź godziny";
    }
    case "activity": {
      return item.schedule_summary || item.days_of_week.join(", ") || "Sprawdź harmonogram";
    }
  }
}

/** Get the secondary info line for cards */
export function getSecondaryInfo(item: DiscoveryItem): string | null {
  switch (item.content_type) {
    case "camp":
      return `${item.duration_days} dni` + (item.meals_included ? " · wyżywienie" : "");
    case "place":
      return item.is_indoor ? "Wewnątrz" : "Na zewnątrz";
    case "activity":
      return item.price_from != null ? `od ${item.price_from} zł/mies.` : null;
    default:
      return null;
  }
}

/** Fallback placeholder icon for items without images */
export function getPlaceholderIcon(item: DiscoveryItem): string {
  return getSubcategoryIcon(item);
}
