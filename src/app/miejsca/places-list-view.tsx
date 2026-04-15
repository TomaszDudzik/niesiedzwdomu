"use client";

import { useState, useMemo, useEffect } from "react";
import { Search, LayoutGrid, MapIcon, SlidersHorizontal, X, MapPin, Check, Tags } from "lucide-react";
import { PLACE_TYPE_LABELS, PLACE_TYPE_ICONS, DISTRICT_LIST } from "@/lib/mock-data";
import { getTaxonomyOptions, matchesTaxonomyFilter } from "@/lib/taxonomy-filters";
import { ContentCard } from "@/components/ui/content-card";
import { FilterSection } from "@/components/ui/filter-section";
import { cn } from "@/lib/utils";
import type { Place, PlaceType, District } from "@/types/database";

const placeTypes = Object.keys(PLACE_TYPE_LABELS).filter((k) => k !== "inne") as PlaceType[];

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
  events: { id: string; title: string; slug: string; venue_name: string; image_url?: string | null }[];
  label: string;
}

interface PlacesListViewProps {
  places: Place[];
}

export function PlacesListView({ places }: PlacesListViewProps) {
  const [search, setSearch] = useState("");
  const [activeMainCategories, setActiveMainCategories] = useState<string[]>([]);
  const [activeCategories, setActiveCategories] = useState<string[]>([]);
  const [activeTypes, setActiveTypes] = useState<PlaceType[]>([]);
  const [activeDistricts, setActiveDistricts] = useState<District[]>([]);
  const [activeAgeGroups, setActiveAgeGroups] = useState<string[]>([]);
  const [view, setView] = useState<ViewMode>("list");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [MapComponent, setMapComponent] = useState<React.ComponentType<{ groups: MarkerGroup[]; basePath?: string }> | null>(null);

  const ageGroups = useMemo(
    () => AGE_GROUPS.filter((group) => activeAgeGroups.includes(group.key)),
    [activeAgeGroups]
  );
  const hasActiveFilters =
    !!search || activeMainCategories.length > 0 || activeCategories.length > 0 || activeTypes.length > 0 || activeDistricts.length > 0 || activeAgeGroups.length > 0;

  // Lazy load map component
  useEffect(() => {
    if (view === "map" && !MapComponent) {
      import("@/app/wydarzenia/map-leaflet").then((mod) => {
        setMapComponent(() => mod.MapLeaflet);
      });
    }
  }, [view, MapComponent]);

  const filtered = useMemo(() => {
    let result = places;
    if (search) {
      const q = search.toLowerCase();
      result = result.filter((p) =>
        [p.title, p.description_short, p.street, p.city].join(" ").toLowerCase().includes(q)
      );
    }
    if (activeMainCategories.length > 0) {
      result = result.filter((place) => matchesTaxonomyFilter(place.main_category, activeMainCategories));
    }
    if (activeCategories.length > 0) {
      result = result.filter((place) => matchesTaxonomyFilter(place.category, activeCategories));
    }
    if (activeTypes.length > 0) {
      result = result.filter((p) => activeTypes.includes(p.place_type));
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
  }, [places, search, activeMainCategories, activeCategories, activeTypes, activeDistricts, ageGroups]);

  // Group by place_type preserving order
  const grouped = useMemo(() => {
    const groups: { type: PlaceType; label: string; icon: string; places: Place[] }[] = [];
    const seen = new Set<string>();
    for (const place of filtered) {
      const t = place.place_type;
      if (!seen.has(t)) {
        seen.add(t);
        groups.push({
          type: t,
          label: PLACE_TYPE_LABELS[t] || t,
          icon: PLACE_TYPE_ICONS[t] || "📍",
          places: [],
        });
      }
      groups.find((g) => g.type === t)!.places.push(place);
    }
    return groups;
  }, [filtered]);

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
        venue_name: [place.street, place.city].filter(Boolean).join(", "),
        image_url: place.image_url,
      });
    }
    return Object.values(groups);
  }, [filtered]);

  const availableDistricts = useMemo(() => {
    const set = new Set<string>();
    places.forEach((p) => set.add(p.district));
    return DISTRICT_LIST.filter((d) => set.has(d));
  }, [places]);

  const typeCounts = useMemo(() => {
    const counts = new Map<PlaceType, number>();
    places.forEach((place) => {
      counts.set(place.place_type, (counts.get(place.place_type) || 0) + 1);
    });
    return counts;
  }, [places]);

  const mainCategoryOptions = useMemo(
    () => getTaxonomyOptions(places, (place) => place.main_category),
    [places]
  );

  const categoryOptions = useMemo(
    () => getTaxonomyOptions(places, (place) => place.category),
    [places]
  );

  const districtCounts = useMemo(() => {
    const counts = new Map<District, number>();
    places.forEach((place) => {
      counts.set(place.district, (counts.get(place.district) || 0) + 1);
    });
    return counts;
  }, [places]);

  const activeFilterBadges = useMemo(() => {
    const badges: { id: string; label: string; onRemove: () => void }[] = [];

    if (search.trim()) {
      badges.push({ id: "search", label: `Szukaj: ${search.trim()}`, onRemove: () => setSearch("") });
    }

    activeMainCategories.forEach((mainCategory) => {
      const option = mainCategoryOptions.find((item) => item.value === mainCategory);
      badges.push({
        id: `main-${mainCategory}`,
        label: `Typ: ${option?.label || mainCategory}`,
        onRemove: () => setActiveMainCategories((prev) => prev.filter((item) => item !== mainCategory)),
      });
    });

    activeCategories.forEach((category) => {
      const option = categoryOptions.find((item) => item.value === category);
      badges.push({
        id: `category-${category}`,
        label: `Kategoria: ${option?.label || category}`,
        onRemove: () => setActiveCategories((prev) => prev.filter((item) => item !== category)),
      });
    });

    activeTypes.forEach((type) => {
      badges.push({
        id: `type-${type}`,
        label: `Typ: ${PLACE_TYPE_LABELS[type]}`,
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
  }, [search, activeMainCategories, mainCategoryOptions, activeCategories, categoryOptions, activeTypes, activeAgeGroups, activeDistricts]);

  function clearFilters() {
    setSearch("");
    setActiveMainCategories([]);
    setActiveCategories([]);
    setActiveTypes([]);
    setActiveDistricts([]);
    setActiveAgeGroups([]);
  }

  function toggleMainCategory(mainCategory: string) {
    setActiveMainCategories((prev) =>
      prev.includes(mainCategory) ? prev.filter((item) => item !== mainCategory) : [...prev, mainCategory]
    );
  }

  function toggleCategory(category: string) {
    setActiveCategories((prev) =>
      prev.includes(category) ? prev.filter((item) => item !== category) : [...prev, category]
    );
  }

  function toggleType(type: PlaceType) {
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
        <div className="lg:hidden rounded-xl border border-border bg-card p-3 mb-4 space-y-2.5 max-h-[calc(100dvh-8rem)] overflow-y-auto overscroll-contain">
          <div className="flex items-center justify-between gap-3 pb-1 border-b border-border/70">
            <p className="text-[11px] font-semibold text-foreground">Filtry miejsc</p>
            <button
              type="button"
              onClick={() => setFiltersOpen(false)}
              className="inline-flex items-center gap-1 rounded-lg border border-border bg-background px-2 py-1 text-[10px] font-medium text-muted-foreground hover:text-foreground hover:border-primary/20 transition-colors"
            >
              <X size={10} /> Zwiń
            </button>
          </div>

          <FilterSection title={<span className="inline-flex items-center gap-1 text-[11px] font-medium text-muted-foreground"><Tags size={11} /> Typ</span>}>
            <div className="flex flex-wrap gap-1">
              {mainCategoryOptions.map((option) => {
                const selected = activeMainCategories.includes(option.value);
                return (
                  <button key={option.value} onClick={() => toggleMainCategory(option.value)}
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

          <FilterSection title={<span className="inline-flex items-center gap-1 text-[11px] font-medium text-muted-foreground"><Tags size={11} /> Kategoria</span>}>
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

          <FilterSection title={<span className="text-[11px] font-medium text-muted-foreground">Typ miejsca</span>}>
            <div className="flex flex-wrap gap-1">
              {placeTypes.map((type) => {
                const count = typeCounts.get(type) || 0;
                if (count === 0) return null;
                const selected = activeTypes.includes(type);
                return (
                  <button key={type} onClick={() => toggleType(type)}
                    className={cn("inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-medium border transition-all duration-200",
                      selected ? "bg-primary text-primary-foreground border-primary" : "bg-background text-muted border-border hover:border-primary/30 hover:text-foreground")}>
                    <span>{PLACE_TYPE_ICONS[type]}</span>
                    <span>{PLACE_TYPE_LABELS[type]}</span>
                    <span className="text-[10px] opacity-60">{count}</span>
                    {selected && <Check size={11} />}
                  </button>
                );
              })}
            </div>
          </FilterSection>
          <FilterSection title={<span className="text-[11px] font-medium text-muted-foreground">Wiek dziecka</span>}>
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
          <FilterSection title={<span className="text-[11px] font-medium text-muted-foreground">Dzielnica</span>}>
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

          <button
            type="button"
            onClick={() => setFiltersOpen(false)}
            className="w-full inline-flex items-center justify-center gap-1 rounded-lg border border-border bg-background px-3 py-2 text-[11px] font-semibold text-foreground hover:border-primary/20 hover:bg-accent/40 transition-colors"
          >
            Zamknij filtry
          </button>
        </div>
      )}

      {/* Desktop layout: sidebar + content */}
      <div className="lg:flex lg:gap-6 lg:items-start">

        {/* Sidebar filters — desktop only, sticky */}
        <aside className="hidden lg:block w-52 shrink-0 sticky top-20">
          <div className="rounded-xl border border-border bg-card p-2.5 space-y-2.5 max-h-[calc(100vh-6rem)] overflow-y-auto overscroll-contain pr-1">
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

            <FilterSection title={<span className="text-[9px] font-semibold text-muted-foreground uppercase tracking-wider">Typ</span>} triggerClassName="px-2 py-1.5" contentClassName="px-2 pb-2.5">
              <div className="flex flex-col gap-0.5">
                {mainCategoryOptions.map((option) => {
                  const selected = activeMainCategories.includes(option.value);
                  return (
                    <button key={option.value} onClick={() => toggleMainCategory(option.value)}
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

            <FilterSection title={<span className="text-[9px] font-semibold text-muted-foreground uppercase tracking-wider">Kategoria</span>} triggerClassName="px-2 py-1.5" contentClassName="px-2 pb-2.5">
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

            <FilterSection title={<span className="text-[9px] font-semibold text-muted-foreground uppercase tracking-wider">Typ miejsca</span>} triggerClassName="px-2 py-1.5" contentClassName="px-2 pb-2.5">
              <div className="flex flex-col gap-0.5">
                {placeTypes.map((type) => {
                  const count = typeCounts.get(type) || 0;
                  if (count === 0) return null;
                  const selected = activeTypes.includes(type);
                  return (
                    <button key={type} onClick={() => toggleType(type)}
                      className={cn("flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] font-medium text-left transition-all duration-200",
                        selected ? "bg-primary text-primary-foreground" : "text-foreground hover:bg-accent")}>
                      <span>{PLACE_TYPE_ICONS[type]}</span>
                      <span className="flex-1">{PLACE_TYPE_LABELS[type]}</span>
                      {selected && <Check size={10} />}
                      <span className="text-[8px] opacity-40">{count}</span>
                    </button>
                  );
                })}
              </div>
            </FilterSection>

            <FilterSection title={<span className="text-[9px] font-semibold text-muted-foreground uppercase tracking-wider">Wiek</span>} triggerClassName="px-2 py-1.5" contentClassName="px-2 pb-2.5">
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

            <FilterSection title={<span className="text-[9px] font-semibold text-muted-foreground uppercase tracking-wider">Dzielnica</span>} triggerClassName="px-2 py-1.5" contentClassName="px-2 pb-2.5">
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
          <div className="mb-4 rounded-xl border border-border bg-card px-2.5 py-2">
            <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-hide whitespace-nowrap" style={{ scrollbarWidth: "none" }}>
              <p className="shrink-0 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Filtry:</p>
              {activeFilterBadges.length > 0 ? (
                <>
                  {activeFilterBadges.map((badge) => (
                    <span
                      key={badge.id}
                      className="inline-flex shrink-0 items-center gap-1 rounded-full border border-border bg-accent/60 px-2 py-0.5 text-[10px] font-medium text-foreground"
                    >
                      <span>{badge.label}</span>
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
                    className="inline-flex shrink-0 items-center gap-1 rounded-full border border-border bg-background px-2 py-0.5 text-[10px] font-semibold text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
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
  );
}
