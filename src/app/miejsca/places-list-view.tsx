"use client";

import { useState, useMemo, useEffect } from "react";
import { Search, X, Check, ChevronDown } from "lucide-react";
import { MobileActionBar } from "@/components/ui/mobile-action-bar";
import { PageHero } from "@/components/layout/page-hero";
import { ListGroupHeader } from "@/components/layout/list-group-header";
import { ListPageMainContent } from "@/components/layout/list-page-main-content";
import { ListPageSidebar } from "@/components/layout/list-page-sidebar";
import { FilterBadgeBar } from "@/components/ui/filter-badge-bar";
import { ViewModeToggle } from "@/components/ui/view-mode-toggle";
import { TopSearchBar } from "@/components/ui/top-search-bar";
import { ContentCard } from "@/components/ui/content-card";
import { FilterSection } from "@/components/ui/filter-section";
import { useListFilters } from "@/hooks/use-list-filters";
import { DISTRICT_ICONS } from "@/lib/district-constants";
import { getTaxonomyIcon } from "@/lib/taxonomy-filters";
import { cn } from "@/lib/utils";
import type { Place, District } from "@/types/database";

const AGE_GROUPS = [
  { key: "0-3", label: "0–3 lata", icon: "👶", min: 0, max: 3 },
  { key: "4-6", label: "4–6 lat", icon: "🧒", min: 4, max: 6 },
  { key: "7-10", label: "7–10 lat", icon: "🎒", min: 7, max: 10 },
  { key: "11-14", label: "11–14 lat", icon: "🧑", min: 11, max: 14 },
  { key: "15+", label: "15+ lat", icon: "🎓", min: 15, max: 99 },
] as const;

type ViewMode = "list" | "map";

interface MarkerGroup {
  coords: [number, number];
  events: { id: string; title: string; slug: string; street: string; city: string; image_url?: string | null }[];
  label: string;
  markerIcon: string;
}

interface PlacesListViewProps {
  places: Place[];
}

function getPlaceTypeValue(place: Place): string {
  return place.category_lvl_1 ?? "Bez kategorii";
}

function getPlaceCategoryValue(place: Place): string {
  return place.category_lvl_2 ?? "";
}

export function PlacesListView({ places }: PlacesListViewProps) {
  const [view, setView] = useState<ViewMode>("list");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [filtersOpenDesktop, setFiltersOpenDesktop] = useState(false);
  const [MapComponent, setMapComponent] = useState<React.ComponentType<{ groups: MarkerGroup[]; basePath?: string }> | null>(null);

  const filters = useListFilters({
    items: places,
    ageGroups: AGE_GROUPS,
    getType:       getPlaceTypeValue,
    getCategory:   getPlaceCategoryValue,
    getDistrict:   (p) => p.district,
    getAgeMin:     (p) => p.age_min,
    getAgeMax:     (p) => p.age_max,
    getSearchText: (p) => [p.title, p.description_short, p.street, p.city].join(" "),
  });

  // Places enriches category options with icons from category_lvl_1
  const enrichedCategoryOptions = useMemo(
    () => filters.categoryOptions.map((option) => {
      const firstMatch = places.find((p) => getPlaceCategoryValue(p) === option.value);
      return { ...option, icon: getTaxonomyIcon(firstMatch?.category_lvl_1 ?? option.value) };
    }),
    [filters.categoryOptions, places]
  );

  // Lazy load map component
  useEffect(() => {
    if (view === "map" && !MapComponent) {
      import("@/app/wydarzenia/map-leaflet").then((mod) => {
        setMapComponent(() => mod.MapLeaflet);
      });
    }
  }, [view, MapComponent]);

  // Group results by category_lvl_1 preserving order
  const grouped = useMemo(() => {
    const groups: { type: string; label: string; icon: string; places: Place[] }[] = [];
    const seen = new Set<string>();
    for (const place of filters.filteredItems) {
      const t = getPlaceTypeValue(place);
      const typeOption = filters.typeOptionsByValue.get(t);
      if (!seen.has(t)) {
        seen.add(t);
        groups.push({ type: t, label: typeOption?.label || t, icon: typeOption?.icon || "📍", places: [] });
      }
      groups.find((g) => g.type === t)!.places.push(place);
    }
    return groups;
  }, [filters.filteredItems, filters.typeOptionsByValue]);

  const mapGroups = useMemo((): MarkerGroup[] => {
    const groups: Record<string, MarkerGroup> = {};
    for (const place of filters.filteredItems) {
      if (!place.lat || !place.lng) continue;
      const key = `${place.lat},${place.lng}`;
      const typeValue = getPlaceTypeValue(place);
      const typeIcon = filters.typeOptionsByValue.get(typeValue)?.icon || "📍";
      if (!groups[key]) {
        groups[key] = { coords: [place.lat, place.lng], events: [], label: place.title, markerIcon: typeIcon };
      }
      groups[key].events.push({ id: place.id, title: place.title, slug: place.slug, street: place.street, city: place.city, image_url: place.image_url });
    }
    return Object.values(groups);
  }, [filters.filteredItems, filters.typeOptionsByValue]);

  return (
    <div>
      <PageHero
        title="Magiczne Miejsca"
        search={filters.search}
        onSearch={filters.setSearch}
        searchPlaceholder="Szukaj miejsc..."
        subtitle="Sale zabaw, parki, muzea i atrakcje — sprawdzone adresy dla dzieci w każdym wieku"
        addHref="/dodaj?type=place"
        addTitle="Chcesz stworzyć z nami mapę miejsc?"
        addDescription="Dodaj swoje miejsce i pomóż rodzicom odkrywać wartościowe adresy w Krakowie."
        addLabel="Dodaj miejsce"
      />
      <div className="container-page pt-0 pb-10">
        <div className="lg:hidden mb-3 px-1">
          <div className="relative">
            <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-amber-500" />
            <input
              value={filters.search}
              onChange={(e) => filters.setSearch(e.target.value)}
              placeholder="Szukaj miejsc..."
              className="w-full rounded-xl border border-amber-300 bg-amber-50/40 py-1.5 pl-7 pr-2 text-[11px] text-black placeholder:text-black/40 focus:outline-none focus:border-amber-400"
            />
          </div>
        </div>
        <div className="rounded-[28px] bg-white px-4 py-5 sm:px-6 sm:py-6 lg:px-8 lg:py-8">
          <MobileActionBar
            filtersOpen={filtersOpen}
            hasActiveFilters={filters.hasActiveFilters}
            onToggleFilters={() => setFiltersOpen(!filtersOpen)}
            view={view}
            onSetView={setView}
            addHref="/dodaj?type=place"
            addLabel="Dodaj miejsce"
          />

          {filtersOpen && (
            <div className="lg:hidden rounded-xl p-3 mb-4 space-y-2.5">
              <FilterSection title={<p className="text-[11px] font-medium text-muted-foreground">Typ</p>} defaultCollapsed={false}>
                <div className="flex flex-wrap gap-1">
                  {filters.typeOptions.map((option) => {
                    const selected = filters.activeTypes.includes(option.value);
                    return (
                      <button key={option.value} onClick={() => filters.toggleType(option.value)}
                        className={cn("inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-medium border transition-all duration-200",
                          selected ? "bg-primary text-primary-foreground border-primary" : "bg-background text-muted border-border hover:border-primary/30 hover:text-foreground")}>
                        <span>{option.icon}</span><span>{option.label}</span>
                        <span className="text-[10px] opacity-60">{option.count}</span>
                        {selected && <Check size={11} />}
                      </button>
                    );
                  })}
                </div>
              </FilterSection>

              {enrichedCategoryOptions.length > 0 && (
                <FilterSection title={<p className="text-[11px] font-medium text-muted-foreground">Kategoria</p>} defaultCollapsed={false}>
                  <div className="flex flex-wrap gap-1">
                    {enrichedCategoryOptions.map((option) => {
                      const selected = filters.activeCategories.includes(option.value);
                      return (
                        <button key={option.value} onClick={() => filters.toggleCategory(option.value)}
                          className={cn("inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-medium border transition-all duration-200",
                            selected ? "bg-primary text-primary-foreground border-primary" : "bg-background text-muted border-border hover:border-primary/30 hover:text-foreground")}>
                          <span>{option.icon}</span><span>{option.label}</span>
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
                {filters.hasActiveFilters && (
                  <button onClick={filters.clearFilters} className="inline-flex items-center gap-1 text-[11px] font-medium text-muted-foreground hover:text-foreground transition-colors">
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
              searchPlaceholder="Szukaj miejsc..."
              showSearch={false}
              hasActiveFilters={filters.hasActiveFilters}
              onClearFilters={filters.clearFilters}
              topSlot={<ViewModeToggle view={view} onSetView={setView} />}
            >
              <FilterSection title={<p className="text-[11px] font-semibold text-foreground uppercase tracking-wider">Typ</p>} defaultCollapsed={!filtersOpenDesktop}>
                <div className="flex flex-col gap-0.5">
                  {filters.typeOptions.map((option) => {
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

              {enrichedCategoryOptions.length > 0 && (
                <FilterSection title={<p className="text-[11px] font-semibold text-foreground uppercase tracking-wider">Kategoria</p>} defaultCollapsed={!filtersOpenDesktop}>
                  <div className="flex flex-col gap-0.5">
                    {enrichedCategoryOptions.map((option) => (
                      <button key={option.value} onClick={() => filters.toggleCategory(option.value)}
                        className={cn("flex w-full items-center gap-1.5 px-1.5 py-1 rounded-md text-[10px] font-medium text-left transition-all duration-200",
                          filters.activeCategories.includes(option.value) ? "bg-primary text-primary-foreground" : "text-foreground hover:bg-primary/15 hover:text-foreground")}>
                        {option.icon && <span className="shrink-0 text-[12px]">{option.icon}</span>}
                        <span className="flex-1 truncate">{option.label}</span>
                        {filters.activeCategories.includes(option.value)
                          ? <Check size={10} className="shrink-0" />
                          : <span className="text-[9px] opacity-40 tabular-nums">{option.count}</span>}
                      </button>
                    ))}
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

              <FilterSection title={<p className="text-[11px] font-semibold text-foreground uppercase tracking-wider">Dzielnica</p>} defaultCollapsed={!filtersOpenDesktop}>
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
              topContent={filters.filterBadges.length > 0 ? <FilterBadgeBar badges={filters.filterBadges} onClearAll={filters.clearFilters} /> : undefined}
            >
              {view === "map" ? (
                <div className="space-y-3">
                  <div className="rounded-xl border border-border bg-card px-4 py-3">
                    <h2 className="text-[15px] font-semibold text-foreground">Mapa miejsc w Krakowie</h2>
                    <p className="mt-1 text-[12px] leading-5 text-muted">
                      Sprawdź, gdzie znajdują się sale zabaw, parki, muzea i inne rodzinne miejsca. Kliknij pinezkę,
                      aby zobaczyć szczegóły konkretnego adresu.
                    </p>
                  </div>
                  <div className="rounded-xl overflow-hidden border border-border" style={{ height: "500px" }}>
                    {MapComponent ? (
                      <MapComponent groups={mapGroups} basePath="/miejsca" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-accent/20">
                        <p className="text-[13px] text-muted">Ładowanie mapy...</p>
                      </div>
                    )}
                  </div>
                </div>
              ) : filters.filteredItems.length === 0 ? (
                <div className="text-center py-16">
                  <Search size={32} className="mx-auto text-muted-foreground/20 mb-3" />
                  <p className="text-[14px] text-muted mb-3">Brak miejsc pasujących do filtrów.</p>
                  {filters.hasActiveFilters && (
                    <button onClick={filters.clearFilters} className="text-[12px] font-medium text-primary hover:text-primary-hover transition-colors">
                      Wyczyść filtry
                    </button>
                  )}
                </div>
              ) : (
                <div className="space-y-12">
                  {grouped.map((group) => (
                    <section key={group.type}>
                      <ListGroupHeader icon={group.icon} title={group.label} count={group.places.length} />
                      <div className="grid grid-cols-1 sm:grid-cols-3 xl:grid-cols-4 gap-4">
                        {group.places.map((place) => (
                          <ContentCard key={place.id} item={place} variant="vertical" />
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
