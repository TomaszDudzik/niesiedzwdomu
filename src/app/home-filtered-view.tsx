"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { Search, ArrowRight, SlidersHorizontal, X, MapPin } from "lucide-react";
import { ContentCard } from "@/components/ui/content-card";
import { CATEGORY_LABELS, CATEGORY_ICONS, PLACE_TYPE_LABELS, PLACE_TYPE_ICONS, DISTRICT_LIST } from "@/lib/mock-data";
import { cn } from "@/lib/utils";
import type { Event, Place, EventCategory, PlaceType, District } from "@/types/database";

function SectionLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link href={href} className="group inline-flex items-center gap-1 text-[13px] font-medium text-primary hover:text-primary-hover transition-colors">
      {children}
      <ArrowRight size={13} className="group-hover:translate-x-0.5 transition-transform duration-200" />
    </Link>
  );
}

type ContentTypeFilter = "all" | "event" | "place";

const categoryKeys = Object.keys(CATEGORY_LABELS).filter((k) => k !== "inne") as EventCategory[];
const placeTypeKeys = Object.keys(PLACE_TYPE_LABELS).filter((k) => k !== "inne") as PlaceType[];

const AGE_GROUPS = [
  { key: "0-3", label: "0–3 lata", icon: "👶", min: 0, max: 3 },
  { key: "4-6", label: "4–6 lat", icon: "🧒", min: 4, max: 6 },
  { key: "7-10", label: "7–10 lat", icon: "🎒", min: 7, max: 10 },
  { key: "11-14", label: "11–14 lat", icon: "🧑", min: 11, max: 14 },
  { key: "15+", label: "15+ lat", icon: "🎓", min: 15, max: 99 },
] as const;

interface HomeFilteredViewProps {
  events: Event[];
  places: Place[];
}

export function HomeFilteredView({ events, places }: HomeFilteredViewProps) {
  const [search, setSearch] = useState("");
  const [contentType, setContentType] = useState<ContentTypeFilter>("all");
  const [activeCategory, setActiveCategory] = useState<EventCategory | null>(null);
  const [activePlaceType, setActivePlaceType] = useState<PlaceType | null>(null);
  const [activeDistrict, setActiveDistrict] = useState<District | null>(null);
  const [activeAgeGroup, setActiveAgeGroup] = useState<string | null>(null);
  const [filtersOpen, setFiltersOpen] = useState(false);

  const ageGroup = AGE_GROUPS.find((g) => g.key === activeAgeGroup) ?? null;
  const hasActiveFilters = search || contentType !== "all" || activeCategory || activePlaceType || activeDistrict || activeAgeGroup !== null;

  const filteredEvents = useMemo(() => {
    if (contentType === "place") return [];
    let result = events;
    if (search) {
      const q = search.toLowerCase();
      result = result.filter((e) =>
        [e.title, e.description_short, e.venue_name, e.district].join(" ").toLowerCase().includes(q)
      );
    }
    if (activeCategory) {
      result = result.filter((e) => e.category === activeCategory);
    }
    if (activeDistrict) {
      result = result.filter((e) => e.district === activeDistrict);
    }
    if (ageGroup) {
      result = result.filter((e) =>
        (e.age_min === null || e.age_min <= ageGroup.max) &&
        (e.age_max === null || e.age_max >= ageGroup.min)
      );
    }
    return result;
  }, [events, search, contentType, activeCategory, activeDistrict, ageGroup]);

  const filteredPlaces = useMemo(() => {
    if (contentType === "event") return [];
    let result = places;
    if (search) {
      const q = search.toLowerCase();
      result = result.filter((p) =>
        [p.title, p.description_short, p.street, p.city, p.district].join(" ").toLowerCase().includes(q)
      );
    }
    if (activePlaceType) {
      result = result.filter((p) => p.place_type === activePlaceType);
    }
    if (activeDistrict) {
      result = result.filter((p) => p.district === activeDistrict);
    }
    if (ageGroup) {
      result = result.filter((p) =>
        (p.age_min === null || p.age_min <= ageGroup.max) &&
        (p.age_max === null || p.age_max >= ageGroup.min)
      );
    }
    return result;
  }, [places, search, contentType, activePlaceType, activeDistrict, ageGroup]);

  function clearFilters() {
    setSearch("");
    setContentType("all");
    setActiveCategory(null);
    setActivePlaceType(null);
    setActiveDistrict(null);
    setActiveAgeGroup(null);
  }

  // Collect districts that actually exist in the data
  const availableDistricts = useMemo(() => {
    const set = new Set<string>();
    events.forEach((e) => set.add(e.district));
    places.forEach((p) => set.add(p.district));
    return DISTRICT_LIST.filter((d) => set.has(d));
  }, [events, places]);

  return (
    <div>
      {/* Filter panel */}
      <section className="container-page pt-5">
        <div className="rounded-xl border border-border bg-card p-4">
          {/* Filter button + search row */}
          <div className="flex flex-col sm:flex-row gap-2">
            <button
              onClick={() => setFiltersOpen(!filtersOpen)}
              className={cn(
                "inline-flex items-center justify-center gap-2 px-4 py-2 sm:py-1.5 rounded-lg text-[13px] sm:text-[12px] font-semibold border-2 transition-all duration-200 shrink-0",
                filtersOpen || hasActiveFilters
                  ? "bg-primary text-primary-foreground border-primary shadow-sm"
                  : "bg-primary/5 text-foreground border-primary/20 hover:bg-primary/10 hover:border-primary/30"
              )}
            >
              <SlidersHorizontal size={14} />
              Filtry
              {hasActiveFilters && (
                <span className="ml-0.5 w-1.5 h-1.5 rounded-full bg-primary-foreground" />
              )}
            </button>
            <div className="relative flex-1">
              <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground/50" />
              <input
                type="text"
                placeholder="Szukaj wydarzeń i miejsc..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-8 pr-3 py-2 sm:py-1.5 rounded-lg border border-border bg-background text-[13px] sm:text-[12px] text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/40 transition-all duration-200"
              />
            </div>
          </div>

          {/* Expandable filter options */}
          {filtersOpen && (
            <div className="mt-3 pt-3 border-t border-border space-y-3">
              {/* Content type */}
              <div>
                <p className="text-[11px] font-medium text-muted-foreground mb-1.5">Pokaż</p>
                <div className="flex flex-wrap gap-1.5">
                  {([
                    { key: "all", label: "Wszystko" },
                    { key: "event", label: "Wydarzenia" },
                    { key: "place", label: "Miejsca" },
                  ] as const).map(({ key, label }) => (
                    <button
                      key={key}
                      onClick={() => {
                        setContentType(key);
                        if (key === "place") setActiveCategory(null);
                        if (key === "event") setActivePlaceType(null);
                      }}
                      className={cn(
                        "px-2.5 py-1 rounded-lg text-[11px] font-medium border transition-all duration-200",
                        contentType === key
                          ? "bg-primary text-primary-foreground border-primary"
                          : "bg-background text-muted border-border hover:border-primary/30 hover:text-foreground"
                      )}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Event categories — only when events are visible */}
              {contentType !== "place" && (
                <div>
                  <p className="text-[11px] font-medium text-muted-foreground mb-1.5">Kategoria wydarzeń</p>
                  <div className="flex flex-wrap gap-1.5">
                    {categoryKeys.map((key) => {
                      const count = events.filter((e) => e.category === key).length;
                      if (count === 0) return null;
                      return (
                        <button
                          key={key}
                          onClick={() => setActiveCategory(activeCategory === key ? null : key)}
                          className={cn(
                            "px-2.5 py-1 rounded-lg text-[11px] font-medium border transition-all duration-200",
                            activeCategory === key
                              ? "bg-primary text-primary-foreground border-primary"
                              : "bg-background text-muted border-border hover:border-primary/30 hover:text-foreground"
                          )}
                        >
                          {CATEGORY_ICONS[key]} {CATEGORY_LABELS[key]}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Place types — only when places are visible */}
              {contentType !== "event" && (
                <div>
                  <p className="text-[11px] font-medium text-muted-foreground mb-1.5">Typ miejsca</p>
                  <div className="flex flex-wrap gap-1.5">
                    {placeTypeKeys.map((type) => {
                      const count = places.filter((p) => p.place_type === type).length;
                      if (count === 0) return null;
                      return (
                        <button
                          key={type}
                          onClick={() => setActivePlaceType(activePlaceType === type ? null : type)}
                          className={cn(
                            "px-2.5 py-1 rounded-lg text-[11px] font-medium border transition-all duration-200",
                            activePlaceType === type
                              ? "bg-primary text-primary-foreground border-primary"
                              : "bg-background text-muted border-border hover:border-primary/30 hover:text-foreground"
                          )}
                        >
                          {PLACE_TYPE_ICONS[type]} {PLACE_TYPE_LABELS[type]}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Age group */}
              <div>
                <p className="text-[11px] font-medium text-muted-foreground mb-1.5">Wiek dziecka</p>
                <div className="flex flex-wrap gap-1.5">
                  {AGE_GROUPS.map((group) => (
                    <button
                      key={group.key}
                      onClick={() => setActiveAgeGroup(activeAgeGroup === group.key ? null : group.key)}
                      className={cn(
                        "px-2.5 py-1 rounded-lg text-[11px] font-medium border transition-all duration-200",
                        activeAgeGroup === group.key
                          ? "bg-primary text-primary-foreground border-primary"
                          : "bg-background text-muted border-border hover:border-primary/30 hover:text-foreground"
                      )}
                    >
                      {group.icon} {group.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* District */}
              <div className="flex flex-wrap items-end gap-3">
                <div className="flex-1 min-w-[160px]">
                  <p className="text-[11px] font-medium text-muted-foreground mb-1.5">
                    <MapPin size={10} className="inline mr-1" />
                    Dzielnica
                  </p>
                  <select
                    value={activeDistrict || ""}
                    onChange={(e) => setActiveDistrict(e.target.value ? (e.target.value as District) : null)}
                    className="w-full px-2.5 py-1.5 rounded-lg border border-border bg-background text-[11px] text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/40 transition-all duration-200"
                  >
                    <option value="">Wszystkie dzielnice</option>
                    {availableDistricts.map((d) => (
                      <option key={d} value={d}>{d}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Clear filters */}
              {hasActiveFilters && (
                <button
                  onClick={clearFilters}
                  className="inline-flex items-center gap-1 text-[11px] font-medium text-muted-foreground hover:text-foreground transition-colors"
                >
                  <X size={11} />
                  Wyczyść filtry
                </button>
              )}
            </div>
          )}
        </div>
      </section>

      {/* Events section */}
      {filteredEvents.length > 0 && (
        <section className="container-page mt-6">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-[15px] font-semibold text-foreground">
              Nadchodzące wydarzenia
              {hasActiveFilters && (
                <span className="ml-2 text-[12px] font-normal text-muted-foreground">({filteredEvents.length})</span>
              )}
            </h2>
            <SectionLink href="/wydarzenia">Wszystkie</SectionLink>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {filteredEvents.slice(0, 8).map((event) => (
              <ContentCard key={event.id} item={event} />
            ))}
          </div>
        </section>
      )}

      {/* Places section */}
      {filteredPlaces.length > 0 && (
        <section className="container-page mt-14">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-[15px] font-semibold text-foreground">
              Ciekawe miejsca
              {hasActiveFilters && (
                <span className="ml-2 text-[12px] font-normal text-muted-foreground">({filteredPlaces.length})</span>
              )}
            </h2>
            <SectionLink href="/miejsca">Wszystkie</SectionLink>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {filteredPlaces.slice(0, 8).map((place) => (
              <ContentCard key={place.id} item={place} />
            ))}
          </div>
        </section>
      )}

      {/* Empty state when filters match nothing */}
      {hasActiveFilters && filteredEvents.length === 0 && filteredPlaces.length === 0 && (
        <section className="container-page mt-6">
          <div className="text-center py-16">
            <Search size={32} className="mx-auto text-muted-foreground/20 mb-3" />
            <p className="text-[14px] text-muted mb-3">Brak wyników pasujących do filtrów.</p>
            <button
              onClick={clearFilters}
              className="text-[12px] font-medium text-primary hover:text-primary-hover transition-colors"
            >
              Wyczyść filtry
            </button>
          </div>
        </section>
      )}
    </div>
  );
}
