"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { Search, ArrowRight, X, MapPin, Users, Check, ChevronDown } from "lucide-react";
import { ContentCard } from "@/components/ui/content-card";
import { ImageWithFallback } from "@/components/ui/image-with-fallback";
import type { AdminTaxonomyResponse } from "@/lib/admin-taxonomy";
import { useAdminTaxonomy } from "@/lib/use-admin-taxonomy";
import { CATEGORY_LABELS } from "@/lib/mock-data";
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
        "group flex w-full items-center gap-2.5 border-b border-border/50 last:border-0 px-4 py-2.5 text-[13px] text-left transition-all duration-150",
        selected
          ? "bg-primary/8 text-primary font-bold"
          : "text-foreground font-semibold hover:bg-accent/70"
      )}
    >
      {icon && (
        <span className={cn("shrink-0 text-[14px] transition-opacity", selected ? "opacity-100" : "opacity-60 group-hover:opacity-90")}>
          {icon}
        </span>
      )}
      <span className="flex-1 truncate">{label}</span>
      {selected ? (
        <Check size={13} className="shrink-0 text-primary" />
      ) : (
        <span className="flex items-center gap-1.5 shrink-0">
          {count !== undefined && (
            <span className="text-[11px] text-muted-foreground/50 tabular-nums">{count}</span>
          )}
          <ChevronDown size={11} className="-rotate-90 text-muted-foreground/30 group-hover:text-muted-foreground/60 transition-colors" />
        </span>
      )}
    </button>
  );
}

/* ─── Collapsible sidebar section ─── */
function SidebarSection({
  title,
  children,
  defaultOpen = false,
}: {
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border-b border-border last:border-0">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between px-4 py-3 text-left transition-colors hover:bg-accent/50"
      >
        <span className="text-[11px] font-extrabold uppercase tracking-widest text-black">
          {title}
        </span>
        <ChevronDown
          size={13}
          className={cn("shrink-0 text-black transition-transform duration-200", open && "rotate-180")}
        />
      </button>
      {open && <div className="pb-1">{children}</div>}
    </div>
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

export function HomeFilteredView({ events, places, camps, activities, initialTaxonomy }: HomeFilteredViewProps) {
  const { typeLevel2Options: taxonomyTypeLevel2Options } = useAdminTaxonomy(initialTaxonomy);
  const [search, setSearch] = useState("");
  const [activeTypeLevel2, setActiveTypeLevel2] = useState<string[]>([]);
  const [activeTypes, setActiveTypes] = useState<string[]>([]);
  const [activeCategories, setActiveCategories] = useState<string[]>([]);
  const [activeDistricts, setActiveDistricts] = useState<District[]>([]);
  const [activeAgeGroup, setActiveAgeGroup] = useState<string | null>(null);
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);

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
    if (search.trim() && !entry.searchText.includes(search.trim().toLowerCase())) return false;
    if (!excluded.includes("typeLevel2") && !matchesTaxonomyFilter(entry.typeLevel2, activeTypeLevel2)) return false;
    if (!excluded.includes("type") && !matchesTaxonomyFilter(entry.type, activeTypes)) return false;
    if (!excluded.includes("category") && !matchesTaxonomyFilter(entry.category, activeCategories)) return false;
    if (!excluded.includes("district") && activeDistricts.length > 0 && !activeDistricts.includes(entry.district)) return false;
    if (!excluded.includes("age") && !matchesAgeFilter(entry.ageMin, entry.ageMax, ageGroup)) return false;
    return true;
  }

  const typeOptions = useMemo(
    () => mergeSelectedTaxonomyOptions(
      getTaxonomyOptions(unifiedFilterEntries.filter((e) => matchesUnifiedFilters(e, ["type"])), (e) => e.type),
      activeTypes,
    ),
    [unifiedFilterEntries, search, activeTypeLevel2, activeCategories, activeDistricts, ageGroup, activeTypes]
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
    [unifiedFilterEntries, typeLevel2LabelMap, search, activeTypes, activeCategories, activeDistricts, ageGroup, activeTypeLevel2]
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
    [unifiedFilterEntries, search, activeTypeLevel2, activeTypes, activeDistricts, ageGroup, activeCategories]
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
  }, [unifiedFilterEntries, search, activeTypeLevel2, activeTypes, activeCategories, ageGroup]);

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
    if (activeAgeGroup) {
      const group = AGE_GROUPS.find((g) => g.key === activeAgeGroup);
      badges.push({ id: `age-${activeAgeGroup}`, label: group?.label || activeAgeGroup, onRemove: () => setActiveAgeGroup(null) });
    }
    return badges;
  }, [search, activeTypeLevel2, activeTypes, activeCategories, activeDistricts, activeAgeGroup, typeLevel2OptionsByValue, typeOptionsByValue, categoryOptionsByValue]);

  /* ─── Filtered data ─── */
  const filteredEvents = useMemo(() => {
    let result = events;
    if (search) result = result.filter((e) => [e.title, e.description_short, e.street, e.city, e.district].join(" ").toLowerCase().includes(search.toLowerCase()));
    if (activeTypeLevel2.length > 0) result = result.filter((e) => matchesTaxonomyFilter(e.type_lvl_2_id ?? null, activeTypeLevel2));
    if (activeTypes.length > 0) result = result.filter((e) => matchesTaxonomyFilter(getEventCategoryLvl1(e), activeTypes));
    if (activeCategories.length > 0) result = result.filter((e) => matchesTaxonomyFilter(getEventCategoryLvl2(e), activeCategories));
    if (activeDistricts.length > 0) result = result.filter((e) => activeDistricts.includes(normalizeDistrictName(e.district)));
    return result.filter((e) => matchesAgeFilter(e.age_min, e.age_max, ageGroup)).sort((a, b) => b.likes - a.likes);
  }, [events, search, activeTypeLevel2, activeTypes, activeCategories, activeDistricts, ageGroup]);

  const filteredPlaces = useMemo(() => {
    let result = places;
    if (search) result = result.filter((p) => [p.title, p.description_short, p.street, p.city, p.district].join(" ").toLowerCase().includes(search.toLowerCase()));
    if (activeTypeLevel2.length > 0) result = result.filter((p) => matchesTaxonomyFilter(p.type_lvl_2_id ?? null, activeTypeLevel2));
    if (activeTypes.length > 0) result = result.filter((p) => matchesTaxonomyFilter(getPlaceCategoryLvl1(p), activeTypes));
    if (activeCategories.length > 0) result = result.filter((p) => matchesTaxonomyFilter(getPlaceCategoryLvl2(p), activeCategories));
    if (activeDistricts.length > 0) result = result.filter((p) => activeDistricts.includes(normalizeDistrictName(p.district)));
    return result.filter((p) => matchesAgeFilter(p.age_min, p.age_max, ageGroup)).sort((a, b) => b.likes - a.likes);
  }, [places, search, activeTypeLevel2, activeTypes, activeCategories, activeDistricts, ageGroup]);

  const filteredCamps = useMemo(() => {
    let result = camps;
    if (search) result = result.filter((c) => [c.title, c.description_short, c.venue_name, c.venue_address, c.organizer].join(" ").toLowerCase().includes(search.toLowerCase()));
    if (activeTypeLevel2.length > 0) result = result.filter((c) => matchesTaxonomyFilter(c.type_lvl_2_id ?? null, activeTypeLevel2));
    if (activeTypes.length > 0) result = result.filter((c) => matchesTaxonomyFilter(getCampCategoryLvl1(c), activeTypes));
    if (activeCategories.length > 0) result = result.filter((c) => matchesTaxonomyFilter(getCampCategoryLvl2(c), activeCategories));
    if (activeDistricts.length > 0) result = result.filter((c) => activeDistricts.includes(normalizeDistrictName(c.district)));
    return result.filter((c) => matchesAgeFilter(c.age_min, c.age_max, ageGroup)).sort((a, b) => new Date(a.date_start).getTime() - new Date(b.date_start).getTime());
  }, [camps, search, activeTypeLevel2, activeTypes, activeCategories, activeDistricts, ageGroup]);

  const filteredActivities = useMemo(() => {
    let result = activities;
    if (search) result = result.filter((a) => [a.title, a.description_short, a.venue_name, a.venue_address, a.organizer].join(" ").toLowerCase().includes(search.toLowerCase()));
    if (activeTypeLevel2.length > 0) result = result.filter((a) => matchesTaxonomyFilter(a.type_lvl_2_id ?? null, activeTypeLevel2));
    if (activeTypes.length > 0) result = result.filter((a) => matchesTaxonomyFilter(getActivityCategoryLvl1(a), activeTypes));
    if (activeCategories.length > 0) result = result.filter((a) => matchesTaxonomyFilter(getActivityCategoryLvl2(a), activeCategories));
    if (activeDistricts.length > 0) result = result.filter((a) => activeDistricts.includes(normalizeDistrictName(a.district)));
    return result.filter((a) => matchesAgeFilter(a.age_min, a.age_max, ageGroup)).sort((a, b) => b.likes - a.likes);
  }, [activities, search, activeTypeLevel2, activeTypes, activeCategories, activeDistricts, ageGroup]);

  function toggleTypeLevel2(v: string) { setActiveTypeLevel2((p) => p.includes(v) ? p.filter((x) => x !== v) : [...p, v]); }
  function toggleType(v: string) { setActiveTypes((p) => p.includes(v) ? p.filter((x) => x !== v) : [...p, v]); }
  function toggleCategory(v: string) { setActiveCategories((p) => p.includes(v) ? p.filter((x) => x !== v) : [...p, v]); }
  function toggleDistrict(v: District) { setActiveDistricts((p) => p.includes(v) ? p.filter((x) => x !== v) : [...p, v]); }
  function clearFilters() { setSearch(""); setActiveTypeLevel2([]); setActiveTypes([]); setActiveCategories([]); setActiveDistricts([]); setActiveAgeGroup(null); }

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

  /* ─── Sidebar JSX (shared desktop/mobile) ─── */
  const sidebarContent = (
    <>
      {/* Search inside sidebar */}
      <div className="px-3 py-3 border-b border-border bg-accent/40">
        <div className="relative">
          <Search size={13} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground/40" />
          <input
            type="text"
            placeholder="Szukaj w filtrach..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full h-9 rounded-xl border border-border bg-white pl-9 pr-3 text-[13px] text-foreground placeholder:text-muted-foreground/50 focus:border-primary/40 focus:outline-none focus:ring-2 focus:ring-primary/15 transition-all"
          />
        </div>
      </div>

      {typeLevel2Options.length > 0 && (
        <SidebarSection title="Grupa">
          {typeLevel2Options.map((option) => (
            <FilterBtn
              key={option.value}
              selected={activeTypeLevel2.includes(option.value)}
              onClick={() => toggleTypeLevel2(option.value)}
              icon={option.icon}
              label={option.label}
              count={option.count}
            />
          ))}
        </SidebarSection>
      )}

      {typeOptions.length > 0 && (
        <SidebarSection title="Typ">
          {typeOptions.map((option) => (
            <FilterBtn
              key={option.value}
              selected={activeTypes.includes(option.value)}
              onClick={() => toggleType(option.value)}
              icon={option.icon}
              label={option.label}
              count={option.count}
            />
          ))}
        </SidebarSection>
      )}

      <SidebarSection title="Wiek dziecka">
        {ageOptions.filter((g) => g.count > 0 || activeAgeGroup === g.key).map((group) => (
          <FilterBtn
            key={group.key}
            selected={activeAgeGroup === group.key}
            onClick={() => setActiveAgeGroup(activeAgeGroup === group.key ? null : group.key)}
            icon={group.icon}
            label={group.label}
            count={group.count}
          />
        ))}
      </SidebarSection>

      {categoryOptions.length > 0 && (
        <SidebarSection title="Kategoria" defaultOpen={false}>
          {categoryOptions.map((option) => (
            <FilterBtn
              key={option.value}
              selected={activeCategories.includes(option.value)}
              onClick={() => toggleCategory(option.value)}
              icon={option.icon}
              label={option.label}
              count={option.count}
            />
          ))}
        </SidebarSection>
      )}

      {districtOptions.length > 0 && (
        <SidebarSection title="Dzielnica" defaultOpen={false}>
          {districtOptions.map((option) => (
            <FilterBtn
              key={option.value}
              selected={activeDistricts.includes(option.value)}
              onClick={() => toggleDistrict(option.value)}
              icon={option.icon}
              label={option.label}
              count={option.count}
            />
          ))}
        </SidebarSection>
      )}

      {hasActiveFilters && (
        <div className="px-4 py-3">
          <button
            onClick={clearFilters}
            className="inline-flex w-full items-center justify-center gap-1.5 rounded-lg border border-border px-3 py-2 text-[12px] font-semibold text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
          >
            <X size={12} />
            Wyczyść filtry
          </button>
        </div>
      )}
    </>
  );

  return (
    <div>
      {/* ──────────────────────────────────────────
          Hero Banner
      ────────────────────────────────────────── */}
      <section className="relative overflow-hidden">
        <div className="container-page relative pt-4 pb-5 md:pt-5 md:pb-6">
          <div className="mb-8 flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <img
              src="/logo-custom.png"
              alt="NieSiedzWDomu"
              className="h-auto w-[158px] max-w-[56vw] object-contain md:w-[202px] lg:w-[216px]"
            />

            <div className="flex flex-col items-start gap-2.5 lg:items-end">
              <div className="flex flex-wrap items-center gap-2.5 lg:justify-end">
                {[
                  { href: "/miejsca", emoji: "📍", label: "Miejsca", count: places.length },
                  { href: "/wydarzenia", emoji: "🎉", label: "Wydarzenia", count: events.length },
                  { href: "/kolonie", emoji: "⛺", label: "Kolonie", count: camps.length },
                  { href: "/zajecia", emoji: "🎨", label: "Zajęcia", count: activities.length },
                ].map((stat) => (
                  <Link
                    key={stat.href}
                    href={stat.href}
                    className="inline-flex items-center gap-2 rounded-full border border-white/12 bg-white/6 px-3 py-1.5 text-[12px] font-semibold text-white/88 shadow-[0_8px_24px_rgba(0,0,0,0.18)] transition-all hover:-translate-y-0.5 hover:border-primary/50 hover:bg-white/10 hover:text-white"
                  >
                    <span>{stat.emoji}</span>
                    <span>{stat.label}</span>
                    <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1.5 text-[11px] font-bold text-black">
                      {stat.count}+
                    </span>
                  </Link>
                ))}
              </div>
            </div>
          </div>

          <div className="lg:flex lg:items-stretch lg:gap-8">
            {/* Left: heading + search */}
            <div className="flex flex-col justify-between flex-1 max-w-2xl lg:max-w-none">
              <h1
                className="font-heading font-black leading-[1.05] tracking-[-0.03em] text-white"
                style={{ fontSize: "clamp(32px, 5vw, 60px)" }}
              >
                Odkryj Kraków <span className="text-primary">razem z dziećmi</span>
              </h1>

              {/* Search bar */}
              <div className="mt-7 flex gap-2 max-w-2xl">
                <div className="relative flex-1">
                  <Search size={15} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-foreground/40" />
                  <input
                    type="text"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Szukaj miejsc, wydarzeń, aktywności..."
                    className="w-full h-9 rounded-xl border border-border bg-white pl-11 pr-4 text-[14px] text-foreground placeholder:text-muted-foreground/60 shadow-[0_4px_16px_rgba(0,0,0,0.10)] focus:outline-none focus:ring-2 focus:ring-primary/20"
                  />
                </div>
                <button
                  type="button"
                  className="h-9 w-[152px] justify-center rounded-xl border border-[#e60100]/90 bg-[#e60100] px-5 text-[13px] font-bold text-white transition-colors hover:bg-[#c40000] shrink-0"
                >
                  Szukaj
                </button>
              </div>
            </div>

            {/* Right column: CTA top, quote bottom */}
            <div className="hidden lg:flex lg:flex-col lg:justify-between ml-auto max-w-[480px] text-right shrink-0">
              <Link
                href="/dodaj"
                className="self-end inline-flex h-9 w-[200px] justify-center items-center gap-1.5 rounded-xl border border-[#e60100]/90 bg-[#e60100] px-4 text-[12px] font-extrabold uppercase tracking-[0.04em] text-white transition-colors hover:bg-[#c40000]"
              >
                Dodaj swój event
                <ArrowRight size={13} />
              </Link>
              <p className="font-heading text-[17px] font-black leading-[1.18] tracking-[-0.02em] text-white/90">
                "<span className="text-primary">Razem</span> nawet zwykły <span className="text-primary">park</span> to dżungla przygody,
                <br />
                a <span className="text-primary">Kraków</span> ma ich tyle, że braknie ci soboty."
              </p>
            </div>
          </div>
        </div>
      </section>


      {/* ──────────────────────────────────────────
          Main content area
      ────────────────────────────────────────── */}
      <div className="container-page py-8">
        <div className="rounded-[28px] bg-[#f2f2f2] px-4 py-5 shadow-[0_24px_70px_rgba(0,0,0,0.28)] sm:px-6 sm:py-6 lg:px-8 lg:py-8">

        {/* Mobile filter toggle */}
        <div className="lg:hidden mb-4 flex items-center gap-2">
          <button
            onClick={() => setMobileFiltersOpen((v) => !v)}
            className={cn(
              "inline-flex items-center gap-2 rounded-xl border px-4 py-2.5 text-[13px] font-semibold transition-all duration-150",
              mobileFiltersOpen || hasActiveFilters
                ? "border-primary bg-primary text-white"
                : "border-border bg-white text-foreground hover:border-primary/40 hover:bg-primary/5"
            )}
          >
            <span>Filtry</span>
            {hasActiveFilters && (
              <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-white/25 text-[10px] font-bold">
                {activeFilterBadges.length}
              </span>
            )}
          </button>

          {/* Active filter badges on mobile */}
          {activeFilterBadges.length > 0 && (
            <div className="flex flex-wrap gap-1.5 overflow-hidden">
              {activeFilterBadges.slice(0, 3).map((badge) => (
                <span
                  key={badge.id}
                  className="inline-flex items-center gap-1 rounded-full border border-border bg-white px-2.5 py-1 text-[11px] font-medium"
                >
                  {badge.label}
                  <button
                    onClick={badge.onRemove}
                    className="text-muted-foreground hover:text-foreground"
                    aria-label={`Usuń ${badge.label}`}
                  >
                    <X size={10} />
                  </button>
                </span>
              ))}
              {activeFilterBadges.length > 3 && (
                <span className="text-[11px] text-muted-foreground self-center">+{activeFilterBadges.length - 3}</span>
              )}
            </div>
          )}
        </div>

        {/* Mobile filters panel */}
        {mobileFiltersOpen && (
          <div className="lg:hidden mb-4 rounded-2xl border border-border bg-white overflow-hidden">
            <div
              className="flex items-center gap-2.5 px-4 py-3"
              style={{ background: "var(--color-primary)" }}
            >
              <span className="font-heading font-bold text-[14px] text-black">Wszystkie filtry</span>
              {hasActiveFilters && (
                <span className="ml-auto inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-black/12 px-1.5 text-[11px] font-bold text-black">
                  {activeFilterBadges.length}
                </span>
              )}
            </div>
            {sidebarContent}
          </div>
        )}

        <div className="lg:flex lg:gap-6 lg:items-start">

          {/* ── Desktop sidebar ── */}
          <aside className="hidden lg:block w-[240px] xl:w-[260px] shrink-0 rounded-2xl overflow-hidden border border-border bg-white">
            {/* Bold coloured header — ecommerce style */}
            <div
              className="flex items-center gap-2.5 px-4 py-3.5"
              style={{ background: "var(--color-primary)" }}
            >
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none" className="shrink-0 opacity-90">
                <rect x="1" y="1" width="6" height="6" rx="1.5" fill="#161616" />
                <rect x="11" y="1" width="6" height="6" rx="1.5" fill="#161616" />
                <rect x="1" y="11" width="6" height="6" rx="1.5" fill="#161616" />
                <rect x="11" y="11" width="6" height="6" rx="1.5" fill="#161616" />
              </svg>
              <span className="font-heading font-bold text-[15px] text-black tracking-[-0.01em]">
                Wszystkie filtry
              </span>
              {hasActiveFilters && (
                <span className="ml-auto inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-black/12 px-1.5 text-[11px] font-bold text-black">
                  {activeFilterBadges.length}
                </span>
              )}
            </div>
            {sidebarContent}
          </aside>

          {/* ── Main content ── */}
          <main className="flex-1 min-w-0 space-y-10">

            {/* Active filter badges — desktop */}
            {hasActiveFilters && activeFilterBadges.length > 0 && (
              <div className="hidden lg:flex flex-wrap items-center gap-2">
                <span className="text-[12px] font-semibold text-muted-foreground">Aktywne filtry:</span>
                {activeFilterBadges.map((badge) => (
                  <span
                    key={badge.id}
                    className="inline-flex items-center gap-1.5 rounded-full border border-border bg-white px-3 py-1 text-[12px] font-medium text-foreground"
                  >
                    {badge.label}
                    <button
                      onClick={badge.onRemove}
                      className="inline-flex h-3.5 w-3.5 items-center justify-center rounded-full text-muted-foreground hover:bg-border hover:text-foreground transition-colors"
                    >
                      <X size={9} />
                    </button>
                  </span>
                ))}
                <button
                  onClick={clearFilters}
                  className="text-[12px] font-semibold text-primary hover:text-primary-hover transition-colors"
                >
                  Wyczyść wszystko
                </button>
              </div>
            )}

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
                <SectionHeader
                  title="Ciekawe miejsca"
                  subtitle={hasActiveFilters ? undefined : "Sprawdzone adresy dla całej rodziny w Krakowie"}
                  href="/miejsca"
                  count={hasActiveFilters ? filteredPlaces.length : undefined}
                />
                <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-4">
                  {visiblePlaces.map((place) => (
                    <ContentCard key={place.id} item={place} variant="vertical" />
                  ))}
                </div>
              </section>
            )}

            {/* ── Events ── */}
            {showEvents && (
              <section>
                <SectionHeader
                  title="Nadchodzące wydarzenia"
                  subtitle={hasActiveFilters ? undefined : "Co słychać w Krakowie dla rodzin z dziećmi"}
                  href="/wydarzenia"
                  count={hasActiveFilters ? filteredEvents.length : undefined}
                />
                <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-4">
                  {visibleEvents.map((event) => (
                    <ContentCard key={event.id} item={event} variant="vertical" />
                  ))}
                </div>
              </section>
            )}

            {/* ── Camps ── */}
            {showCamps && (
              <section>
                <SectionHeader
                  title="Kolonie dla dzieci"
                  subtitle={hasActiveFilters ? undefined : "Sprawdzeni organizatorzy letnich wyjazdów"}
                  href="/kolonie"
                  count={hasActiveFilters ? organizers.length : undefined}
                />
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
                  {visibleOrganizers.map((organizer) => (
                    <article
                      key={organizer.key}
                      className="rounded-xl border border-border bg-white shadow-[var(--shadow-card)] hover:shadow-[var(--shadow-card-hover)] hover:-translate-y-0.5 transition-all duration-200 overflow-hidden"
                    >
                      <Link href={`/kolonie/${organizer.leadCamp.slug}`} className="group flex overflow-hidden h-[152px]">
                        <div className="w-[148px] shrink-0 relative self-stretch bg-accent">
                          {organizer.leadCamp.image_url ? (
                            <ImageWithFallback
                              src={thumbUrl(organizer.leadCamp.image_thumb, organizer.leadCamp.image_url) || organizer.leadCamp.image_url}
                              alt={organizer.name}
                              className="h-full w-full object-contain bg-accent/30 transition-transform duration-300 group-hover:scale-[1.04]"
                              loading="lazy"
                            />
                          ) : (
                            <div className="flex h-full w-full items-center justify-center text-3xl text-muted-foreground/25">⛺</div>
                          )}
                          <span className="absolute bottom-2 left-2 inline-flex items-center gap-1 rounded-full bg-white px-2 py-1 text-[10px] font-bold text-foreground shadow-sm border border-border/70">
                            {getSessionLabel(organizer.camps.length)}
                          </span>
                        </div>
                        <div className="flex-1 min-w-0 p-3.5 flex flex-col gap-1.5">
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
                      <div className="border-t border-border/70 bg-accent/40 px-3 py-2.5">
                        <div className="flex flex-wrap gap-1.5">
                          {organizer.camps.map((camp) => (
                            <span
                              key={camp.id}
                              className="inline-flex items-center rounded-full border border-border/80 bg-white px-2 py-0.5 text-[9px] font-medium text-foreground"
                            >
                              {getDateChipLabel(camp)}
                            </span>
                          ))}
                        </div>
                      </div>
                    </article>
                  ))}
                </div>
              </section>
            )}

            {/* ── Activities ── */}
            {showActivities && (
              <section>
                <SectionHeader
                  title="Zajęcia pozaszkolne"
                  subtitle={hasActiveFilters ? undefined : "Regularne aktywności dla dzieci w Krakowie"}
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
          </main>
        </div>
        </div>
      </div>
    </div>
  );
}
