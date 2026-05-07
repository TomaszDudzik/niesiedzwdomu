"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { Search, X, Check, ChevronDown } from "lucide-react";
import { MobileActionBar } from "@/components/ui/mobile-action-bar";
import { PageHero } from "@/components/layout/page-hero";
import { ListPageMainContent } from "@/components/layout/list-page-main-content";
import { ListPageSidebar } from "@/components/layout/list-page-sidebar";
import { FilterBadgeBar } from "@/components/ui/filter-badge-bar";
import { FilterSection } from "@/components/ui/filter-section";
import { TopSearchBar } from "@/components/ui/top-search-bar";
import { ImageWithFallback } from "@/components/ui/image-with-fallback";
import { useListFilters } from "@/hooks/use-list-filters";
import { DISTRICT_ICONS } from "@/lib/district-constants";
import { cn, formatDateShort, toLocalDateKey, thumbUrl } from "@/lib/utils";
import type { FilterBadge } from "@/components/ui/filter-badge-bar";
import type { Camp, District } from "@/types/database";

const AGE_GROUPS = [
  { key: "0-5", label: "0-5 lat", icon: "👶", min: 0, max: 5 },
  { key: "6-8", label: "6-8 lat", icon: "🧒", min: 6, max: 8 },
  { key: "9-12", label: "9-12 lat", icon: "🎒", min: 9, max: 12 },
  { key: "13+", label: "13+ lat", icon: "🧑", min: 13, max: 99 },
] as const;

const MONTHS_PL = [
  "Styczeń", "Luty", "Marzec", "Kwiecień", "Maj", "Czerwiec",
  "Lipiec", "Sierpień", "Wrzesień", "Październik", "Listopad", "Grudzień",
];
const DAYS_PL = ["Nd", "Pn", "Wt", "Śr", "Cz", "Pt", "So"];

interface DateRange {
  start: Date;
  end: Date;
}

interface OrganizerTile {
  organizerKey: string;
  organizerName: string;
  leadCamp: Camp;
  camps: Camp[];
}

interface CampsListViewProps {
  camps: Camp[];
}

function getCampTypeValue(camp: Camp): string {
  return camp.category_lvl_1 ?? camp.main_category ?? "Bez kategorii";
}

function getCampCategoryValue(camp: Camp): string | null {
  return camp.category_lvl_2 ?? camp.category ?? null;
}

function getCampSubcategoryValue(camp: Camp): string | null {
  return camp.category_lvl_3 ?? camp.subcategory ?? null;
}

function normalizeCampTypeToken(value: string): string {
  return value.trim().toLowerCase().replace(/ł/g, "l").normalize("NFD").replace(/[̀-ͯ]/g, "");
}

function getCampTypeLevel2Value(camp: Camp): "kolonie" | "polkolonie" | null {
  const value = normalizeCampTypeToken(camp.type_lvl_2 ?? "");
  if (value === "kolonie" || value === "polkolonie") return value;
  return null;
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

function campIntersectsRange(camp: Camp, range: DateRange): boolean {
  const campStart = parseDateOnly(camp.date_start);
  const campEndRaw = parseDateOnly(camp.date_end) || campStart;
  if (!campStart || !campEndRaw) return false;
  const campEnd = toEndOfDay(campEndRaw);
  return campStart <= range.end && campEnd >= range.start;
}

function getCampsForDate(camps: Camp[], date: Date): Camp[] {
  const range = { start: toStartOfDay(date), end: toEndOfDay(date) };
  return camps.filter((camp) => campIntersectsRange(camp, range));
}

function getOrganizerName(camp: Camp): string {
  return camp.organizer_data?.organizer_name?.trim() || camp.organizer?.trim() || "";
}

function getSessionLabel(count: number): string {
  if (count === 1) return "1 turnus";
  if (count < 5) return `${count} turnusy`;
  return `${count} turnusów`;
}

function getDateChipLabel(camp: Camp): string {
  const start = parseDateOnly(camp.date_start);
  const end = parseDateOnly(camp.date_end);
  if (!start) return camp.date_start;
  const startLabel = `${DAYS_PL[start.getDay()]} ${formatDateShort(start)}`;
  if (!end || isSameDay(start, end)) return startLabel;
  return `${startLabel} - ${DAYS_PL[end.getDay()]} ${formatDateShort(end)}`;
}

function sortCampsByNearest(camps: Camp[], today: Date): Camp[] {
  return [...camps].sort((a, b) => {
    const aEnd = parseDateOnly(a.date_end) || parseDateOnly(a.date_start);
    const bEnd = parseDateOnly(b.date_end) || parseDateOnly(b.date_start);
    const aIsUpcoming = !!aEnd && toEndOfDay(aEnd) >= today;
    const bIsUpcoming = !!bEnd && toEndOfDay(bEnd) >= today;
    if (aIsUpcoming !== bIsUpcoming) return aIsUpcoming ? -1 : 1;
    return new Date(a.date_start).getTime() - new Date(b.date_start).getTime();
  });
}

export function CampsListView({ camps }: CampsListViewProps) {
  const today = useMemo(() => getTodayStart(), []);
  const startYear = today.getFullYear();
  const startMonth = today.getMonth();
  const calendarRef = useRef<HTMLDivElement | null>(null);
  const todayButtonRef = useRef<HTMLButtonElement | null>(null);
  const hasAutoScrolled = useRef(false);

  const [activeCampMainTypes, setActiveCampMainTypes] = useState<Array<"kolonie" | "polkolonie">>([]);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [filtersOpenDesktop, setFiltersOpenDesktop] = useState(false);
  const [singleDate, setSingleDate] = useState("");
  const [rangeFrom, setRangeFrom] = useState("");
  const [rangeTo, setRangeTo] = useState("");
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [currentMonth, setCurrentMonth] = useState(() => today.getMonth());
  const [currentYear, setCurrentYear] = useState(() => today.getFullYear());
  const [expandedOrganizers, setExpandedOrganizers] = useState<Record<string, boolean>>({});

  const filters = useListFilters({
    items: camps,
    ageGroups: AGE_GROUPS,
    getType:        getCampTypeValue,
    getCategory:    getCampCategoryValue,
    getSubcategory: getCampSubcategoryValue,
    getDistrict:    (c) => c.district,
    getAgeMin:      (c) => c.age_min,
    getAgeMax:      (c) => c.age_max,
    getSearchText:  (c) => [c.title, c.description_short, c.street, c.postcode, c.city, c.note, c.organizer].join(" "),
  });

  useEffect(() => {
    if (hasAutoScrolled.current) return;
    if (currentYear !== today.getFullYear() || currentMonth !== today.getMonth()) return;
    if (!todayButtonRef.current) return;
    todayButtonRef.current.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
    hasAutoScrolled.current = true;
  }, [currentMonth, currentYear, today]);

  function matchesDateSelection(camp: Camp): boolean {
    const fromDate = parseDateOnly(rangeFrom);
    const toDate = parseDateOnly(rangeTo);
    if (fromDate || toDate) {
      const start = fromDate ? toStartOfDay(fromDate) : new Date(1970, 0, 1);
      const end = toDate ? toEndOfDay(toDate) : new Date(2100, 0, 1);
      return campIntersectsRange(camp, { start, end });
    }
    const exactDate = parseDateOnly(singleDate);
    if (exactDate) {
      return campIntersectsRange(camp, { start: toStartOfDay(exactDate), end: toEndOfDay(exactDate) });
    }
    return true;
  }

  const hasDateFilters = !!singleDate || !!rangeFrom || !!rangeTo;
  const hasActiveFilters = filters.hasActiveFilters || activeCampMainTypes.length > 0 || hasDateFilters;

  const filteredCamps = useMemo(() => {
    let result = filters.filteredItems;
    if (activeCampMainTypes.length > 0) {
      result = result.filter((c) => {
        const t = getCampTypeLevel2Value(c);
        return t !== null && activeCampMainTypes.includes(t);
      });
    }
    if (hasDateFilters) {
      result = result.filter((c) => matchesDateSelection(c));
    }
    return result;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters.filteredItems, activeCampMainTypes, singleDate, rangeFrom, rangeTo]);

  const campMainTypeCounts = useMemo(() => ({
    kolonie: filters.filteredItems.filter((c) => getCampTypeLevel2Value(c) === "kolonie").length,
    polkolonie: filters.filteredItems.filter((c) => getCampTypeLevel2Value(c) === "polkolonie").length,
  }), [filters.filteredItems]);

  const daysInMonth = getDaysInMonth(currentYear, currentMonth);
  const monthDays = useMemo(
    () => Array.from({ length: daysInMonth }, (_, i) => new Date(currentYear, currentMonth, i + 1)),
    [currentYear, currentMonth, daysInMonth]
  );

  const monthOptions = useMemo(
    () => Array.from({ length: 12 }, (_, offset) => {
      const d = new Date(startYear, startMonth + offset, 1);
      return { month: d.getMonth(), year: d.getFullYear(), label: MONTHS_PL[d.getMonth()].slice(0, 3), key: `${d.getFullYear()}-${d.getMonth()}` };
    }),
    [startYear, startMonth]
  );

  const campCountMap = useMemo(() => {
    const source = activeCampMainTypes.length > 0
      ? filters.filteredItems.filter((c) => { const t = getCampTypeLevel2Value(c); return t !== null && activeCampMainTypes.includes(t); })
      : filters.filteredItems;
    const counts = new Map<string, number>();
    for (const date of monthDays) {
      counts.set(toLocalDateKey(date), getCampsForDate(source, date).length);
    }
    return counts;
  }, [filters.filteredItems, activeCampMainTypes, monthDays]);

  const campExtraBadges = useMemo((): FilterBadge[] => {
    const badges: FilterBadge[] = [];
    activeCampMainTypes.forEach((mainType) => badges.push({
      id: `mainType-${mainType}`,
      label: mainType === "kolonie" ? "Rodzaj: Kolonie" : "Rodzaj: Półkolonie",
      onRemove: () => setActiveCampMainTypes((p) => p.filter((x) => x !== mainType)),
    }));
    if (singleDate) {
      const d = parseDateOnly(singleDate);
      badges.push({ id: "singleDate", label: `Data: ${d ? d.toLocaleDateString("pl-PL") : singleDate}`, onRemove: () => { setSingleDate(""); setSelectedDate(null); } });
    } else if (rangeFrom || rangeTo) {
      const fromLabel = rangeFrom ? (parseDateOnly(rangeFrom)?.toLocaleDateString("pl-PL") || rangeFrom) : "od początku";
      const toLabel = rangeTo ? (parseDateOnly(rangeTo)?.toLocaleDateString("pl-PL") || rangeTo) : "bez końca";
      badges.push({ id: "range", label: `Zakres: ${fromLabel} - ${toLabel}`, onRemove: () => { setRangeFrom(""); setRangeTo(""); } });
    }
    return badges;
  }, [activeCampMainTypes, singleDate, rangeFrom, rangeTo]);

  const allBadges = useMemo(
    () => [...filters.filterBadges, ...campExtraBadges],
    [filters.filterBadges, campExtraBadges]
  );

  function clearAll() {
    filters.clearFilters();
    setActiveCampMainTypes([]);
    setSingleDate("");
    setRangeFrom("");
    setRangeTo("");
    setSelectedDate(null);
  }

  function toggleCampMainType(mainType: "kolonie" | "polkolonie") {
    setActiveCampMainTypes((p) => p.includes(mainType) ? p.filter((x) => x !== mainType) : [...p, mainType]);
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
      setRangeFrom(""); setRangeTo("");
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
      setSingleDate(""); setSelectedDate(null);
      return;
    }
    const start = selectedDate < date ? selectedDate : date;
    const end = selectedDate < date ? date : selectedDate;
    setSingleDate("");
    setRangeFrom(toDateInputValue(start));
    setRangeTo(toDateInputValue(end));
    setSelectedDate(null);
  }

  function focusCalendar() {
    calendarRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function applyCampDatesToCalendar(camp: Camp) {
    const start = parseDateOnly(camp.date_start);
    const end = parseDateOnly(camp.date_end);
    if (!start) return;
    updateDisplayedMonth(start.getFullYear(), start.getMonth());
    if (!end || isSameDay(start, end)) {
      setRangeFrom(""); setRangeTo("");
      setSingleDate(toDateInputValue(start));
      setSelectedDate(start);
    } else {
      setSingleDate(""); setSelectedDate(null);
      setRangeFrom(toDateInputValue(start));
      setRangeTo(toDateInputValue(end));
    }
    focusCalendar();
  }

  function toggleOrganizerSessions(organizerKey: string) {
    setExpandedOrganizers((prev) => ({ ...prev, [organizerKey]: !prev[organizerKey] }));
  }

  const campMainTypeToggle = (
    <div className="flex items-center gap-1 rounded-lg border border-border p-0.5 bg-accent/50 w-full">
      <button type="button" onClick={() => toggleCampMainType("kolonie")}
        className={cn("flex-1 inline-flex items-center justify-center gap-1 px-2 py-1 rounded-md text-[10px] font-medium transition-all duration-200",
          activeCampMainTypes.includes("kolonie") ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:text-foreground")}>
        Kolonie ({campMainTypeCounts.kolonie})
      </button>
      <button type="button" onClick={() => toggleCampMainType("polkolonie")}
        className={cn("flex-1 inline-flex items-center justify-center gap-1 px-2 py-1 rounded-md text-[10px] font-medium transition-all duration-200",
          activeCampMainTypes.includes("polkolonie") ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:text-foreground")}>
        Półkolonie ({campMainTypeCounts.polkolonie})
      </button>
    </div>
  );

  return (
    <div>
      <PageHero
        title="Niezapomniane Kolonie"
        subtitle="Sprawdzeni organizatorzy kolonii i półkolonii — letnie i zimowe wyjazdy w Krakowie i okolicach"
        search={filters.search}
        onSearch={filters.setSearch}
        searchPlaceholder="Szukaj kolonii..."
        addHref="/dodaj?type=camp"
        addTitle="Prowadzisz kolonie lub półkolonie?"
        addDescription="Pokaż ofertę rodzinom szukającym sprawdzonych wyjazdów w Krakowie."
        addLabel="Dodaj ofertę"
      />
      <div className="container-page pt-0 pb-10">
        <div className="lg:hidden mb-3 px-1">
          <div className="relative">
            <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-amber-500" />
            <input value={filters.search} onChange={(e) => filters.setSearch(e.target.value)} placeholder="Szukaj kolonii..."
              className="w-full rounded-xl border border-amber-300 bg-amber-50/40 py-1.5 pl-7 pr-2 text-[11px] text-black placeholder:text-black/40 focus:outline-none focus:border-amber-400" />
          </div>
        </div>
        <div className="rounded-[28px] bg-white px-4 py-5 sm:px-6 sm:py-6 lg:px-8 lg:py-8">
          <MobileActionBar
            filtersOpen={filtersOpen}
            hasActiveFilters={hasActiveFilters}
            onToggleFilters={() => setFiltersOpen(!filtersOpen)}
            addHref="/dodaj?type=camp"
            addLabel="Dodaj kolonie"
            bottomContent={
              <div className="h-9 w-full inline-flex items-center gap-1 rounded-lg border border-border bg-accent/50 p-0.5">
                <button type="button" onClick={() => toggleCampMainType("kolonie")}
                  className={cn("flex-1 h-full inline-flex items-center justify-center gap-1.5 rounded-md text-[10px] font-semibold transition-all duration-200",
                    activeCampMainTypes.includes("kolonie") ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground")}>
                  Kolonie ({campMainTypeCounts.kolonie})
                </button>
                <div className="w-px bg-border/50 self-stretch" />
                <button type="button" onClick={() => toggleCampMainType("polkolonie")}
                  className={cn("flex-1 h-full inline-flex items-center justify-center gap-1.5 rounded-md text-[10px] font-semibold transition-all duration-200",
                    activeCampMainTypes.includes("polkolonie") ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground")}>
                  Półkolonie ({campMainTypeCounts.polkolonie})
                </button>
              </div>
            }
          />

          {filtersOpen && (
            <div className="lg:hidden rounded-xl p-3 mb-4 space-y-2.5">
              <FilterSection title={<p className="text-[11px] font-medium text-muted-foreground">Data</p>} defaultCollapsed={false}>
                <p className="text-[10px] text-muted-foreground mb-1">Konkretna data</p>
                <input type="date" onClick={(e) => openDatePicker(e.currentTarget)} value={singleDate}
                  onChange={(e) => { setSingleDate(e.target.value); setRangeFrom(""); setRangeTo(""); setSelectedDate(parseDateOnly(e.target.value)); }}
                  className="w-full px-2.5 py-1.5 rounded-lg border border-border bg-background text-[11px] text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20" />
                <p className="text-[10px] text-muted-foreground mt-2 mb-1">Zakres dat (od-do)</p>
                <div className="grid grid-cols-2 gap-1.5">
                  <input type="date" onClick={(e) => openDatePicker(e.currentTarget)} value={rangeFrom}
                    onChange={(e) => { setRangeFrom(e.target.value); setSingleDate(""); setSelectedDate(null); }}
                    className="px-2 py-1.5 rounded-lg border border-border bg-background text-[11px] text-foreground" />
                  <input type="date" onClick={(e) => openDatePicker(e.currentTarget)} value={rangeTo}
                    onChange={(e) => { setRangeTo(e.target.value); setSingleDate(""); setSelectedDate(null); }}
                    className="px-2 py-1.5 rounded-lg border border-border bg-background text-[11px] text-foreground" />
                </div>
              </FilterSection>

              <FilterSection title={<p className="text-[11px] font-medium text-muted-foreground">Typ</p>} defaultCollapsed={false}>
                <div className="flex flex-wrap gap-1">
                  {filters.typeOptions.map((option) => {
                    const selected = filters.activeTypes.includes(option.value);
                    return (
                      <button key={option.value} onClick={() => filters.toggleType(option.value)}
                        className={cn("inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-medium border transition-all duration-200",
                          selected ? "bg-primary text-primary-foreground border-primary" : "bg-background text-muted border-border hover:border-danger/30 hover:text-foreground")}>
                        <span>{option.icon}</span><span>{option.label}</span>
                        <span className="text-[10px] opacity-60">{option.count}</span>
                        {selected && <Check size={11} />}
                      </button>
                    );
                  })}
                </div>
              </FilterSection>

              <FilterSection title={<p className="text-[11px] font-medium text-muted-foreground">Wiek dziecka</p>} defaultCollapsed={false}>
                <div className="flex flex-wrap gap-1">
                  {filters.ageOptions.filter((g) => g.count > 0 || filters.activeAgeGroups.includes(g.key)).map((group) => {
                    const selected = filters.activeAgeGroups.includes(group.key);
                    return (
                      <button key={group.key} onClick={() => filters.toggleAgeGroup(group.key)}
                        className={cn("inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-medium border transition-all duration-200",
                          selected ? "bg-primary text-primary-foreground border-primary" : "bg-background text-muted border-border hover:border-danger/30 hover:text-foreground")}>
                        <span>{group.icon}</span><span>{group.label}</span>
                        <span className="text-[10px] opacity-60">{group.count}</span>
                        {selected && <Check size={11} />}
                      </button>
                    );
                  })}
                </div>
              </FilterSection>

              <FilterSection title={<p className="text-[11px] font-medium text-muted-foreground">Kategoria</p>} defaultCollapsed={false}>
                <div className="flex flex-wrap gap-1">
                  {filters.categoryOptions.map((option) => {
                    const selected = filters.activeCategories.includes(option.value);
                    return (
                      <button key={option.value} onClick={() => filters.toggleCategory(option.value)}
                        className={cn("inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-medium border transition-all duration-200",
                          selected ? "bg-primary text-primary-foreground border-primary" : "bg-background text-muted border-border hover:border-danger/30 hover:text-foreground")}>
                        <span>{option.icon}</span><span>{option.label}</span>
                        <span className="text-[10px] opacity-60">{option.count}</span>
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
                          selected ? "bg-primary text-primary-foreground border-primary" : "bg-background text-muted border-border hover:border-danger/30 hover:text-foreground")}>
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
              searchPlaceholder="Szukaj kolonii..."
              showSearch={false}
              hasActiveFilters={hasActiveFilters}
              onClearFilters={clearAll}
              topSlot={campMainTypeToggle}
            >
              <FilterSection title={<p className="text-[11px] font-semibold text-foreground uppercase tracking-wider">Data</p>} defaultCollapsed={!filtersOpenDesktop}>
                <p className="text-[10px] text-muted-foreground mb-1">Konkretna data</p>
                <input type="date" onClick={(e) => openDatePicker(e.currentTarget)} value={singleDate}
                  onChange={(e) => { setSingleDate(e.target.value); setRangeFrom(""); setRangeTo(""); setSelectedDate(parseDateOnly(e.target.value)); }}
                  className="w-full px-2 py-1 rounded-lg border border-border bg-background text-[10px] text-foreground" />
                <p className="text-[10px] text-muted-foreground mt-2 mb-1">Zakres dat (od-do)</p>
                <div className="grid grid-cols-2 gap-1.5">
                  <input type="date" onClick={(e) => openDatePicker(e.currentTarget)} value={rangeFrom}
                    onChange={(e) => { setRangeFrom(e.target.value); setSingleDate(""); setSelectedDate(null); }}
                    className="px-1.5 py-1 rounded-lg border border-border bg-background text-[9px] text-foreground" />
                  <input type="date" onClick={(e) => openDatePicker(e.currentTarget)} value={rangeTo}
                    onChange={(e) => { setRangeTo(e.target.value); setSingleDate(""); setSelectedDate(null); }}
                    className="px-1.5 py-1 rounded-lg border border-border bg-background text-[9px] text-foreground" />
                </div>
              </FilterSection>

              <FilterSection title={<p className="text-[11px] font-semibold text-foreground uppercase tracking-wider">Typ</p>} defaultCollapsed={!filtersOpenDesktop}>
                <div className="flex flex-col gap-0.5">
                  {filters.typeOptions.map((option) => {
                    const selected = filters.activeTypes.includes(option.value);
                    return (
                      <button key={option.value} onClick={() => filters.toggleType(option.value)}
                        className={cn("flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] font-medium text-left transition-all duration-200",
                          selected ? "bg-primary text-primary-foreground" : "text-foreground hover:bg-accent")}>
                        <span>{option.icon}</span><span className="flex-1">{option.label}</span>
                        {selected && <Check size={10} />}
                        <span className="text-[8px] opacity-40">{option.count}</span>
                      </button>
                    );
                  })}
                </div>
              </FilterSection>

              <FilterSection title={<p className="text-[11px] font-semibold text-foreground uppercase tracking-wider">Wiek</p>} defaultCollapsed={!filtersOpenDesktop}>
                <div className="flex flex-col gap-0.5">
                  {filters.ageOptions.filter((g) => g.count > 0 || filters.activeAgeGroups.includes(g.key)).map((group) => {
                    const selected = filters.activeAgeGroups.includes(group.key);
                    return (
                      <button key={group.key} onClick={() => filters.toggleAgeGroup(group.key)}
                        className={cn("flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] font-medium text-left transition-all duration-200",
                          selected ? "bg-primary text-primary-foreground" : "text-foreground hover:bg-accent")}>
                        <span>{group.icon}</span><span className="flex-1">{group.label}</span>
                        <span className="text-[8px] opacity-40">{group.count}</span>
                        {selected && <Check size={10} />}
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
                        <span>{option.icon}</span><span className="flex-1">{option.label}</span>
                        {selected && <Check size={10} />}
                        <span className="text-[8px] opacity-40">{option.count}</span>
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
                        <span>{icon}</span><span className="flex-1">{district}</span>
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
                  <div ref={calendarRef} className="rounded-xl border border-border bg-white overflow-hidden scroll-mt-24">
                    <div className="px-3 pt-2 pb-1 border-b border-border/50">
                      <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-hide" style={{ scrollbarWidth: "none" }}>
                        {monthOptions.map((opt) => {
                          const isActive = opt.month === currentMonth && opt.year === currentYear;
                          return (
                            <button key={opt.key} onClick={() => updateDisplayedMonth(opt.year, opt.month)}
                              className={cn("shrink-0 rounded-full px-3 py-1 text-[11px] font-medium transition-colors",
                                isActive ? "bg-primary text-primary-foreground" : "bg-accent text-foreground hover:bg-accent/70")}
                              title={`${MONTHS_PL[opt.month]} ${opt.year}`}>
                              {opt.label}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                    <div className="flex lg:grid lg:grid-flow-col lg:auto-cols-fr overflow-x-auto lg:overflow-visible scrollbar-hide py-2 px-2 gap-1.5 lg:gap-0.5" style={{ scrollbarWidth: "none" }}>
                      {monthDays.map((date) => {
                        const key = toLocalDateKey(date);
                        const selected = selectedDate ? isSameDay(date, selectedDate) : false;
                        const rangeStart = parseDateOnly(rangeFrom);
                        const rangeEnd = parseDateOnly(rangeTo);
                        const inRange = !!(rangeStart && rangeEnd && date >= rangeStart && date <= rangeEnd);
                        const rangeEdge = !!(rangeStart && rangeEnd && (isSameDay(date, rangeStart) || isSameDay(date, rangeEnd)));
                        const todayFlag = isToday(date);
                        const weekend = isWeekend(date);
                        const count = campCountMap.get(key) || 0;
                        const isPast = date < today;
                        return (
                          <button ref={todayFlag ? todayButtonRef : null} key={key}
                            onClick={() => handleCalendarDateClick(date)}
                            title={`${date.toLocaleDateString("pl-PL")}${count > 0 ? ` • ${count} kolonii` : ""}`}
                            className={cn(
                              "flex flex-col items-center justify-center min-w-[54px] lg:min-w-0 px-2 lg:px-0.5 py-2 lg:py-1 rounded-lg lg:rounded-md transition-all relative shrink-0 lg:shrink",
                              selected || rangeEdge ? "bg-primary text-primary-foreground shadow-sm"
                                : inRange ? "bg-primary/15 text-foreground ring-1 ring-primary/20"
                                : todayFlag ? "bg-accent/80 text-foreground ring-1 ring-primary/30"
                                : isPast ? "text-muted-foreground/40 hover:bg-accent/40"
                                : weekend ? "text-foreground hover:bg-accent/60 bg-accent/20"
                                : "text-foreground hover:bg-accent/50"
                            )}>
                            <span className={cn("text-[9px] lg:text-[8px] font-medium uppercase leading-none", selected ? "text-white/70" : "text-muted-foreground")}>
                              {DAYS_PL[date.getDay()]}
                            </span>
                            <span className={cn("text-[12px] lg:text-[11px] font-semibold leading-tight mt-0.5", selected && "text-white")}>
                              {date.getDate()}
                            </span>
                            <span className={cn("mt-0.5 text-[9px] lg:text-[8px] leading-none font-semibold",
                              selected ? "text-primary-foreground/85" : count > 0 ? "text-danger/80" : "text-muted-foreground/55")}>
                              {count > 99 ? "99+" : count}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {allBadges.length > 0 && <FilterBadgeBar badges={allBadges} onClearAll={clearAll} />}
                </>
              )}
            >
              {filteredCamps.length === 0 ? (
                <div className="text-center py-16">
                  <Search size={32} className="mx-auto text-muted-foreground/20 mb-3" />
                  <p className="text-[14px] text-muted mb-3">Brak kolonii pasujących do filtrów.</p>
                  {hasActiveFilters && (
                    <button onClick={clearAll} className="text-[12px] font-medium text-danger hover:opacity-80 transition-opacity">
                      Wyczyść filtry
                    </button>
                  )}
                </div>
              ) : (
                <div className="space-y-4">
                  {(() => {
                    const organizerMap = new Map<string, OrganizerTile>();
                    [...filteredCamps]
                      .sort((a, b) => new Date(a.date_start).getTime() - new Date(b.date_start).getTime())
                      .forEach((camp) => {
                        const organizerKey = camp.organizer_id ? `id:${camp.organizer_id}` : getOrganizerName(camp).toLowerCase();
                        const organizerName = getOrganizerName(camp);
                        if (!organizerName) return;
                        const existing = organizerMap.get(organizerKey);
                        if (!existing) {
                          organizerMap.set(organizerKey, { organizerKey, organizerName, leadCamp: camp, camps: [camp] });
                          return;
                        }
                        existing.camps.push(camp);
                        if (new Date(camp.date_start).getTime() < new Date(existing.leadCamp.date_start).getTime()) {
                          existing.leadCamp = camp;
                        }
                      });
                    const flatOrganizers = Array.from(organizerMap.values()).sort((a, b) => a.organizerName.localeCompare(b.organizerName, "pl"));
                    return flatOrganizers.map((organizer) => {
                      const sortedCamps = sortCampsByNearest(organizer.camps, today);
                      const expanded = !!expandedOrganizers[organizer.organizerKey];
                      const visibleCamps = expanded ? sortedCamps : sortedCamps.slice(0, 3);

                      return (
                        <article key={organizer.organizerKey}
                          className="rounded-xl border border-border bg-card shadow-[var(--shadow-card)] hover:shadow-[var(--shadow-card-hover)] hover:-translate-y-0.5 transition-all duration-200 overflow-hidden">
                          <div className="group flex flex-col overflow-hidden sm:min-h-[180px] sm:flex-row">
                            <Link href={`/kolonie/${organizer.leadCamp.slug}`}
                              className="relative aspect-video w-full shrink-0 bg-accent sm:aspect-auto sm:h-auto sm:w-[210px] sm:self-stretch">
                              {organizer.leadCamp.image_url ? (
                                <ImageWithFallback
                                  src={thumbUrl(organizer.leadCamp.image_thumb, organizer.leadCamp.image_url) || organizer.leadCamp.image_url}
                                  alt={organizer.organizerName}
                                  className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
                                  loading="lazy"
                                />
                              ) : (
                                <div className="flex h-full w-full items-center justify-center text-3xl text-muted-foreground/30">🏕️</div>
                              )}
                            </Link>

                            <div className="flex-1 min-w-0 p-3">
                              <div className="flex h-full min-w-0 flex-col gap-2.5">
                                <div className="flex items-start justify-between gap-2">
                                  <div className="min-w-0">
                                    <Link href={`/kolonie/${organizer.leadCamp.slug}`}
                                      className="font-bold text-[13px] text-foreground group-hover:text-[#e60100] leading-snug transition-colors duration-200 line-clamp-2">
                                      {organizer.organizerName}
                                    </Link>
                                    {organizer.leadCamp.description_short && (
                                      <p className="mt-1 text-[12px] text-muted leading-relaxed line-clamp-2">{organizer.leadCamp.description_short}</p>
                                    )}
                                  </div>
                                  <span className="shrink-0 rounded-full border border-border bg-background px-2 py-0.5 text-[9px] font-semibold text-muted">
                                    {getSessionLabel(organizer.camps.length)}
                                  </span>
                                </div>

                                <div className="min-w-0 rounded-lg border border-border/70 bg-background/40 px-3 py-2.5">
                                  <table className="w-full table-fixed text-[10px]">
                                    <colgroup>
                                      <col className="w-[56%]" />
                                      <col className="w-[30%]" />
                                      <col className="w-[14%]" />
                                    </colgroup>
                                    <thead className="hidden sm:table-header-group">
                                      <tr className="border-b border-border/70 text-muted">
                                        <th className="py-1 pr-2 text-left font-semibold uppercase tracking-wider">Turnus</th>
                                        <th className="px-2 py-1 text-left font-semibold uppercase tracking-wider">Termin</th>
                                        <th className="px-2 py-1 text-left font-semibold uppercase tracking-wider">Szczegóły</th>
                                      </tr>
                                    </thead>
                                    <tbody>
                                      {visibleCamps.map((camp) => (
                                        <tr key={camp.id}
                                          className="group border-b border-border/40 last:border-0 cursor-pointer"
                                          onClick={() => window.location.href = `/kolonie/${camp.slug}`}>
                                          <td className="py-1.5 pr-2 text-foreground align-top rounded-l">
                                            <span className="block truncate whitespace-nowrap font-medium transition-colors" title={camp.title}>{camp.title}</span>
                                          </td>
                                          <td className="px-2 py-1.5 text-muted align-top whitespace-nowrap">{getDateChipLabel(camp)}</td>
                                          <td className="px-2 py-1.5 align-top whitespace-nowrap rounded-r">
                                            <span className="font-medium text-danger">
                                              <span className="hidden sm:inline">Zobacz</span>
                                              <svg className="sm:hidden ml-4" xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>
                                            </span>
                                          </td>
                                        </tr>
                                      ))}
                                    </tbody>
                                  </table>
                                  {organizer.camps.length > 3 && (
                                    <div className="mt-2 flex justify-end">
                                      <button type="button" onClick={() => toggleOrganizerSessions(organizer.organizerKey)}
                                        className="text-[10px] font-medium text-danger hover:opacity-80 transition-opacity">
                                        {expanded ? "Pokaż mniej" : `Pokaż wszystkie (${organizer.camps.length})`}
                                      </button>
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>
                        </article>
                      );
                    });
                  })()}
                </div>
              )}
            </ListPageMainContent>
          </div>
        </div>
      </div>
    </div>
  );
}
