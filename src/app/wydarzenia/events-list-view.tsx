"use client";

import { useState, useMemo, useEffect } from "react";
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

type QuickDatePreset = "all" | "today" | "tomorrow" | "weekend" | "thisWeek" | "nextWeek" | "thisMonth";

const QUICK_DATE_PRESETS: Array<{ key: QuickDatePreset; label: string }> = [
  { key: "all", label: "Wszystkie" },
  { key: "today", label: "Dziś" },
  { key: "tomorrow", label: "Jutro" },
  { key: "weekend", label: "Weekend" },
  { key: "thisWeek", label: "Ten tydzień" },
  { key: "nextWeek", label: "Następny tydzień" },
  { key: "thisMonth", label: "Ten miesiąc" },
];

const KRAKOW_CENTER: [number, number] = [50.0614, 19.9372];
const DISTRICT_COORDS: Record<string, [number, number]> = {
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
  "Bieżanów": [50.015, 20.005],
};

interface MarkerGroup {
  coords: [number, number];
  events: Event[];
  label: string;
}

interface DateRange {
  start: Date;
  end: Date;
}

function getTodayStart(): Date {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  return now;
}

function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

function toStartOfDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

function toEndOfDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(23, 59, 59, 999);
  return d;
}

function parseDateOnly(value: string): Date | null {
  if (!value) return null;
  const d = new Date(`${value}T00:00:00`);
  return Number.isNaN(d.getTime()) ? null : d;
}

function getRangeFromPreset(preset: QuickDatePreset, today: Date): DateRange | null {
  const startToday = toStartOfDay(today);

  if (preset === "all") return null;
  if (preset === "today") return { start: startToday, end: toEndOfDay(startToday) };
  if (preset === "tomorrow") {
    const day = addDays(startToday, 1);
    return { start: day, end: toEndOfDay(day) };
  }
  if (preset === "weekend") {
    const day = startToday.getDay();
    const daysUntilSaturday = day === 6 ? 0 : (6 - day + 7) % 7;
    const saturday = addDays(startToday, daysUntilSaturday);
    const sunday = addDays(saturday, 1);
    return { start: saturday, end: toEndOfDay(sunday) };
  }
  if (preset === "thisWeek") {
    const end = addDays(startToday, 6);
    return { start: startToday, end: toEndOfDay(end) };
  }
  if (preset === "nextWeek") {
    const start = addDays(startToday, 7);
    const end = addDays(startToday, 13);
    return { start, end: toEndOfDay(end) };
  }

  const monthStart = new Date(startToday.getFullYear(), startToday.getMonth(), 1);
  const monthEnd = new Date(startToday.getFullYear(), startToday.getMonth() + 1, 0);
  return { start: monthStart, end: toEndOfDay(monthEnd) };
}

function eventIntersectsRange(event: Event, range: DateRange): boolean {
  const eventStart = parseDateOnly(event.date_start);
  if (!eventStart) return false;
  const eventEndRaw = parseDateOnly(event.date_end || "") || eventStart;
  const eventEnd = toEndOfDay(eventEndRaw);

  return eventStart <= range.end && eventEnd >= range.start;
}

function groupByLocation(events: Event[]): MarkerGroup[] {
  const groups: Record<string, MarkerGroup> = {};
  for (const event of events) {
    const coords: [number, number] = event.lat && event.lng
      ? [event.lat, event.lng]
      : (DISTRICT_COORDS[event.district] || KRAKOW_CENTER);
    const key = `${coords[0]},${coords[1]}`;
    if (!groups[key]) {
      groups[key] = { coords, events: [], label: event.venue_name || event.district };
    }
    groups[key].events.push(event);
  }
  return Object.values(groups);
}

type ViewMode = "list" | "calendar-map";

interface EventsListViewProps {
  events: Event[];
}

export function EventsListView({ events }: EventsListViewProps) {
  const today = getTodayStart();

  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState<EventCategory | null>(null);
  const [activeDistrict, setActiveDistrict] = useState<District | null>(null);
  const [activeAgeGroup, setActiveAgeGroup] = useState<string | null>(null);
  const [view, setView] = useState<ViewMode>("list");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [quickDatePreset, setQuickDatePreset] = useState<QuickDatePreset>("all");
  const [daysAhead, setDaysAhead] = useState(0);
  const [singleDate, setSingleDate] = useState("");
  const [rangeFrom, setRangeFrom] = useState("");
  const [rangeTo, setRangeTo] = useState("");
  const [MapComponent, setMapComponent] = useState<React.ComponentType<{ groups: MarkerGroup[] }> | null>(null);

  useEffect(() => {
    import("./map-leaflet").then((mod) => setMapComponent(() => mod.MapLeaflet));
  }, []);

  const ageGroup = AGE_GROUPS.find((g) => g.key === activeAgeGroup) ?? null;
  const hasDateFilters = quickDatePreset !== "all" || daysAhead > 0 || !!singleDate || !!rangeFrom || !!rangeTo;
  const hasActiveFilters = search || activeCategory || activeDistrict || activeAgeGroup !== null || hasDateFilters;

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

  const dateFiltered = useMemo(() => {
    const fromDate = parseDateOnly(rangeFrom);
    const toDate = parseDateOnly(rangeTo);

    if (fromDate || toDate) {
      const start = fromDate ? toStartOfDay(fromDate) : new Date(1970, 0, 1);
      const end = toDate ? toEndOfDay(toDate) : new Date(2100, 0, 1);
      return filtered.filter((event) => eventIntersectsRange(event, { start, end }));
    }

    const exactDate = parseDateOnly(singleDate);
    if (exactDate) {
      const range = { start: toStartOfDay(exactDate), end: toEndOfDay(exactDate) };
      return filtered.filter((event) => eventIntersectsRange(event, range));
    }

    if (daysAhead > 0) {
      const range = { start: toStartOfDay(today), end: toEndOfDay(addDays(today, daysAhead)) };
      return filtered.filter((event) => eventIntersectsRange(event, range));
    }

    const presetRange = getRangeFromPreset(quickDatePreset, today);
    if (!presetRange) return filtered;
    return filtered.filter((event) => eventIntersectsRange(event, presetRange));
  }, [filtered, rangeFrom, rangeTo, singleDate, daysAhead, quickDatePreset, today]);

  const listEvents = useMemo(
    () => (view === "list" ? dateFiltered : filtered),
    [view, dateFiltered, filtered]
  );

  const sidebarMapGroups = useMemo(() => groupByLocation(listEvents), [listEvents]);

  const grouped = useMemo(() => {
    const groups: { category: EventCategory; label: string; icon: string; events: Event[] }[] = [];
    const seen = new Set<string>();
    for (const event of listEvents) {
      const cat = event.category;
      if (!seen.has(cat)) {
        seen.add(cat);
        groups.push({ category: cat, label: CATEGORY_LABELS[cat] || cat, icon: CATEGORY_ICONS[cat] || "✨", events: [] });
      }
      groups.find((g) => g.category === cat)!.events.push(event);
    }
    return groups;
  }, [listEvents]);

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
    setQuickDatePreset("all");
    setDaysAhead(0);
    setSingleDate("");
    setRangeFrom("");
    setRangeTo("");
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

          <div>
            <p className="text-[11px] font-medium text-muted-foreground mb-1.5">Data</p>
            <div className="flex flex-wrap gap-1.5 mb-2">
              {QUICK_DATE_PRESETS.map((preset) => (
                <button
                  key={preset.key}
                  onClick={() => {
                    setQuickDatePreset(preset.key);
                    setDaysAhead(0);
                    setSingleDate("");
                    setRangeFrom("");
                    setRangeTo("");
                  }}
                  className={cn(
                    "px-2.5 py-1 rounded-lg text-[11px] font-medium border transition-all duration-200",
                    quickDatePreset === preset.key && !singleDate && !rangeFrom && !rangeTo
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-background text-muted border-border hover:border-primary/30 hover:text-foreground"
                  )}
                >
                  {preset.label}
                </button>
              ))}
            </div>
            <input
              type="date"
              value={singleDate}
              onChange={(e) => {
                setSingleDate(e.target.value);
                setQuickDatePreset("all");
                setDaysAhead(0);
                setRangeFrom("");
                setRangeTo("");
              }}
              className="w-full px-2.5 py-1.5 rounded-lg border border-border bg-background text-[11px] text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
            />

            <div className="mt-2">
              <label className="text-[11px] font-medium text-muted-foreground">Najbliższe dni: {daysAhead}</label>
              <input
                type="range"
                min={0}
                max={60}
                step={1}
                value={daysAhead}
                onChange={(e) => {
                  const next = Number(e.target.value);
                  setDaysAhead(next);
                  if (next > 0) {
                    setQuickDatePreset("all");
                    setSingleDate("");
                    setRangeFrom("");
                    setRangeTo("");
                  }
                }}
                className="w-full accent-[var(--color-primary)]"
              />
            </div>

            <div className="mt-2 grid grid-cols-2 gap-2">
              <input
                type="date"
                value={rangeFrom}
                onChange={(e) => {
                  setRangeFrom(e.target.value);
                  setQuickDatePreset("all");
                  setDaysAhead(0);
                  setSingleDate("");
                }}
                className="px-2 py-1.5 rounded-lg border border-border bg-background text-[11px] text-foreground"
              />
              <input
                type="date"
                value={rangeTo}
                onChange={(e) => {
                  setRangeTo(e.target.value);
                  setQuickDatePreset("all");
                  setDaysAhead(0);
                  setSingleDate("");
                }}
                className="px-2 py-1.5 rounded-lg border border-border bg-background text-[11px] text-foreground"
              />
            </div>
          </div>

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

            <div>
              <p className="text-[9px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">Data</p>
              <div className="flex flex-wrap gap-1">
                {QUICK_DATE_PRESETS.map((preset) => (
                  <button
                    key={preset.key}
                    onClick={() => {
                      setQuickDatePreset(preset.key);
                      setDaysAhead(0);
                      setSingleDate("");
                      setRangeFrom("");
                      setRangeTo("");
                    }}
                    className={cn(
                      "px-2 py-1 rounded-md text-[10px] font-medium border transition-all duration-200",
                      quickDatePreset === preset.key && !singleDate && !rangeFrom && !rangeTo
                        ? "bg-primary text-primary-foreground border-primary"
                        : "bg-background text-muted border-border hover:border-primary/30 hover:text-foreground"
                    )}
                  >
                    {preset.label}
                  </button>
                ))}
              </div>

              <input
                type="date"
                value={singleDate}
                onChange={(e) => {
                  setSingleDate(e.target.value);
                  setQuickDatePreset("all");
                  setDaysAhead(0);
                  setRangeFrom("");
                  setRangeTo("");
                }}
                className="mt-2 w-full px-2 py-1 rounded-lg border border-border bg-background text-[11px] text-foreground"
              />

              <div className="mt-2">
                <label className="text-[10px] font-medium text-muted-foreground">Najbliższe dni: {daysAhead}</label>
                <input
                  type="range"
                  min={0}
                  max={60}
                  step={1}
                  value={daysAhead}
                  onChange={(e) => {
                    const next = Number(e.target.value);
                    setDaysAhead(next);
                    if (next > 0) {
                      setQuickDatePreset("all");
                      setSingleDate("");
                      setRangeFrom("");
                      setRangeTo("");
                    }
                  }}
                  className="w-full accent-[var(--color-primary)]"
                />
              </div>

              <div className="mt-2 grid grid-cols-2 gap-1.5">
                <input
                  type="date"
                  value={rangeFrom}
                  onChange={(e) => {
                    setRangeFrom(e.target.value);
                    setQuickDatePreset("all");
                    setDaysAhead(0);
                    setSingleDate("");
                  }}
                  className="px-2 py-1 rounded-lg border border-border bg-background text-[10px] text-foreground"
                />
                <input
                  type="date"
                  value={rangeTo}
                  onChange={(e) => {
                    setRangeTo(e.target.value);
                    setQuickDatePreset("all");
                    setDaysAhead(0);
                    setSingleDate("");
                  }}
                  className="px-2 py-1 rounded-lg border border-border bg-background text-[10px] text-foreground"
                />
              </div>
            </div>

            {hasActiveFilters && (
              <button onClick={clearFilters} className="inline-flex items-center gap-1 text-[10px] font-medium text-muted-foreground hover:text-foreground transition-colors pt-2 border-t border-border w-full">
                <X size={10} />Wyczyść filtry
              </button>
            )}

            {view === "list" && (
              <>
                <div className="border-t border-border" />
                <div className="rounded-lg border border-border overflow-hidden h-56 bg-accent/10">
                  {MapComponent ? (
                    <MapComponent groups={sidebarMapGroups} />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-[11px] text-muted-foreground">
                      Ładowanie mapy...
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        </aside>

        {/* Main content */}
        <div className="flex-1 min-w-0">
          {view === "calendar-map" ? (
            <CalendarMapView events={filtered} />
          ) : (
            <>
              {listEvents.length === 0 ? (
                <div className="text-center py-16">
                  <Search size={32} className="mx-auto text-muted-foreground/20 mb-3" />
                  <p className="text-[14px] text-muted mb-3">Brak wydarzeń pasujących do filtrów daty i pozostałych filtrów.</p>
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
            </>
          )}
        </div>
      </div>
    </div>
  );
}
