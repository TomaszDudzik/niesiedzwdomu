"use client";

import { useState, useMemo, useEffect, useRef } from "react";
import { Search, LayoutGrid, CalendarDays, SlidersHorizontal, X, MapPin, MapIcon, Check, ChevronDown } from "lucide-react";
import { DISTRICT_LIST } from "@/lib/mock-data";
import { ContentCard } from "@/components/ui/content-card";
import { FilterSection } from "@/components/ui/filter-section";
import { SubmissionCta } from "@/components/ui/submission-cta";
import { cn, toLocalDateKey } from "@/lib/utils";
import { getEventsForDate } from "@/lib/filter-events";
import { getAgeGroupOptions, getTaxonomyOptions, matchesTaxonomyFilter, mergeSelectedTaxonomyOptions } from "@/lib/taxonomy-filters";
import type { Event, District } from "@/types/database";

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
  "Bieżanów-Prokocim": [50.015, 20.005],
};

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

function groupByLocation(events: Event[]): MarkerGroup[] {
  const groups: Record<string, MarkerGroup> = {};
  for (const event of events) {
    const coords: [number, number] = event.lat && event.lng
      ? [event.lat, event.lng]
      : (DISTRICT_COORDS[event.district] || KRAKOW_CENTER);
    const key = `${coords[0]},${coords[1]}`;
    if (!groups[key]) {
      groups[key] = { coords, events: [], label: event.street || event.city || event.district };
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
  const today = getTodayStart();
  const startYear = today.getFullYear();
  const startMonth = today.getMonth();
  const monthScrollerRef = useRef<HTMLDivElement | null>(null);
  const todayButtonRef = useRef<HTMLButtonElement | null>(null);

  const [search, setSearch] = useState("");
  const [activeTypes, setActiveTypes] = useState<string[]>([]);
  const [activeCategories, setActiveCategories] = useState<string[]>([]);
  const [activeDistricts, setActiveDistricts] = useState<District[]>([]);
  const [activeAgeGroups, setActiveAgeGroups] = useState<string[]>([]);
  const [view, setView] = useState<ViewMode>("list");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [filtersOpenDesktop, setFiltersOpenDesktop] = useState(false);
  const [singleDate, setSingleDate] = useState("");
  const [rangeFrom, setRangeFrom] = useState("");
  const [rangeTo, setRangeTo] = useState("");
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [currentMonth, setCurrentMonth] = useState(() => today.getMonth());
  const [currentYear, setCurrentYear] = useState(() => today.getFullYear());
  const [MapComponent, setMapComponent] = useState<React.ComponentType<{ groups: MarkerGroup[] }> | null>(null);

  useEffect(() => {
    import("./map-leaflet").then((mod) => setMapComponent(() => mod.MapLeaflet));
  }, []);

  useEffect(() => {
    if (currentYear !== today.getFullYear() || currentMonth !== today.getMonth()) {
      return;
    }

    todayButtonRef.current?.scrollIntoView({
      behavior: "smooth",
      inline: "center",
      block: "nearest",
    });
  }, [currentMonth, currentYear, today]);

  const ageGroups = useMemo(
    () => AGE_GROUPS.filter((g) => activeAgeGroups.includes(g.key)),
    [activeAgeGroups]
  );
  const hasDateFilters = !!singleDate || !!rangeFrom || !!rangeTo;
  const hasActiveFilters =
    !!search || activeTypes.length > 0 || activeCategories.length > 0 || activeDistricts.length > 0 || activeAgeGroups.length > 0 || hasDateFilters;
  function matchesSearch(event: Event) {
    if (!search) {
      return true;
    }

    const query = search.toLowerCase();
    return [event.title, event.description_short, event.street, event.city, event.district].join(" ").toLowerCase().includes(query);
  }

  function matchesAgeSelection(event: Event, selectedGroups = ageGroups) {
    if (selectedGroups.length === 0) {
      return true;
    }

    return selectedGroups.some((group) =>
      (event.age_min === null || event.age_min <= group.max) &&
      (event.age_max === null || event.age_max >= group.min)
    );
  }

  function matchesDateSelection(event: Event) {
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

  function matchesEventFilters(event: Event, excluded: Array<"type" | "category" | "district" | "age" | "date"> = []) {
    if (!matchesSearch(event)) {
      return false;
    }
    if (!excluded.includes("type") && !matchesTaxonomyFilter(getEventTypeValue(event), activeTypes)) {
      return false;
    }
    if (!excluded.includes("category") && !matchesTaxonomyFilter(getEventCategoryValue(event), activeCategories)) {
      return false;
    }
    if (!excluded.includes("district") && activeDistricts.length > 0 && !activeDistricts.includes(event.district)) {
      return false;
    }
    if (!excluded.includes("age") && !matchesAgeSelection(event)) {
      return false;
    }
    if (!excluded.includes("date") && !matchesDateSelection(event)) {
      return false;
    }
    return true;
  }

  const listEvents = useMemo(
    () => events.filter((event) => matchesEventFilters(event)),
    [events, search, activeTypes, activeCategories, activeDistricts, ageGroups, rangeFrom, rangeTo, singleDate]
  );

  const typeOptionsSource = useMemo(
    () => events.filter((event) => matchesEventFilters(event, ["type"])),
    [events, search, activeCategories, activeDistricts, ageGroups, rangeFrom, rangeTo, singleDate]
  );

  const typeOptions = useMemo(
    () => mergeSelectedTaxonomyOptions(getTaxonomyOptions(typeOptionsSource, getEventTypeValue), activeTypes),
    [typeOptionsSource, activeTypes]
  );

  const typeOptionsByValue = useMemo(
    () => new Map(typeOptions.map((option) => [option.value, option])),
    [typeOptions]
  );

  const categoryOptions = useMemo(
    () => mergeSelectedTaxonomyOptions(
      getTaxonomyOptions(events.filter((event) => matchesEventFilters(event, ["category"])), getEventCategoryValue),
      activeCategories,
    ),
    [events, search, activeTypes, activeDistricts, ageGroups, rangeFrom, rangeTo, singleDate, activeCategories]
  );

  const categoryOptionsByValue = useMemo(
    () => new Map(categoryOptions.map((option) => [option.value, option])),
    [categoryOptions]
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
      const dateOptionEvents = events.filter((event) => matchesEventFilters(event, ["date"]));
      counts.set(key, getEventsForDate(dateOptionEvents, date).length);
    }
    return counts;
  }, [events, search, activeTypes, activeCategories, activeDistricts, ageGroups, monthDays]);

  const ageOptions = useMemo(
    () => getAgeGroupOptions(
      events.filter((event) => matchesEventFilters(event, ["age"])),
      (event) => event.age_min,
      (event) => event.age_max,
      AGE_GROUPS,
    ),
    [events, search, activeTypes, activeCategories, activeDistricts, rangeFrom, rangeTo, singleDate]
  );

  const sidebarMapGroups = useMemo(() => groupByLocation(listEvents), [listEvents]);

  const grouped = useMemo(() => {
    const groups: { category: string; label: string; icon: string; events: Event[] }[] = [];
    const seen = new Set<string>();
    for (const event of listEvents) {
      const cat = getEventTypeValue(event);
      const categoryOption = typeOptionsByValue.get(cat);
      if (!seen.has(cat)) {
        seen.add(cat);
        groups.push({
          category: cat,
          label: categoryOption?.label || cat,
          icon: categoryOption?.icon || "✨",
          events: [],
        });
      }
      groups.find((g) => g.category === cat)!.events.push(event);
    }
    return groups;
  }, [listEvents, typeOptionsByValue]);

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
        onRemove: () => setActiveCategories((prev) => prev.filter((c) => c !== category)),
      });
    });

    activeAgeGroups.forEach((ageKey) => {
      const age = AGE_GROUPS.find((g) => g.key === ageKey);
      if (age) {
        badges.push({
          id: `age-${age.key}`,
          label: `Wiek: ${age.label}`,
          onRemove: () => setActiveAgeGroups((prev) => prev.filter((k) => k !== age.key)),
        });
      }
    });

    activeDistricts.forEach((district) => {
      badges.push({
        id: `district-${district}`,
        label: `Dzielnica: ${district}`,
        onRemove: () => setActiveDistricts((prev) => prev.filter((d) => d !== district)),
      });
    });

    if (singleDate) {
      const d = parseDateOnly(singleDate);
      badges.push({
        id: "singleDate",
        label: `Data: ${d ? d.toLocaleDateString("pl-PL") : singleDate}`,
        onRemove: () => setSingleDate(""),
      });
    } else if (rangeFrom || rangeTo) {
      const fromLabel = rangeFrom ? (parseDateOnly(rangeFrom)?.toLocaleDateString("pl-PL") || rangeFrom) : "od początku";
      const toLabel = rangeTo ? (parseDateOnly(rangeTo)?.toLocaleDateString("pl-PL") || rangeTo) : "bez końca";
      badges.push({
        id: "range",
        label: `Zakres: ${fromLabel} - ${toLabel}`,
        onRemove: () => {
          setRangeFrom("");
          setRangeTo("");
        },
      });
    }

    return badges;
  }, [search, activeTypes, activeCategories, activeAgeGroups, activeDistricts, singleDate, rangeFrom, rangeTo, typeOptionsByValue, categoryOptionsByValue]);

  const availableDistricts = useMemo(() => {
    const set = new Set<string>();
    events.filter((event) => matchesEventFilters(event, ["district"])).forEach((event) => set.add(event.district));
    return DISTRICT_LIST.filter((district) => set.has(district) || activeDistricts.includes(district));
  }, [events, search, activeTypes, activeCategories, ageGroups, rangeFrom, rangeTo, singleDate, activeDistricts]);

  const districtCounts = useMemo(() => {
    const counts = new Map<District, number>();
    events.filter((event) => matchesEventFilters(event, ["district"])).forEach((event) => {
      counts.set(event.district, (counts.get(event.district) || 0) + 1);
    });
    return counts;
  }, [events, search, activeTypes, activeCategories, ageGroups, rangeFrom, rangeTo, singleDate]);

  function clearFilters() {
    setSearch("");
    setActiveTypes([]);
    setActiveCategories([]);
    setActiveDistricts([]);
    setActiveAgeGroups([]);
    setSingleDate("");
    setRangeFrom("");
    setRangeTo("");
    setSelectedDate(null);
  }

  function toggleType(type: string) {
    setActiveTypes((prev) =>
      prev.includes(type) ? prev.filter((item) => item !== type) : [...prev, type]
    );
    setActiveCategories([]);
  }

  function toggleCategory(category: string) {
    setActiveCategories((prev) =>
      prev.includes(category) ? prev.filter((c) => c !== category) : [...prev, category]
    );
  }

  function toggleAgeGroup(ageKey: string) {
    setActiveAgeGroups((prev) =>
      prev.includes(ageKey) ? prev.filter((k) => k !== ageKey) : [...prev, ageKey]
    );
  }

  function toggleDistrict(district: District) {
    setActiveDistricts((prev) =>
      prev.includes(district) ? prev.filter((d) => d !== district) : [...prev, district]
    );
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

  return (
    <div className="container-page pt-5 pb-10">
      <SubmissionCta
        mobile
        title="Organizujesz wydarzenie dla dzieci?"
        description="Dodaj je do kalendarza i pomóż rodzinom znaleźć pomysł na dziś albo weekend."
        buttonLabel="Dodaj wydarzenie"
        href="/dodaj?type=event"
      />

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
          <button onClick={() => setView("map")} className={cn("px-2 py-1 rounded-lg text-[11px] font-medium transition-all duration-200", view === "map" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground")}><MapIcon size={12} /></button>
        </div>
      </div>

      {/* Mobile filters dropdown */}
      {filtersOpen && (
        <div className="lg:hidden rounded-xl border border-border bg-card p-3 mb-4 space-y-2.5">
          <FilterSection title={<p className="text-[11px] font-medium text-muted-foreground">Data</p>} defaultCollapsed={false}>
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
              className="w-full px-2.5 py-1.5 rounded-lg border border-border bg-background text-[11px] text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
            />

            <p className="text-[10px] text-muted-foreground mt-2 mb-1">Zakres dat (od-do)</p>
            <div className="grid grid-cols-2 gap-1.5">
              <input
                type="date"
                onClick={(e) => openDatePicker(e.currentTarget)}
                value={rangeFrom}
                onChange={(e) => {
                  setRangeFrom(e.target.value);
                  setSingleDate("");
                  setSelectedDate(null);
                }}
                className="px-2 py-1.5 rounded-lg border border-border bg-background text-[11px] text-foreground"
              />
              <input
                type="date"
                onClick={(e) => openDatePicker(e.currentTarget)}
                value={rangeTo}
                onChange={(e) => {
                  setRangeTo(e.target.value);
                  setSingleDate("");
                  setSelectedDate(null);
                }}
                className="px-2 py-1.5 rounded-lg border border-border bg-background text-[11px] text-foreground"
              />
            </div>
          </FilterSection>

          <FilterSection title={<p className="text-[11px] font-medium text-muted-foreground">Typ</p>} defaultCollapsed={false}>
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

          <FilterSection title={<p className="text-[11px] font-medium text-muted-foreground">Kategoria</p>} defaultCollapsed={false}>
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

      {/* Desktop layout */}
      <div className="lg:flex lg:gap-6 lg:items-start">

        {/* Sidebar — desktop only */}
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

            <FilterSection title={<p className="text-[9px] font-semibold text-muted-foreground uppercase tracking-wider">Data</p>} defaultCollapsed={!filtersOpenDesktop}>
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
                  onChange={(e) => {
                    setRangeFrom(e.target.value);
                    setSingleDate("");
                    setSelectedDate(null);
                  }}
                  className="px-1.5 py-1 rounded-lg border border-border bg-background text-[9px] text-foreground"
                />
                <input
                  type="date"
                  onClick={(e) => openDatePicker(e.currentTarget)}
                  value={rangeTo}
                  onChange={(e) => {
                    setRangeTo(e.target.value);
                    setSingleDate("");
                    setSelectedDate(null);
                  }}
                  className="px-1.5 py-1 rounded-lg border border-border bg-background text-[9px] text-foreground"
                />
              </div>
            </FilterSection>

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

            <FilterSection title={<p className="text-[9px] font-semibold text-muted-foreground uppercase tracking-wider">Kategoria</p>} defaultCollapsed>
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

            <FilterSection title={<p className="text-[9px] font-semibold text-muted-foreground uppercase tracking-wider">Dzielnica</p>} defaultCollapsed>
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
          <>
            <div className="space-y-7">
              <SubmissionCta
                title="Organizujesz wydarzenie dla dzieci?"
                description="Dodaj je do kalendarza i pomóż rodzinom znaleźć pomysł na dziś albo weekend."
                buttonLabel="Dodaj wydarzenie"
                href="/dodaj?type=event"
              />

              <div className="rounded-xl border border-border bg-white overflow-hidden mb-4">
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
                    const selected = selectedDate ? isSameDay(date, selectedDate) : false;
                    const rangeStart = parseDateOnly(rangeFrom);
                    const rangeEnd = parseDateOnly(rangeTo);
                    const inRange = !!(rangeStart && rangeEnd && date >= rangeStart && date <= rangeEnd);
                    const rangeEdge = !!(
                      rangeStart && rangeEnd && (isSameDay(date, rangeStart) || isSameDay(date, rangeEnd))
                    );
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
                          selected || rangeEdge
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
                        <span className={cn("text-[9px] lg:text-[8px] font-medium uppercase leading-none", selected ? "text-white/70" : "text-muted-foreground")}>
                          {DAYS_PL[date.getDay()]}
                        </span>
                        <span className={cn("text-[12px] lg:text-[11px] font-semibold leading-tight mt-0.5", selected && "text-white")}>
                          {date.getDate()}
                        </span>
                        <span
                          className={cn(
                            "mt-0.5 text-[9px] lg:text-[8px] leading-none font-semibold",
                            selected
                              ? "text-primary-foreground/85"
                              : count > 0
                                ? "text-primary/80"
                                : "text-muted-foreground/55"
                          )}
                        >
                          {count > 99 ? "99+" : count}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="rounded-xl border border-border bg-card px-2.5 py-2">
                <div className="flex flex-wrap items-center gap-1.5">
                  <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Filtry:</p>
                  {activeFilterBadges.length > 0 ? (
                    <>
                      {activeFilterBadges.map((badge) => (
                        <span
                          key={badge.id}
                          className="inline-flex items-center gap-1 rounded-full border border-border bg-accent/60 px-2 py-0.5 text-[10px] font-medium text-foreground"
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
                        className="inline-flex items-center gap-1 rounded-full border border-border bg-background px-2 py-0.5 text-[10px] font-semibold text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
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
                      <MapComponent groups={sidebarMapGroups} />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-[13px] text-muted-foreground">
                        Ładowanie mapy...
                      </div>
                    )}
                  </div>
                </div>
              ) : listEvents.length === 0 ? (
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
            </div>
          </>
        </div>
      </div>
    </div>
  );
}
