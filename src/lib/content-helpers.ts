import type { DiscoveryItem, ContentType } from "@/types/database";
import { CONTENT_TYPE_LABELS, CONTENT_TYPE_ICONS, CONTENT_TYPE_COLORS, CATEGORY_LABELS, CATEGORY_ICONS, CAMP_MAIN_CATEGORY_LABELS, CAMP_MAIN_CATEGORY_ICONS, PLACE_TYPE_LABELS, PLACE_TYPE_ICONS, ACTIVITY_TYPE_LABELS, ACTIVITY_TYPE_ICONS } from "./mock-data";
import { formatDateShort, formatPriceRange, formatAgeRange, toHourMinute } from "./utils";

const CATEGORY_LEVEL_1_LABELS: Record<string, string> = {
  edukacja: "Edukacja",
  integracja: "Integracja",
  kreatywnosc: "Kreatywność",
  kulinaria: "Kulinaria",
  kultura: "Kultura",
  nauka: "Nauka",
  plac_zabaw: "Plac zabaw",
  przygoda: "Przygoda",
  przyroda: "Przyroda",
  relaks: "Relaks",
  sala_zabaw: "Sala zabaw",
  sport: "Sport",
  technologia: "Technologia",
};

const CATEGORY_LEVEL_1_ICONS: Record<string, string> = {
  edukacja: "📚",
  integracja: "🤝",
  kreatywnosc: "🎨",
  kulinaria: "🍳",
  kultura: "🎭",
  nauka: "🔬",
  plac_zabaw: "🛝",
  przygoda: "🏕️",
  przyroda: "🌿",
  relaks: "🌤️",
  sala_zabaw: "🧸",
  sport: "⚽",
  technologia: "💻",
};

function normalizeCategoryLevel1Key(value: string | null | undefined) {
  if (!value) return null;
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[\s/-]+/g, "_");
}

function getCategoryLevel1Label(value: string | null | undefined) {
  const normalized = normalizeCategoryLevel1Key(value);
  if (!normalized) return null;
  return CATEGORY_LEVEL_1_LABELS[normalized] ?? value;
}

function getCategoryLevel1Icon(value: string | null | undefined) {
  const normalized = normalizeCategoryLevel1Key(value);
  if (!normalized) return null;
  return CATEGORY_LEVEL_1_ICONS[normalized] ?? null;
}

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
    case "event": {
      return getCategoryLevel1Label(item.category_lvl_1 ?? item.main_category)
        ?? CATEGORY_LABELS[(item.category_lvl_2 ?? item.category) as keyof typeof CATEGORY_LABELS]
        ?? item.category_lvl_2
        ?? item.category;
    }
    case "camp": return CAMP_MAIN_CATEGORY_LABELS[item.category_lvl_1 ?? item.main_category];
    case "place": return getPlaceCategoryLabel(item.category_lvl_1 ?? item.main_category ?? item.place_type);
    case "activity":
      return getCategoryLevel1Label(item.category_lvl_1 ?? item.main_category)
        ?? ACTIVITY_TYPE_LABELS[item.activity_type];
  }
}

/** Get the sub-category icon */
export function getSubcategoryIcon(item: DiscoveryItem): string {
  switch (item.content_type) {
    case "event": {
      return getCategoryLevel1Icon(item.category_lvl_1 ?? item.main_category)
        ?? CATEGORY_ICONS[(item.category_lvl_2 ?? item.category) as keyof typeof CATEGORY_ICONS]
        ?? "📅";
    }
    case "camp": return CAMP_MAIN_CATEGORY_ICONS[item.category_lvl_1 ?? item.main_category];
    case "place": return getPlaceCategoryIcon(item.category_lvl_1 ?? item.main_category ?? item.place_type);
    case "activity":
      return getCategoryLevel1Icon(item.category_lvl_1 ?? item.main_category)
        ?? ACTIVITY_TYPE_ICONS[item.activity_type];
  }
}

/** Get the primary location text */
export function getLocationText(item: DiscoveryItem): string {
  switch (item.content_type) {
    case "event": return [item.street, item.city].filter(Boolean).join(", ");
    case "camp": return [item.street, item.postcode, item.city].filter(Boolean).join(", ");
    case "place": return [item.street, item.city].filter(Boolean).join(", ");
    case "activity": return [item.street, item.postcode, item.city].filter(Boolean).join(", ");
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
      if (item.time_start) s += ` · ${toHourMinute(item.time_start)}`;
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
      return `${item.duration_days} dni · ${formatPriceRange(item.price_from, item.price_to, item.is_free)}`;
    case "place":
      return item.is_indoor ? "Wewnątrz" : "Na zewnątrz";
    case "activity":
      return formatPriceRange(item.price_from, item.price_to, item.is_free);
    default:
      return null;
  }
}

/** Fallback placeholder icon for items without images */
export function getPlaceholderIcon(item: DiscoveryItem): string {
  return getSubcategoryIcon(item);
}
