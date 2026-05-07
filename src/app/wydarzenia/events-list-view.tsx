"use client";

import { useState, useMemo, useEffect, useRef } from "react";
import type { ComponentType } from "react";
import { Search, X, Check, ChevronDown } from "lucide-react";
import { MobileActionBar } from "@/components/ui/mobile-action-bar";
import { PageHero } from "@/components/layout/page-hero";
import { ListGroupHeader } from "@/components/layout/list-group-header";
import { ListPageMainContent } from "@/components/layout/list-page-main-content";
import { ListPageSidebar } from "@/components/layout/list-page-sidebar";
import { ContentCard } from "@/components/ui/content-card";
import { FilterSection } from "@/components/ui/filter-section";
import { FilterBadgeBar } from "@/components/ui/filter-badge-bar";
import { TopSearchBar } from "@/components/ui/top-search-bar";
import { ViewModeToggle } from "@/components/ui/view-mode-toggle";
import { cn, toLocalDateKey } from "@/lib/utils";
import { getEventsForDate } from "@/lib/filter-events";
import { DISTRICT_ICONS, KRAKOW_CENTER, DISTRICT_COORDS } from "@/lib/district-constants";
import { useListFilters } from "@/hooks/use-list-filters";
import type { Event } from "@/types/database";

const AGE_GROUPS = [
  { key: "0-3", label: "0–3 lata", icon: "👶", min: 0, max: 3 },
  { key: "4-6", label: "4–6 lat", icon: "🧒", min: 4, max: 6 },
  { key: "7-10", label: "7–10 lat", icon: "🎒", min: 7, max: 10 },
  { key: "11-14", label: "11–14 lat", icon: "🧑", min: 11, max: 14 },
  { key: "15+", label: "15+ lat", icon: "🎓", min: 15, max: 99 },
] as const;

const MONTHS_PL = [
  "Styczeń", "Luty", "Marzec", "Kwiecień", "Maj", "Czerwiec",
  "Lipiec", "Sierpień", "Wrzesień", "Październik", "Listopad", "Grudzień",
];
const DAYS_PL = ["Nd", "Pn", "Wt", "Śr", "Cz", "Pt", "So"];

interface MarkerGroup {
  coords: [number, number];
  events: Event[];
  label: string;
  markerIcon?: string;
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

function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

function isSameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

function isToday(date: Date): boolean {
  return isSameDay(date, new Date());
}

function isWeekend(date: Date): boolean {
  const d = date.getDay();
  return d === 0 || d === 6;
}

function parseDateOnly(value: string): Date | null {
  if (!value) return null;
  const d = new Date(`${value}T00:00:00`);
  return Number.isNaN(d.getTime()) ? null : d;
}

function toDateInputValue(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function openDatePicker(input: HTMLInputElement) {
  input.showPicker?.();
}

function eventIntersectsRange(event: Event, range: DateRange): boolean {
  const eventStart = parseDateOnly(event.date_start);
  if (!eventStart) return false;
  const eventEndRaw = parseDateOnly(event.date_end || "") || eventStart;
  const eventEnd = toEndOfDay(eventEndRaw);
  return eventStart <= range.end && eventEnd >= range.start;
}

function groupByLocation(events: Event[], typeIconByValue?: Map<string, { icon?: string }>): MarkerGroup[] {
  const groups: Record<string, MarkerGroup> = {};
  for (const event of events) {
    const coords: [number, number] = event.lat && event.lng
      ? [event.lat, event.lng]
      : (DISTRICT_COORDS[event.district] || KRAKOW_CENTER);
    const key = `${coords[0]},${coords[1]}`;
    const markerIcon = typeIconByValue?.get(getEventTypeValue(event))?.icon || "📍";
    if (!groups[key]) {
      groups[key] = { coords, events: [], label: event.street || event.city || event.district, markerIcon };
    }
    groups[key].events.push(event);
  }
  return Object.values(groups);
}

type ViewMode = "list" | "map";

interface EventsListViewProps {
  events: Event[];
}

function getEventTypeValue(event: Event): string {
  return event.category_lvl_1 ?? event.main_category ?? event.category ?? "Bez kategorii";
}

function getEventCategoryValue(event: Event): string | null {
  return event.category_lvl_2 ?? null;
}

export function EventsListView({ events }: EventsListViewProps) {
  const today = useMemo(() => getTodayStart(), []);
  const startYear = today.getFullYear();
  const startMonth = today.getMonth();
  const monthScrollerRef = useRef<HTMLDivElement | null>(null);
  const todayButtonRef = useRef<HTMLButtonElement | null>(null);
  const hasAutoScrolled = useRef(false);

  const [view, setView] = useState<ViewMode>("list");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [singleDate, setSingleDate] = useState("");
  const [rangeFrom, setRangeFrom] = useState("");
  const [rangeTo, setRangeTo] = useState("");
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [currentMonth, setCurrentMonth] = useState(() => today.getMonth());
  const [currentYear, setCurrentYear] = useState(() => today.getFullYear());
  const [MapComponent, setMapComponent] = useState<ComponentType<{ groups: MarkerGroup[] }> | null>(null);

  useEffect(() => {
    import("./map-leaflet").then((mod) => setMapComponent(() => mod.MapLeaflet));
  }, []);

  useEffect(() => {
    if (hasAutoScrolled.current) return;
    if (currentYear !== today.getFullYear() || currentMonth !== today.getMonth()) return;
    if (!todayButtonRef.current) return;
    todayButtonRef.current.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
    hasAutoScrolled.current = true;
  }, [currentMonth, currentYear, today]);

  const filters = useListFilters({
    items: events,
    ageGroups: AGE_GROUPS,
    getType: getEventTypeValue,
    getCategory: getEventCategoryValue,
    getDistrict: (e) => e.district,
    getAgeMin: (e) => e.age_min,
    getAgeMax: (e) => e.age_max,
    getSearchText: (e) => [e.title, e.description_short, e.street, e.city, e.district].join(" "),
  });

  function matchesDateSelection(event: Event): boolean {
    const fromDate = parseDateOnly(rangeFrom);
    const toDate = parseDateOnly(rangeTo);
    if (fromDate || toDate) {
      const start = fromDate ? toStartOfDay(fromDate) : new Date(1970, 0, 1);
      const end = toDate ? toEndOfDay(toDate) : new Date(2100, 0, 1);
      return eventIntersectsRange(event, { start, end });
    }
    const exactDate = parseDateOnly(singleDate);
    if (exactDate) {
      return eventIntersectsRange(event, { start: toStartOfDay(exactDate), end: toEndOfDay(exactDate) });
    }
    return true;
  }

  const filteredEvents = useMemo(
    () => filters.filteredItems.filter(matchesDateSelection),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [filters.filteredItems, singleDate, rangeFrom, rangeTo]
  );

  const daysInMonth = getDaysInMonth(currentYear, currentMonth);

  const monthDays = useMemo(
    () => Array.from({ length: daysInMonth }, (_, i) => new Date(currentYear, currentMonth, i + 1)),
    [currentYear, currentMonth, daysInMonth]
  );

  const monthOptions = useMemo(
    () => Array.from({ length: 12 }, (_, offset) => {
      const d = new Date(startYear, startMonth + offset, 1);
      return {
        month: d.getMonth(),
        year: d.getFullYear(),
        label: MONTHS_PL[d.getMonth()].slice(0, 3),
        key: `${d.getFullYear()}-${d.getMonth()}`,
      };
    }),
    [startYear, startMonth]
  );

  const eventCountMap = useMemo(() => {
    const counts = new Map<string, number>();
    for (const date of monthDays) {
      const key = toLocalDateKey(date);
      counts.set(key, getEventsForDate(filters.filteredItems, date).length);
    }
    return counts;
  }, [filters.filteredItems, monthDays]);

  const mapGroups = useMemo(
    () => groupByLocation(filteredEvents, filters.typeOptionsByValue as Map<string, { icon?: string }>),
    [filteredEvents, filters.typeOptionsByValue]
  );

  const grouped = useMemo(() => {
    const groups: { category: string; label: string; icon: string; events: Event[] }[] = [];
    const seen = new Set<string>();
    for (const event of filteredEvents) {
      const cat = getEventTypeValue(event);
      const opt = filters.typeOptionsByValue.get(cat);
      if (!seen.has(cat)) {
        seen.add(cat);
        groups.push({ category: cat, label: opt?.label || cat, icon: opt?.icon || "✨", events: [] });
      }
      groups.find((g) => g.category === cat)!.events.push(event);
    }
    return groups;
  }, [filteredEvents, filters.typeOptionsByValue]);

  const dateBadges = useMemo(() => {
    const badges: { id: string; label: string; onRemove: () => void }[] = [];
    if (singleDate) {
      const d = parseDateOnly(singleDate);
      badges.push({ id: "singleDate", label: `Data: ${d ? d.toLocaleDateString("pl-PL") : singleDate}`, onRemove: () => setSingleDate("") });
    } else if (rangeFrom || rangeTo) {
      const fromLabel = rangeFrom ? (parseDateOnly(rangeFrom)?.toLocaleDateString("pl-PL") || rangeFrom) : "od początku";
      const toLabel = rangeTo ? (parseDateOnly(rangeTo)?.toLocaleDateString("pl-PL") || rangeTo) : "bez końca";
      badges.push({ id: "range", label: `Zakres: ${fromLabel} - ${toLabel}`, onRemove: () => { setRangeFrom(""); setRangeTo(""); } });
    }
    return badges;
  }, [singleDate, rangeFrom, rangeTo]);

  const allBadges = useMemo(() => [...filters.filterBadges, ...dateBadges], [filters.filterBadges, dateBadges]);

  const hasActiveFilters = filters.hasActiveFilters || !!singleDate || !!rangeFrom || !!rangeTo;

  function clearAll() {
    filters.clearFilters();
    setSingleDate("");
    setRangeFrom("");
    setRangeTo("");
    setSelectedDate(null);
  }

  function updateDisplayedMonth(year: number, month: number) {
    setCurrentYear(year);
    setCurrentMonth(month);
    setSelectedDate((prev) => {
      if (!prev) return null;
      const safeDay = Math.min(prev.getDate(), getDaysInMonth(year, month));
      return new Date(year, month, safeDay);
    });
  }

  function handleCalendarDateClick(date: Date) {
    if (rangeFrom || rangeTo) {
      setRangeFrom("");
      setRangeTo("");
      setSingleDate(toDateInputValue(date));
      setSelectedDate(date);
      return;
    }
    if (!selectedDate) {
      setSingleDate(toDateInputValue(date));
      setSelectedDate(date);
      return;
    }
    if (isSameDay(selectedDate, date)) {
      setSingleDate("");
      setSelectedDate(null);
      return;
    }
    const start = selectedDate < date ? selectedDate : date;
    const end = selectedDate < date ? date : selectedDate;
    setSingleDate("");
    setRangeFrom(toDateInputValue(start));
    setRangeTo(toDateInputValue(end));
    setSelectedDate(null);
  }

  const dateSidebarSection = (
    <FilterSection title={<p className="text-[11px] font-semibold text-foreground uppercase tracking-wider">Data</p>} defaultCollapsed>
      <p className="text-[10px] text-muted-foreground mb-1">Konkretna data</p>
      <input
        type="date"
        onClick={(e) => openDatePicker(e.currentTarget)}
        value={singleDate}
        onChange={(e) => {
          setSingleDate(e.target.value);
          setRangeFrom("");
          setRangeTo("");
          setSelectedDate(parseDateOnly(e.target.value));
        }}
        className="w-full px-2 py-1 rounded-lg border border-border bg-background text-[10px] text-foreground"
      />
      <p className="text-[10px] text-muted-foreground mt-2 mb-1">Zakres dat (od-do)</p>
      <div className="grid grid-cols-2 gap-1.5">
        <input
          type="date"
          onClick={(e) => openDatePicker(e.currentTarget)}
          value={rangeFrom}
          onChange={(e) => { setRangeFrom(e.target.value); setSingleDate(""); setSelectedDate(null); }}
          className="px-1.5 py-1 rounded-lg border border-border bg-background text-[9px] text-foreground"
        />
        <input
          type="date"
          onClick={(e) => openDatePicker(e.currentTarget)}
          value={rangeTo}
          onChange={(e) => { setRangeTo(e.target.value); setSingleDate(""); setSelectedDate(null); }}
          className="px-1.5 py-1 rounded-lg border border-border bg-background text-[9px] text-foreground"
        />
      </div>
    </FilterSection>
  );

  return (
    <div>
      <PageHero
        title="Wyjątkowe Wydarzenia"
        subtitle="Warsztaty, spektakle, festyny i rodzinne atrakcje — aktualne wydarzenia na każdy dzień"
        search={filters.search}
        onSearch={filters.setSearch}
        searchPlaceholder="Szukaj wydarzeń..."
        addHref="/dodaj?type=event"
        addTitle="Organizujesz wydarzenie dla dzieci?"
        addDescription="Dodaj je do kalendarza i pomóż rodzinom znaleźć pomysł na dziś albo weekend."
        addLabel="Dodaj wydarzenie"
      />
      <div className="container-page pt-0 pb-10">
        <div className="lg:hidden mb-3 px-1">
          <div className="relative">
            <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-amber-500" />
            <input
              value={filters.search}
              onChange={(e) => filters.setSearch(e.target.value)}
              placeholder="Szukaj wydarzeń..."
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
            addHref="/dodaj?type=event"
            addLabel="Dodaj wydarzenie"
          />

          {filtersOpen && (
            <div className="lg:hidden rounded-xl p-3 mb-4 space-y-2.5">
              <FilterSection title={<p className="text-[11px] font-medium text-muted-foreground">Data</p>} defaultCollapsed>
                <p className="text-[10px] text-muted-foreground mb-1">Konkretna data</p>
                <input
                  type="date"
                  onClick={(e) => openDatePicker(e.currentTarget)}
                  value={singleDate}
                  onChange={(e) => { setSingleDate(e.target.value); setRangeFrom(""); setRangeTo(""); setSelectedDate(parseDateOnly(e.target.value)); }}
                  className="w-full px-2.5 py-1.5 rounded-lg border border-border bg-background text-[11px] text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
                <p className="text-[10px] text-muted-foreground mt-2 mb-1">Zakres dat (od-do)</p>
                <div className="grid grid-cols-2 gap-1.5">
                  <input
                    type="date"
                    onClick={(e) => openDatePicker(e.currentTarget)}
                    value={rangeFrom}
                    onChange={(e) => { setRangeFrom(e.target.value); setSingleDate(""); setSelectedDate(null); }}
                    className="px-2 py-1.5 rounded-lg border border-border bg-background text-[11px] text-foreground"
                  />
                  <input
                    type="date"
                    onClick={(e) => openDatePicker(e.currentTarget)}
                    value={rangeTo}
                    onChange={(e) => { setRangeTo(e.target.value); setSingleDate(""); setSelectedDate(null); }}
                    className="px-2 py-1.5 rounded-lg border border-border bg-background text-[11px] text-foreground"
                  />
                </div>
              </FilterSection>

              <FilterSection title={<p className="text-[11px] font-medium text-muted-foreground">Typ</p>} defaultCollapsed>
                <div className="flex flex-wrap gap-1">
                  {filters.typeOptions.map((option) => {
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

              <FilterSection title={<p className="text-[11px] font-medium text-muted-foreground">Kategoria</p>} defaultCollapsed>
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

              <FilterSection title={<p className="text-[11px] font-medium text-muted-foreground">Wiek dziecka</p>} defaultCollapsed>
                <div className="flex flex-wrap gap-1">
                  {filters.ageOptions.filter((g) => g.count > 0 || filters.activeAgeGroups.includes(g.key)).map((group) => {
                    const selected = filters.activeAgeGroups.includes(group.key);
                    return (
                      <button key={group.key} onClick={() => filters.toggleAgeGroup(group.key)}
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

              <FilterSection title={<p className="text-[11px] font-medium text-muted-foreground">Dzielnica</p>} defaultCollapsed>
                <div className="flex flex-wrap gap-1">
                  {filters.availableDistricts.map((district) => {
                    const selected = filters.activeDistricts.includes(district);
                    const count = filters.districtCounts.get(district) || 0;
                    const icon = DISTRICT_ICONS[district] || "📍";
                    return (
                      <button key={district} onClick={() => filters.toggleDistrict(district)}
                        className={cn("inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-medium border transition-all duration-200",
                          selected ? "bg-primary text-primary-foreground border-primary" : "bg-background text-muted border-border hover:border-primary/30 hover:text-foreground")}>
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
                  <button onClick={clearAll} className="inline-flex items-center gap-1 text-[11px] font-medium text-muted-foreground hover:text-foreground transition-colors">
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
            <ListPageSidebar
              search={filters.search}
              onSearchChange={filters.setSearch}
              searchPlaceholder="Szukaj wydarzeń..."
              showSearch={false}
              hasActiveFilters={hasActiveFilters}
              onClearFilters={clearAll}
              topSlot={<ViewModeToggle view={view} onSetView={setView} />}
            >
              {dateSidebarSection}

              <FilterSection title={<p className="text-[11px] font-semibold text-foreground uppercase tracking-wider">Typ</p>} defaultCollapsed>
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

              <FilterSection title={<p className="text-[11px] font-semibold text-foreground uppercase tracking-wider">Kategoria</p>} defaultCollapsed>
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

              <FilterSection title={<p className="text-[11px] font-semibold text-foreground uppercase tracking-wider">Wiek</p>} defaultCollapsed>
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
              topContent={(
                <>
                  <div className="rounded-xl border border-border bg-white overflow-hidden">
                    <div className="px-3 pt-2 pb-1 border-b border-border/50">
                      <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-hide" style={{ scrollbarWidth: "none" }}>
                        {monthOptions.map((opt) => {
                          const isActive = opt.month === currentMonth && opt.year === currentYear;
                          return (
                            <button
                              key={opt.key}
                              onClick={() => updateDisplayedMonth(opt.year, opt.month)}
                              className={cn(
                                "shrink-0 rounded-full px-3 py-1 text-[11px] font-medium transition-colors",
                                isActive ? "bg-primary text-primary-foreground" : "bg-accent text-foreground hover:bg-accent/70",
                              )}
                              title={`${MONTHS_PL[opt.month]} ${opt.year}`}
                            >
                              {opt.label}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    <div ref={monthScrollerRef} className="flex lg:grid lg:grid-flow-col lg:auto-cols-fr overflow-x-auto lg:overflow-visible scrollbar-hide py-2 px-2 gap-1.5 lg:gap-0.5" style={{ scrollbarWidth: "none" }}>
                      {monthDays.map((date) => {
                        const key = toLocalDateKey(date);
                        const sel = selectedDate ? isSameDay(date, selectedDate) : false;
                        const rangeStart = parseDateOnly(rangeFrom);
                        const rangeEnd = parseDateOnly(rangeTo);
                        const inRange = !!(rangeStart && rangeEnd && date >= rangeStart && date <= rangeEnd);
                        const rangeEdge = !!(rangeStart && rangeEnd && (isSameDay(date, rangeStart) || isSameDay(date, rangeEnd)));
                        const todayFlag = isToday(date);
                        const weekend = isWeekend(date);
                        const count = eventCountMap.get(key) || 0;
                        const isPast = date < today;

                        return (
                          <button
                            ref={todayFlag ? todayButtonRef : null}
                            key={key}
                            onClick={() => handleCalendarDateClick(date)}
                            title={`${date.toLocaleDateString("pl-PL")}${count > 0 ? ` • ${count} wydarzeń` : ""}`}
                            className={cn(
                              "flex flex-col items-center justify-center min-w-[54px] lg:min-w-0 px-2 lg:px-0.5 py-2 lg:py-1 rounded-lg lg:rounded-md transition-all relative shrink-0 lg:shrink",
                              sel || rangeEdge
                                ? "bg-primary text-primary-foreground shadow-sm"
                                : inRange
                                  ? "bg-primary/15 text-foreground ring-1 ring-primary/20"
                                  : todayFlag
                                    ? "bg-accent/80 text-foreground ring-1 ring-primary/30"
                                    : isPast
                                      ? "text-muted-foreground/40 hover:bg-accent/40"
                                      : weekend
                                        ? "text-foreground hover:bg-accent/60 bg-accent/20"
                                        : "text-foreground hover:bg-accent/50"
                            )}
                          >
                            <span className={cn("text-[9px] lg:text-[8px] font-medium uppercase leading-none", sel ? "text-white/70" : "text-muted-foreground")}>
                              {DAYS_PL[date.getDay()]}
                            </span>
                            <span className={cn("text-[12px] lg:text-[11px] font-semibold leading-tight mt-0.5", sel && "text-white")}>
                              {date.getDate()}
                            </span>
                            <span className={cn(
                              "mt-0.5 text-[9px] lg:text-[8px] leading-none font-semibold",
                              sel ? "text-primary-foreground/85" : count > 0 ? "text-danger/80" : "text-muted-foreground/55"
                            )}>
                              {count > 99 ? "99+" : count}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <FilterBadgeBar badges={allBadges} onClearAll={clearAll} />
                </>
              )}
            >
              {view === "map" ? (
                <div className="space-y-3">
                  <div className="rounded-xl border border-border bg-card px-4 py-3">
                    <h2 className="text-[15px] font-semibold text-foreground">Mapa wydarzeń w Krakowie</h2>
                    <p className="mt-1 text-[12px] leading-5 text-muted">
                      Sprawdź, gdzie odbywają się wydarzenia dla dzieci i rodzin. Kliknij pinezkę,
                      aby zobaczyć szczegóły lokalizacji i szybko przejść do wybranego wydarzenia.
                    </p>
                  </div>
                  <div className="rounded-xl border border-border overflow-hidden h-[420px] lg:h-[560px] bg-accent/10">
                    {MapComponent ? (
                      <MapComponent groups={mapGroups} />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-[13px] text-muted-foreground">
                        Ładowanie mapy...
                      </div>
                    )}
                  </div>
                </div>
              ) : filteredEvents.length === 0 ? (
                <div className="text-center py-16">
                  <Search size={32} className="mx-auto text-muted-foreground/20 mb-3" />
                  <p className="text-[14px] text-muted mb-3">Brak wydarzeń pasujących do filtrów daty i pozostałych filtrów.</p>
                  {hasActiveFilters && (
                    <button onClick={clearAll} className="text-[12px] font-medium text-primary hover:text-primary-hover transition-colors">
                      Wyczyść filtry
                    </button>
                  )}
                </div>
              ) : (
                <div className="space-y-12">
                  {grouped.map((group) => (
                    <section key={group.category}>
                      <ListGroupHeader icon={group.icon} title={group.label} count={group.events.length} />
                      <div className="grid grid-cols-1 sm:grid-cols-3 xl:grid-cols-4 gap-4">
                        {group.events.map((event) => (
                          <ContentCard key={event.id} item={event} variant="vertical" mobileTitleTop />
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
