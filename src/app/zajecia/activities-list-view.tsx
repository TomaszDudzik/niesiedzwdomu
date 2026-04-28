"use client";

import { useEffect, useMemo, useState } from "react";
import { Search, LayoutGrid, MapIcon, SlidersHorizontal, X, MapPin, Check, ChevronDown } from "lucide-react";
import { MobileActionBar } from "@/components/ui/mobile-action-bar";
import { PageHero } from "@/components/layout/page-hero";
import { ListGroupHeader } from "@/components/layout/list-group-header";
import { ListPageMainContent } from "@/components/layout/list-page-main-content";
import { DISTRICT_LIST } from "@/lib/mock-data";
import { ContentCard } from "@/components/ui/content-card";
import { FilterSection } from "@/components/ui/filter-section";
import { SubmissionCta } from "@/components/ui/submission-cta";
import { cn } from "@/lib/utils";
import { getAgeGroupOptions, getTaxonomyOptions, matchesTaxonomyFilter, mergeSelectedTaxonomyOptions } from "@/lib/taxonomy-filters";
import type { Activity, District } from "@/types/database";

const AGE_GROUPS = [
  { key: "0-4", label: "0–4 lata", icon: "👶", min: 0, max: 4 },
  { key: "5-7", label: "5–7 lat", icon: "🧒", min: 5, max: 7 },
  { key: "8-10", label: "8–10 lat", icon: "🎒", min: 8, max: 10 },
  { key: "11-14", label: "11–14 lat", icon: "🧑", min: 11, max: 14 },
  { key: "15+", label: "15+ lat", icon: "🎓", min: 15, max: 99 },
] as const;

const DISTRICT_ICONS: Partial<Record<District, string>> = {
  "Stare Miasto": "🏰",
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
};

type ViewMode = "list" | "map";

const KRAKOW_CENTER: [number, number] = [50.0614, 19.9372];
const DISTRICT_COORDS: Partial<Record<District, [number, number]>> = {
  "Stare Miasto": [50.0614, 19.9372],
  "Kazimierz": [50.05, 19.946],
  "Podgórze": [50.042, 19.951],
  "Nowa Huta": [50.072, 20.037],
  "Krowodrza": [50.077, 19.913],
  "Bronowice": [50.081, 19.89],
  "Zwierzyniec": [50.056, 19.89],
  "Dębniki": [50.043, 19.92],
  "Prądnik Czerwony": [50.087, 19.955],
  "Prądnik Biały": [50.095, 19.92],
  "Czyżyny": [50.072, 20.005],
  "Bieżanów-Prokocim": [50.015, 20.005],
};

interface MarkerGroup {
  coords: [number, number];
  events: { id: string; title: string; slug: string; street: string; city: string; image_url?: string | null }[];
  label: string;
  markerIcon?: string;
}

interface ActivitiesListViewProps {
  activities: Activity[];
}

function getActivityTypeValue(activity: Activity): string {
  return activity.category_lvl_1 ?? activity.main_category ?? activity.activity_type ?? "Bez kategorii";
}

function getActivityCategoryValue(activity: Activity): string | null {
  return activity.category_lvl_2 ?? activity.category ?? null;
}

function getActivitySubcategoryValue(activity: Activity): string | null {
  return activity.category_lvl_3 ?? activity.subcategory ?? null;
}

export function ActivitiesListView({ activities }: ActivitiesListViewProps) {
  const [search, setSearch] = useState("");
  const [activeTypes, setActiveTypes] = useState<string[]>([]);
  const [activeCategories, setActiveCategories] = useState<string[]>([]);
  const [activeSubcategories, setActiveSubcategories] = useState<string[]>([]);
  const [activeDistricts, setActiveDistricts] = useState<District[]>([]);
  const [activeAgeGroups, setActiveAgeGroups] = useState<string[]>([]);
  const [view, setView] = useState<ViewMode>("list");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [filtersOpenDesktop, setFiltersOpenDesktop] = useState(false);
  const [MapComponent, setMapComponent] = useState<React.ComponentType<{ groups: MarkerGroup[]; basePath?: string }> | null>(null);

  const ageGroups = useMemo(
    () => AGE_GROUPS.filter((group) => activeAgeGroups.includes(group.key)),
    [activeAgeGroups]
  );

  const hasActiveFilters =
    !!search || activeTypes.length > 0 || activeCategories.length > 0 || activeSubcategories.length > 0 || activeDistricts.length > 0 || activeAgeGroups.length > 0;

  useEffect(() => {
    if (view === "map" && !MapComponent) {
      import("@/app/wydarzenia/map-leaflet").then((mod) => {
        setMapComponent(() => mod.MapLeaflet);
      });
    }
  }, [view, MapComponent]);
  function matchesSearch(activity: Activity) {
    if (!search) {
      return true;
    }

    const query = search.toLowerCase();
    return [activity.title, activity.description_short, activity.street, activity.postcode, activity.city, activity.note, activity.organizer]
      .join(" ")
      .toLowerCase()
      .includes(query);
  }

  function matchesAgeSelection(activity: Activity, selectedGroups = ageGroups) {
    if (selectedGroups.length === 0) {
      return true;
    }

    return selectedGroups.some((group) =>
      (activity.age_min === null || activity.age_min <= group.max) &&
      (activity.age_max === null || activity.age_max >= group.min)
    );
  }

  function matchesActivityFilters(activity: Activity, excluded: Array<"type" | "category" | "subcategory" | "district" | "age"> = []) {
    if (!matchesSearch(activity)) {
      return false;
    }
    if (!excluded.includes("type") && !matchesTaxonomyFilter(getActivityTypeValue(activity), activeTypes)) {
      return false;
    }
    if (!excluded.includes("category") && !matchesTaxonomyFilter(getActivityCategoryValue(activity), activeCategories)) {
      return false;
    }
    if (!excluded.includes("subcategory") && !matchesTaxonomyFilter(getActivitySubcategoryValue(activity), activeSubcategories)) {
      return false;
    }
    if (!excluded.includes("district") && activeDistricts.length > 0 && !activeDistricts.includes(activity.district)) {
      return false;
    }
    if (!excluded.includes("age") && !matchesAgeSelection(activity)) {
      return false;
    }
    return true;
  }

  const filteredActivities = useMemo(
    () => activities.filter((activity) => matchesActivityFilters(activity)),
    [activities, search, activeTypes, activeCategories, activeSubcategories, activeDistricts, ageGroups]
  );

  const typeOptions = useMemo(
    () => mergeSelectedTaxonomyOptions(
      getTaxonomyOptions(activities.filter((activity) => matchesActivityFilters(activity, ["type"])), getActivityTypeValue),
      activeTypes,
    ),
    [activities, search, activeCategories, activeSubcategories, activeDistricts, ageGroups, activeTypes]
  );

  const typeOptionsByValue = useMemo(
    () => new Map(typeOptions.map((option) => [option.value, option])),
    [typeOptions]
  );

  const categoryOptions = useMemo(
    () => mergeSelectedTaxonomyOptions(
      getTaxonomyOptions(activities.filter((activity) => matchesActivityFilters(activity, ["category"])), getActivityCategoryValue),
      activeCategories,
    ),
    [activities, search, activeTypes, activeSubcategories, activeDistricts, ageGroups, activeCategories]
  );

  const categoryOptionsByValue = useMemo(
    () => new Map(categoryOptions.map((option) => [option.value, option])),
    [categoryOptions]
  );

  const subcategoryOptions = useMemo(
    () => mergeSelectedTaxonomyOptions(
      getTaxonomyOptions(activities.filter((activity) => matchesActivityFilters(activity, ["subcategory"])), getActivitySubcategoryValue),
      activeSubcategories,
    ),
    [activities, search, activeTypes, activeCategories, activeDistricts, ageGroups, activeSubcategories]
  );

  const subcategoryOptionsByValue = useMemo(
    () => new Map(subcategoryOptions.map((option) => [option.value, option])),
    [subcategoryOptions]
  );

  const districtOptionsSource = useMemo(
    () => activities.filter((activity) => matchesActivityFilters(activity, ["district"])),
    [activities, search, activeTypes, activeCategories, activeSubcategories, ageGroups]
  );

  const districtCounts = useMemo(() => {
    const counts = new Map<District, number>();
    districtOptionsSource.forEach((activity) => {
      counts.set(activity.district, (counts.get(activity.district) || 0) + 1);
    });
    return counts;
  }, [districtOptionsSource]);

  const availableDistricts = useMemo(() => {
    const set = new Set<string>();
    districtOptionsSource.forEach((activity) => set.add(activity.district));
    return DISTRICT_LIST.filter((district) => set.has(district) || activeDistricts.includes(district));
  }, [districtOptionsSource, activeDistricts]);

  const ageOptions = useMemo(
    () => getAgeGroupOptions(
      activities.filter((activity) => matchesActivityFilters(activity, ["age"])),
      (activity) => activity.age_min,
      (activity) => activity.age_max,
      AGE_GROUPS,
    ),
    [activities, search, activeTypes, activeCategories, activeSubcategories, activeDistricts]
  );

  const grouped = useMemo(() => {
    const groups: { type: string; label: string; icon: string; activities: Activity[] }[] = [];
    const seen = new Set<string>();

    for (const activity of filteredActivities) {
      const type = getActivityTypeValue(activity);
      const typeOption = typeOptionsByValue.get(type);

      if (!seen.has(type)) {
        seen.add(type);
        groups.push({
          type,
          label: typeOption?.label || type,
          icon: typeOption?.icon || "✨",
          activities: [],
        });
      }

      groups.find((group) => group.type === type)!.activities.push(activity);
    }

    return groups;
  }, [filteredActivities, typeOptionsByValue]);

  const mapGroups = useMemo((): MarkerGroup[] => {
    const groups: Record<string, MarkerGroup> = {};

    for (const activity of filteredActivities) {
      const coords: [number, number] = activity.lat && activity.lng
        ? [activity.lat, activity.lng]
        : (DISTRICT_COORDS[activity.district] || KRAKOW_CENTER);
      const key = `${coords[0]},${coords[1]}`;
      const markerIcon = typeOptionsByValue.get(getActivityTypeValue(activity))?.icon || "🎯";

      if (!groups[key]) {
        groups[key] = {
          coords,
          events: [],
          label: activity.title,
          markerIcon,
        };
      }

      groups[key].events.push({
        id: activity.id,
        title: activity.title,
        slug: activity.slug,
        street: activity.venue_address || activity.street || "",
        city: activity.city || activity.district,
        image_url: activity.image_url,
      });
    }

    return Object.values(groups);
  }, [filteredActivities, typeOptionsByValue]);

  const activeFilterBadges = useMemo(() => {
    const badges: { id: string; label: string; onRemove: () => void }[] = [];

    if (search.trim()) {
      badges.push({ id: "search", label: `Szukaj: ${search.trim()}`, onRemove: () => setSearch("") });
    }

    activeTypes.forEach((type) => {
      const typeOption = typeOptionsByValue.get(type);
      badges.push({
        id: `type-${type}`,
        label: `Typ: ${typeOption?.label || type}`,
        onRemove: () => setActiveTypes((prev) => prev.filter((item) => item !== type)),
      });
    });

    activeCategories.forEach((category) => {
      const categoryOption = categoryOptionsByValue.get(category);
      badges.push({
        id: `category-${category}`,
        label: `Kategoria: ${categoryOption?.label || category}`,
        onRemove: () => setActiveCategories((prev) => prev.filter((item) => item !== category)),
      });
    });

    activeSubcategories.forEach((subcategory) => {
      const subcategoryOption = subcategoryOptionsByValue.get(subcategory);
      badges.push({
        id: `subcategory-${subcategory}`,
        label: `Tematyka: ${subcategoryOption?.label || subcategory}`,
        onRemove: () => setActiveSubcategories((prev) => prev.filter((item) => item !== subcategory)),
      });
    });

    activeAgeGroups.forEach((ageKey) => {
      const group = AGE_GROUPS.find((item) => item.key === ageKey);
      if (group) {
        badges.push({
          id: `age-${group.key}`,
          label: `Wiek: ${group.label}`,
          onRemove: () => setActiveAgeGroups((prev) => prev.filter((item) => item !== group.key)),
        });
      }
    });

    activeDistricts.forEach((district) => {
      badges.push({
        id: `district-${district}`,
        label: `Dzielnica: ${district}`,
        onRemove: () => setActiveDistricts((prev) => prev.filter((item) => item !== district)),
      });
    });

    return badges;
  }, [search, activeTypes, activeCategories, activeSubcategories, activeAgeGroups, activeDistricts, typeOptionsByValue, categoryOptionsByValue, subcategoryOptionsByValue]);

  function clearFilters() {
    setSearch("");
    setActiveTypes([]);
    setActiveCategories([]);
    setActiveSubcategories([]);
    setActiveDistricts([]);
    setActiveAgeGroups([]);
  }

  function toggleType(type: string) {
    setActiveTypes((prev) =>
      prev.includes(type) ? prev.filter((item) => item !== type) : [...prev, type]
    );
    setActiveCategories([]);
    setActiveSubcategories([]);
  }

  function toggleCategory(category: string) {
    setActiveCategories((prev) =>
      prev.includes(category) ? prev.filter((item) => item !== category) : [...prev, category]
    );
    setActiveSubcategories([]);
  }

  function toggleSubcategory(subcategory: string) {
    setActiveSubcategories((prev) =>
      prev.includes(subcategory) ? prev.filter((item) => item !== subcategory) : [...prev, subcategory]
    );
  }

  function toggleAgeGroup(ageKey: string) {
    setActiveAgeGroups((prev) =>
      prev.includes(ageKey) ? prev.filter((item) => item !== ageKey) : [...prev, ageKey]
    );
  }

  function toggleDistrict(district: District) {
    setActiveDistricts((prev) =>
      prev.includes(district) ? prev.filter((item) => item !== district) : [...prev, district]
    );
  }

  return (
    <div>
    <PageHero
      title="Inspirujące Zajęcia"
      subtitle="Sport, muzyka, języki, sztuka — znajdź aktywności dopasowane do wieku i zainteresowań dziecka"
      search={search}
      onSearch={setSearch}
    />
    <div className="container-page pt-3 pb-10">
      <div className="olive-gradient-panel rounded-[28px] px-4 py-5 shadow-[0_24px_70px_rgba(0,0,0,0.28)] sm:px-6 sm:py-6 lg:px-8 lg:py-8">
      <MobileActionBar
        filtersOpen={filtersOpen}
        hasActiveFilters={hasActiveFilters}
        onToggleFilters={() => setFiltersOpen(!filtersOpen)}
        view={view}
        onSetView={setView}
        addHref="/dodaj?type=activity"
        addLabel="Dodaj zajęcia"
      />

      {filtersOpen && (
        <div className="lg:hidden rounded-xl border border-border bg-card p-3 mb-4 space-y-2.5">
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
          <FilterSection title={<p className="text-[11px] font-medium text-muted-foreground">Wiek dziecka</p>} defaultCollapsed={false}>
            <div className="flex flex-wrap gap-1">
              {ageOptions.filter((group) => group.count > 0 || activeAgeGroups.includes(group.key)).map((group) => {
                const selected = activeAgeGroups.includes(group.key);
                return (
                  <button key={group.key} onClick={() => toggleAgeGroup(group.key)}
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
          <FilterSection title={<p className="text-[11px] font-medium text-muted-foreground">Tematyka</p>} defaultCollapsed={false}>
            <div className="flex flex-wrap gap-1">
              {subcategoryOptions.map((option) => {
                const selected = activeSubcategories.includes(option.value);
                return (
                  <button key={option.value} onClick={() => toggleSubcategory(option.value)}
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
          <FilterSection title={<p className="text-[11px] font-medium text-muted-foreground">Dzielnica</p>} defaultCollapsed={false}>
            <div className="flex flex-wrap gap-1">
              {availableDistricts.map((district) => {
                const selected = activeDistricts.includes(district);
                const count = districtCounts.get(district) || 0;
                const icon = DISTRICT_ICONS[district] || "📍";
                return (
                  <button
                    key={district}
                    onClick={() => toggleDistrict(district)}
                    className={cn(
                      "inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-medium border transition-all duration-200",
                      selected ? "bg-primary text-primary-foreground border-primary" : "bg-background text-muted border-border hover:border-primary/30 hover:text-foreground"
                    )}
                  >
                    <span>{icon}</span>
                    <span>{district}</span>
                    <span className="text-[10px] opacity-60">{count}</span>
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

      <div className="lg:flex lg:gap-6 lg:items-start">
        <aside className="hidden lg:block w-[240px] xl:w-[260px] shrink-0 rounded-2xl overflow-hidden border border-border bg-white">
          <div className="p-2.5 space-y-2.5">
            <div className="flex items-center gap-2 px-0.5 pb-0.5">
              <span className="text-[10px] font-black uppercase tracking-[0.14em] text-[#e60100]">Filtry</span>
              <div className="flex-1 h-px bg-border/70 rounded-full" />
            </div>
            <div className="flex items-center gap-1 rounded-lg border border-border p-0.5 bg-accent/50">
              <button onClick={() => setView("list")} className={cn("flex-1 inline-flex items-center justify-center gap-1 px-2 py-1 rounded-md text-[10px] font-medium transition-all duration-200", view === "list" ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:text-foreground")}>
                <LayoutGrid size={11} /> Lista
              </button>
              <button onClick={() => setView("map")} className={cn("flex-1 inline-flex items-center justify-center gap-1 px-2 py-1 rounded-md text-[10px] font-medium transition-all duration-200", view === "map" ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:text-foreground")}>
                <MapIcon size={11} /> Mapa
              </button>
            </div>

            <div className="border-t border-border" />

            <FilterSection title={<p className="text-[9px] font-semibold text-muted-foreground uppercase tracking-wider">Typ</p>} defaultCollapsed={!filtersOpenDesktop}>
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

            <FilterSection title={<p className="text-[9px] font-semibold text-muted-foreground uppercase tracking-wider">Wiek</p>} defaultCollapsed={!filtersOpenDesktop}>
              <div className="flex flex-col gap-0.5">
                {ageOptions.filter((group) => group.count > 0 || activeAgeGroups.includes(group.key)).map((group) => {
                  const selected = activeAgeGroups.includes(group.key);
                  return (
                    <button key={group.key} onClick={() => toggleAgeGroup(group.key)}
                      className={cn("flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] font-medium text-left transition-all duration-200",
                        selected ? "bg-primary text-primary-foreground" : "text-foreground hover:bg-accent")}>
                      <span>{group.icon}</span>
                      <span className="flex-1">{group.label}</span>
                      <span className="text-[8px] opacity-40">{group.count}</span>
                      {selected && <Check size={10} />}
                    </button>
                  );
                })}
              </div>
            </FilterSection>

            <FilterSection title={<p className="text-[9px] font-semibold text-muted-foreground uppercase tracking-wider">Kategoria</p>} defaultCollapsed={!filtersOpenDesktop}>
              <div className="flex flex-col gap-0.5">
                {categoryOptions.map((option) => {
                  const selected = activeCategories.includes(option.value);
                  return (
                    <button key={option.value} onClick={() => toggleCategory(option.value)}
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

            <FilterSection title={<p className="text-[9px] font-semibold text-muted-foreground uppercase tracking-wider">Tematyka</p>} defaultCollapsed>
              <div className="flex flex-col gap-0.5">
                {subcategoryOptions.map((option) => {
                  const selected = activeSubcategories.includes(option.value);
                  return (
                    <button key={option.value} onClick={() => toggleSubcategory(option.value)}
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

            <FilterSection title={<p className="text-[9px] font-semibold text-muted-foreground uppercase tracking-wider">Dzielnica</p>} defaultCollapsed>
              <div className="flex flex-col gap-0.5">
                {availableDistricts.map((district) => {
                  const selected = activeDistricts.includes(district);
                  const count = districtCounts.get(district) || 0;
                  const icon = DISTRICT_ICONS[district] || "📍";
                  return (
                    <button
                      key={district}
                      onClick={() => toggleDistrict(district)}
                      className={cn(
                        "flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] font-medium text-left transition-all duration-200",
                        selected ? "bg-primary text-primary-foreground" : "text-foreground hover:bg-accent"
                      )}
                    >
                      <span>{icon}</span>
                      <span className="flex-1">{district}</span>
                      {selected && <Check size={10} />}
                      <span className="text-[8px] opacity-40">{count}</span>
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

        <ListPageMainContent
          topContent={(
            <>
            <SubmissionCta
              title="Tworzysz ciekawe zajęcia dla dzieci?"
              description="Dodaj je do katalogu i ułatw rodzicom znalezienie regularnych aktywności w okolicy."
              buttonLabel="Dodaj zajęcia"
              href="/dodaj?type=activity"
            />

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
            </>
          )}
        >

          {view === "map" ? (
            <div className="rounded-xl overflow-hidden border border-border" style={{ height: "500px" }}>
              {MapComponent ? (
                <MapComponent groups={mapGroups} basePath="/zajecia" />
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center bg-accent/20 gap-3">
                  <div className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
                  <p className="text-[13px] text-muted-foreground">Ładowanie mapy…</p>
                </div>
              )}
            </div>
          ) : filteredActivities.length === 0 ? (
            <div className="text-center py-16">
              <Search size={32} className="mx-auto text-muted-foreground/20 mb-3" />
              <p className="text-[14px] font-semibold text-foreground mb-2">Brak zajęć pasujących do filtrów.</p>
              <p className="text-[13px] text-muted mb-3">Zmień filtry albo wyczyść je, aby zobaczyć więcej wyników.</p>
              {hasActiveFilters && (
                <button onClick={clearFilters} className="text-[12px] font-medium text-primary hover:text-primary-hover transition-colors">
                  Wyczyść filtry
                </button>
              )}
            </div>
          ) : (
            <div className="space-y-12">
              {grouped.map((group) => (
                <section key={group.type}>
                  <ListGroupHeader icon={group.icon} title={group.label} count={group.activities.length} />
                  <div className="grid grid-cols-1 sm:grid-cols-3 xl:grid-cols-4 gap-4">
                    {group.activities.map((activity) => (
                      <ContentCard key={activity.id} item={activity} variant="vertical" />
                    ))}
                  </div>
                </section>
              ))}
            </div>
          )}
        </ListPageMainContent>
      </div>
      </div>
    </div>
    </div>
  );
}
