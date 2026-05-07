"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Search, X, MapPin, Check, ChevronDown } from "lucide-react";
import { MobileActionBar } from "@/components/ui/mobile-action-bar";
import { PageHero } from "@/components/layout/page-hero";
import { ListGroupHeader } from "@/components/layout/list-group-header";
import { ListPageMainContent } from "@/components/layout/list-page-main-content";
import { ListPageSidebar } from "@/components/layout/list-page-sidebar";
import { FilterBadgeBar } from "@/components/ui/filter-badge-bar";
import { ViewModeToggle } from "@/components/ui/view-mode-toggle";
import { FilterSection } from "@/components/ui/filter-section";
import { TopSearchBar } from "@/components/ui/top-search-bar";
import { ImageWithFallback } from "@/components/ui/image-with-fallback";
import { useListFilters } from "@/hooks/use-list-filters";
import { DISTRICT_ICONS, KRAKOW_CENTER, DISTRICT_COORDS } from "@/lib/district-constants";
import { cn } from "@/lib/utils";
import type { Activity, District } from "@/types/database";
import type { FilterBadge } from "@/components/ui/filter-badge-bar";

const AGE_GROUPS = [
  { key: "0-4", label: "0–4 lata", icon: "👶", min: 0, max: 4 },
  { key: "5-7", label: "5–7 lat", icon: "🧒", min: 5, max: 7 },
  { key: "8-10", label: "8–10 lat", icon: "🎒", min: 8, max: 10 },
  { key: "11-14", label: "11–14 lat", icon: "🧑", min: 11, max: 14 },
  { key: "15+", label: "15+ lat", icon: "🎓", min: 15, max: 99 },
] as const;

type ViewMode = "list" | "map";

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

interface ActivityTypeGroup {
  type: string;
  label: string;
  icon: string;
  organizers: ActivityOrganizerTile[];
}

interface ActivitiesListViewProps {
  activities: Activity[];
}

function getActivityTypeValue(activity: Activity): string {
  return activity.category_lvl_1 ?? activity.main_category ?? activity.activity_type ?? "Bez kategorii";
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

function hashString(value: string): number {
  let hash = 0;
  for (let i = 0; i < value.length; i += 1) {
    hash = ((hash << 5) - hash + value.charCodeAt(i)) | 0;
  }
  return Math.abs(hash);
}

export function ActivitiesListView({ activities }: ActivitiesListViewProps) {
  const [view, setView] = useState<ViewMode>("list");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [filtersOpenDesktop, setFiltersOpenDesktop] = useState(false);
  const [expandedOrganizers, setExpandedOrganizers] = useState<Record<string, boolean>>({});
  const [activeActivityTypes, setActiveActivityTypes] = useState<string[]>([]);
  const [shuffleSeed] = useState(() => Math.random().toString(36).slice(2));
  const [MapComponent, setMapComponent] = useState<React.ComponentType<{ groups: MarkerGroup[]; basePath?: string }> | null>(null);

  const filters = useListFilters({
    items: activities,
    ageGroups: AGE_GROUPS,
    getType:        (a) => a.category_lvl_1 ?? a.main_category ?? a.activity_type,
    getCategory:    (a) => a.category_lvl_2 ?? a.category,
    getSubcategory: (a) => a.category_lvl_3 ?? a.subcategory,
    getDistrict:    (a) => a.district,
    getAgeMin:      (a) => a.age_min,
    getAgeMax:      (a) => a.age_max,
    getSearchText:  (a) => [a.title, a.description_short, a.street, a.postcode, a.city, a.note, a.organizer].join(" "),
  });

  // Extra filter unique to zajecia: list_of_activities field
  const activityTypeOptions = useMemo(() => {
    const counts = new Map<string, number>();
    filters.filteredItems.forEach((a) => {
      if (!a.list_of_activities) return;
      a.list_of_activities.split(";").map((s) => s.trim()).filter(Boolean).forEach((item) => {
        counts.set(item, (counts.get(item) ?? 0) + 1);
      });
    });
    const all = Array.from(counts.entries()).map(([value, count]) => ({ value, label: value, count }));
    all.sort((a, b) => b.count - a.count || a.label.localeCompare(b.label, "pl"));
    activeActivityTypes.forEach((t) => { if (!counts.has(t)) all.push({ value: t, label: t, count: 0 }); });
    return all;
  }, [filters.filteredItems, activeActivityTypes]);

  const filteredActivities = useMemo(() => {
    if (activeActivityTypes.length === 0) return filters.filteredItems;
    return filters.filteredItems.filter((a) => {
      const items = a.list_of_activities
        ? a.list_of_activities.split(";").map((s) => s.trim().toLowerCase()).filter(Boolean)
        : [];
      return activeActivityTypes.some((t) => items.includes(t.toLowerCase()));
    });
  }, [filters.filteredItems, activeActivityTypes]);

  const hasActiveFilters = filters.hasActiveFilters || activeActivityTypes.length > 0;

  function clearAll() {
    filters.clearFilters();
    setActiveActivityTypes([]);
  }

  const activityTypeBadges = useMemo((): FilterBadge[] =>
    activeActivityTypes.map((t) => ({
      id: `activityType-${t}`,
      label: `Tematyka: ${t}`,
      onRemove: () => setActiveActivityTypes((p) => p.filter((x) => x !== t)),
    })),
    [activeActivityTypes]
  );

  const allBadges = useMemo(
    () => [...filters.filterBadges, ...activityTypeBadges],
    [filters.filterBadges, activityTypeBadges]
  );

  useEffect(() => {
    if (view === "map" && !MapComponent) {
      import("@/app/wydarzenia/map-leaflet").then((mod) => {
        setMapComponent(() => mod.MapLeaflet);
      });
    }
  }, [view, MapComponent]);

  const randomizedActivities = useMemo(() => {
    return [...filteredActivities]
      .map((activity) => ({ activity, score: hashString(`${shuffleSeed}:${activity.id}`) }))
      .sort((a, b) => a.score - b.score)
      .map((entry) => entry.activity);
  }, [filteredActivities, shuffleSeed]);

  // Group by category_lvl_1 and then by organizer, preserving shuffled order.
  const groupedByType = useMemo((): ActivityTypeGroup[] => {
    const typeMap = new Map<string, { label: string; icon: string; organizers: Map<string, ActivityOrganizerTile> }>();

    randomizedActivities.forEach((activity) => {
      const type = getActivityTypeValue(activity);
      const typeOption = filters.typeOptionsByValue.get(type);

      if (!typeMap.has(type)) {
        typeMap.set(type, {
          label: typeOption?.label || type,
          icon: typeOption?.icon || "🎯",
          organizers: new Map<string, ActivityOrganizerTile>(),
        });
      }

      const typeGroup = typeMap.get(type)!;
      const organizerKey = activity.organizer_id
        ? `id:${activity.organizer_id}`
        : `name:${getActivityOrganizerName(activity).toLowerCase()}`;

      const existingOrganizer = typeGroup.organizers.get(organizerKey);
      if (!existingOrganizer) {
        typeGroup.organizers.set(organizerKey, {
          organizerKey,
          organizerName: getActivityOrganizerName(activity),
          leadActivity: activity,
          formGroups: [],
          activities: [activity],
        });
      } else {
        existingOrganizer.activities.push(activity);
      }
    });

    return Array.from(typeMap.entries()).map(([type, group]) => ({
      type,
      label: group.label,
      icon: group.icon,
      organizers: Array.from(group.organizers.values()).map((organizer) => {
        const formMap = new Map<string, Activity[]>();
        organizer.activities.forEach((activity) => {
          const formLabel = getActivityFormLabel(activity);
          const list = formMap.get(formLabel) || [];
          list.push(activity);
          formMap.set(formLabel, list);
        });

        const formGroups: ActivityFormGroup[] = Array.from(formMap.entries())
          .map(([formLabel, acts]) => ({ formLabel, activities: acts }));

        return { ...organizer, formGroups };
      }),
    }));
  }, [randomizedActivities, filters.typeOptionsByValue]);

  const mapGroups = useMemo((): MarkerGroup[] => {
    const groups: Record<string, MarkerGroup> = {};
    for (const activity of filteredActivities) {
      const coords: [number, number] = activity.lat && activity.lng
        ? [activity.lat, activity.lng]
        : (DISTRICT_COORDS[activity.district] || KRAKOW_CENTER);
      const key = `${coords[0]},${coords[1]}`;
      const markerIcon = filters.typeOptionsByValue.get(getActivityTypeValue(activity))?.icon || "🎯";
      if (!groups[key]) {
        groups[key] = { coords, events: [], label: activity.title, markerIcon };
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
  }, [filteredActivities, filters.typeOptionsByValue]);

  function toggleActivityType(t: string) {
    setActiveActivityTypes((p) => p.includes(t) ? p.filter((x) => x !== t) : [...p, t]);
  }

  function toggleOrganizerActivities(organizerKey: string) {
    setExpandedOrganizers((prev) => ({ ...prev, [organizerKey]: !prev[organizerKey] }));
  }

  return (
    <div>
      <PageHero
        title="Inspirujące Zajęcia"
        search={filters.search}
        onSearch={filters.setSearch}
        searchPlaceholder="Szukaj zajęć..."
        subtitle="Sport, muzyka, języki, sztuka — znajdź aktywności dopasowane do wieku i zainteresowań dziecka"
        addHref="/dodaj?type=activity"
        addTitle="Tworzysz ciekawe zajęcia dla dzieci?"
        addDescription="Dodaj je do katalogu i ułatw rodzicom znalezienie regularnych aktywności w okolicy."
        addLabel="Dodaj zajęcia"
      />
      <div className="container-page pt-0 pb-10">
        <div className="lg:hidden mb-3 px-1">
          <div className="relative">
            <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-amber-500" />
            <input
              value={filters.search}
              onChange={(e) => filters.setSearch(e.target.value)}
              placeholder="Szukaj zajęć..."
              className="w-full rounded-xl border-[0.5px] border-amber-300 bg-amber-50/40 py-1.5 pl-7 pr-2 text-[11px] text-black placeholder:text-black/40 focus:outline-none focus:border-amber-400"
            />
          </div>
        </div>
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
              <FilterSection title={<p className="text-[11px] font-medium text-muted-foreground">Typ</p>} defaultCollapsed={false}>
                <div className="flex flex-wrap gap-1">
                  {filters.typeOptions.filter((o) => o.count > 0 || filters.activeTypes.includes(o.value)).map((option) => {
                    const selected = filters.activeTypes.includes(option.value);
                    return (
                      <button key={option.value} onClick={() => filters.toggleType(option.value)}
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

              {filters.categoryOptions.length > 0 && (
                <FilterSection title={<p className="text-[11px] font-medium text-muted-foreground">Kategoria</p>} defaultCollapsed={false}>
                  <div className="flex flex-wrap gap-1">
                    {filters.categoryOptions.map((option) => {
                      const selected = filters.activeCategories.includes(option.value);
                      return (
                        <button key={option.value} onClick={() => filters.toggleCategory(option.value)}
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
                  {filters.ageOptions.filter((g) => g.count > 0 || filters.activeAgeGroups.includes(g.key)).map((group) => {
                    const selected = filters.activeAgeGroups.includes(group.key);
                    return (
                      <button key={group.key} onClick={() => filters.toggleAgeGroup(group.key)}
                        className={cn("inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-medium border transition-all duration-200",
                          selected ? "bg-primary text-primary-foreground border-primary" : "bg-background text-muted border-border hover:border-primary/30 hover:text-foreground")}>
                        <span>{group.icon}</span><span>{group.label}</span>
                        <span className="text-[10px] opacity-60">{group.count}</span>
                        {selected && <Check size={11} />}
                      </button>
                    );
                  })}
                </div>
              </FilterSection>

              <FilterSection title={<p className="text-[11px] font-medium text-muted-foreground">Dzielnica</p>} defaultCollapsed={false}>
                <div className="flex flex-wrap gap-1">
                  {filters.availableDistricts.map((district) => {
                    const selected = filters.activeDistricts.includes(district);
                    const count = filters.districtCounts.get(district) || 0;
                    const icon = DISTRICT_ICONS[district] || "📍";
                    return (
                      <button key={district} onClick={() => filters.toggleDistrict(district)}
                        className={cn("inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-medium border transition-all duration-200",
                          selected ? "bg-primary text-primary-foreground border-primary" : "bg-background text-muted border-border hover:border-primary/30 hover:text-foreground")}>
                        <span>{icon}</span><span>{district}</span>
                        <span className="text-[10px] opacity-60">{count}</span>
                        {selected && <Check size={11} />}
                      </button>
                    );
                  })}
                </div>
              </FilterSection>

              <div className="flex items-center gap-2 border-t border-border/70 pt-2">
                {hasActiveFilters && (
                  <button onClick={clearAll} className="inline-flex items-center gap-1 text-[11px] font-medium text-muted-foreground hover:text-foreground transition-colors">
                    <X size={11} /> Wyczyść filtry
                  </button>
                )}
                <button type="button" onClick={() => setFiltersOpen(false)}
                  className="ml-auto inline-flex items-center gap-1 rounded-lg border border-border px-2.5 py-1 text-[11px] font-medium text-foreground hover:bg-accent/60 transition-colors">
                  Schowaj filtry <ChevronDown size={11} className="rotate-180" />
                </button>
              </div>
            </div>
          )}

          <div className="lg:flex lg:gap-6 lg:items-start">
            <ListPageSidebar
              search={filters.search}
              onSearchChange={filters.setSearch}
              searchPlaceholder="Szukaj zajęć..."
              showSearch={false}
              hasActiveFilters={hasActiveFilters}
              onClearFilters={clearAll}
              topSlot={<ViewModeToggle view={view} onSetView={setView} />}
            >
              <FilterSection title={<p className="text-[11px] font-semibold text-foreground uppercase tracking-wider">Typ</p>} defaultCollapsed={!filtersOpenDesktop}>
                <div className="flex flex-col gap-0.5">
                  {filters.typeOptions.filter((o) => o.count > 0 || filters.activeTypes.includes(o.value)).map((option) => {
                    const selected = filters.activeTypes.includes(option.value);
                    return (
                      <button key={option.value} onClick={() => filters.toggleType(option.value)}
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

              {filters.categoryOptions.length > 0 && (
                <FilterSection title={<p className="text-[11px] font-semibold text-foreground uppercase tracking-wider">Kategoria</p>} defaultCollapsed={!filtersOpenDesktop}>
                  <div className="flex flex-col gap-0.5">
                    {filters.categoryOptions.map((option) => {
                      const selected = filters.activeCategories.includes(option.value);
                      return (
                        <button key={option.value} onClick={() => filters.toggleCategory(option.value)}
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
              )}

              <FilterSection title={<p className="text-[11px] font-semibold text-foreground uppercase tracking-wider">Wiek</p>} defaultCollapsed={!filtersOpenDesktop}>
                <div className="flex flex-col gap-0.5">
                  {filters.ageOptions.filter((g) => g.count > 0 || filters.activeAgeGroups.includes(g.key)).map((group) => {
                    const selected = filters.activeAgeGroups.includes(group.key);
                    return (
                      <button key={group.key} onClick={() => filters.toggleAgeGroup(group.key)}
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

              <FilterSection title={<p className="text-[11px] font-semibold text-foreground uppercase tracking-wider">Dzielnica</p>} defaultCollapsed>
                <div className="flex flex-col gap-0.5">
                  {filters.availableDistricts.map((district) => {
                    const selected = filters.activeDistricts.includes(district);
                    const count = filters.districtCounts.get(district) || 0;
                    const icon = DISTRICT_ICONS[district] || "📍";
                    return (
                      <button key={district} onClick={() => filters.toggleDistrict(district)}
                        className={cn("flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] font-medium text-left transition-all duration-200",
                          selected ? "bg-primary text-primary-foreground" : "text-foreground hover:bg-accent")}>
                        <span>{icon}</span>
                        <span className="flex-1">{district}</span>
                        {selected && <Check size={10} />}
                        <span className="text-[8px] opacity-40">{count}</span>
                      </button>
                    );
                  })}
                </div>
              </FilterSection>
            </ListPageSidebar>

            <ListPageMainContent
              topContent={allBadges.length > 0 ? <FilterBadgeBar badges={allBadges} onClearAll={clearAll} /> : undefined}
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
                    <button onClick={clearAll} className="text-[12px] font-medium text-primary hover:text-primary-hover transition-colors">
                      Wyczyść filtry
                    </button>
                  )}
                </div>
              ) : (
                <div className="space-y-12">
                  {groupedByType.map((group) => (
                    <section key={group.type}>
                      <ListGroupHeader icon={group.icon} title={group.label} count={group.organizers.length} />
                      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                        {group.organizers.map((organizer) => {
                          const imgSrc = organizer.leadActivity.image_cover || organizer.leadActivity.image_url;
                          const address = [organizer.leadActivity.street, organizer.leadActivity.city].filter(Boolean).join(", ");
                          const listOfActivities = organizer.leadActivity.list_of_activities
                            ? organizer.leadActivity.list_of_activities.split(";").map((s) => s.trim()).filter(Boolean)
                            : [];
                          const MAX_VISIBLE_TAGS = 4;
                          const visibleTags = listOfActivities.slice(0, MAX_VISIBLE_TAGS);
                          const hiddenTagCount = Math.max(listOfActivities.length - visibleTags.length, 0);

                          const tagColors = [
                            "bg-red-50 text-red-700 border-red-200",
                            "bg-orange-50 text-orange-700 border-orange-200",
                            "bg-amber-50 text-amber-700 border-amber-200",
                            "bg-emerald-50 text-emerald-700 border-emerald-200",
                            "bg-sky-50 text-sky-700 border-sky-200",
                            "bg-violet-50 text-violet-700 border-violet-200",
                            "bg-pink-50 text-pink-700 border-pink-200",
                          ];

                          return (
                            <Link
                              key={`${group.type}-${organizer.organizerKey}`}
                              href={`/zajecia/${organizer.leadActivity.slug}`}
                              className="group flex flex-col rounded-2xl border border-border bg-card shadow-[var(--shadow-card)] hover:shadow-[var(--shadow-card-hover)] hover:-translate-y-1 transition-all duration-200 overflow-hidden"
                            >
                              {/* Image */}
                              <div className="relative w-full shrink-0 bg-accent overflow-hidden" style={{ paddingBottom: "90%" }}>
                                {imgSrc ? (
                                  <ImageWithFallback
                                    src={imgSrc}
                                    alt={organizer.organizerName}
                                    className="absolute inset-0 h-full w-full object-cover object-center transition-transform duration-300 group-hover:scale-[1.04]"
                                    loading="lazy"
                                  />
                                ) : (
                                  <div className="absolute inset-0 flex h-full w-full items-center justify-center text-5xl text-muted-foreground/20">🎯</div>
                                )}
                              </div>

                              <div className="flex flex-col p-3.5 gap-0">
                                {/* 1. Title */}
                                <p className="font-bold text-[13px] leading-snug text-foreground group-hover:text-[#e60100] transition-colors duration-150 line-clamp-2 mb-2">
                                  {organizer.organizerName}
                                </p>

                                {/* 2. Subtitle */}
                                {organizer.leadActivity.description_short && (
                                  <p className="text-[11px] text-muted leading-relaxed line-clamp-3 mb-3">
                                    {organizer.leadActivity.description_short}
                                  </p>
                                )}

                                {/* 3. Separator */}
                                <hr className="border-border/50 mb-2.5" />

                                {/* 4. Address */}
                                {address && (
                                  <div className="flex items-start gap-1 text-[10px] text-muted-foreground mb-2.5">
                                    <MapPin size={10} className="mt-0.5 shrink-0 text-muted-foreground/60" />
                                    <span className="line-clamp-1">{address}</span>
                                  </div>
                                )}

                                {/* 5. Separator */}
                                {listOfActivities.length > 0 && (
                                  <hr className="border-border/50 mb-2.5" />
                                )}

                                {/* 6. List of activities – max 4 tags then count */}
                                {listOfActivities.length > 0 && (
                                  <div className="flex flex-wrap gap-1.5">
                                    {visibleTags.map((item, i) => (
                                      <span key={item} className={`inline-flex items-center rounded-md border px-2 py-0.5 text-[10px] font-medium leading-snug ${tagColors[i % tagColors.length]}`}>
                                        {item}
                                      </span>
                                    ))}
                                    {hiddenTagCount > 0 && (
                                      <span className="inline-flex items-center rounded-md border border-border bg-accent px-2 py-0.5 text-[10px] font-medium text-muted-foreground leading-snug">
                                        +{hiddenTagCount}
                                      </span>
                                    )}
                                  </div>
                                )}
                              </div>
                            </Link>
                          );
                        })}
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
