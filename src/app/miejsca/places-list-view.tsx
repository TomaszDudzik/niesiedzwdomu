"use client";

import { useState, useMemo, useEffect } from "react";
import { Search, LayoutGrid, MapIcon, SlidersHorizontal, X, MapPin, Check, ChevronDown } from "lucide-react";
import { DISTRICT_LIST } from "@/lib/mock-data";
import { ContentCard } from "@/components/ui/content-card";
import { FilterSection } from "@/components/ui/filter-section";
import { SubmissionCta } from "@/components/ui/submission-cta";
import { cn } from "@/lib/utils";
import { getTaxonomyOptions, matchesTaxonomyFilter } from "@/lib/taxonomy-filters";
import type { Place, District } from "@/types/database";

const AGE_GROUPS = [
  { key: "0-3", label: "0–3 lata", icon: "👶", min: 0, max: 3 },
  { key: "4-6", label: "4–6 lat", icon: "🧒", min: 4, max: 6 },
  { key: "7-10", label: "7–10 lat", icon: "🎒", min: 7, max: 10 },
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

interface MarkerGroup {
  coords: [number, number];
  events: { id: string; title: string; slug: string; street: string; city: string; image_url?: string | null }[];
  label: string;
}

interface PlacesListViewProps {
  places: Place[];
}

function getPlaceTypeValue(place: Place): string {
  return place.category_lvl_1 ?? "Bez kategorii";
}

export function PlacesListView({ places }: PlacesListViewProps) {
  const [search, setSearch] = useState("");
  const [activeTypes, setActiveTypes] = useState<string[]>([]);
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
  const hasActiveFilters = !!search || activeTypes.length > 0 || activeDistricts.length > 0 || activeAgeGroups.length > 0;

  const baseFiltered = useMemo(() => {
    let result = places;
    if (search) {
      const q = search.toLowerCase();
      result = result.filter((p) =>
        [p.title, p.description_short, p.street, p.city].join(" ").toLowerCase().includes(q)
      );
    }
    if (activeDistricts.length > 0) {
      result = result.filter((p) => activeDistricts.includes(p.district));
    }
    if (ageGroups.length > 0) {
      result = result.filter((p) =>
        ageGroups.some((group) =>
          (p.age_min === null || p.age_min <= group.max) &&
          (p.age_max === null || p.age_max >= group.min)
        )
      );
    }
    return result;
  }, [places, search, activeDistricts, ageGroups]);

  const districtOptionsSource = useMemo(() => {
    let result = places;
    if (search) {
      const q = search.toLowerCase();
      result = result.filter((p) =>
        [p.title, p.description_short, p.street, p.city].join(" ").toLowerCase().includes(q)
      );
    }
    if (ageGroups.length > 0) {
      result = result.filter((p) =>
        ageGroups.some((group) =>
          (p.age_min === null || p.age_min <= group.max) &&
          (p.age_max === null || p.age_max >= group.min)
        )
      );
    }
    return result;
  }, [places, search, ageGroups]);

  const typeOptions = useMemo(
    () => getTaxonomyOptions(baseFiltered, getPlaceTypeValue),
    [baseFiltered]
  );

  const typeOptionsByValue = useMemo(
    () => new Map(typeOptions.map((option) => [option.value, option])),
    [typeOptions]
  );

  const categorySource = useMemo(
    () => baseFiltered.filter((place) => matchesTaxonomyFilter(getPlaceTypeValue(place), activeTypes)),
    [baseFiltered, activeTypes]
  );

  // Lazy load map component
  useEffect(() => {
    if (view === "map" && !MapComponent) {
      import("@/app/wydarzenia/map-leaflet").then((mod) => {
        setMapComponent(() => mod.MapLeaflet);
      });
    }
  }, [view, MapComponent]);

  const filtered = categorySource;

  // Group by category level 1 preserving order
  const grouped = useMemo(() => {
    const groups: { type: string; label: string; icon: string; places: Place[] }[] = [];
    const seen = new Set<string>();
    for (const place of filtered) {
      const t = getPlaceTypeValue(place);
      const typeOption = typeOptionsByValue.get(t);
      if (!seen.has(t)) {
        seen.add(t);
        groups.push({
          type: t,
          label: typeOption?.label || t,
          icon: typeOption?.icon || "📍",
          places: [],
        });
      }
      groups.find((g) => g.type === t)!.places.push(place);
    }
    return groups;
  }, [filtered, typeOptionsByValue]);

  // Map marker groups
  const mapGroups = useMemo((): MarkerGroup[] => {
    const groups: Record<string, MarkerGroup> = {};
    for (const place of filtered) {
      if (!place.lat || !place.lng) continue;
      const key = `${place.lat},${place.lng}`;
      if (!groups[key]) {
        groups[key] = { coords: [place.lat, place.lng], events: [], label: place.title };
      }
      groups[key].events.push({
        id: place.id,
        title: place.title,
        slug: place.slug,
        street: place.street,
        city: place.city,
        image_url: place.image_url,
      });
    }
    return Object.values(groups);
  }, [filtered]);

  const availableDistricts = useMemo(() => {
    const set = new Set<string>();
    districtOptionsSource.forEach((p) => set.add(p.district));
    return DISTRICT_LIST.filter((d) => set.has(d));
  }, [districtOptionsSource]);

  const districtCounts = useMemo(() => {
    const counts = new Map<District, number>();
    districtOptionsSource.forEach((place) => {
      counts.set(place.district, (counts.get(place.district) || 0) + 1);
    });
    return counts;
  }, [districtOptionsSource]);

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
  }, [search, activeTypes, activeAgeGroups, activeDistricts, typeOptionsByValue]);

  function clearFilters() {
    setSearch("");
    setActiveTypes([]);
    setActiveDistricts([]);
    setActiveAgeGroups([]);
  }

  function toggleType(type: string) {
    setActiveTypes((prev) =>
      prev.includes(type) ? prev.filter((item) => item !== type) : [...prev, type]
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
    <div className="container-page pt-5 pb-10">
      <SubmissionCta
        mobile
        title="Chcesz stworzyć z nami mapę miejsc?"
        description="Dodaj swoje miejsce i pomóż rodzicom odkrywać wartościowe adresy w Krakowie."
        buttonLabel="Dodaj miejsce"
        href="/dodaj?type=place"
      />

      {/* Mobile top bar */}
      <div className="lg:hidden rounded-xl border border-border bg-card p-3 mb-4 flex items-center gap-2">
        <button
          onClick={() => setFiltersOpen(!filtersOpen)}
          className={cn(
            "inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-[12px] font-semibold border-2 transition-all duration-200",
            filtersOpen || hasActiveFilters
              ? "bg-primary text-primary-foreground border-primary"
              : "bg-primary/5 text-foreground border-primary/20 hover:bg-primary/10"
          )}
        >
          <SlidersHorizontal size={13} />
          Filtry
          {hasActiveFilters && <span className="w-1.5 h-1.5 rounded-full bg-primary-foreground" />}
        </button>
        <div className="relative flex-1">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground/50" />
          <input type="text" placeholder="Szukaj miejsc..." value={search} onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 rounded-lg border border-border bg-background text-[12px] text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/40 transition-all duration-200" />
        </div>
        <div className="flex items-center gap-1 rounded-lg border border-border p-0.5 bg-accent/50">
          <button onClick={() => setView("list")} className={cn("inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-medium transition-all duration-200", view === "list" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground")}><LayoutGrid size={12} /></button>
          <button onClick={() => setView("map")} className={cn("inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-medium transition-all duration-200", view === "map" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground")}><MapIcon size={12} /></button>
        </div>
      </div>

      {/* Mobile filters dropdown */}
      {filtersOpen && (
        <div className="lg:hidden rounded-xl border border-border bg-card p-3 mb-4 space-y-2.5">
          <FilterSection title={<p className="text-[11px] font-medium text-muted-foreground">Typ</p>} defaultCollapsed>
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
          <FilterSection title={<p className="text-[11px] font-medium text-muted-foreground">Wiek dziecka</p>} defaultCollapsed>
            <div className="flex flex-wrap gap-1">
              {AGE_GROUPS.map((group) => {
                const selected = activeAgeGroups.includes(group.key);
                return (
                  <button key={group.key} onClick={() => toggleAgeGroup(group.key)}
                    className={cn("inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-medium border transition-all duration-200",
                      selected ? "bg-primary text-primary-foreground border-primary" : "bg-background text-muted border-border hover:border-primary/30 hover:text-foreground")}>
                    <span>{group.icon}</span>
                    <span>{group.label}</span>
                    {selected && <Check size={11} />}
                  </button>
                );
              })}
            </div>
          </FilterSection>
          <FilterSection title={<p className="text-[11px] font-medium text-muted-foreground">Dzielnica</p>} defaultCollapsed>
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
          {hasActiveFilters && (
            <button onClick={clearFilters} className="inline-flex items-center gap-1 text-[11px] font-medium text-muted-foreground hover:text-foreground transition-colors">
              <X size={11} /> Wyczyść filtry
            </button>
          )}
        </div>
      )}

      {/* Desktop layout: sidebar + content */}
      <div className="lg:flex lg:gap-10 lg:items-start">

        {/* Sidebar filters — desktop only, sticky */}
        <aside className="hidden lg:block w-52 shrink-0">
          <div className="rounded-xl border border-border bg-card p-2.5 space-y-2.5">
            <div className="flex items-center gap-1 rounded-lg border border-border p-0.5 bg-accent/50">
              <button onClick={() => setView("list")} className={cn("flex-1 inline-flex items-center justify-center gap-1 px-2 py-1 rounded-md text-[10px] font-medium transition-all duration-200", view === "list" ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:text-foreground")}>
                <LayoutGrid size={11} /> Lista
              </button>
              <button onClick={() => setView("map")} className={cn("flex-1 inline-flex items-center justify-center gap-1 px-2 py-1 rounded-md text-[10px] font-medium transition-all duration-200", view === "map" ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:text-foreground")}>
                <MapIcon size={11} /> Mapa
              </button>
            </div>

            <div className="border-t border-border" />

            <div className="relative">
              <Search size={11} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground/50" />
              <input type="text" placeholder="Szukaj..." value={search} onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-7 pr-2 py-1 rounded-lg border border-border bg-background text-[10px] text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/40 transition-all duration-200" />
            </div>

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
                {AGE_GROUPS.map((group) => {
                  const selected = activeAgeGroups.includes(group.key);
                  return (
                    <button key={group.key} onClick={() => toggleAgeGroup(group.key)}
                      className={cn("flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] font-medium text-left transition-all duration-200",
                        selected ? "bg-primary text-primary-foreground" : "text-foreground hover:bg-accent")}>
                      <span>{group.icon}</span>
                      <span className="flex-1">{group.label}</span>
                      {selected && <Check size={10} />}
                    </button>
                  );
                })}
              </div>
            </FilterSection>

            <FilterSection title={<p className="text-[9px] font-semibold text-muted-foreground uppercase tracking-wider">Dzielnica</p>} defaultCollapsed={!filtersOpenDesktop}>
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

        {/* Main content */}
        <div className="flex-1 min-w-0">
          <div className="space-y-7">
            <SubmissionCta
              title="Chcesz stworzyć z nami mapę miejsc?"
              description="Dodaj swoje miejsce i pomóż rodzicom odkrywać wartościowe adresy w Krakowie."
              buttonLabel="Dodaj miejsce"
              href="/dodaj?type=place"
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
          </div>

          <div className="mt-4">
            {view === "map" ? (
              <div className="rounded-xl overflow-hidden border border-border" style={{ height: "500px" }}>
                {MapComponent ? (
                  <MapComponent groups={mapGroups} basePath="/miejsca" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-accent/20">
                    <p className="text-[13px] text-muted">Ładowanie mapy...</p>
                  </div>
                )}
              </div>
            ) : filtered.length === 0 ? (
              <div className="text-center py-16">
                <Search size={32} className="mx-auto text-muted-foreground/20 mb-3" />
                <p className="text-[14px] text-muted mb-3">Brak miejsc pasujących do filtrów.</p>
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
                    <div className="flex items-center gap-2 mb-4">
                      <span className="text-lg">{group.icon}</span>
                      <h2 className="text-[15px] font-semibold text-foreground">{group.label}</h2>
                      <span className="text-[12px] text-muted-foreground">({group.places.length})</span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {group.places.map((place) => (
                        <ContentCard key={place.id} item={place} largeImage />
                      ))}
                    </div>
                  </section>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
