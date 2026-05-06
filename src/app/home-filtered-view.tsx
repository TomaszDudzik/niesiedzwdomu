"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { Search, ArrowRight, X, MapPin, Users, Check, ChevronDown } from "lucide-react";
import { MobileActionBar } from "@/components/ui/mobile-action-bar";
import { ContentCard } from "@/components/ui/content-card";
import { FilterSection } from "@/components/ui/filter-section";
import { ImageWithFallback } from "@/components/ui/image-with-fallback";
import type { AdminTaxonomyResponse } from "@/lib/admin-taxonomy";
import { useAdminTaxonomy } from "@/lib/use-admin-taxonomy";
import { CATEGORY_LABELS } from "@/lib/mock-data";
import { normalizeDistrictName } from "@/lib/districts";
import { getTaxonomyOptions, matchesTaxonomyFilter, mergeSelectedTaxonomyOptions } from "@/lib/taxonomy-filters";
import { cn, formatAgeRange, thumbUrl } from "@/lib/utils";
import type { Event, Place, Camp, Activity, District } from "@/types/database";
import type { ShopifyProduct } from "@/lib/shopify";
import { ShopifyProductCard } from "@/components/ui/shopify-product-card";

interface OrganizerTile {
  key: string;
  name: string;
  leadCamp: Camp;
  camps: Camp[];
}

function getOrganizerName(camp: Camp): string {
  return camp.organizer_data?.organizer_name?.trim() || camp.organizer?.trim() || "";
}

function getSessionLabel(count: number): string {
  if (count === 1) return "1 turnus";
  if (count < 5) return `${count} turnusy`;
  return `${count} turnusów`;
}

function getOrganizerDistrictSummary(camps: Camp[]): string {
  return Array.from(new Set(camps.map((c) => normalizeDistrictName(c.district)))).join(" • ");
}

function getOrganizerAgeSummary(camps: Camp[]): string {
  const mins = camps.map((c) => c.age_min).filter((a): a is number => a !== null);
  const maxes = camps.map((c) => c.age_max).filter((a): a is number => a !== null);
  const min = mins.length > 0 ? Math.min(...mins) : null;
  const max = maxes.length > 0 ? Math.max(...maxes) : null;
  return formatAgeRange(min, max);
}

const AGE_GROUPS = [
  { key: "0-3", label: "0–3 lata", icon: "👶", min: 0, max: 3 },
  { key: "4-6", label: "4–6 lat", icon: "🧒", min: 4, max: 6 },
  { key: "7-10", label: "7–10 lat", icon: "🎒", min: 7, max: 10 },
  { key: "11-14", label: "11–14 lat", icon: "🧑", min: 11, max: 14 },
  { key: "15+", label: "15+ lat", icon: "🎓", min: 15, max: 99 },
] as const;

const DISTRICT_ICONS: Partial<Record<District, string>> = {
  "Stare Miasto": "🏰",
  "Grzegórzki": "🚋",
  "Kazimierz": "🕍",
  "Podgórze": "🌉",
  "Nowa Huta": "🏭",
  "Krowodrza": "🌿",
  "Bronowice": "🌾",
  "Zwierzyniec": "🦬",
  "Dębniki": "🌊",
  "Prądnik Czerwony": "🌳",
  "Prądnik Biały": "🍃",
  "Czyżyny": "✈️",
  "Bieżanów-Prokocim": "🚋",
  "Łagiewniki-Borek Fałęcki": "⛪",
  "Swoszowice": "♨️",
  "Mistrzejowice": "🏘️",
  "Wzgórza Krzesławickie": "🌄",
  "Inne": "📍",
};

function getTaxonomyAccentClasses(optionValue: string, optionLabel: string) {
  const key = `${optionValue} ${optionLabel}`.toLowerCase();

  if (key.includes("bez kategor") || key.includes("inne") || key.includes("ogolne") || key.includes("ogolny")) return { selected: "border-stone-600 bg-stone-600 text-white" };
  if (key.includes("sala zabaw")) return { selected: "border-amber-600 bg-amber-600 text-white" };
  if (key.includes("plac zabaw")) return { selected: "border-lime-600 bg-lime-600 text-white" };
  if (key.includes("kreatyw") || key.includes("artystycz")) return { selected: "border-fuchsia-600 bg-fuchsia-600 text-white" };
  if (key.includes("kultura") || key.includes("spektakl") || key.includes("wystaw")) return { selected: "border-violet-600 bg-violet-600 text-white" };
  if (key.includes("edukac")) return { selected: "border-indigo-600 bg-indigo-600 text-white" };
  if (key.includes("nauka")) return { selected: "border-sky-600 bg-sky-600 text-white" };
  if (key.includes("relaks")) return { selected: "border-teal-600 bg-teal-600 text-white" };
  if (key.includes("przyro") || key.includes("natura")) return { selected: "border-emerald-600 bg-emerald-600 text-white" };
  if (key.includes("sport")) return { selected: "border-orange-600 bg-orange-600 text-white" };
  if (key.includes("muzyka")) return { selected: "border-fuchsia-600 bg-fuchsia-600 text-white" };
  if (key.includes("kino")) return { selected: "border-slate-600 bg-slate-600 text-white" };
  if (key.includes("warsztat")) return { selected: "border-yellow-600 bg-yellow-600 text-white" };
  if (key.includes("kulinar")) return { selected: "border-yellow-600 bg-yellow-600 text-white" };
  if (key.includes("integrac")) return { selected: "border-cyan-600 bg-cyan-600 text-white" };
  if (key.includes("przygod")) return { selected: "border-teal-600 bg-teal-600 text-white" };
  if (key.includes("jezyk")) return { selected: "border-cyan-600 bg-cyan-600 text-white" };
  if (key.includes("sensory")) return { selected: "border-indigo-600 bg-indigo-600 text-white" };

  return { selected: "border-stone-600 bg-stone-600 text-white" };
}

interface HomeFilteredViewProps {
  events: Event[];
  places: Place[];
  camps: Camp[];
  activities: Activity[];
  initialTaxonomy: AdminTaxonomyResponse;
  shopifyProducts?: ShopifyProduct[];
  shopifyStoreUrl?: string;
}

interface UnifiedFilterEntry {
  typeLevel2: string | null;
  type: string | null;
  category: string | null;
  district: District;
  ageMin: number | null;
  ageMax: number | null;
  searchText: string;
}

function getEventCategoryLvl1(event: Event) { return event.category_lvl_1 ?? event.main_category ?? null; }
function getEventCategoryLvl2(event: Event) { return event.category_lvl_2 ?? event.category; }
function getPlaceCategoryLvl1(place: Place) { return place.category_lvl_1 ?? place.main_category ?? null; }
function getPlaceCategoryLvl2(place: Place) { return place.category_lvl_2 ?? place.category ?? null; }
function getCampCategoryLvl1(camp: Camp) { return camp.category_lvl_1 ?? camp.main_category ?? null; }
function getCampCategoryLvl2(camp: Camp) { return camp.category_lvl_2 ?? camp.category ?? null; }
function getActivityCategoryLvl1(activity: Activity) { return activity.category_lvl_1 ?? activity.main_category ?? activity.activity_type ?? null; }
function getActivityCategoryLvl2(activity: Activity) { return activity.category_lvl_2 ?? activity.category ?? null; }

function matchesAgeFilter(ageMin: number | null, ageMax: number | null, ageGroup: typeof AGE_GROUPS[number] | null) {
  if (!ageGroup) return true;
  return (ageMin === null || ageMin <= ageGroup.max) && (ageMax === null || ageMax >= ageGroup.min);
}

/* ─── Sidebar filter item button ─── */
function FilterBtn({
  selected,
  onClick,
  icon,
  label,
  count,
}: {
  selected: boolean;
  onClick: () => void;
  icon?: React.ReactNode;
  label: string;
  count?: number;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex w-full items-center gap-1.5 px-1.5 py-1 rounded-md text-[10px] font-medium text-left transition-all duration-200",
        selected ? "bg-primary text-primary-foreground" : "text-foreground hover:bg-primary/15 hover:text-foreground"
      )}
    >
      {icon && <span className="shrink-0 text-[12px]">{icon}</span>}
      <span className="flex-1 truncate">{label}</span>
      {selected
        ? <Check size={10} className="shrink-0" />
        : count !== undefined && <span className="text-[9px] opacity-40 tabular-nums">{count}</span>
      }
    </button>
  );
}

/* ─── Section heading with "see all" link ─── */
function SectionHeader({ title, subtitle, href, count }: { title: string; subtitle?: string; href: string; count?: number }) {
  return (
    <div className="flex items-end justify-between mb-4">
      <div>
        <h2 className="font-heading font-black text-[22px] leading-tight text-black">
          {title}
          {count !== undefined && (
            <span className="ml-2 text-[14px] font-normal text-muted-foreground">({count})</span>
          )}
        </h2>
        {subtitle && <p className="mt-0.5 text-[13px] text-muted-foreground">{subtitle}</p>}
      </div>
      <Link
        href={href}
        className="group inline-flex items-center gap-1 text-[13px] font-semibold text-black hover:text-black/75 transition-colors shrink-0 mb-0.5"
      >
        Wszystkie
        <ArrowRight size={13} className="group-hover:translate-x-0.5 transition-transform duration-150" />
      </Link>
    </div>
  );
}


export function HomeFilteredView({ events, places, camps, activities, initialTaxonomy, shopifyProducts = [], shopifyStoreUrl = "" }: HomeFilteredViewProps) {
  const { typeLevel2Options: taxonomyTypeLevel2Options } = useAdminTaxonomy(initialTaxonomy);
  const [search, setSearch] = useState("");
  const [activeTypeLevel2, setActiveTypeLevel2] = useState<string[]>([]);
  const [activeTypes, setActiveTypes] = useState<string[]>([]);
  const [activeCategories, setActiveCategories] = useState<string[]>([]);
  const [activeDistricts, setActiveDistricts] = useState<District[]>([]);
  const [activeAgeGroups, setActiveAgeGroups] = useState<string[]>([]);
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);

  const selectedAgeGroups = useMemo(
    () => AGE_GROUPS.filter((group) => activeAgeGroups.includes(group.key)),
    [activeAgeGroups]
  );
  const hasActiveFilters = !!(search || activeTypeLevel2.length > 0 || activeTypes.length > 0 || activeCategories.length > 0 || activeDistricts.length > 0 || activeAgeGroups.length > 0);

  const unifiedFilterEntries = useMemo<UnifiedFilterEntry[]>(
    () => [
      ...events.map((event) => ({
        typeLevel2: event.type_lvl_2 ?? null,
        type: getEventCategoryLvl1(event),
        category: getEventCategoryLvl2(event),
        district: normalizeDistrictName(event.district),
        ageMin: event.age_min,
        ageMax: event.age_max,
        searchText: [event.title, event.description_short, event.street, event.city, event.district].join(" ").toLowerCase(),
      })),
      ...places.map((place) => ({
        typeLevel2: place.type_lvl_2 ?? null,
        type: getPlaceCategoryLvl1(place),
        category: getPlaceCategoryLvl2(place),
        district: normalizeDistrictName(place.district),
        ageMin: place.age_min,
        ageMax: place.age_max,
        searchText: [place.title, place.description_short, place.street, place.city, place.district].join(" ").toLowerCase(),
      })),
      ...camps.map((camp) => ({
        typeLevel2: camp.type_lvl_2 ?? null,
        type: getCampCategoryLvl1(camp),
        category: getCampCategoryLvl2(camp),
        district: normalizeDistrictName(camp.district),
        ageMin: camp.age_min,
        ageMax: camp.age_max,
        searchText: [camp.title, camp.description_short, camp.venue_name, camp.venue_address, camp.organizer].join(" ").toLowerCase(),
      })),
      ...activities.map((activity) => ({
        typeLevel2: activity.type_lvl_2 ?? null,
        type: getActivityCategoryLvl1(activity),
        category: getActivityCategoryLvl2(activity),
        district: normalizeDistrictName(activity.district),
        ageMin: activity.age_min,
        ageMax: activity.age_max,
        searchText: [activity.title, activity.description_short, activity.venue_name, activity.venue_address, activity.organizer].join(" ").toLowerCase(),
      })),
    ],
    [events, places, camps, activities]
  );

  function matchesUnifiedFilters(entry: UnifiedFilterEntry, excluded: Array<"typeLevel2" | "type" | "category" | "district" | "age"> = []) {
    if (search.trim() && !entry.searchText.includes(search.trim().toLowerCase())) return false;
    if (!excluded.includes("typeLevel2") && !matchesTaxonomyFilter(entry.typeLevel2, activeTypeLevel2)) return false;
    if (!excluded.includes("type") && !matchesTaxonomyFilter(entry.type, activeTypes)) return false;
    if (!excluded.includes("category") && !matchesTaxonomyFilter(entry.category, activeCategories)) return false;
    if (!excluded.includes("district") && activeDistricts.length > 0 && !activeDistricts.includes(entry.district)) return false;
    if (!excluded.includes("age") && selectedAgeGroups.length > 0 && !selectedAgeGroups.some((group) => matchesAgeFilter(entry.ageMin, entry.ageMax, group))) return false;
    return true;
  }

  const typeOptions = useMemo(
    () => mergeSelectedTaxonomyOptions(
      getTaxonomyOptions(unifiedFilterEntries.filter((e) => matchesUnifiedFilters(e, ["type"])), (e) => e.type),
      activeTypes,
    ),
    [unifiedFilterEntries, search, activeTypeLevel2, activeCategories, activeDistricts, activeAgeGroups, selectedAgeGroups, activeTypes]
  );

  const typeLevel2LabelMap = useMemo(
    () => Object.fromEntries(taxonomyTypeLevel2Options.map((o) => [o.id, o.name])),
    [taxonomyTypeLevel2Options]
  );

  const typeLevel2Options = useMemo(
    () => mergeSelectedTaxonomyOptions(
      getTaxonomyOptions(unifiedFilterEntries.filter((e) => matchesUnifiedFilters(e, ["typeLevel2"])), (e) => e.typeLevel2, typeLevel2LabelMap),
      activeTypeLevel2,
      typeLevel2LabelMap,
    ),
    [unifiedFilterEntries, typeLevel2LabelMap, search, activeTypes, activeCategories, activeDistricts, activeAgeGroups, selectedAgeGroups, activeTypeLevel2]
  );

  const typeLevel2OptionsByValue = useMemo(
    () => new Map(typeLevel2Options.map((o) => [o.value, o])),
    [typeLevel2Options]
  );

  const categoryOptions = useMemo(
    () => mergeSelectedTaxonomyOptions(
      getTaxonomyOptions(unifiedFilterEntries.filter((e) => matchesUnifiedFilters(e, ["category"])), (e) => e.category, CATEGORY_LABELS as Record<string, string>),
      activeCategories,
      CATEGORY_LABELS as Record<string, string>,
    ),
    [unifiedFilterEntries, search, activeTypeLevel2, activeTypes, activeDistricts, activeAgeGroups, selectedAgeGroups, activeCategories]
  );

  const typeOptionsByValue = useMemo(() => new Map(typeOptions.map((o) => [o.value, o])), [typeOptions]);
  const categoryOptionsByValue = useMemo(() => new Map(categoryOptions.map((o) => [o.value, o])), [categoryOptions]);

  const districtOptions = useMemo(() => {
    const counts = new Map<District, number>();
    unifiedFilterEntries.filter((e) => matchesUnifiedFilters(e, ["district"])).forEach((e) => {
      counts.set(e.district, (counts.get(e.district) || 0) + 1);
    });
    return Array.from(counts.entries())
      .map(([value, count]) => ({ value, label: value, icon: DISTRICT_ICONS[value] || "📍", count }))
      .sort((a, b) => a.label.localeCompare(b.label, "pl"));
  }, [unifiedFilterEntries, search, activeTypeLevel2, activeTypes, activeCategories, activeAgeGroups, selectedAgeGroups]);

  const ageOptions = useMemo(
    () => AGE_GROUPS.map((group) => ({
      ...group,
      count: unifiedFilterEntries.filter((e) => matchesUnifiedFilters(e, ["age"]) && matchesAgeFilter(e.ageMin, e.ageMax, group)).length,
    })),
    [unifiedFilterEntries, search, activeTypeLevel2, activeTypes, activeCategories, activeDistricts]
  );

  const activeFilterBadges = useMemo(() => {
    const badges: { id: string; label: string; onRemove: () => void }[] = [];
    if (search.trim()) badges.push({ id: "search", label: `„${search.trim()}"`, onRemove: () => setSearch("") });
    activeTypeLevel2.forEach((v) => {
      const o = typeLevel2OptionsByValue.get(v);
      badges.push({ id: `tl2-${v}`, label: o?.label || v, onRemove: () => setActiveTypeLevel2((p) => p.filter((x) => x !== v)) });
    });
    activeTypes.forEach((v) => {
      const o = typeOptionsByValue.get(v);
      badges.push({ id: `type-${v}`, label: o?.label || v, onRemove: () => setActiveTypes((p) => p.filter((x) => x !== v)) });
    });
    activeCategories.forEach((v) => {
      const o = categoryOptionsByValue.get(v);
      badges.push({ id: `cat-${v}`, label: o?.label || v, onRemove: () => setActiveCategories((p) => p.filter((x) => x !== v)) });
    });
    activeDistricts.forEach((v) => {
      badges.push({ id: `dist-${v}`, label: v, onRemove: () => setActiveDistricts((p) => p.filter((x) => x !== v)) });
    });
    activeAgeGroups.forEach((key) => {
      const group = AGE_GROUPS.find((g) => g.key === key);
      badges.push({ id: `age-${key}`, label: group?.label || key, onRemove: () => setActiveAgeGroups((prev) => prev.filter((x) => x !== key)) });
    });
    return badges;
  }, [search, activeTypeLevel2, activeTypes, activeCategories, activeDistricts, activeAgeGroups, typeLevel2OptionsByValue, typeOptionsByValue, categoryOptionsByValue]);

  /* ─── Filtered data ─── */
  const filteredEvents = useMemo(() => {
    let result = events;
    if (search) result = result.filter((e) => [e.title, e.description_short, e.street, e.city, e.district].join(" ").toLowerCase().includes(search.toLowerCase()));
    if (activeTypeLevel2.length > 0) result = result.filter((e) => matchesTaxonomyFilter(e.type_lvl_2 ?? null, activeTypeLevel2));
    if (activeTypes.length > 0) result = result.filter((e) => matchesTaxonomyFilter(getEventCategoryLvl1(e), activeTypes));
    if (activeCategories.length > 0) result = result.filter((e) => matchesTaxonomyFilter(getEventCategoryLvl2(e), activeCategories));
    if (activeDistricts.length > 0) result = result.filter((e) => activeDistricts.includes(normalizeDistrictName(e.district)));
    return result.filter((e) => selectedAgeGroups.length === 0 || selectedAgeGroups.some((group) => matchesAgeFilter(e.age_min, e.age_max, group))).sort((a, b) => b.likes - a.likes);
  }, [events, search, activeTypeLevel2, activeTypes, activeCategories, activeDistricts, selectedAgeGroups]);

  const filteredPlaces = useMemo(() => {
    let result = places;
    if (search) result = result.filter((p) => [p.title, p.description_short, p.street, p.city, p.district].join(" ").toLowerCase().includes(search.toLowerCase()));
    if (activeTypeLevel2.length > 0) result = result.filter((p) => matchesTaxonomyFilter(p.type_lvl_2 ?? null, activeTypeLevel2));
    if (activeTypes.length > 0) result = result.filter((p) => matchesTaxonomyFilter(getPlaceCategoryLvl1(p), activeTypes));
    if (activeCategories.length > 0) result = result.filter((p) => matchesTaxonomyFilter(getPlaceCategoryLvl2(p), activeCategories));
    if (activeDistricts.length > 0) result = result.filter((p) => activeDistricts.includes(normalizeDistrictName(p.district)));
    return result.filter((p) => selectedAgeGroups.length === 0 || selectedAgeGroups.some((group) => matchesAgeFilter(p.age_min, p.age_max, group))).sort((a, b) => b.likes - a.likes);
  }, [places, search, activeTypeLevel2, activeTypes, activeCategories, activeDistricts, selectedAgeGroups]);

  const filteredCamps = useMemo(() => {
    let result = camps;
    if (search) result = result.filter((c) => [c.title, c.description_short, c.venue_name, c.venue_address, c.organizer].join(" ").toLowerCase().includes(search.toLowerCase()));
    if (activeTypeLevel2.length > 0) result = result.filter((c) => matchesTaxonomyFilter(c.type_lvl_2 ?? null, activeTypeLevel2));
    if (activeTypes.length > 0) result = result.filter((c) => matchesTaxonomyFilter(getCampCategoryLvl1(c), activeTypes));
    if (activeCategories.length > 0) result = result.filter((c) => matchesTaxonomyFilter(getCampCategoryLvl2(c), activeCategories));
    if (activeDistricts.length > 0) result = result.filter((c) => activeDistricts.includes(normalizeDistrictName(c.district)));
    return result.filter((c) => selectedAgeGroups.length === 0 || selectedAgeGroups.some((group) => matchesAgeFilter(c.age_min, c.age_max, group))).sort((a, b) => new Date(a.date_start).getTime() - new Date(b.date_start).getTime());
  }, [camps, search, activeTypeLevel2, activeTypes, activeCategories, activeDistricts, selectedAgeGroups]);

  const filteredActivities = useMemo(() => {
    let result = activities;
    if (search) result = result.filter((a) => [a.title, a.description_short, a.venue_name, a.venue_address, a.organizer].join(" ").toLowerCase().includes(search.toLowerCase()));
    if (activeTypeLevel2.length > 0) result = result.filter((a) => matchesTaxonomyFilter(a.type_lvl_2 ?? null, activeTypeLevel2));
    if (activeTypes.length > 0) result = result.filter((a) => matchesTaxonomyFilter(getActivityCategoryLvl1(a), activeTypes));
    if (activeCategories.length > 0) result = result.filter((a) => matchesTaxonomyFilter(getActivityCategoryLvl2(a), activeCategories));
    if (activeDistricts.length > 0) result = result.filter((a) => activeDistricts.includes(normalizeDistrictName(a.district)));
    return result.filter((a) => selectedAgeGroups.length === 0 || selectedAgeGroups.some((group) => matchesAgeFilter(a.age_min, a.age_max, group))).sort((a, b) => b.likes - a.likes);
  }, [activities, search, activeTypeLevel2, activeTypes, activeCategories, activeDistricts, selectedAgeGroups]);

  function toggleTypeLevel2(v: string) { setActiveTypeLevel2((p) => p.includes(v) ? p.filter((x) => x !== v) : [...p, v]); }
  function toggleType(v: string) { setActiveTypes((p) => p.includes(v) ? p.filter((x) => x !== v) : [...p, v]); }
  function toggleCategory(v: string) { setActiveCategories((p) => p.includes(v) ? p.filter((x) => x !== v) : [...p, v]); }
  function toggleDistrict(v: District) { setActiveDistricts((p) => p.includes(v) ? p.filter((x) => x !== v) : [...p, v]); }
  function clearFilters() { setSearch(""); setActiveTypeLevel2([]); setActiveTypes([]); setActiveCategories([]); setActiveDistricts([]); setActiveAgeGroups([]); }

  const organizers = useMemo<OrganizerTile[]>(() => {
    const map = new Map<string, OrganizerTile>();
    [...filteredCamps]
      .sort((a, b) => new Date(a.date_start).getTime() - new Date(b.date_start).getTime())
      .forEach((camp) => {
        const name = getOrganizerName(camp);
        if (!name) return;
        const key = camp.organizer_id ? `id:${camp.organizer_id}` : name.toLowerCase();
        const existing = map.get(key);
        if (!existing) {
          map.set(key, { key, name, leadCamp: camp, camps: [camp] });
        } else {
          existing.camps.push(camp);
          if (!existing.leadCamp.image_url && camp.image_url) existing.leadCamp = camp;
        }
      });
    return Array.from(map.values());
  }, [filteredCamps]);

  const visiblePlaces     = hasActiveFilters ? filteredPlaces     : places.slice(0, 8);
  const visibleEvents     = hasActiveFilters ? filteredEvents     : events.slice(0, 8);
  const visibleOrganizers = hasActiveFilters ? organizers         : organizers.slice(0, 8);
  const visibleActivities = hasActiveFilters ? filteredActivities : activities.slice(0, 8);

  const showPlaces     = places.length > 0 && visiblePlaces.length > 0;
  const showEvents     = events.length > 0 && visibleEvents.length > 0;
  const showCamps      = camps.length > 0 && visibleOrganizers.length > 0;
  const showActivities = activities.length > 0 && visibleActivities.length > 0;
  const showEmpty      = hasActiveFilters && !showPlaces && !showEvents && !showCamps && !showActivities;
  const firstVisibleSection = showPlaces ? "places" : showEvents ? "events" : showCamps ? "camps" : showActivities ? "activities" : null;

  const activeFiltersBox = (
    hasActiveFilters ? (
      <div className="mb-4 rounded-xl border border-border bg-card px-2.5 py-2">
        <div className="flex flex-wrap items-center gap-1.5">
          <p className="shrink-0 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Filtry:</p>
          {activeFilterBadges.map((badge) => (
            <span
              key={badge.id}
              className="inline-flex max-w-full items-center gap-1 rounded-full bg-primary px-2 py-0.5 text-[10px] font-medium text-primary-foreground"
            >
              <span className="min-w-0 whitespace-normal break-words">{badge.label}</span>
              <button
                type="button"
                onClick={badge.onRemove}
                className="inline-flex h-3.5 w-3.5 items-center justify-center rounded-full text-muted-foreground hover:bg-border/70 hover:text-foreground transition-colors"
                aria-label={`Usuń filtr ${badge.label}`}
                title={`Usuń: ${badge.label}`}
              >
                <X size={9} />
              </button>
            </span>
          ))}
          <button
            type="button"
            onClick={clearFilters}
            className="inline-flex max-w-full items-center gap-1 rounded-full border border-border bg-background px-2 py-0.5 text-[10px] font-semibold text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
          >
            <X size={9} />
            Wyczyść
          </button>
        </div>
      </div>
    ) : null
  );

  /* ─── Sidebar JSX (shared desktop/mobile) ─── */
  const sidebarContent = (
    <div className="p-2.5 space-y-2.5">

      {/* Search */}
      <div className="flex items-center rounded-lg border border-border bg-white overflow-hidden">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Szukaj..."
          className="flex-1 h-[36px] pl-3 pr-2 text-[12px] text-foreground placeholder:text-muted-foreground/50 bg-transparent focus:outline-none"
        />
        <div className="h-[36px] w-9 flex items-center justify-center bg-[#e60100] text-white shrink-0">
          <Search size={13} />
        </div>
      </div>

      {typeLevel2Options.length > 0 && (
        <FilterSection title={<p className="text-[11px] font-semibold text-foreground uppercase tracking-wider">Grupa</p>}>
          <div className="flex flex-col gap-0.5">
            {typeLevel2Options.map((option) => (
              <FilterBtn key={option.value} selected={activeTypeLevel2.includes(option.value)} onClick={() => toggleTypeLevel2(option.value)} icon={option.icon} label={option.label} count={option.count} />
            ))}
          </div>
        </FilterSection>
      )}

      {typeOptions.length > 0 && (
        <FilterSection title={<p className="text-[11px] font-semibold text-foreground uppercase tracking-wider">Typ</p>}>
          <div className="flex flex-col gap-0.5">
            {typeOptions.map((option) => (
              <FilterBtn key={option.value} selected={activeTypes.includes(option.value)} onClick={() => toggleType(option.value)} icon={option.icon} label={option.label} count={option.count} />
            ))}
          </div>
        </FilterSection>
      )}

      <FilterSection title={<p className="text-[11px] font-semibold text-foreground uppercase tracking-wider">Wiek dziecka</p>}>
        <div className="flex flex-col gap-0.5">
          {ageOptions.filter((g) => g.count > 0 || activeAgeGroups.includes(g.key)).map((group) => (
            <FilterBtn key={group.key} selected={activeAgeGroups.includes(group.key)} onClick={() => setActiveAgeGroups((prev) => prev.includes(group.key) ? prev.filter((x) => x !== group.key) : [...prev, group.key])} icon={group.icon} label={group.label} count={group.count} />
          ))}
        </div>
      </FilterSection>

      {categoryOptions.length > 0 && (
        <FilterSection title={<p className="text-[11px] font-semibold text-foreground uppercase tracking-wider">Kategoria</p>} defaultCollapsed>
          <div className="flex flex-col gap-0.5">
            {categoryOptions.map((option) => (
              <FilterBtn key={option.value} selected={activeCategories.includes(option.value)} onClick={() => toggleCategory(option.value)} icon={option.icon} label={option.label} count={option.count} />
            ))}
          </div>
        </FilterSection>
      )}

      {districtOptions.length > 0 && (
        <FilterSection title={<p className="text-[11px] font-semibold text-foreground uppercase tracking-wider">Dzielnica</p>} defaultCollapsed>
          <div className="flex flex-col gap-0.5">
            {districtOptions.map((option) => (
              <FilterBtn key={option.value} selected={activeDistricts.includes(option.value)} onClick={() => toggleDistrict(option.value)} icon={option.icon} label={option.label} count={option.count} />
            ))}
          </div>
        </FilterSection>
      )}

      {hasActiveFilters && (
        <button
          onClick={clearFilters}
          className="inline-flex w-full items-center justify-center gap-1.5 rounded-lg border border-border px-3 py-2 text-[10px] font-semibold text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
        >
          <X size={10} />
          Wyczyść filtry
        </button>
      )}
    </div>
  );

  return (
    <div>
      {/* ──────────────────────────────────────────
          Hero Banner
      ────────────────────────────────────────── */}
      <section className="relative overflow-hidden">
        <div className="container-page relative pt-4 pb-2 md:pt-5 md:pb-3">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-start">
            <div className="flex-1 min-w-0">
              <h1
                className="font-heading font-black leading-[1.05] tracking-[-0.03em] text-black lg:whitespace-nowrap"
                style={{ fontSize: "clamp(26px, 4vw, 48px)" }}
              >
                Odkryj Kraków z dziećmi
              </h1>
              <p className="mt-2 text-[15px] text-muted-foreground">
                Sprawdzone miejsca, wydarzenia i aktywności dla rodzin w Krakowie
              </p>
            </div>

            {/* Add CTA — desktop right of heading */}
            {false && (
            <a
              href="/dodaj"
              className="group relative hidden xl:flex shrink-0 self-center overflow-hidden rounded-2xl border border-sky-300/70 bg-[linear-gradient(180deg,rgba(214,238,252,0.98),rgba(200,230,250,0.98))] px-4 py-3 shadow-[0_14px_34px_-30px_rgba(14,116,144,0.35)] transition-colors duration-200 hover:border-sky-400/70 items-center gap-3 w-[583px] mr-8"
            >
              <div className="absolute inset-y-2 left-0 w-1 rounded-r-full bg-cyan-700" />
              <div className="min-w-0 flex-1 pl-2">
                <p className="text-[13px] font-semibold text-slate-900">Prowadzisz miejsce, zajęcia lub wydarzenie?</p>
                <p className="mt-0.5 text-[11px] text-slate-600">Dodaj swoje miejsce, wydarzenie, zajęcia lub kolonie i bądź widoczny dla rodzin.</p>
              </div>
              <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-cyan-700/20 bg-white/85 px-3 py-1.5 text-[11px] font-semibold text-cyan-800 transition-all duration-200 group-hover:bg-cyan-700 group-hover:text-white">
                Dodaj wpis
                <ArrowRight size={13} className="transition-transform duration-200 group-hover:translate-x-0.5" />
              </span>
            </a>
            )}
          </div>
        </div>
      </section>


      {/* ──────────────────────────────────────────
          Main content area
      ────────────────────────────────────────── */}
      <div className="container-page pt-0 pb-8">
        <div className="rounded-[28px] bg-white px-4 py-5 sm:px-6 sm:py-6 lg:px-8 lg:py-8">

        <MobileActionBar
          filtersOpen={mobileFiltersOpen}
          hasActiveFilters={hasActiveFilters}
          onToggleFilters={() => setMobileFiltersOpen((v) => !v)}
          addHref="/dodaj"
          addLabel="Dodaj swój event"
        />

        {/* Mobile filters panel */}
        {mobileFiltersOpen && (
          <div className="lg:hidden rounded-xl p-3 mb-4 space-y-2.5">
            {/* Search */}
            <div className="flex items-center rounded-lg border border-border bg-white overflow-hidden">
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Szukaj..."
                className="flex-1 h-8 pl-3 pr-2 text-[12px] text-foreground placeholder:text-muted-foreground/50 bg-transparent focus:outline-none"
              />
              <div className="h-8 w-8 flex items-center justify-center bg-[#e60100] text-white shrink-0">
                <Search size={13} />
              </div>
            </div>

            {typeLevel2Options.length > 0 && (
              <FilterSection title={<p className="text-[11px] font-medium text-muted-foreground">Grupa</p>} defaultCollapsed={false}>
                <div className="flex flex-wrap gap-1">
                  {typeLevel2Options.map((option) => {
                    const selected = activeTypeLevel2.includes(option.value);
                    return (
                      <button key={option.value} onClick={() => toggleTypeLevel2(option.value)}
                        className={cn("inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-medium border transition-all duration-200",
                          selected ? "bg-primary text-primary-foreground border-primary" : "bg-background text-muted border-border hover:border-primary/30 hover:text-foreground")}>
                        <span>{option.icon}</span>
                        <span>{option.label}</span>
                        <span className="text-[10px] opacity-60">{option.count}</span>
                        {selected && <Check size={11} />}
                      </button>
                    );
                  })}
                </div>
              </FilterSection>
            )}
            {typeOptions.length > 0 && (
              <FilterSection title={<p className="text-[11px] font-medium text-muted-foreground">Typ</p>} defaultCollapsed={false}>
                <div className="flex flex-wrap gap-1">
                  {typeOptions.map((option) => {
                    const selected = activeTypes.includes(option.value);
                    return (
                      <button key={option.value} onClick={() => toggleType(option.value)}
                        className={cn("inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-medium border transition-all duration-200",
                          selected ? "bg-primary text-primary-foreground border-primary" : "bg-background text-muted border-border hover:border-primary/30 hover:text-foreground")}>
                        <span>{option.icon}</span>
                        <span>{option.label}</span>
                        <span className="text-[10px] opacity-60">{option.count}</span>
                        {selected && <Check size={11} />}
                      </button>
                    );
                  })}
                </div>
              </FilterSection>
            )}
            <FilterSection title={<p className="text-[11px] font-medium text-muted-foreground">Wiek dziecka</p>} defaultCollapsed={false}>
              <div className="flex flex-wrap gap-1">
                {ageOptions.filter((g) => g.count > 0 || activeAgeGroups.includes(g.key)).map((group) => {
                  const selected = activeAgeGroups.includes(group.key);
                  return (
                    <button key={group.key} onClick={() => setActiveAgeGroups((prev) => prev.includes(group.key) ? prev.filter((x) => x !== group.key) : [...prev, group.key])}
                      className={cn("inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-medium border transition-all duration-200",
                        selected ? "bg-primary text-primary-foreground border-primary" : "bg-background text-muted border-border hover:border-primary/30 hover:text-foreground")}>
                      <span>{group.icon}</span>
                      <span>{group.label}</span>
                      <span className="text-[10px] opacity-60">{group.count}</span>
                      {selected && <Check size={11} />}
                    </button>
                  );
                })}
              </div>
            </FilterSection>
            {categoryOptions.length > 0 && (
              <FilterSection title={<p className="text-[11px] font-medium text-muted-foreground">Kategoria</p>} defaultCollapsed={false}>
                <div className="flex flex-wrap gap-1">
                  {categoryOptions.map((option) => {
                    const selected = activeCategories.includes(option.value);
                    return (
                      <button key={option.value} onClick={() => toggleCategory(option.value)}
                        className={cn("inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-medium border transition-all duration-200",
                          selected ? "bg-primary text-primary-foreground border-primary" : "bg-background text-muted border-border hover:border-primary/30 hover:text-foreground")}>
                        <span>{option.icon}</span>
                        <span>{option.label}</span>
                        <span className="text-[10px] opacity-60">{option.count}</span>
                        {selected && <Check size={11} />}
                      </button>
                    );
                  })}
                </div>
              </FilterSection>
            )}
            {districtOptions.length > 0 && (
              <FilterSection title={<p className="text-[11px] font-medium text-muted-foreground">Dzielnica</p>} defaultCollapsed={false}>
                <div className="flex flex-wrap gap-1">
                  {districtOptions.map((option) => {
                    const selected = activeDistricts.includes(option.value as District);
                    return (
                      <button key={option.value} onClick={() => toggleDistrict(option.value as District)}
                        className={cn("inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-medium border transition-all duration-200",
                          selected ? "bg-primary text-primary-foreground border-primary" : "bg-background text-muted border-border hover:border-primary/30 hover:text-foreground")}>
                        <span>{option.icon}</span>
                        <span>{option.label}</span>
                        <span className="text-[10px] opacity-60">{option.count}</span>
                        {selected && <Check size={11} />}
                      </button>
                    );
                  })}
                </div>
              </FilterSection>
            )}
            <div className="flex items-center gap-2 border-t border-border/70 pt-2">
              {hasActiveFilters && (
                <button onClick={clearFilters} className="inline-flex items-center gap-1 text-[11px] font-medium text-muted-foreground hover:text-foreground transition-colors">
                  <X size={11} /> Wyczyść filtry
                </button>
              )}
              <button
                type="button"
                onClick={() => setMobileFiltersOpen(false)}
                className="ml-auto inline-flex items-center gap-1 rounded-lg border border-border px-2.5 py-1 text-[11px] font-medium text-foreground hover:bg-accent/60 transition-colors"
              >
                Schowaj filtry
                <ChevronDown size={11} className="rotate-180" />
              </button>
            </div>
          </div>
        )}

        <div className="lg:flex lg:gap-6 lg:items-start -mt-5">

          {/* ── Desktop sidebar ── */}
          <aside className="hidden lg:block w-[240px] xl:w-[260px] shrink-0 rounded-2xl overflow-hidden -mt-[10px]">
            {sidebarContent}
          </aside>

          {/* ── Main content ── */}
          <main className="flex-1 min-w-0 space-y-2">

            {/* Empty state */}
            {showEmpty && (
              <div className="flex flex-col items-center justify-center py-20 text-center">
                <span className="text-6xl mb-4">🔍</span>
                <p className="text-[16px] font-semibold text-foreground mb-1">Brak wyników</p>
                <p className="text-[14px] text-muted-foreground mb-5">Spróbuj zmienić filtry lub wpisz inne słowo kluczowe.</p>
                <button
                  onClick={clearFilters}
                  className="rounded-xl border border-border px-5 py-2.5 text-[13px] font-semibold hover:bg-accent transition-colors"
                >
                  Wyczyść filtry
                </button>
              </div>
            )}

            {/* ── Places ── */}
            {showPlaces && (
              <section>
                {firstVisibleSection === "places" && activeFiltersBox}
                <SectionHeader
                  title="Magiczne Miejsca"
                  subtitle={hasActiveFilters ? undefined : "Sale zabaw, parki, muzea i atrakcje — sprawdzone adresy dla dzieci w każdym wieku"}
                  href="/miejsca"
                  count={hasActiveFilters ? filteredPlaces.length : undefined}
                />
                <div className="grid grid-cols-1 sm:grid-cols-3 xl:grid-cols-4 gap-4">
                  {visiblePlaces.map((place) => (
                    <ContentCard key={place.id} item={place} variant="vertical" />
                  ))}
                </div>
              </section>
            )}

            {/* ── Events ── */}
            {showEvents && (
              <section className="mt-10">
                {firstVisibleSection === "events" && activeFiltersBox}
                <SectionHeader
                  title="Wyjątkowe Wydarzenia"
                  subtitle={hasActiveFilters ? undefined : "Warsztaty, spektakle, festyny i rodzinne atrakcje — aktualne wydarzenia na każdy dzień"}
                  href="/wydarzenia"
                  count={hasActiveFilters ? filteredEvents.length : undefined}
                />
                <div className="grid grid-cols-1 sm:grid-cols-3 xl:grid-cols-4 gap-4">
                  {visibleEvents.map((event) => (
                    <ContentCard key={event.id} item={event} variant="vertical" />
                  ))}
                </div>
              </section>
            )}

            {/* ── Camps ── */}
            {showCamps && (
              <section className="mt-10">
                {firstVisibleSection === "camps" && activeFiltersBox}
                <SectionHeader
                  title="Niezapomniane Kolonie"
                  subtitle={hasActiveFilters ? undefined : "Sprawdzeni organizatorzy kolonii i p\u00f3\u0142kolonii \u2014 letnie i zimowe wyjazdy w Krakowie i okolicach"}
                  href="/kolonie"
                  count={hasActiveFilters ? organizers.length : undefined}
                />
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
                  {visibleOrganizers.map((organizer) => (
                    <article
                      key={organizer.key}
                      className="rounded-xl border border-border bg-white shadow-[var(--shadow-card)] hover:shadow-[var(--shadow-card-hover)] hover:-translate-y-0.5 transition-all duration-200 overflow-hidden"
                    >
                      <Link
                        href={`/kolonie/${organizer.leadCamp.slug}`}
                        className="group flex h-[152px] overflow-hidden sm:h-auto sm:flex-col"
                      >
                        <div className="relative w-[148px] shrink-0 self-stretch overflow-hidden bg-accent sm:w-full sm:aspect-[4/3]">
                          {organizer.leadCamp.image_url ? (
                            <ImageWithFallback
                              src={thumbUrl(organizer.leadCamp.image_thumb, organizer.leadCamp.image_url) || organizer.leadCamp.image_url}
                              alt={organizer.name}
                              className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.04]"
                              loading="lazy"
                            />
                          ) : (
                            <div className="flex h-full w-full items-center justify-center text-3xl text-muted-foreground/25">⛺</div>
                          )}
                          <span className="absolute bottom-2 left-2 inline-flex items-center gap-1 rounded-full bg-white px-2 py-1 text-[10px] font-bold text-foreground shadow-sm border border-border/70">
                            {getSessionLabel(organizer.camps.length)}
                          </span>
                        </div>
                        <div className="flex min-w-0 flex-1 flex-col gap-1.5 p-3.5 sm:gap-2 sm:p-4">
                          <h3 className="font-heading font-bold text-[13px] text-foreground leading-snug group-hover:text-[#e60100] transition-colors duration-150 line-clamp-2">
                            {organizer.name}
                          </h3>
                          {organizer.leadCamp.description_short && (
                            <p className="text-[11px] text-muted-foreground leading-relaxed line-clamp-2">
                              {organizer.leadCamp.description_short}
                            </p>
                          )}
                          <div className="mt-auto space-y-1">
                            <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                              <MapPin size={9} className="text-secondary shrink-0" />
                              <span className="truncate">{getOrganizerDistrictSummary(organizer.camps)}</span>
                            </div>
                            <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                              <Users size={9} className="text-secondary shrink-0" />
                              <span className="truncate">{getOrganizerAgeSummary(organizer.camps)}</span>
                            </div>
                          </div>
                        </div>
                      </Link>
                    </article>
                  ))}
                </div>
              </section>
            )}

            {/* ── Activities ── */}
            {showActivities && (
              <section className="mt-10">
                {firstVisibleSection === "activities" && activeFiltersBox}
                <SectionHeader
                  title="Inspirujące Zajęcia"
                  subtitle={hasActiveFilters ? undefined : "Sport, muzyka, j\u0119zyki, sztuka \u2014 znajd\u017a aktywno\u015bci dopasowane do wieku i zainteresowa\u0144 dziecka"}
                  href="/zajecia"
                  count={hasActiveFilters ? filteredActivities.length : undefined}
                />
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
                  {visibleActivities.map((activity) => (
                    <ContentCard key={activity.id} item={activity} />
                  ))}
                </div>
              </section>
            )}
            {/* ── Shopify Products ── */}
            {/* hidden for now */}
          </main>
        </div>
        </div>
      </div>
    </div>
  );
}
