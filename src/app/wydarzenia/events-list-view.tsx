"use client";

import { useState, useMemo } from "react";
import { Search, LayoutGrid, CalendarDays, SlidersHorizontal, X, MapPin } from "lucide-react";
import { CATEGORY_LABELS, CATEGORY_ICONS, DISTRICT_LIST } from "@/lib/mock-data";
import { ContentCard } from "@/components/ui/content-card";
import { CalendarMapView } from "./calendar-map-view";
import { cn } from "@/lib/utils";
import type { Event, EventCategory, District } from "@/types/database";

const categoryKeys = Object.keys(CATEGORY_LABELS).filter((k) => k !== "inne") as EventCategory[];

const AGE_GROUPS = [
  { key: "0-3", label: "0–3 lata", icon: "👶", min: 0, max: 3 },
  { key: "4-6", label: "4–6 lat", icon: "🧒", min: 4, max: 6 },
  { key: "7-10", label: "7–10 lat", icon: "🎒", min: 7, max: 10 },
  { key: "11-14", label: "11–14 lat", icon: "🧑", min: 11, max: 14 },
  { key: "15+", label: "15+ lat", icon: "🎓", min: 15, max: 99 },
] as const;

type ViewMode = "list" | "calendar-map";

interface EventsListViewProps {
  events: Event[];
}

export function EventsListView({ events }: EventsListViewProps) {
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState<EventCategory | null>(null);
  const [activeDistrict, setActiveDistrict] = useState<District | null>(null);
  const [activeAgeGroup, setActiveAgeGroup] = useState<string | null>(null);
  const [view, setView] = useState<ViewMode>("list");
  const [filtersOpen, setFiltersOpen] = useState(false);

  const ageGroup = AGE_GROUPS.find((g) => g.key === activeAgeGroup) ?? null;
  const hasActiveFilters = search || activeCategory || activeDistrict || activeAgeGroup !== null;

  const filtered = useMemo(() => {
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
  }, [events, search, activeCategory, activeDistrict, ageGroup]);

  // Group by category preserving order
  const grouped = useMemo(() => {
    const groups: { category: EventCategory; label: string; icon: string; events: Event[] }[] = [];
    const seen = new Set<string>();
    for (const event of filtered) {
      const cat = event.category;
      if (!seen.has(cat)) {
        seen.add(cat);
        groups.push({
          category: cat,
          label: CATEGORY_LABELS[cat] || cat,
          icon: CATEGORY_ICONS[cat] || "✨",
          events: [],
        });
      }
      groups.find((g) => g.category === cat)!.events.push(event);
    }
    return groups;
  }, [filtered]);

  const availableDistricts = useMemo(() => {
    const set = new Set<string>();
    events.forEach((e) => set.add(e.district));
    return DISTRICT_LIST.filter((d) => set.has(d));
  }, [events]);

  function clearFilters() {
    setSearch("");
    setActiveCategory(null);
    setActiveDistrict(null);
    setActiveAgeGroup(null);
  }

  return (
    <div className="container-page pt-5 pb-10">
      {/* Filter panel */}
      <div className="rounded-xl border border-border bg-card p-4 mb-6">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setFiltersOpen(!filtersOpen)}
            className={cn(
              "inline-flex items-center gap-2 px-4 py-2 sm:py-1.5 rounded-lg text-[13px] sm:text-[12px] font-semibold border-2 transition-all duration-200 shrink-0",
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
          <div className="relative flex-1 hidden sm:block">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground/50" />
            <input
              type="text"
              placeholder="Szukaj wydarzeń..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 rounded-lg border border-border bg-background text-[12px] text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/40 transition-all duration-200"
            />
          </div>
          <div className="ml-auto flex items-center gap-1 rounded-lg border border-border p-0.5 bg-accent/50">
            <button
              onClick={() => setView("list")}
              className={cn(
                "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-medium transition-all duration-200",
                view === "list"
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground hover:bg-card/60"
              )}
            >
              <LayoutGrid size={13} />
              Lista
            </button>
            <button
              onClick={() => setView("calendar-map")}
              className={cn(
                "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-medium transition-all duration-200",
                view === "calendar-map"
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground hover:bg-card/60"
              )}
            >
              <CalendarDays size={13} />
              Kalendarz
            </button>
          </div>
        </div>

        {filtersOpen && (
          <div className="mt-3 pt-3 border-t border-border space-y-3">
            {/* Search — mobile only (inside filters) */}
            <div className="relative sm:hidden">
              <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground/50" />
              <input
                type="text"
                placeholder="Szukaj wydarzeń..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-8 pr-3 py-2 rounded-lg border border-border bg-background text-[13px] text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/40 transition-all duration-200"
              />
            </div>
            {/* Categories */}
            <div>
              <p className="text-[11px] font-medium text-muted-foreground mb-1.5">Kategoria</p>
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

      {view === "calendar-map" ? (
        <CalendarMapView events={filtered} />
      ) : filtered.length === 0 ? (
        <div className="text-center py-16">
          <Search size={32} className="mx-auto text-muted-foreground/20 mb-3" />
          <p className="text-[14px] text-muted mb-3">Brak wydarzeń pasujących do filtrów.</p>
          {hasActiveFilters && (
            <button
              onClick={clearFilters}
              className="text-[12px] font-medium text-primary hover:text-primary-hover transition-colors"
            >
              Wyczyść filtry
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-12">
          {grouped.map((group) => (
            <section key={group.category}>
              <div className="flex items-center gap-2 mb-4">
                <span className="text-lg">{group.icon}</span>
                <h2 className="text-[15px] font-semibold text-foreground">{group.label}</h2>
                <span className="text-[12px] text-muted-foreground">({group.events.length})</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                {group.events.map((event) => (
                  <ContentCard key={event.id} item={event} />
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
