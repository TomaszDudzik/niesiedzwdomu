"use client";

import Link from "next/link";
import { useMemo, useRef, useState } from "react";
import { Search, SlidersHorizontal, X, MapPin, Check, Tags, Users, CalendarDays } from "lucide-react";
import { CAMP_TYPE_ICONS, CAMP_TYPE_LABELS, DISTRICT_LIST } from "@/lib/mock-data";
import { cn, formatAgeRange, formatDateShort, toLocalDateKey } from "@/lib/utils";
import type { Camp, CampType, District } from "@/types/database";

const campTypes = Object.keys(CAMP_TYPE_LABELS) as CampType[];

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
  "Bieżanów": "🚋",
};

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

interface CampTypeGroup {
  type: CampType;
  label: string;
  icon: string;
  organizers: OrganizerTile[];
}

interface CampsListViewProps {
  camps: Camp[];
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
  return camp.organizer?.trim() || camp.venue_name?.trim() || camp.title;
}

function getSessionLabel(count: number): string {
  if (count === 1) return "1 turnus";
  if (count < 5) return `${count} turnusy`;
  return `${count} turnusów`;
}

function getOrganizerDistrictSummary(camps: Camp[]): string {
  return Array.from(new Set(camps.map((camp) => camp.district))).join(" • ");
}

function getOrganizerAgeSummary(camps: Camp[]): string {
  const mins = camps.map((camp) => camp.age_min).filter((age): age is number => age !== null);
  const maxes = camps.map((camp) => camp.age_max).filter((age): age is number => age !== null);

  const min = mins.length > 0 ? Math.min(...mins) : null;
  const max = maxes.length > 0 ? Math.max(...maxes) : null;
  return formatAgeRange(min, max);
}

function getDateChipLabel(camp: Camp): string {
  const start = parseDateOnly(camp.date_start);
  const end = parseDateOnly(camp.date_end);

  if (!start) return camp.date_start;

  const startLabel = `${DAYS_PL[start.getDay()]} ${formatDateShort(start)}`;
  if (!end || isSameDay(start, end)) {
    return startLabel;
  }

  return `${startLabel} - ${DAYS_PL[end.getDay()]} ${formatDateShort(end)}`;
}

export function CampsListView({ camps }: CampsListViewProps) {
  const today = getTodayStart();
  const startYear = today.getFullYear();
  const startMonth = today.getMonth();
  const calendarRef = useRef<HTMLDivElement | null>(null);

  const [search, setSearch] = useState("");
  const [activeTypes, setActiveTypes] = useState<CampType[]>([]);
  const [activeDistricts, setActiveDistricts] = useState<District[]>([]);
  const [activeAgeGroups, setActiveAgeGroups] = useState<string[]>([]);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [singleDate, setSingleDate] = useState("");
  const [rangeFrom, setRangeFrom] = useState("");
  const [rangeTo, setRangeTo] = useState("");
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [currentMonth, setCurrentMonth] = useState(() => today.getMonth());
  const [currentYear, setCurrentYear] = useState(() => today.getFullYear());

  const ageGroups = useMemo(
    () => AGE_GROUPS.filter((group) => activeAgeGroups.includes(group.key)),
    [activeAgeGroups]
  );

  const hasDateFilters = !!singleDate || !!rangeFrom || !!rangeTo;
  const hasActiveFilters =
    !!search || activeTypes.length > 0 || activeDistricts.length > 0 || activeAgeGroups.length > 0 || hasDateFilters;

  const filtered = useMemo(() => {
    let result = camps;

    if (search) {
      const query = search.toLowerCase();
      result = result.filter((camp) =>
        [camp.title, camp.description_short, camp.venue_name, camp.venue_address, camp.organizer]
          .join(" ")
          .toLowerCase()
          .includes(query)
      );
    }

    if (activeTypes.length > 0) {
      result = result.filter((camp) => activeTypes.includes(camp.camp_type));
    }

    if (activeDistricts.length > 0) {
      result = result.filter((camp) => activeDistricts.includes(camp.district));
    }

    if (ageGroups.length > 0) {
      result = result.filter((camp) =>
        ageGroups.some(
          (group) =>
            (camp.age_min === null || camp.age_min <= group.max) &&
            (camp.age_max === null || camp.age_max >= group.min)
        )
      );
    }

    return result;
  }, [camps, search, activeTypes, activeDistricts, ageGroups]);

  const dateFiltered = useMemo(() => {
    const fromDate = parseDateOnly(rangeFrom);
    const toDate = parseDateOnly(rangeTo);

    if (fromDate || toDate) {
      const start = fromDate ? toStartOfDay(fromDate) : new Date(1970, 0, 1);
      const end = toDate ? toEndOfDay(toDate) : new Date(2100, 0, 1);
      return filtered.filter((camp) => campIntersectsRange(camp, { start, end }));
    }

    const exactDate = parseDateOnly(singleDate);
    if (exactDate) {
      const range = { start: toStartOfDay(exactDate), end: toEndOfDay(exactDate) };
      return filtered.filter((camp) => campIntersectsRange(camp, range));
    }

    return filtered;
  }, [filtered, rangeFrom, rangeTo, singleDate]);

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

  const campCountMap = useMemo(() => {
    const counts = new Map<string, number>();
    for (const date of monthDays) {
      const key = toLocalDateKey(date);
      counts.set(key, getCampsForDate(filtered, date).length);
    }
    return counts;
  }, [filtered, monthDays]);

  const grouped = useMemo(() => {
    const groupedByType = new Map<CampType, Camp[]>();

    for (const camp of dateFiltered) {
      const current = groupedByType.get(camp.camp_type) || [];
      current.push(camp);
      groupedByType.set(camp.camp_type, current);
    }

    return Array.from(groupedByType.entries()).map(([type, typeCamps]) => {
      const organizerMap = new Map<string, OrganizerTile>();

      [...typeCamps]
        .sort((a, b) => new Date(a.date_start).getTime() - new Date(b.date_start).getTime())
        .forEach((camp) => {
          const organizerName = getOrganizerName(camp);
          const organizerKey = organizerName.toLowerCase();
          const existing = organizerMap.get(organizerKey);

          if (!existing) {
            organizerMap.set(organizerKey, {
              organizerKey,
              organizerName,
              leadCamp: camp,
              camps: [camp],
            });
            return;
          }

          existing.camps.push(camp);

          const leadCampDate = new Date(existing.leadCamp.date_start).getTime();
          const currentDate = new Date(camp.date_start).getTime();
          if (currentDate < leadCampDate || (!existing.leadCamp.image_url && camp.image_url)) {
            existing.leadCamp = camp;
          }
        });

      return {
        type,
        label: CAMP_TYPE_LABELS[type] || type,
        icon: CAMP_TYPE_ICONS[type] || "🏕️",
        organizers: Array.from(organizerMap.values()).sort((a, b) => a.organizerName.localeCompare(b.organizerName, "pl")),
      } satisfies CampTypeGroup;
    });
  }, [dateFiltered]);

  const availableDistricts = useMemo(() => {
    const set = new Set<string>();
    camps.forEach((camp) => set.add(camp.district));
    return DISTRICT_LIST.filter((district) => set.has(district));
  }, [camps]);

  const typeCounts = useMemo(() => {
    const counts = new Map<CampType, number>();
    camps.forEach((camp) => {
      counts.set(camp.camp_type, (counts.get(camp.camp_type) || 0) + 1);
    });
    return counts;
  }, [camps]);

  const districtCounts = useMemo(() => {
    const counts = new Map<District, number>();
    camps.forEach((camp) => {
      counts.set(camp.district, (counts.get(camp.district) || 0) + 1);
    });
    return counts;
  }, [camps]);

  const activeFilterBadges = useMemo(() => {
    const badges: { id: string; label: string; onRemove: () => void }[] = [];

    if (search.trim()) {
      badges.push({ id: "search", label: `Szukaj: ${search.trim()}`, onRemove: () => setSearch("") });
    }

    activeTypes.forEach((type) => {
      badges.push({
        id: `type-${type}`,
        label: `Typ: ${CAMP_TYPE_LABELS[type]}`,
        onRemove: () => setActiveTypes((prev) => prev.filter((item) => item !== type)),
      });
    });

    activeAgeGroups.forEach((ageKey) => {
      const ageGroup = AGE_GROUPS.find((group) => group.key === ageKey);
      if (ageGroup) {
        badges.push({
          id: `age-${ageKey}`,
          label: `Wiek: ${ageGroup.label}`,
          onRemove: () => setActiveAgeGroups((prev) => prev.filter((item) => item !== ageKey)),
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

    if (singleDate) {
      const date = parseDateOnly(singleDate);
      badges.push({
        id: "singleDate",
        label: `Data: ${date ? date.toLocaleDateString("pl-PL") : singleDate}`,
        onRemove: () => {
          setSingleDate("");
          setSelectedDate(null);
        },
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
  }, [search, activeTypes, activeAgeGroups, activeDistricts, singleDate, rangeFrom, rangeTo]);

  function clearFilters() {
    setSearch("");
    setActiveTypes([]);
    setActiveDistricts([]);
    setActiveAgeGroups([]);
    setSingleDate("");
    setRangeFrom("");
    setRangeTo("");
    setSelectedDate(null);
  }

  function toggleType(type: CampType) {
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

  function focusCalendar() {
    calendarRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function applyCampDatesToCalendar(camp: Camp) {
    const start = parseDateOnly(camp.date_start);
    const end = parseDateOnly(camp.date_end);
    if (!start) return;

    updateDisplayedMonth(start.getFullYear(), start.getMonth());

    if (!end || isSameDay(start, end)) {
      setRangeFrom("");
      setRangeTo("");
      setSingleDate(toDateInputValue(start));
      setSelectedDate(start);
    } else {
      setSingleDate("");
      setSelectedDate(null);
      setRangeFrom(toDateInputValue(start));
      setRangeTo(toDateInputValue(end));
    }

    focusCalendar();
  }

  return (
    <div className="container-page pt-5 pb-10">
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
          <input
            type="text"
            placeholder="Szukaj kolonii..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 rounded-lg border border-border bg-background text-[12px] text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/40 transition-all duration-200"
          />
        </div>
      </div>

      {filtersOpen && (
        <div className="lg:hidden rounded-xl border border-border bg-card p-3 mb-4 space-y-2.5">
          <div>
            <p className="inline-flex items-center gap-1 text-[11px] font-medium text-muted-foreground mb-1.5">
              <CalendarDays size={11} /> Data
            </p>
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
          </div>

          <div>
            <p className="inline-flex items-center gap-1 text-[11px] font-medium text-muted-foreground mb-1.5">
              <Tags size={11} /> Typ kolonii
            </p>
            <div className="flex flex-wrap gap-1">
              {campTypes.map((type) => {
                const count = typeCounts.get(type) || 0;
                if (count === 0) return null;
                const selected = activeTypes.includes(type);
                return (
                  <button
                    key={type}
                    onClick={() => toggleType(type)}
                    className={cn(
                      "inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-medium border transition-all duration-200",
                      selected
                        ? "bg-primary text-primary-foreground border-primary"
                        : "bg-background text-muted border-border hover:border-primary/30 hover:text-foreground"
                    )}
                  >
                    <span>{CAMP_TYPE_ICONS[type]}</span>
                    <span>{CAMP_TYPE_LABELS[type]}</span>
                    <span className="text-[10px] opacity-60">{count}</span>
                    {selected && <Check size={11} />}
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <p className="inline-flex items-center gap-1 text-[11px] font-medium text-muted-foreground mb-1.5">
              <Users size={11} /> Wiek dziecka
            </p>
            <div className="flex flex-wrap gap-1">
              {AGE_GROUPS.map((group) => {
                const selected = activeAgeGroups.includes(group.key);
                return (
                  <button
                    key={group.key}
                    onClick={() => toggleAgeGroup(group.key)}
                    className={cn(
                      "inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-medium border transition-all duration-200",
                      selected
                        ? "bg-primary text-primary-foreground border-primary"
                        : "bg-background text-muted border-border hover:border-primary/30 hover:text-foreground"
                    )}
                  >
                    <span>{group.icon}</span>
                    <span>{group.label}</span>
                    {selected && <Check size={11} />}
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <p className="inline-flex items-center gap-1 text-[11px] font-medium text-muted-foreground mb-1.5">
              <MapPin size={11} /> Dzielnica
            </p>
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
                      selected
                        ? "bg-primary text-primary-foreground border-primary"
                        : "bg-background text-muted border-border hover:border-primary/30 hover:text-foreground"
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
          </div>

          {hasActiveFilters && (
            <button
              onClick={clearFilters}
              className="inline-flex items-center gap-1 text-[11px] font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              <X size={11} /> Wyczyść filtry
            </button>
          )}
        </div>
      )}

      <div className="lg:flex lg:gap-6 lg:items-start">
        <aside className="hidden lg:block w-52 shrink-0 sticky top-20">
          <div className="rounded-xl border border-border bg-card p-2.5 space-y-2.5">
            <div className="relative">
              <Search size={11} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground/50" />
              <input
                type="text"
                placeholder="Szukaj..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-7 pr-2 py-1 rounded-lg border border-border bg-background text-[10px] text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/40 transition-all duration-200"
              />
            </div>

            <div>
              <p className="inline-flex items-center gap-1 text-[9px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">
                <CalendarDays size={10} /> Data
              </p>
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
            </div>

            <div>
              <p className="inline-flex items-center gap-1 text-[9px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">
                <Tags size={10} /> Typ kolonii
              </p>
              <div className="flex flex-col gap-0.5">
                {campTypes.map((type) => {
                  const count = typeCounts.get(type) || 0;
                  if (count === 0) return null;
                  const selected = activeTypes.includes(type);
                  return (
                    <button
                      key={type}
                      onClick={() => toggleType(type)}
                      className={cn(
                        "flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] font-medium text-left transition-all duration-200",
                        selected ? "bg-primary text-primary-foreground" : "text-foreground hover:bg-accent"
                      )}
                    >
                      <span>{CAMP_TYPE_ICONS[type]}</span>
                      <span className="flex-1">{CAMP_TYPE_LABELS[type]}</span>
                      {selected && <Check size={10} />}
                      <span className="text-[8px] opacity-40">{count}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <p className="inline-flex items-center gap-1 text-[9px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">
                <Users size={10} /> Wiek
              </p>
              <div className="flex flex-col gap-0.5">
                {AGE_GROUPS.map((group) => {
                  const selected = activeAgeGroups.includes(group.key);
                  return (
                    <button
                      key={group.key}
                      onClick={() => toggleAgeGroup(group.key)}
                      className={cn(
                        "flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] font-medium text-left transition-all duration-200",
                        selected ? "bg-primary text-primary-foreground" : "text-foreground hover:bg-accent"
                      )}
                    >
                      <span>{group.icon}</span>
                      <span className="flex-1">{group.label}</span>
                      {selected && <Check size={10} />}
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <p className="inline-flex items-center gap-1 text-[9px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">
                <MapPin size={9} className="inline mr-1" /> Dzielnica
              </p>
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
            </div>

            {hasActiveFilters && (
              <button
                onClick={clearFilters}
                className="inline-flex items-center gap-1 text-[10px] font-medium text-muted-foreground hover:text-foreground transition-colors pt-2 border-t border-border w-full"
              >
                <X size={10} /> Wyczyść filtry
              </button>
            )}
          </div>
        </aside>

        <div className="flex-1 min-w-0">
          <div ref={calendarRef} className="rounded-xl border border-border bg-white overflow-hidden mb-4 scroll-mt-24">
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
                        isActive ? "bg-primary text-primary-foreground" : "bg-accent text-foreground hover:bg-accent/70"
                      )}
                      title={`${MONTHS_PL[opt.month]} ${opt.year}`}
                    >
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
                const rangeEdge = !!(
                  rangeStart && rangeEnd && (isSameDay(date, rangeStart) || isSameDay(date, rangeEnd))
                );
                const todayFlag = isToday(date);
                const weekend = isWeekend(date);
                const count = campCountMap.get(key) || 0;
                const isPast = date < today;

                return (
                  <button
                    key={key}
                    onClick={() => handleCalendarDateClick(date)}
                    title={`${date.toLocaleDateString("pl-PL")}${count > 0 ? ` • ${count} kolonii` : ""}`}
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

          {dateFiltered.length === 0 ? (
            <div className="text-center py-16">
              <Search size={32} className="mx-auto text-muted-foreground/20 mb-3" />
              <p className="text-[14px] text-muted mb-3">Brak kolonii pasujących do filtrów.</p>
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
                <section key={group.type}>
                  <div className="flex items-center gap-2 mb-4">
                    <span className="text-lg">{group.icon}</span>
                    <h2 className="text-[15px] font-semibold text-foreground">{group.label}</h2>
                    <span className="text-[12px] text-muted-foreground">({group.organizers.length})</span>
                  </div>
                  <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                    {group.organizers.map((organizer) => (
                      <article
                        key={organizer.organizerKey}
                        className="rounded-xl border border-border bg-card shadow-[var(--shadow-card)] hover:shadow-[var(--shadow-card-hover)] hover:-translate-y-0.5 transition-all duration-200 overflow-hidden"
                      >
                        <Link
                          href={`/kolonie/${organizer.leadCamp.slug}`}
                          className="group flex overflow-hidden h-[160px]"
                        >
                          <div className="w-[160px] shrink-0 relative self-stretch bg-accent">
                            {organizer.leadCamp.image_url ? (
                              <img
                                src={organizer.leadCamp.image_url}
                                alt={organizer.organizerName}
                                className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
                              />
                            ) : (
                              <div className="flex h-full w-full items-center justify-center text-3xl text-muted-foreground/30">
                                {group.icon}
                              </div>
                            )}
                            <span className="absolute bottom-2 left-2 inline-flex items-center gap-1 rounded-full bg-white px-2 py-1 text-[10px] font-semibold text-foreground shadow-[var(--shadow-soft)] border border-border/70">
                              {getSessionLabel(organizer.camps.length)}
                            </span>
                          </div>

                          <div className="flex-1 min-w-0 p-3 flex flex-col gap-1.5">
                            <h3 className="font-semibold text-[13px] text-foreground leading-snug group-hover:text-primary transition-colors duration-200 line-clamp-2">
                              {organizer.organizerName}
                            </h3>

                            {organizer.leadCamp.description_short && (
                              <p className="text-[11px] text-muted leading-relaxed line-clamp-2">
                                {organizer.leadCamp.description_short}
                              </p>
                            )}

                            <div className="mt-auto space-y-0.5">
                              <div className="flex items-center gap-1 text-[10px] text-muted">
                                <MapPin size={9} className="text-secondary/60 shrink-0" />
                                <span className="truncate">{getOrganizerDistrictSummary(organizer.camps)}</span>
                              </div>
                              <div className="flex items-center gap-1 text-[10px] text-muted">
                                <Users size={9} className="text-secondary/60 shrink-0" />
                                <span className="truncate">{getOrganizerAgeSummary(organizer.camps)}</span>
                              </div>
                            </div>
                          </div>
                        </Link>

                        <div className="border-t border-border/70 bg-background/40 px-3 py-2.5">
                          <div className="flex flex-wrap gap-1.5">
                            {organizer.camps.map((camp) => (
                              <button
                                key={camp.id}
                                type="button"
                                onClick={() => applyCampDatesToCalendar(camp)}
                                className="inline-flex items-center rounded-full border border-border/80 bg-background px-2 py-0.5 text-[9px] font-medium text-foreground hover:bg-card hover:border-primary/20 transition-colors"
                                title="Pokaż ten termin w kalendarzu"
                              >
                                {getDateChipLabel(camp)}
                              </button>
                            ))}
                          </div>
                        </div>
                      </article>
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
