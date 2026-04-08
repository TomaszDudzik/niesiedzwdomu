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
    if (activeCategory) result = result.filter((e) => e.category === activeCategory);
    if (activeDistrict) result = result.filter((e) => e.district === activeDistrict);
    if (ageGroup) {
      result = result.filter((e) =>
        (e.age_min === null || e.age_min <= ageGroup.max) &&
        (e.age_max === null || e.age_max >= ageGroup.min)
      );
    }
    return result;
  }, [events, search, activeCategory, activeDistrict, ageGroup]);

  const grouped = useMemo(() => {
    const groups: { category: EventCategory; label: string; icon: string; events: Event[] }[] = [];
    const seen = new Set<string>();
    for (const event of filtered) {
      const cat = event.category;
      if (!seen.has(cat)) {
        seen.add(cat);
        groups.push({ category: cat, label: CATEGORY_LABELS[cat] || cat, icon: CATEGORY_ICONS[cat] || "✨", events: [] });
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
      {/* Mobile top bar */}
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
        <div className="relative flex-1">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground/50" />
          <input type="text" placeholder="Szukaj wydarzeń..." value={search} onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 rounded-lg border border-border bg-background text-[12px] text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/40 transition-all duration-200" />
        </div>
        <div className="flex items-center gap-1 rounded-lg border border-border p-0.5 bg-accent/50">
          <button onClick={() => setView("list")} className={cn("px-2 py-1 rounded-lg text-[11px] font-medium transition-all duration-200", view === "list" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground")}><LayoutGrid size={12} /></button>
          <button onClick={() => setView("calendar-map")} className={cn("px-2 py-1 rounded-lg text-[11px] font-medium transition-all duration-200", view === "calendar-map" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground")}><CalendarDays size={12} /></button>
        </div>
      </div>

      {/* Mobile filters dropdown */}
      {filtersOpen && (
        <div className="lg:hidden rounded-xl border border-border bg-card p-4 mb-4 space-y-3">
          <div>
            <p className="text-[11px] font-medium text-muted-foreground mb-1.5">Kategoria</p>
            <div className="flex flex-wrap gap-1.5">
              {categoryKeys.map((key) => {
                const count = events.filter((e) => e.category === key).length;
                if (count === 0) return null;
                return (
                  <button key={key} onClick={() => setActiveCategory(activeCategory === key ? null : key)}
                    className={cn("px-2.5 py-1 rounded-lg text-[11px] font-medium border transition-all duration-200",
                      activeCategory === key ? "bg-primary text-primary-foreground border-primary" : "bg-background text-muted border-border hover:border-primary/30 hover:text-foreground")}>
                    {CATEGORY_ICONS[key]} {CATEGORY_LABELS[key]}
                  </button>
                );
              })}
            </div>
          </div>
          <div>
            <p className="text-[11px] font-medium text-muted-foreground mb-1.5">Wiek dziecka</p>
            <div className="flex flex-wrap gap-1.5">
              {AGE_GROUPS.map((group) => (
                <button key={group.key} onClick={() => setActiveAgeGroup(activeAgeGroup === group.key ? null : group.key)}
                  className={cn("px-2.5 py-1 rounded-lg text-[11px] font-medium border transition-all duration-200",
                    activeAgeGroup === group.key ? "bg-primary text-primary-foreground border-primary" : "bg-background text-muted border-border hover:border-primary/30 hover:text-foreground")}>
                  {group.icon} {group.label}
                </button>
              ))}
            </div>
          </div>
          <select value={activeDistrict || ""} onChange={(e) => setActiveDistrict(e.target.value ? (e.target.value as District) : null)}
            className="w-full px-2.5 py-1.5 rounded-lg border border-border bg-background text-[11px] text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20">
            <option value="">Wszystkie dzielnice</option>
            {availableDistricts.map((d) => <option key={d} value={d}>{d}</option>)}
          </select>
          {hasActiveFilters && (
            <button onClick={clearFilters} className="inline-flex items-center gap-1 text-[11px] font-medium text-muted-foreground hover:text-foreground transition-colors">
              <X size={11} /> Wyczyść filtry
            </button>
          )}
        </div>
      )}

      {/* Desktop layout */}
      <div className="lg:flex lg:gap-6 lg:items-start">

        {/* Sidebar — desktop only */}
        <aside className="hidden lg:block w-56 shrink-0 sticky top-20">
          <div className="rounded-xl border border-border bg-card p-3 space-y-3">
            <div className="flex items-center gap-1 rounded-lg border border-border p-0.5 bg-accent/50">
              <button onClick={() => setView("list")} className={cn("flex-1 inline-flex items-center justify-center gap-1 px-2 py-1 rounded-md text-[10px] font-medium transition-all duration-200", view === "list" ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:text-foreground")}>
                <LayoutGrid size={11} /> Lista
              </button>
              <button onClick={() => setView("calendar-map")} className={cn("flex-1 inline-flex items-center justify-center gap-1 px-2 py-1 rounded-md text-[10px] font-medium transition-all duration-200", view === "calendar-map" ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:text-foreground")}>
                <CalendarDays size={11} /> Kalendarz
              </button>
            </div>

            <div className="border-t border-border" />

            <div className="relative">
              <Search size={11} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground/50" />
              <input type="text" placeholder="Szukaj..." value={search} onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-7 pr-2 py-1 rounded-lg border border-border bg-background text-[11px] text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/40 transition-all duration-200" />
            </div>

            <div>
              <p className="text-[9px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">Kategoria</p>
              <div className="flex flex-col gap-0.5">
                {categoryKeys.map((key) => {
                  const count = events.filter((e) => e.category === key).length;
                  if (count === 0) return null;
                  return (
                    <button key={key} onClick={() => setActiveCategory(activeCategory === key ? null : key)}
                      className={cn("flex items-center gap-1.5 px-2 py-1 rounded-md text-[11px] font-medium text-left transition-all duration-200",
                        activeCategory === key ? "bg-primary text-primary-foreground" : "text-foreground hover:bg-accent")}>
                      <span>{CATEGORY_ICONS[key]}</span>
                      <span className="flex-1">{CATEGORY_LABELS[key]}</span>
                      <span className="text-[9px] opacity-40">{count}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <p className="text-[9px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">Wiek</p>
              <div className="flex flex-col gap-0.5">
                {AGE_GROUPS.map((group) => (
                  <button key={group.key} onClick={() => setActiveAgeGroup(activeAgeGroup === group.key ? null : group.key)}
                    className={cn("flex items-center gap-1.5 px-2 py-1 rounded-md text-[11px] font-medium text-left transition-all duration-200",
                      activeAgeGroup === group.key ? "bg-primary text-primary-foreground" : "text-foreground hover:bg-accent")}>
                    <span>{group.icon}</span>
                    <span>{group.label}</span>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <p className="text-[9px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">
                <MapPin size={9} className="inline mr-1" />Dzielnica
              </p>
              <select value={activeDistrict || ""} onChange={(e) => setActiveDistrict(e.target.value ? (e.target.value as District) : null)}
                className="w-full px-2 py-1 rounded-lg border border-border bg-background text-[11px] text-foreground focus:outline-none focus:ring-1 focus:ring-primary/20 transition-all duration-200">
                <option value="">Wszystkie</option>
                {availableDistricts.map((d) => <option key={d} value={d}>{d}</option>)}
              </select>
            </div>

            {hasActiveFilters && (
              <button onClick={clearFilters} className="inline-flex items-center gap-1 text-[10px] font-medium text-muted-foreground hover:text-foreground transition-colors pt-2 border-t border-border w-full">
                <X size={10} />Wyczyść filtry
              </button>
            )}
          </div>
        </aside>

        {/* Main content */}
        <div className="flex-1 min-w-0">
          {view === "calendar-map" ? (
            <CalendarMapView events={filtered} />
          ) : filtered.length === 0 ? (
            <div className="text-center py-16">
              <Search size={32} className="mx-auto text-muted-foreground/20 mb-3" />
              <p className="text-[14px] text-muted mb-3">Brak wydarzeń pasujących do filtrów.</p>
              {hasActiveFilters && (
                <button onClick={clearFilters} className="text-[12px] font-medium text-primary hover:text-primary-hover transition-colors">
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
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {group.events.map((event) => (
                      <ContentCard key={event.id} item={event} />
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
