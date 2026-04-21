"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { Search, ArrowRight, SlidersHorizontal, X, MapPin, Users, Check, Tags, ChevronDown } from "lucide-react";
import { ContentCard } from "@/components/ui/content-card";
import { FilterSection } from "@/components/ui/filter-section";
import { ImageWithFallback } from "@/components/ui/image-with-fallback";
import { useAdminTaxonomy } from "@/lib/use-admin-taxonomy";
import { CATEGORY_LABELS, CATEGORY_ICONS } from "@/lib/mock-data";
import { normalizeDistrictName } from "@/lib/districts";
import { getTaxonomyOptions, matchesTaxonomyFilter, mergeSelectedTaxonomyOptions } from "@/lib/taxonomy-filters";
import { cn, formatDateShort, formatAgeRange, thumbUrl } from "@/lib/utils";
import type { Event, Place, Camp, Activity, District } from "@/types/database";

const DAYS_PL = ["Nd", "Pn", "Wt", "Śr", "Cz", "Pt", "So"];

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

function getDateChipLabel(camp: Camp): string {
  const start = new Date(camp.date_start + "T00:00:00");
  const end = new Date(camp.date_end + "T00:00:00");
  const startLabel = `${DAYS_PL[start.getDay()]} ${formatDateShort(camp.date_start)}`;
  if (camp.date_start === camp.date_end) return startLabel;
  return `${startLabel} – ${DAYS_PL[end.getDay()]} ${formatDateShort(camp.date_end)}`;
}

function SectionLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link href={href} className="group inline-flex items-center gap-1 text-[13px] font-medium text-primary hover:text-primary-hover transition-colors">
      {children}
      <ArrowRight size={13} className="group-hover:translate-x-0.5 transition-transform duration-200" />
    </Link>
  );
}

function HomeSectionSubmissionCta({
  title,
  description,
  buttonLabel,
  href = "/dodaj",
}: {
  title: string;
  description: string;
  buttonLabel: string;
  href?: string;
}) {
  return (
    <Link
      href={href}
      className="group mb-4 flex w-full items-center gap-3 rounded-2xl border border-sky-200/80 bg-[linear-gradient(180deg,rgba(240,249,255,0.98),rgba(236,253,255,0.98))] px-3 py-3 shadow-[0_14px_34px_-30px_rgba(14,116,144,0.35)] transition-colors duration-200 hover:border-sky-300/90"
    >
      <div className="h-10 w-1 shrink-0 rounded-full bg-cyan-700" />
      <div className="min-w-0 flex-1">
        <p className="text-[12px] font-semibold leading-4 text-slate-900 sm:text-[13px] lg:text-[14px]">{title}</p>
        <p className="mt-1 text-[10px] leading-4 text-slate-600 sm:text-[11px] lg:text-[12px]">{description}</p>
      </div>
      <span className="inline-flex shrink-0 items-center gap-1 whitespace-nowrap rounded-full border border-cyan-700/15 bg-white/85 px-2.5 py-1.5 text-[10px] font-semibold text-cyan-800 shadow-[0_10px_22px_-18px_rgba(8,145,178,0.7)] transition-all duration-200 group-hover:border-cyan-700/30 group-hover:bg-cyan-700 group-hover:text-white sm:px-3 sm:text-[11px]">
        {buttonLabel}
        <ArrowRight size={13} className="transition-transform duration-200 group-hover:translate-x-0.5" />
      </span>
    </Link>
  );
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

  if (key.includes("bez kategor") || key.includes("inne") || key.includes("ogolne") || key.includes("ogolny")) return { icon: "bg-stone-100 ring-stone-200", chip: "border-stone-200 bg-stone-50 text-stone-800", hover: "hover:border-stone-300 hover:bg-stone-100 hover:text-stone-900", selected: "border-stone-600 bg-stone-600 text-white" };
  if (key.includes("sala zabaw")) return { icon: "bg-amber-100 ring-amber-200", chip: "border-amber-200 bg-amber-50 text-amber-800", hover: "hover:border-amber-300 hover:bg-amber-100 hover:text-amber-900", selected: "border-amber-600 bg-amber-600 text-white" };
  if (key.includes("plac zabaw")) return { icon: "bg-lime-100 ring-lime-200", chip: "border-lime-200 bg-lime-50 text-lime-800", hover: "hover:border-lime-300 hover:bg-lime-100 hover:text-lime-900", selected: "border-lime-600 bg-lime-600 text-white" };
  if (key.includes("kreatyw") || key.includes("artystycz")) return { icon: "bg-fuchsia-100 ring-fuchsia-200", chip: "border-fuchsia-200 bg-fuchsia-50 text-fuchsia-800", hover: "hover:border-fuchsia-300 hover:bg-fuchsia-100 hover:text-fuchsia-900", selected: "border-fuchsia-600 bg-fuchsia-600 text-white" };
  if (key.includes("kultura") || key.includes("spektakl") || key.includes("wystaw")) return { icon: "bg-violet-100 ring-violet-200", chip: "border-violet-200 bg-violet-50 text-violet-800", hover: "hover:border-violet-300 hover:bg-violet-100 hover:text-violet-900", selected: "border-violet-600 bg-violet-600 text-white" };
  if (key.includes("edukac")) return { icon: "bg-indigo-100 ring-indigo-200", chip: "border-indigo-200 bg-indigo-50 text-indigo-800", hover: "hover:border-indigo-300 hover:bg-indigo-100 hover:text-indigo-900", selected: "border-indigo-600 bg-indigo-600 text-white" };
  if (key.includes("nauka")) return { icon: "bg-sky-100 ring-sky-200", chip: "border-sky-200 bg-sky-50 text-sky-800", hover: "hover:border-sky-300 hover:bg-sky-100 hover:text-sky-900", selected: "border-sky-600 bg-sky-600 text-white" };
  if (key.includes("relaks")) return { icon: "bg-teal-100 ring-teal-200", chip: "border-teal-200 bg-teal-50 text-teal-800", hover: "hover:border-teal-300 hover:bg-teal-100 hover:text-teal-900", selected: "border-teal-600 bg-teal-600 text-white" };
  if (key.includes("przyro") || key.includes("natura")) return { icon: "bg-emerald-100 ring-emerald-200", chip: "border-emerald-200 bg-emerald-50 text-emerald-800", hover: "hover:border-emerald-300 hover:bg-emerald-100 hover:text-emerald-900", selected: "border-emerald-600 bg-emerald-600 text-white" };
  if (key.includes("sport")) return { icon: "bg-orange-100 ring-orange-200", chip: "border-orange-200 bg-orange-50 text-orange-800", hover: "hover:border-orange-300 hover:bg-orange-100 hover:text-orange-900", selected: "border-orange-600 bg-orange-600 text-white" };
  if (key.includes("muzyka")) return { icon: "bg-fuchsia-100 ring-fuchsia-200", chip: "border-fuchsia-200 bg-fuchsia-50 text-fuchsia-800", hover: "hover:border-fuchsia-300 hover:bg-fuchsia-100 hover:text-fuchsia-900", selected: "border-fuchsia-600 bg-fuchsia-600 text-white" };
  if (key.includes("kino")) return { icon: "bg-slate-100 ring-slate-200", chip: "border-slate-200 bg-slate-50 text-slate-800", hover: "hover:border-slate-300 hover:bg-slate-100 hover:text-slate-900", selected: "border-slate-600 bg-slate-600 text-white" };
  if (key.includes("warsztat")) return { icon: "bg-yellow-100 ring-yellow-200", chip: "border-yellow-200 bg-yellow-50 text-yellow-800", hover: "hover:border-yellow-300 hover:bg-yellow-100 hover:text-yellow-900", selected: "border-yellow-600 bg-yellow-600 text-white" };
  if (key.includes("kulinar")) return { icon: "bg-yellow-100 ring-yellow-200", chip: "border-yellow-200 bg-yellow-50 text-yellow-800", hover: "hover:border-yellow-300 hover:bg-yellow-100 hover:text-yellow-900", selected: "border-yellow-600 bg-yellow-600 text-white" };
  if (key.includes("integrac")) return { icon: "bg-cyan-100 ring-cyan-200", chip: "border-cyan-200 bg-cyan-50 text-cyan-800", hover: "hover:border-cyan-300 hover:bg-cyan-100 hover:text-cyan-900", selected: "border-cyan-600 bg-cyan-600 text-white" };
  if (key.includes("przygod")) return { icon: "bg-teal-100 ring-teal-200", chip: "border-teal-200 bg-teal-50 text-teal-800", hover: "hover:border-teal-300 hover:bg-teal-100 hover:text-teal-900", selected: "border-teal-600 bg-teal-600 text-white" };
  if (key.includes("jezyk")) return { icon: "bg-cyan-100 ring-cyan-200", chip: "border-cyan-200 bg-cyan-50 text-cyan-800", hover: "hover:border-cyan-300 hover:bg-cyan-100 hover:text-cyan-900", selected: "border-cyan-600 bg-cyan-600 text-white" };
  if (key.includes("sensory")) return { icon: "bg-indigo-100 ring-indigo-200", chip: "border-indigo-200 bg-indigo-50 text-indigo-800", hover: "hover:border-indigo-300 hover:bg-indigo-100 hover:text-indigo-900", selected: "border-indigo-600 bg-indigo-600 text-white" };

  return { icon: "bg-stone-100 ring-stone-200", chip: "border-stone-200 bg-stone-50 text-stone-800", hover: "hover:border-stone-300 hover:bg-stone-100 hover:text-stone-900", selected: "border-stone-600 bg-stone-600 text-white" };
}

function getCategoryIconClasses(optionValue: string, optionLabel: string, selected: boolean) {
  if (selected) {
    return "bg-white/20 ring-white/15";
  }

  return getTaxonomyAccentClasses(optionValue, optionLabel).icon;
}

interface HomeFilteredViewProps {
  events: Event[];
  places: Place[];
  camps: Camp[];
  activities: Activity[];
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

function getEventCategoryLvl1(event: Event) {
  return event.category_lvl_1 ?? event.main_category ?? null;
}

function getEventCategoryLvl2(event: Event) {
  return event.category_lvl_2 ?? event.category;
}

function getEventCategoryLvl3(event: Event) {
  return event.category_lvl_3 ?? event.subcategory ?? null;
}

function getPlaceCategoryLvl1(place: Place) {
  return place.category_lvl_1 ?? place.main_category ?? null;
}

function getPlaceCategoryLvl2(place: Place) {
  return place.category_lvl_2 ?? place.category ?? null;
}

function getCampCategoryLvl1(camp: Camp) {
  return camp.category_lvl_1 ?? camp.main_category ?? null;
}

function getCampCategoryLvl2(camp: Camp) {
  return camp.category_lvl_2 ?? camp.category ?? null;
}

function getActivityCategoryLvl1(activity: Activity) {
  return activity.category_lvl_1 ?? activity.main_category ?? activity.activity_type ?? null;
}

function getActivityCategoryLvl2(activity: Activity) {
  return activity.category_lvl_2 ?? activity.category ?? null;
}

function matchesAgeFilter(ageMin: number | null, ageMax: number | null, ageGroup: typeof AGE_GROUPS[number] | null) {
  if (!ageGroup) {
    return true;
  }

  return (ageMin === null || ageMin <= ageGroup.max) && (ageMax === null || ageMax >= ageGroup.min);
}


export function HomeFilteredView({ events, places, camps, activities }: HomeFilteredViewProps) {
  const { typeLevel2Options: taxonomyTypeLevel2Options } = useAdminTaxonomy();
  const [search, setSearch] = useState("");
  const [activeTypeLevel2, setActiveTypeLevel2] = useState<string[]>([]);
  const [activeTypes, setActiveTypes] = useState<string[]>([]);
  const [activeCategories, setActiveCategories] = useState<string[]>([]);
  const [activeDistricts, setActiveDistricts] = useState<District[]>([]);
  const [activeAgeGroup, setActiveAgeGroup] = useState<string | null>(null);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [filtersOpenDesktop, setFiltersOpenDesktop] = useState(false);

  const ageGroup = AGE_GROUPS.find((g) => g.key === activeAgeGroup) ?? null;
  const hasActiveFilters = !!(search || activeTypeLevel2.length > 0 || activeTypes.length > 0 || activeCategories.length > 0 || activeDistricts.length > 0 || activeAgeGroup !== null);

  const unifiedFilterEntries = useMemo<UnifiedFilterEntry[]>(
    () => [
      ...events.map((event) => ({
        typeLevel2: event.type_lvl_2_id ?? null,
        type: getEventCategoryLvl1(event),
        category: getEventCategoryLvl2(event),
        district: normalizeDistrictName(event.district),
        ageMin: event.age_min,
        ageMax: event.age_max,
        searchText: [event.title, event.description_short, event.street, event.city, event.district].join(" ").toLowerCase(),
      })),
      ...places.map((place) => ({
        typeLevel2: place.type_lvl_2_id ?? null,
        type: getPlaceCategoryLvl1(place),
        category: getPlaceCategoryLvl2(place),
        district: normalizeDistrictName(place.district),
        ageMin: place.age_min,
        ageMax: place.age_max,
        searchText: [place.title, place.description_short, place.street, place.city, place.district].join(" ").toLowerCase(),
      })),
      ...camps.map((camp) => ({
        typeLevel2: camp.type_lvl_2_id ?? null,
        type: getCampCategoryLvl1(camp),
        category: getCampCategoryLvl2(camp),
        district: normalizeDistrictName(camp.district),
        ageMin: camp.age_min,
        ageMax: camp.age_max,
        searchText: [camp.title, camp.description_short, camp.venue_name, camp.venue_address, camp.organizer].join(" ").toLowerCase(),
      })),
      ...activities.map((activity) => ({
        typeLevel2: activity.type_lvl_2_id ?? null,
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
    if (search.trim() && !entry.searchText.includes(search.trim().toLowerCase())) {
      return false;
    }
    if (!excluded.includes("typeLevel2") && !matchesTaxonomyFilter(entry.typeLevel2, activeTypeLevel2)) {
      return false;
    }
    if (!excluded.includes("type") && !matchesTaxonomyFilter(entry.type, activeTypes)) {
      return false;
    }
    if (!excluded.includes("category") && !matchesTaxonomyFilter(entry.category, activeCategories)) {
      return false;
    }
    if (!excluded.includes("district") && activeDistricts.length > 0 && !activeDistricts.includes(entry.district)) {
      return false;
    }
    if (!excluded.includes("age") && !matchesAgeFilter(entry.ageMin, entry.ageMax, ageGroup)) {
      return false;
    }
    return true;
  }

  const typeOptions = useMemo(
    () => mergeSelectedTaxonomyOptions(
      getTaxonomyOptions(unifiedFilterEntries.filter((entry) => matchesUnifiedFilters(entry, ["type"])), (entry) => entry.type),
      activeTypes,
    ),
    [unifiedFilterEntries, search, activeTypeLevel2, activeCategories, activeDistricts, ageGroup, activeTypes]
  );

  const typeLevel2LabelMap = useMemo(
    () => Object.fromEntries(taxonomyTypeLevel2Options.map((option) => [option.id, option.name])),
    [taxonomyTypeLevel2Options]
  );

  const typeLevel2Options = useMemo(
    () => mergeSelectedTaxonomyOptions(
      getTaxonomyOptions(unifiedFilterEntries.filter((entry) => matchesUnifiedFilters(entry, ["typeLevel2"])), (entry) => entry.typeLevel2, typeLevel2LabelMap),
      activeTypeLevel2,
      typeLevel2LabelMap,
    ),
    [unifiedFilterEntries, typeLevel2LabelMap, search, activeTypes, activeCategories, activeDistricts, ageGroup, activeTypeLevel2]
  );

  const typeLevel2OptionsByValue = useMemo(
    () => new Map(typeLevel2Options.map((option) => [option.value, option])),
    [typeLevel2Options]
  );

  const categoryOptions = useMemo(
    () => mergeSelectedTaxonomyOptions(
      getTaxonomyOptions(unifiedFilterEntries.filter((entry) => matchesUnifiedFilters(entry, ["category"])), (entry) => entry.category, CATEGORY_LABELS as Record<string, string>),
      activeCategories,
      CATEGORY_LABELS as Record<string, string>,
    ),
    [unifiedFilterEntries, search, activeTypeLevel2, activeTypes, activeDistricts, ageGroup, activeCategories]
  );

  const typeOptionsByValue = useMemo(
    () => new Map(typeOptions.map((option) => [option.value, option])),
    [typeOptions]
  );

  const categoryOptionsByValue = useMemo(
    () => new Map(categoryOptions.map((option) => [option.value, option])),
    [categoryOptions]
  );

  const districtOptions = useMemo(() => {
    const counts = new Map<District, number>();

    unifiedFilterEntries.filter((entry) => matchesUnifiedFilters(entry, ["district"])).forEach((entry) => {
      counts.set(entry.district, (counts.get(entry.district) || 0) + 1);
    });

    return Array.from(counts.entries())
      .map(([value, count]) => ({ value, label: value, icon: DISTRICT_ICONS[value] || "📍", count }))
      .sort((left, right) => left.label.localeCompare(right.label, "pl"));
  }, [unifiedFilterEntries, search, activeTypeLevel2, activeTypes, activeCategories, ageGroup]);

  const ageOptions = useMemo(
    () => AGE_GROUPS.map((group) => ({
      ...group,
      count: unifiedFilterEntries.filter((entry) => matchesUnifiedFilters(entry, ["age"]) && matchesAgeFilter(entry.ageMin, entry.ageMax, group)).length,
    })),
    [unifiedFilterEntries, search, activeTypeLevel2, activeTypes, activeCategories, activeDistricts]
  );

  const activeFilterBadges = useMemo(() => {
    const badges: { id: string; label: string; onRemove: () => void }[] = [];

    if (search.trim()) {
      badges.push({ id: "search", label: `Szukaj: ${search.trim()}`, onRemove: () => setSearch("") });
    }

    activeTypeLevel2.forEach((typeLevel2) => {
      const option = typeLevel2OptionsByValue.get(typeLevel2);
      badges.push({
        id: `type-level-2-${typeLevel2}`,
        label: `Grupa: ${option?.label || typeLevel2}`,
        onRemove: () => setActiveTypeLevel2((prev) => prev.filter((item) => item !== typeLevel2)),
      });
    });

    activeTypes.forEach((type) => {
      const option = typeOptionsByValue.get(type);
      badges.push({
        id: `type-${type}`,
        label: `Typ: ${option?.label || type}`,
        onRemove: () => setActiveTypes((prev) => prev.filter((item) => item !== type)),
      });
    });

    activeCategories.forEach((category) => {
      const option = categoryOptionsByValue.get(category);
      badges.push({
        id: `category-${category}`,
        label: `Kategoria: ${option?.label || category}`,
        onRemove: () => setActiveCategories((prev) => prev.filter((item) => item !== category)),
      });
    });

    activeDistricts.forEach((district) => {
      badges.push({
        id: `district-${district}`,
        label: `Dzielnica: ${district}`,
        onRemove: () => setActiveDistricts((prev) => prev.filter((item) => item !== district)),
      });
    });

    if (activeAgeGroup) {
      const group = AGE_GROUPS.find((item) => item.key === activeAgeGroup);
      badges.push({
        id: `age-${activeAgeGroup}`,
        label: `Wiek: ${group?.label || activeAgeGroup}`,
        onRemove: () => setActiveAgeGroup(null),
      });
    }

    return badges;
  }, [search, activeTypeLevel2, activeTypes, activeCategories, activeDistricts, activeAgeGroup, typeLevel2OptionsByValue, typeOptionsByValue, categoryOptionsByValue]);

  const filteredEvents = useMemo(() => {
    let result = events;
    if (search) {
      const q = search.toLowerCase();
      result = result.filter((e) =>
        [e.title, e.description_short, e.street, e.city, e.district].join(" ").toLowerCase().includes(q)
      );
    }
    if (activeTypeLevel2.length > 0) {
      result = result.filter((event) => matchesTaxonomyFilter(event.type_lvl_2_id ?? null, activeTypeLevel2));
    }
    if (activeTypes.length > 0) {
      result = result.filter((event) => matchesTaxonomyFilter(getEventCategoryLvl1(event), activeTypes));
    }
    if (activeCategories.length > 0) {
      result = result.filter((event) => matchesTaxonomyFilter(getEventCategoryLvl2(event), activeCategories));
    }
    if (activeDistricts.length > 0) {
      result = result.filter((event) => activeDistricts.includes(normalizeDistrictName(event.district)));
    }
    result = result.filter((event) => matchesAgeFilter(event.age_min, event.age_max, ageGroup));
    return [...result].sort((a, b) => b.likes - a.likes);
  }, [events, search, activeTypeLevel2, activeTypes, activeCategories, activeDistricts, ageGroup]);

  const filteredPlaces = useMemo(() => {
    let result = places;
    if (search) {
      const q = search.toLowerCase();
      result = result.filter((p) =>
        [p.title, p.description_short, p.street, p.city, p.district].join(" ").toLowerCase().includes(q)
      );
    }
    if (activeTypeLevel2.length > 0) {
      result = result.filter((place) => matchesTaxonomyFilter(place.type_lvl_2_id ?? null, activeTypeLevel2));
    }
    if (activeTypes.length > 0) {
      result = result.filter((place) => matchesTaxonomyFilter(getPlaceCategoryLvl1(place), activeTypes));
    }
    if (activeCategories.length > 0) {
      result = result.filter((place) => matchesTaxonomyFilter(getPlaceCategoryLvl2(place), activeCategories));
    }
    if (activeDistricts.length > 0) {
      result = result.filter((place) => activeDistricts.includes(normalizeDistrictName(place.district)));
    }
    result = result.filter((place) => matchesAgeFilter(place.age_min, place.age_max, ageGroup));
    return [...result].sort((a, b) => b.likes - a.likes);
  }, [places, search, activeTypeLevel2, activeTypes, activeCategories, activeDistricts, ageGroup]);

  const filteredCamps = useMemo(() => {
    let result = camps;
    if (search) {
      const q = search.toLowerCase();
      result = result.filter((camp) =>
        [camp.title, camp.description_short, camp.venue_name, camp.venue_address, camp.organizer]
          .join(" ")
          .toLowerCase()
          .includes(q)
      );
    }
    if (activeTypeLevel2.length > 0) {
      result = result.filter((camp) => matchesTaxonomyFilter(camp.type_lvl_2_id ?? null, activeTypeLevel2));
    }
    if (activeTypes.length > 0) {
      result = result.filter((camp) => matchesTaxonomyFilter(getCampCategoryLvl1(camp), activeTypes));
    }
    if (activeCategories.length > 0) {
      result = result.filter((camp) => matchesTaxonomyFilter(getCampCategoryLvl2(camp), activeCategories));
    }
    if (activeDistricts.length > 0) {
      result = result.filter((camp) => activeDistricts.includes(normalizeDistrictName(camp.district)));
    }
    result = result.filter((camp) => matchesAgeFilter(camp.age_min, camp.age_max, ageGroup));
    return [...result].sort((a, b) => new Date(a.date_start).getTime() - new Date(b.date_start).getTime());
  }, [camps, search, activeTypeLevel2, activeTypes, activeCategories, activeDistricts, ageGroup]);

  const filteredActivities = useMemo(() => {
    let result = activities;
    if (search) {
      const q = search.toLowerCase();
      result = result.filter((activity) =>
        [activity.title, activity.description_short, activity.venue_name, activity.venue_address, activity.organizer]
          .join(" ")
          .toLowerCase()
          .includes(q)
      );
    }
    if (activeTypeLevel2.length > 0) {
      result = result.filter((activity) => matchesTaxonomyFilter(activity.type_lvl_2_id ?? null, activeTypeLevel2));
    }
    if (activeTypes.length > 0) {
      result = result.filter((activity) => matchesTaxonomyFilter(getActivityCategoryLvl1(activity), activeTypes));
    }
    if (activeCategories.length > 0) {
      result = result.filter((activity) => matchesTaxonomyFilter(getActivityCategoryLvl2(activity), activeCategories));
    }
    if (activeDistricts.length > 0) {
      result = result.filter((activity) => activeDistricts.includes(normalizeDistrictName(activity.district)));
    }
    result = result.filter((activity) => matchesAgeFilter(activity.age_min, activity.age_max, ageGroup));
    return [...result].sort((a, b) => b.likes - a.likes);
  }, [activities, search, activeTypeLevel2, activeTypes, activeCategories, activeDistricts, ageGroup]);

  function toggleTypeLevel2(nextTypeLevel2: string) {
    setActiveTypeLevel2((prev) =>
      prev.includes(nextTypeLevel2) ? prev.filter((item) => item !== nextTypeLevel2) : [...prev, nextTypeLevel2]
    );
  }

  function toggleType(nextType: string) {
    setActiveTypes((prev) =>
      prev.includes(nextType) ? prev.filter((item) => item !== nextType) : [...prev, nextType]
    );
  }

  function toggleCategory(nextCategory: string) {
    setActiveCategories((prev) =>
      prev.includes(nextCategory) ? prev.filter((item) => item !== nextCategory) : [...prev, nextCategory]
    );
  }

  function toggleDistrict(nextDistrict: District) {
    setActiveDistricts((prev) =>
      prev.includes(nextDistrict) ? prev.filter((item) => item !== nextDistrict) : [...prev, nextDistrict]
    );
  }

  function clearFilters() {
    setSearch("");
    setActiveTypeLevel2([]);
    setActiveTypes([]);
    setActiveCategories([]);
    setActiveDistricts([]);
    setActiveAgeGroup(null);
  }

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
          if (!existing.leadCamp.image_url && camp.image_url) {
            existing.leadCamp = camp;
          }
        }
      });
    return Array.from(map.values());
  }, [filteredCamps]);

  // Data from data.ts is already shuffled server-side — no client-side shuffle to
  // avoid server/client Math.random() mismatch that causes hydration errors.
  const visiblePlaces = hasActiveFilters ? filteredPlaces : places.slice(0, 8);
  const visibleEvents = hasActiveFilters ? filteredEvents : events.slice(0, 8);
  const visibleOrganizers = hasActiveFilters ? organizers : organizers.slice(0, 8);
  const visibleActivities = hasActiveFilters ? filteredActivities : activities.slice(0, 8);

  const showPlaces = places.length > 0 && visiblePlaces.length > 0;
  const showEvents = events.length > 0 && visibleEvents.length > 0;
  const showCamps = camps.length > 0 && visibleOrganizers.length > 0;
  const showActivities = activities.length > 0 && visibleActivities.length > 0;
  const showEmpty = hasActiveFilters && !showPlaces && !showEvents && !showCamps && !showActivities;

  return (
    <div>
      {/* ——— Hero ——— */}
      <section className="relative overflow-hidden">
        <div className="container-page relative pb-12 pt-9 text-center">
          {/* Headline */}
          <h1 className="mt-2 font-heading font-black leading-[1.05] tracking-[-0.04em] text-foreground"
              style={{ fontSize: "clamp(40px, 6vw, 72px)" }}>
            Odkryj Kraków
            <br />
            <span className="text-gradient-hero">razem z dziećmi</span>
          </h1>

          {/* Tagline */}
          <p className="mx-auto mt-5 max-w-3xl text-[15px] leading-relaxed text-muted">
            Sprawdzone miejsca, wydarzenia i zajęcia — wszystko w jednym miejscu.
          </p>

          {/* Search bar */}
          <div className="relative mx-auto mt-8 max-w-xl rounded-2xl shadow-[var(--shadow-card-hover)]">
            <Search size={15} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground/40" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Szukaj miejsc, wydarzeń, aktywności..."
              className="w-full rounded-2xl border border-border bg-card py-3.5 pl-11 pr-28 text-[14px] text-foreground placeholder:text-muted-foreground transition-all focus:border-primary/40 focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
            <button
              type="button"
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded-xl bg-primary px-4 py-2 text-[13px] font-semibold text-white transition-colors hover:bg-primary-hover"
            >
              Szukaj
            </button>
          </div>

          {/* Age chips */}
          <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
            <span className="text-[12px] font-medium text-muted-foreground">Wiek:</span>
            {AGE_GROUPS.map((group) => (
              <button
                key={group.key}
                type="button"
                onClick={() => setActiveAgeGroup(activeAgeGroup === group.key ? null : group.key)}
                className={cn(
                  "rounded-full border px-3 py-1 text-[12px] font-medium transition-all",
                  activeAgeGroup === group.key
                    ? "border-primary bg-primary text-white"
                    : "border-border bg-card text-foreground hover:border-primary/40 hover:shadow-sm"
                )}
              >
                {group.label}
              </button>
            ))}
          </div>

          {typeOptions.length > 0 && (
            <div className="mt-3 flex flex-wrap items-center justify-center gap-2">
              <span className="text-[12px] font-medium text-muted-foreground">Typ:</span>
              {typeOptions.map((option) => {
                const selected = activeTypes.includes(option.value);
                const accent = getTaxonomyAccentClasses(option.value, option.label);
                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => toggleType(option.value)}
                    className={cn(
                      "inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-[12px] font-medium transition-all",
                      selected
                        ? accent.selected
                        : "border-border bg-card text-foreground hover:border-primary/40 hover:shadow-sm"
                    )}
                  >
                    <span className={cn("inline-flex h-5 w-5 items-center justify-center rounded-full ring-1", selected ? "bg-white/20 ring-white/15" : "bg-background ring-border")}>{option.icon}</span>
                    <span>{option.label}</span>
                  </button>
                );
              })}
            </div>
          )}

          {/* Stats — floating cards */}
          <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
            {[
              { href: "/miejsca", icon: "📍", value: `${places.length}+`, label: "Miejsc", color: "var(--color-primary)" },
              { href: "/wydarzenia", icon: "🎉", value: `${events.length}+`, label: "Wydarzeń", color: "var(--color-secondary)" },
              { href: "/kolonie", icon: "⛺", value: `${camps.length}+`, label: "Kolonii", color: "var(--color-purple)" },
              { href: "/zajecia", icon: "🎨", value: `${activities.length}+`, label: "Zajęć", color: "var(--color-pink)" },
            ].map((stat) => (
              <Link
                key={stat.label}
                href={stat.href}
                className="flex items-center gap-3 rounded-2xl border-2 border-border bg-card px-6 py-4 shadow-[var(--shadow-soft)] hover:-translate-y-1 hover:border-primary/30 transition-transform duration-200"
              >
                <span className="text-[24px]">{stat.icon}</span>
                <div className="text-left">
                  <p className="font-heading font-black text-[24px] leading-none" style={{ color: stat.color }}>{stat.value}</p>
                  <p className="mt-0.5 text-[11px] font-semibold text-muted-foreground">{stat.label}</p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <div className="container-page pt-5 pb-10">
        {/* Mobile filter bar */}
        <div className="lg:hidden rounded-xl border border-border bg-card p-3 mb-4 flex items-center gap-2">
          <button
            onClick={() => setFiltersOpen(!filtersOpen)}
            className={cn("inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-[12px] font-semibold border-2 transition-all duration-200",
              filtersOpen || hasActiveFilters ? "bg-primary text-primary-foreground border-primary" : "bg-primary/5 text-foreground border-primary/20 hover:bg-primary/10")}
          >
            <SlidersHorizontal size={13} />
            Filtry
            {hasActiveFilters && <span className="w-1.5 h-1.5 rounded-full bg-primary-foreground" />}
          </button>
        </div>

      {/* Mobile filters dropdown */}
      {filtersOpen && (
        <div className="lg:hidden rounded-xl border border-border bg-card p-3 mb-4 space-y-2.5">
          <FilterSection title={<span className="text-[11px] font-medium text-muted-foreground">Grupa</span>} defaultCollapsed={false}>
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

          <FilterSection title={<span className="text-[11px] font-medium text-muted-foreground">Typ</span>} defaultCollapsed={false}>
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

          <FilterSection title={<span className="text-[11px] font-medium text-muted-foreground">Wiek dziecka</span>} defaultCollapsed={false}>
            <div className="flex flex-wrap gap-1">
              {ageOptions.filter((group) => group.count > 0 || activeAgeGroup === group.key).map((group) => (
                <button key={group.key} onClick={() => setActiveAgeGroup(activeAgeGroup === group.key ? null : group.key)}
                  className={cn("inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-medium border transition-all duration-200",
                    activeAgeGroup === group.key ? "bg-primary text-primary-foreground border-primary" : "bg-background text-muted border-border hover:border-primary/30 hover:text-foreground")}>
                  <span>{group.icon}</span>
                  <span>{group.label}</span>
                  <span className="text-[10px] opacity-60">{group.count}</span>
                </button>
              ))}
            </div>
          </FilterSection>

          <FilterSection title={<span className="text-[11px] font-medium text-muted-foreground">Kategoria</span>} defaultCollapsed={false}>
            <div className="flex flex-wrap gap-1">
              {categoryOptions.map((option) => {
                const selected = activeCategories.includes(option.value);
                return (
                  <button key={option.value} onClick={() => toggleCategory(option.value)}
                    className={cn("inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-medium border transition-all duration-200",
                      selected ? "bg-primary text-primary-foreground border-primary" : "bg-background text-muted border-border hover:border-primary/30 hover:text-foreground")}>
                    <span className={cn("inline-flex h-4 w-4 items-center justify-center rounded-full ring-1", getCategoryIconClasses(option.value, option.label, selected))}>{option.icon}</span>
                    <span>{option.label}</span>
                    <span className="text-[10px] opacity-60">{option.count}</span>
                    {selected && <Check size={11} />}
                  </button>
                );
              })}
            </div>
          </FilterSection>

          <FilterSection title={<span className="text-[11px] font-medium text-muted-foreground">Dzielnica</span>} defaultCollapsed={false}>
            <div className="flex flex-wrap gap-1">
              {districtOptions.map((option) => {
                const selected = activeDistricts.includes(option.value);
                return (
                  <button key={option.value} onClick={() => toggleDistrict(option.value)}
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
          <div className="flex items-center gap-2 border-t border-border/70 pt-2">
            {hasActiveFilters && (
              <button onClick={clearFilters} className="inline-flex items-center gap-1 text-[11px] font-medium text-muted-foreground hover:text-foreground transition-colors">
                <X size={11} /> Wyczyść filtry
              </button>
            )}
            <button
              type="button"
              onClick={() => setFiltersOpen(false)}
              className="ml-auto inline-flex items-center gap-1 rounded-lg border border-border px-2.5 py-1 text-[11px] font-medium text-foreground hover:bg-accent/60 transition-colors"
            >
              Schowaj filtry
              <ChevronDown size={11} className="rotate-180" />
            </button>
          </div>
        </div>
      )}

      {/* Desktop layout */}
      <div className="lg:flex lg:gap-6 lg:items-start">

        {/* Sidebar — desktop only */}
        <aside className="hidden lg:block w-52 shrink-0">
          <div className="rounded-xl border border-border bg-card p-2.5 space-y-2.5">
            <div className="relative">
              <Search size={11} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground/50" />
              <input type="text" placeholder="Szukaj..." value={search} onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-7 pr-2 py-1 rounded-lg border border-border bg-background text-[10px] text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/40 transition-all duration-200" />
            </div>

            <div className="border-t border-border" />

            <FilterSection title={<span className="text-[9px] font-semibold text-muted-foreground uppercase tracking-wider">Grupa</span>} defaultCollapsed={!filtersOpenDesktop}>
              <div className="flex flex-col gap-0.5">
                {typeLevel2Options.map((option) => {
                  const selected = activeTypeLevel2.includes(option.value);
                  return (
                    <button key={option.value} onClick={() => toggleTypeLevel2(option.value)}
                      className={cn("flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] font-medium text-left transition-all duration-200",
                        selected ? "bg-primary text-primary-foreground" : "text-foreground hover:bg-accent")}>
                      <span>{option.icon}</span>
                      <span className="flex-1">{option.label}</span>
                      {selected && <Check size={10} />}
                      <span className="text-[8px] opacity-40">{option.count}</span>
                    </button>
                  );
                })}
              </div>
            </FilterSection>

            <FilterSection title={<span className="text-[9px] font-semibold text-muted-foreground uppercase tracking-wider">Typ</span>} defaultCollapsed={!filtersOpenDesktop}>
              <div className="flex flex-col gap-0.5">
                {typeOptions.map((option) => {
                  const selected = activeTypes.includes(option.value);
                  return (
                    <button key={option.value} onClick={() => toggleType(option.value)}
                      className={cn("flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] font-medium text-left transition-all duration-200",
                        selected ? "bg-primary text-primary-foreground" : "text-foreground hover:bg-accent")}>
                      <span>{option.icon}</span>
                      <span className="flex-1">{option.label}</span>
                      {selected && <Check size={10} />}
                      <span className="text-[8px] opacity-40">{option.count}</span>
                    </button>
                  );
                })}
              </div>
            </FilterSection>

            <FilterSection title={<span className="text-[9px] font-semibold text-muted-foreground uppercase tracking-wider">Wiek</span>} defaultCollapsed={!filtersOpenDesktop}>
              <div className="flex flex-col gap-0.5">
                {ageOptions.filter((group) => group.count > 0 || activeAgeGroup === group.key).map((group) => (
                  <button key={group.key} onClick={() => setActiveAgeGroup(activeAgeGroup === group.key ? null : group.key)}
                    className={cn("flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] font-medium text-left transition-all duration-200",
                      activeAgeGroup === group.key ? "bg-primary text-primary-foreground" : "text-foreground hover:bg-accent")}>
                    <span>{group.icon}</span>
                    <span>{group.label}</span>
                    <span className="ml-auto text-[8px] opacity-40">{group.count}</span>
                  </button>
                ))}
              </div>
            </FilterSection>

            <FilterSection title={<span className="text-[9px] font-semibold text-muted-foreground uppercase tracking-wider">Kategoria</span>}>
              <div className="flex flex-col gap-0.5">
                {categoryOptions.map((option) => {
                  const selected = activeCategories.includes(option.value);
                  return (
                    <button key={option.value} onClick={() => toggleCategory(option.value)}
                      className={cn("flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] font-medium text-left transition-all duration-200",
                        selected ? "bg-primary text-primary-foreground" : "text-foreground hover:bg-accent")}>
                      <span className={cn("inline-flex h-4 w-4 items-center justify-center rounded-full ring-1", getCategoryIconClasses(option.value, option.label, selected))}>{option.icon}</span>
                      <span className="flex-1">{option.label}</span>
                      {selected && <Check size={10} />}
                      <span className="text-[8px] opacity-40">{option.count}</span>
                    </button>
                  );
                })}
              </div>
            </FilterSection>

            <FilterSection title={<span className="text-[9px] font-semibold text-muted-foreground uppercase tracking-wider">Dzielnica</span>}>
              <div className="flex flex-col gap-0.5">
                {districtOptions.map((option) => {
                  const selected = activeDistricts.includes(option.value);
                  return (
                    <button key={option.value} onClick={() => toggleDistrict(option.value)}
                      className={cn("flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] font-medium text-left transition-all duration-200",
                        selected ? "bg-primary text-primary-foreground" : "text-foreground hover:bg-accent")}>
                      <span>{option.icon}</span>
                      <span className="flex-1">{option.label}</span>
                      {selected && <Check size={10} />}
                      <span className="text-[8px] opacity-40">{option.count}</span>
                    </button>
                  );
                })}
              </div>
            </FilterSection>

            {hasActiveFilters && (
              <button onClick={clearFilters} className="inline-flex items-center gap-1 text-[10px] font-medium text-muted-foreground hover:text-foreground transition-colors pt-2 border-t border-border w-full">
                <X size={10} />Wyczyść filtry
              </button>
            )}
          </div>
        </aside>

        {/* Main content */}
        <div className="flex-1 min-w-0 space-y-5">

          <div className="rounded-xl border border-border bg-card px-2.5 py-2">
            <div className="flex flex-wrap items-center gap-1.5">
              <p className="shrink-0 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Filtry:</p>
              {activeFilterBadges.length > 0 ? (
                <>
                  {activeFilterBadges.map((badge) => (
                    <span
                      key={badge.id}
                      className="inline-flex max-w-full items-center gap-1 rounded-full border border-border bg-accent/60 px-2 py-0.5 text-[10px] font-medium text-foreground"
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
                </>
              ) : (
                <p className="text-[11px] text-muted-foreground">Brak aktywnych filtrów.</p>
              )}
            </div>
          </div>

          {/* Empty state */}
          {showEmpty && (
            <div className="text-center py-16">
              <Search size={32} className="mx-auto text-muted-foreground/20 mb-3" />
              <p className="text-[14px] text-muted mb-3">Brak wyników pasujących do filtrów.</p>
              <button onClick={clearFilters} className="text-[12px] font-medium text-primary hover:text-primary-hover transition-colors">
                Wyczyść filtry
              </button>
            </div>
          )}

          {/* Places section */}
          {showPlaces && (
            <section>
              <div className="flex items-center justify-between mb-1">
                <div>
                  <h2 className="font-heading font-black text-[22px] leading-tight text-foreground">
                    Ciekawe miejsca
                    {hasActiveFilters && <span className="ml-2 text-[14px] font-normal text-muted-foreground">({filteredPlaces.length})</span>}
                  </h2>
                  {!hasActiveFilters && (
                    <p className="text-[13px] text-muted-foreground mt-0.5">Sprawdzone adresy dla całej rodziny w Krakowie</p>
                  )}
                </div>
                <SectionLink href="/miejsca">Wszystkie miejsca</SectionLink>
              </div>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mt-4">
                {visiblePlaces.map((place) => (
                  <ContentCard key={place.id} item={place} variant="vertical" />
                ))}
              </div>
              <div className="mt-4">
                <HomeSectionSubmissionCta
                  title="Masz miejsce warte polecenia?"
                  description="Dodaj je do mapy rodzinnych adresów i pomóż odkrywać kolejne sprawdzone miejscówki."
                  buttonLabel="Dodaj"
                  href="/dodaj?type=place"
                />
              </div>
            </section>
          )}

          {/* Events section */}
          {showEvents && (
            <section>
              <div className="flex items-center justify-between mb-1">
                <div>
                  <h2 className="font-heading font-black text-[22px] leading-tight text-foreground">
                    Nadchodzące wydarzenia
                    {hasActiveFilters && <span className="ml-2 text-[14px] font-normal text-muted-foreground">({filteredEvents.length})</span>}
                  </h2>
                  {!hasActiveFilters && (
                    <p className="text-[13px] text-muted-foreground mt-0.5">Co słychać w Krakowie dla rodzin z dziećmi</p>
                  )}
                </div>
                <SectionLink href="/wydarzenia">Wszystkie</SectionLink>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
                {visibleEvents.map((event, idx) => (
                  <div key={event.id} className={!hasActiveFilters && idx >= 4 ? "hidden sm:block" : ""}>
                    <ContentCard item={event} showImageTag />
                  </div>
                ))}
              </div>
              <div className="mt-4">
                <HomeSectionSubmissionCta
                  title="Tworzysz wydarzenie dla dzieci?"
                  description="Dodaj je do kalendarza, żeby rodziny szybciej trafiły na wartościowe wydarzenia w mieście."
                  buttonLabel="Dodaj"
                  href="/dodaj?type=event"
                />
              </div>
            </section>
          )}

          {/* Camps section */}
          {showCamps && (
            <section>
              <div className="flex items-center justify-between mb-1">
                <div>
                  <h2 className="font-heading font-black text-[22px] leading-tight text-foreground">
                    Kolonie dla dzieci
                    {hasActiveFilters && <span className="ml-2 text-[14px] font-normal text-muted-foreground">({organizers.length})</span>}
                  </h2>
                  {!hasActiveFilters && (
                    <p className="text-[13px] text-muted-foreground mt-0.5">Sprawdzeni organizatorzy letnich wyjazdów</p>
                  )}
                </div>
                <SectionLink href="/kolonie">Wszystkie</SectionLink>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
                {visibleOrganizers.map((organizer, idx) => (
                  <div key={organizer.key} className={!hasActiveFilters && idx >= 4 ? "hidden sm:block" : ""}>
                    <article className="rounded-xl border border-border bg-card shadow-[var(--shadow-card)] hover:shadow-[var(--shadow-card-hover)] hover:-translate-y-0.5 transition-all duration-200 overflow-hidden">
                      <Link href={`/kolonie/${organizer.leadCamp.slug}`} className="group flex overflow-hidden h-[160px]">
                        <div className="w-[160px] shrink-0 relative self-stretch bg-accent">
                          {organizer.leadCamp.image_url ? (
                            <ImageWithFallback
                              src={thumbUrl(organizer.leadCamp.image_thumb, organizer.leadCamp.image_url) || organizer.leadCamp.image_url}
                              alt={organizer.name}
                              className="h-full w-full object-contain bg-accent/30 transition-transform duration-300 group-hover:scale-[1.03]"
                              loading="lazy"
                            />
                          ) : (
                            <div className="flex h-full w-full items-center justify-center text-3xl text-muted-foreground/30">⛺</div>
                          )}
                          <span className="absolute bottom-2 left-2 inline-flex items-center gap-1 rounded-full bg-white px-2 py-1 text-[10px] font-semibold text-foreground shadow-[var(--shadow-soft)] border border-border/70">
                            {getSessionLabel(organizer.camps.length)}
                          </span>
                        </div>
                        <div className="flex-1 min-w-0 p-3 flex flex-col gap-1.5">
                          <h3 className="font-semibold text-[13px] text-foreground leading-snug group-hover:text-primary transition-colors duration-200 line-clamp-2">
                            {organizer.name}
                          </h3>
                          {organizer.leadCamp.description_short && (
                            <p className="text-[11px] text-muted leading-relaxed line-clamp-2">
                              {organizer.leadCamp.description_short}
                            </p>
                          )}
                          <div className="mt-auto space-y-0.5">
                            <div className="flex items-center gap-1 text-[10px] text-muted">
                              <MapPin size={9} className="text-secondary/60 shrink-0" />
                              <span className="truncate">{getOrganizerDistrictSummary(organizer.camps)}</span>
                            </div>
                            <div className="flex items-center gap-1 text-[10px] text-muted">
                              <Users size={9} className="text-secondary/60 shrink-0" />
                              <span className="truncate">{getOrganizerAgeSummary(organizer.camps)}</span>
                            </div>
                          </div>
                        </div>
                      </Link>
                      <div className="border-t border-border/70 bg-background/40 px-3 py-2.5">
                        <div className="flex flex-wrap gap-1.5">
                          {organizer.camps.map((camp) => (
                            <span
                              key={camp.id}
                              className="inline-flex items-center rounded-full border border-border/80 bg-background px-2 py-0.5 text-[9px] font-medium text-foreground"
                            >
                              {getDateChipLabel(camp)}
                            </span>
                          ))}
                        </div>
                      </div>
                    </article>
                  </div>
                ))}
              </div>
              <div className="mt-4">
                <HomeSectionSubmissionCta
                  title="Prowadzisz kolonie lub półkolonie?"
                  description="Pokaż swoją ofertę w miejscu, gdzie rodzice szukają sprawdzonych wyjazdów i turnusów."
                  buttonLabel="Dodaj"
                  href="/dodaj?type=camp"
                />
              </div>
            </section>
          )}

          {/* Activities section */}
          {showActivities && (
            <section>
              <div className="flex items-center justify-between mb-1">
                <div>
                  <h2 className="font-heading font-black text-[22px] leading-tight text-foreground">
                    Zajęcia pozaszkolne
                    {hasActiveFilters && <span className="ml-2 text-[14px] font-normal text-muted-foreground">({filteredActivities.length})</span>}
                  </h2>
                  {!hasActiveFilters && (
                    <p className="text-[13px] text-muted-foreground mt-0.5">Regularne aktywności dla dzieci w Krakowie</p>
                  )}
                </div>
                <SectionLink href="/zajecia">Wszystkie</SectionLink>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
                {visibleActivities.map((activity, idx) => (
                  <div key={activity.id} className={!hasActiveFilters && idx >= 4 ? "hidden sm:block" : ""}>
                    <ContentCard item={activity} />
                  </div>
                ))}
              </div>
              <div className="mt-4">
                <HomeSectionSubmissionCta
                  title="Prowadzisz zajęcia dla dzieci?"
                  description="Dodaj je do katalogu i daj rodzicom prosty sposób na znalezienie regularnych aktywności."
                  buttonLabel="Dodaj"
                  href="/dodaj?type=activity"
                />
              </div>
            </section>
          )}
        </div>
      </div>
    </div>
  </div>
  );
}
