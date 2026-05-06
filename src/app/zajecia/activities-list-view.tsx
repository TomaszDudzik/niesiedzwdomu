"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Search, LayoutGrid, MapIcon, SlidersHorizontal, X, MapPin, Check, ChevronDown } from "lucide-react";
import { MobileActionBar } from "@/components/ui/mobile-action-bar";
import { PageHero } from "@/components/layout/page-hero";
import { ListPageMainContent } from "@/components/layout/list-page-main-content";
import { DISTRICT_LIST } from "@/lib/mock-data";
import { FilterSection } from "@/components/ui/filter-section";
import { cn } from "@/lib/utils";
import { getAgeGroupOptions, getTaxonomyOptions, matchesTaxonomyFilter, mergeSelectedTaxonomyOptions } from "@/lib/taxonomy-filters";
import type { Activity, District } from "@/types/database";
import { ImageWithFallback } from "@/components/ui/image-with-fallback";

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

interface ActivityFormGroup {
  formLabel: string;
  activities: Activity[];
}

interface ActivityOrganizerTile {
  organizerKey: string;
  organizerName: string;
  leadActivity: Activity;
  formGroups: ActivityFormGroup[];
  activities: Activity[];
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

function getActivityOrganizerName(activity: Activity): string {
  return activity.organizer_data?.organizer_name?.trim() || activity.organizer?.trim() || "Bez organizatora";
}

function getActivityFormLabel(activity: Activity): string {
  return activity.category_lvl_2 ?? activity.category ?? activity.activity_type ?? "Inna forma";
}

function getActivityCountLabel(count: number): string {
  if (count === 1) return "1 zajęcia";
  if (count < 5) return `${count} zajęcia`;
  return `${count} zajęć`;
}

export function ActivitiesListView({ activities }: ActivitiesListViewProps) {
  const [search, setSearch] = useState("");
  const [activeTypes, setActiveTypes] = useState<string[]>([]);
  const [activeCategories, setActiveCategories] = useState<string[]>([]);
  const [activeSubcategories, setActiveSubcategories] = useState<string[]>([]);
  const [activeDistricts, setActiveDistricts] = useState<District[]>([]);
  const [activeAgeGroups, setActiveAgeGroups] = useState<string[]>([]);
  const [activeActivityTypes, setActiveActivityTypes] = useState<string[]>([]);
  const [view, setView] = useState<ViewMode>("list");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [filtersOpenDesktop, setFiltersOpenDesktop] = useState(false);
  const [expandedOrganizers, setExpandedOrganizers] = useState<Record<string, boolean>>({});
  const [MapComponent, setMapComponent] = useState<React.ComponentType<{ groups: MarkerGroup[]; basePath?: string }> | null>(null);

  const ageGroups = useMemo(
    () => AGE_GROUPS.filter((group) => activeAgeGroups.includes(group.key)),
    [activeAgeGroups]
  );

  const hasActiveFilters =
    !!search || activeTypes.length > 0 || activeCategories.length > 0 || activeSubcategories.length > 0 || activeDistricts.length > 0 || activeAgeGroups.length > 0 || activeActivityTypes.length > 0;

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

  function matchesActivityType(activity: Activity) {
    if (activeActivityTypes.length === 0) return true;
    const items = activity.list_of_activities
      ? activity.list_of_activities.split(";").map((s) => s.trim().toLowerCase()).filter(Boolean)
      : [];
    return activeActivityTypes.some((t) => items.includes(t.toLowerCase()));
  }

  function matchesActivityFilters(activity: Activity, excluded: Array<"type" | "category" | "subcategory" | "district" | "age" | "activityType"> = []) {
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
    if (!excluded.includes("activityType") && !matchesActivityType(activity)) {
      return false;
    }
    return true;
  }

  const filteredActivities = useMemo(
    () => activities.filter((activity) => matchesActivityFilters(activity)),
    [activities, search, activeTypes, activeCategories, activeSubcategories, activeDistricts, ageGroups, activeActivityTypes]
  );

  const activityTypeOptions = useMemo(() => {
    const counts = new Map<string, number>();
    activities.filter((a) => matchesActivityFilters(a, ["activityType"])).forEach((a) => {
      if (!a.list_of_activities) return;
      a.list_of_activities.split(";").map((s) => s.trim()).filter(Boolean).forEach((item) => {
        counts.set(item, (counts.get(item) ?? 0) + 1);
      });
    });
    const all = Array.from(counts.entries()).map(([value, count]) => ({ value, label: value, count }));
    all.sort((a, b) => b.count - a.count || a.label.localeCompare(b.label, "pl"));
    activeActivityTypes.forEach((t) => { if (!counts.has(t)) all.push({ value: t, label: t, count: 0 }); });
    return all;
  }, [activities, search, activeTypes, activeCategories, activeSubcategories, activeDistricts, ageGroups, activeActivityTypes]);

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

  const organizers = useMemo(() => {
    const organizerMap = new Map<string, ActivityOrganizerTile>();

    [...filteredActivities]
      .sort((a, b) => a.title.localeCompare(b.title, "pl"))
      .forEach((activity) => {
        const organizerKey = activity.organizer_id
          ? `id:${activity.organizer_id}`
          : `name:${getActivityOrganizerName(activity).toLowerCase()}`;

        const existing = organizerMap.get(organizerKey);
        if (!existing) {
          organizerMap.set(organizerKey, {
            organizerKey,
            organizerName: getActivityOrganizerName(activity),
            leadActivity: activity,
            formGroups: [],
            activities: [activity],
          });
        } else {
          existing.activities.push(activity);
          if (activity.title.localeCompare(existing.leadActivity.title, "pl") < 0) {
            existing.leadActivity = activity;
          }
        }
      });

    return Array.from(organizerMap.values())
      .map((organizer) => {
        const formMap = new Map<string, Activity[]>();
        organizer.activities
          .sort((a, b) => a.title.localeCompare(b.title, "pl"))
          .forEach((activity) => {
            const formLabel = getActivityFormLabel(activity);
            const list = formMap.get(formLabel) || [];
            list.push(activity);
            formMap.set(formLabel, list);
          });

        const formGroups: ActivityFormGroup[] = Array.from(formMap.entries())
          .map(([formLabel, acts]) => ({
            formLabel,
            activities: acts,
          }))
          .sort((a, b) => a.formLabel.localeCompare(b.formLabel, "pl"));

        return { ...organizer, formGroups };
      })
      .sort((a, b) => a.organizerName.localeCompare(b.organizerName, "pl"));
  }, [filteredActivities]);

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

    activeActivityTypes.forEach((t) => {
      badges.push({
        id: `activityType-${t}`,
        label: `Tematyka: ${t}`,
        onRemove: () => setActiveActivityTypes((prev) => prev.filter((item) => item !== t)),
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
    setActiveActivityTypes([]);
  }

  function toggleActivityType(t: string) {
    setActiveActivityTypes((prev) =>
      prev.includes(t) ? prev.filter((item) => item !== t) : [...prev, t]
    );
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

  function toggleOrganizerActivities(organizerKey: string) {
    setExpandedOrganizers((prev) => ({ ...prev, [organizerKey]: !prev[organizerKey] }));
  }

  return (
    <div>
    <PageHero
      title="Inspirujące Zajęcia"
      subtitle="Sport, muzyka, języki, sztuka — znajdź aktywności dopasowane do wieku i zainteresowań dziecka"
      addHref="/dodaj?type=activity"
      addTitle="Tworzysz ciekawe zajęcia dla dzieci?"
      addDescription="Dodaj je do katalogu i ułatw rodzicom znalezienie regularnych aktywności w okolicy."
      addLabel="Dodaj zajęcia"
    />
    <div className="container-page pt-0 pb-10">
      <div className="rounded-[28px] bg-white px-4 py-5 sm:px-6 sm:py-6 lg:px-8 lg:py-8">
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
        <div className="lg:hidden rounded-xl p-3 mb-4 space-y-2.5">
          <div className="space-y-1">
            <p className="text-[11px] font-medium text-muted-foreground">Szukaj</p>
            <div className="relative">
              <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Szukaj zajęć..."
                className="w-full rounded-lg border border-border bg-background py-1.5 pl-7 pr-2 text-[11px] text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>
          </div>

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
          <FilterSection title={<p className="text-[11px] font-medium text-muted-foreground">Typ</p>} defaultCollapsed={false}>
            <div className="flex flex-wrap gap-1">
              {typeOptions.filter((o) => o.count > 0 || activeTypes.includes(o.value)).map((option) => {
                const selected = activeTypes.includes(option.value);
                return (
                  <button key={option.value} onClick={() => toggleType(option.value)}
                    className={cn("inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-medium border transition-all duration-200",
                      selected ? "bg-primary text-primary-foreground border-primary" : "bg-background text-muted border-border hover:border-primary/30 hover:text-foreground")}>
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
              {activityTypeOptions.map((option) => {
                const selected = activeActivityTypes.includes(option.value);
                return (
                  <button key={option.value} onClick={() => toggleActivityType(option.value)}
                    className={cn("inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-medium border transition-all duration-200",
                      selected ? "bg-primary text-primary-foreground border-primary" : "bg-background text-muted border-border hover:border-primary/30 hover:text-foreground")}>
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
        <aside className="hidden lg:block w-[240px] xl:w-[260px] shrink-0 rounded-2xl overflow-hidden -mt-3">
          <div className="p-2.5 space-y-2.5">
            <div className="space-y-1">
              <p className="text-[11px] font-semibold text-foreground uppercase tracking-wider">Szukaj</p>
              <div className="relative">
                <Search size={11} className="absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Szukaj..."
                  className="w-full rounded-lg border border-border bg-background py-1 pl-6 pr-2 text-[10px] text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
              </div>
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

            <FilterSection title={<p className="text-[11px] font-semibold text-foreground uppercase tracking-wider">Wiek</p>} defaultCollapsed={!filtersOpenDesktop}>
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

            <FilterSection title={<p className="text-[11px] font-semibold text-foreground uppercase tracking-wider">Typ</p>} defaultCollapsed={!filtersOpenDesktop}>
              <div className="flex flex-col gap-0.5">
                {typeOptions.filter((o) => o.count > 0 || activeTypes.includes(o.value)).map((option) => {
                  const selected = activeTypes.includes(option.value);
                  return (
                    <button key={option.value} onClick={() => toggleType(option.value)}
                      className={cn("flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] font-medium text-left transition-all duration-200",
                        selected ? "bg-primary text-primary-foreground" : "text-foreground hover:bg-accent")}>
                      <span className="flex-1">{option.label}</span>
                      {selected && <Check size={10} />}
                      <span className="text-[8px] opacity-40">{option.count}</span>
                    </button>
                  );
                })}
              </div>
            </FilterSection>

            <FilterSection title={<p className="text-[11px] font-semibold text-foreground uppercase tracking-wider">Tematyka</p>} defaultCollapsed={!filtersOpenDesktop}>
              <div className="flex flex-col gap-0.5">
                {activityTypeOptions.map((option) => {
                  const selected = activeActivityTypes.includes(option.value);
                  return (
                    <button key={option.value} onClick={() => toggleActivityType(option.value)}
                      className={cn("flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] font-medium text-left transition-all duration-200",
                        selected ? "bg-primary text-primary-foreground" : "text-foreground hover:bg-accent")}>
                      <span className="flex-1">{option.label}</span>
                      {selected && <Check size={10} />}
                      <span className="text-[8px] opacity-40">{option.count}</span>
                    </button>
                  );
                })}
              </div>
            </FilterSection>

            <FilterSection title={<p className="text-[11px] font-semibold text-foreground uppercase tracking-wider">Dzielnica</p>} defaultCollapsed>
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
          topContent={activeFilterBadges.length > 0 ? (
            <div className="rounded-xl border border-border bg-card px-2.5 py-2">
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
          ) : undefined}
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
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
              {organizers.map((organizer) => {
                const imgSrc = organizer.leadActivity.image_cover || organizer.leadActivity.image_url;
                const address = [organizer.leadActivity.street, organizer.leadActivity.city].filter(Boolean).join(", ");
                const listOfActivities = organizer.leadActivity.list_of_activities
                  ? organizer.leadActivity.list_of_activities.split(";").map((s) => s.trim()).filter(Boolean)
                  : [];
                const visibleTags = listOfActivities.slice(0, 4);
                const hiddenTagCount = Math.max(listOfActivities.length - visibleTags.length, 0);

                return (
                  <article
                    key={organizer.organizerKey}
                    className="group flex flex-col rounded-2xl border border-border bg-card shadow-[var(--shadow-card)] hover:shadow-[var(--shadow-card-hover)] hover:-translate-y-1 transition-all duration-200 overflow-hidden"
                  >
                    {/* Image */}
                    <Link href={`/zajecia/${organizer.leadActivity.slug}`} className="relative aspect-[4/3] w-full shrink-0 bg-accent overflow-hidden">
                      {imgSrc ? (
                        <ImageWithFallback
                          src={imgSrc}
                          alt={organizer.organizerName}
                          className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.04]"
                          loading="lazy"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-5xl text-muted-foreground/20">🎯</div>
                      )}
                    </Link>

                    {/* Body */}
                    <div className="flex flex-col p-3.5 flex-1">
                      {/* Content — fixed height so the divider line always falls at the same position */}
                      <div className="flex flex-col gap-2 h-[108px] overflow-hidden">
                        <Link href={`/zajecia/${organizer.leadActivity.slug}`} className="font-bold text-[13px] leading-snug text-foreground group-hover:text-[#e60100] transition-colors duration-150 line-clamp-2">
                          {organizer.organizerName}
                        </Link>

                        {organizer.leadActivity.description_short && (
                          <p className="text-[11px] text-muted leading-relaxed line-clamp-3">
                            {organizer.leadActivity.description_short}
                          </p>
                        )}

                        {address && (
                          <div className="flex items-start gap-1 text-[10px] text-muted-foreground">
                            <MapPin size={10} className="mt-0.5 shrink-0 text-muted-foreground/60" />
                            <span className="line-clamp-1">{address}</span>
                          </div>
                        )}
                      </div>

                      {/* Tags — always anchored at the bottom of the card */}
                      <div className="pt-2.5 mt-2.5 border-t border-border/50 min-h-[28px]">
                        <div className="flex flex-wrap gap-1.5">
                          {visibleTags.map((item, i) => {
                            const colors = [
                              "bg-red-50 text-red-700 border-red-200",
                              "bg-orange-50 text-orange-700 border-orange-200",
                              "bg-amber-50 text-amber-700 border-amber-200",
                              "bg-emerald-50 text-emerald-700 border-emerald-200",
                              "bg-sky-50 text-sky-700 border-sky-200",
                              "bg-violet-50 text-violet-700 border-violet-200",
                              "bg-pink-50 text-pink-700 border-pink-200",
                            ];
                            const color = colors[i % colors.length];
                            return (
                              <span key={item} className={`inline-flex items-center rounded-md border px-2 py-0.5 text-[10px] font-medium leading-snug ${color}`}>
                                {item}
                              </span>
                            );
                          })}
                          {hiddenTagCount > 0 && (
                            <span className="inline-flex items-center rounded-md border border-border bg-accent px-2 py-0.5 text-[10px] font-medium text-muted-foreground leading-snug">
                              +{hiddenTagCount}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </ListPageMainContent>
      </div>
      </div>
    </div>
    </div>
  );
}
