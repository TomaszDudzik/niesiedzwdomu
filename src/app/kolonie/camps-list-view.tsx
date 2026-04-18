"use client";

import Link from "next/link";
import { useMemo, useRef, useState } from "react";
import { Search, SlidersHorizontal, X, MapPin, Check, Tags, Users, CalendarDays, ChevronDown } from "lucide-react";
import { DISTRICT_LIST } from "@/lib/mock-data";
import { FilterSection } from "@/components/ui/filter-section";
import { SubmissionCta } from "@/components/ui/submission-cta";
import { cn, formatDateShort, toLocalDateKey, thumbUrl } from "@/lib/utils";
import { ImageWithFallback } from "@/components/ui/image-with-fallback";
import { getTaxonomyOptions, matchesTaxonomyFilter } from "@/lib/taxonomy-filters";
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

interface CampMainCategoryGroup {
  type: string;
  label: string;
  icon: string;
  organizers: OrganizerTile[];
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
  if (!end || isSameDay(start, end)) {
    return startLabel;
  }

  return `${startLabel} - ${DAYS_PL[end.getDay()]} ${formatDateShort(end)}`;
}

function sortCampsByNearest(camps: Camp[], today: Date): Camp[] {
  return [...camps].sort((a, b) => {
    const aEnd = parseDateOnly(a.date_end) || parseDateOnly(a.date_start);
    const bEnd = parseDateOnly(b.date_end) || parseDateOnly(b.date_start);
    const aIsUpcoming = !!aEnd && toEndOfDay(aEnd) >= today;
    const bIsUpcoming = !!bEnd && toEndOfDay(bEnd) >= today;

    if (aIsUpcoming !== bIsUpcoming) {
      return aIsUpcoming ? -1 : 1;
    }

    return new Date(a.date_start).getTime() - new Date(b.date_start).getTime();
  });
}

export function CampsListView({ camps }: CampsListViewProps) {
  const today = getTodayStart();
  const startYear = today.getFullYear();
  const startMonth = today.getMonth();
  const calendarRef = useRef<HTMLDivElement | null>(null);

  const [search, setSearch] = useState("");
  const [activeTypes, setActiveTypes] = useState<string[]>([]);
  const [activeCategories, setActiveCategories] = useState<string[]>([]);
  const [activeSubcategories, setActiveSubcategories] = useState<string[]>([]);
  const [activeDistricts, setActiveDistricts] = useState<District[]>([]);
  const [activeAgeGroups, setActiveAgeGroups] = useState<string[]>([]);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [filtersOpenDesktop, setFiltersOpenDesktop] = useState(false);
  const [singleDate, setSingleDate] = useState("");
  const [rangeFrom, setRangeFrom] = useState("");
  const [rangeTo, setRangeTo] = useState("");
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [currentMonth, setCurrentMonth] = useState(() => today.getMonth());
  const [currentYear, setCurrentYear] = useState(() => today.getFullYear());
  const [expandedOrganizers, setExpandedOrganizers] = useState<Record<string, boolean>>({});

  const ageGroups = useMemo(
    () => AGE_GROUPS.filter((group) => activeAgeGroups.includes(group.key)),
    [activeAgeGroups]
  );

  const hasDateFilters = !!singleDate || !!rangeFrom || !!rangeTo;
  const hasActiveFilters =
    !!search || activeTypes.length > 0 || activeCategories.length > 0 || activeSubcategories.length > 0 || activeDistricts.length > 0 || activeAgeGroups.length > 0 || hasDateFilters;

  const preDistrictFiltered = useMemo(() => {
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
  }, [camps, search, ageGroups]);

  const preTaxonomyFiltered = useMemo(() => {
    if (activeDistricts.length === 0) {
      return preDistrictFiltered;
    }
    return preDistrictFiltered.filter((camp) => activeDistricts.includes(camp.district));
  }, [preDistrictFiltered, activeDistricts]);

  const dateScopedCampsForDistrict = useMemo(() => {
    const fromDate = parseDateOnly(rangeFrom);
    const toDate = parseDateOnly(rangeTo);

    if (fromDate || toDate) {
      const start = fromDate ? toStartOfDay(fromDate) : new Date(1970, 0, 1);
      const end = toDate ? toEndOfDay(toDate) : new Date(2100, 0, 1);
      return preDistrictFiltered.filter((camp) => campIntersectsRange(camp, { start, end }));
    }

    const exactDate = parseDateOnly(singleDate);
    if (exactDate) {
      const range = { start: toStartOfDay(exactDate), end: toEndOfDay(exactDate) };
      return preDistrictFiltered.filter((camp) => campIntersectsRange(camp, range));
    }

    return preDistrictFiltered;
  }, [preDistrictFiltered, rangeFrom, rangeTo, singleDate]);

  const dateScopedCamps = useMemo(() => {
    const fromDate = parseDateOnly(rangeFrom);
    const toDate = parseDateOnly(rangeTo);

    if (fromDate || toDate) {
      const start = fromDate ? toStartOfDay(fromDate) : new Date(1970, 0, 1);
      const end = toDate ? toEndOfDay(toDate) : new Date(2100, 0, 1);
      return preTaxonomyFiltered.filter((camp) => campIntersectsRange(camp, { start, end }));
    }

    const exactDate = parseDateOnly(singleDate);
    if (exactDate) {
      const range = { start: toStartOfDay(exactDate), end: toEndOfDay(exactDate) };
      return preTaxonomyFiltered.filter((camp) => campIntersectsRange(camp, range));
    }

    return preTaxonomyFiltered;
  }, [preTaxonomyFiltered, rangeFrom, rangeTo, singleDate]);

  const typeOptions = useMemo(
    () => getTaxonomyOptions(dateScopedCamps, getCampTypeValue),
    [dateScopedCamps]
  );

  const typeOptionsByValue = useMemo(
    () => new Map(typeOptions.map((option) => [option.value, option])),
    [typeOptions]
  );

  const categorySource = useMemo(
    () => dateScopedCamps.filter((camp) => matchesTaxonomyFilter(getCampTypeValue(camp), activeTypes)),
    [dateScopedCamps, activeTypes]
  );

  const categoryOptions = useMemo(
    () => getTaxonomyOptions(categorySource, getCampCategoryValue),
    [categorySource]
  );

  const categoryOptionsByValue = useMemo(
    () => new Map(categoryOptions.map((option) => [option.value, option])),
    [categoryOptions]
  );

  const subcategorySource = useMemo(
    () => categorySource.filter((camp) => matchesTaxonomyFilter(getCampCategoryValue(camp), activeCategories)),
    [categorySource, activeCategories]
  );

  const subcategoryOptions = useMemo(
    () => getTaxonomyOptions(subcategorySource, getCampSubcategoryValue),
    [subcategorySource]
  );

  const subcategoryOptionsByValue = useMemo(
    () => new Map(subcategoryOptions.map((option) => [option.value, option])),
    [subcategoryOptions]
  );

  const filteredCamps = useMemo(
    () => subcategorySource.filter((camp) => matchesTaxonomyFilter(getCampSubcategoryValue(camp), activeSubcategories)),
    [subcategorySource, activeSubcategories]
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

  const campCountMap = useMemo(() => {
    const counts = new Map<string, number>();
    for (const date of monthDays) {
      const key = toLocalDateKey(date);
      counts.set(key, getCampsForDate(preTaxonomyFiltered, date).length);
    }
    return counts;
  }, [preTaxonomyFiltered, monthDays]);

  const grouped = useMemo(() => {
    const groupedByType = new Map<string, Camp[]>();

    for (const camp of filteredCamps) {
      const campType = getCampTypeValue(camp);
      const current = groupedByType.get(campType) || [];
      current.push(camp);
      groupedByType.set(campType, current);
    }

    return Array.from(groupedByType.entries()).map(([type, typeCamps]) => {
      const organizerMap = new Map<string, OrganizerTile>();

      [...typeCamps]
        .sort((a, b) => new Date(a.date_start).getTime() - new Date(b.date_start).getTime())
        .forEach((camp) => {
          // If camp has organizer_data, use its id as key so all sessions with same
          // organizer_id are grouped together regardless of organizer text field.
          const organizerKey = camp.organizer_id
            ? `id:${camp.organizer_id}`
            : getOrganizerName(camp).toLowerCase();
          const organizerName = getOrganizerName(camp);
          if (!organizerName) {
            return;
          }
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
          if (currentDate < leadCampDate) {
            existing.leadCamp = camp;
          }
        });

      const organizers = Array.from(organizerMap.values()).sort((a, b) => a.organizerName.localeCompare(b.organizerName, "pl"));

      const typeOption = typeOptionsByValue.get(type);

      return {
        type,
        label: typeOption?.label || type,
        icon: typeOption?.icon || "🏕️",
        organizers,
      } satisfies CampMainCategoryGroup;
    });
  }, [filteredCamps, typeOptionsByValue]);

  const availableDistricts = useMemo(() => {
    const set = new Set<string>();
    dateScopedCampsForDistrict.forEach((camp) => set.add(camp.district));
    return DISTRICT_LIST.filter((district) => set.has(district));
  }, [dateScopedCampsForDistrict]);

  const districtCounts = useMemo(() => {
    const counts = new Map<District, number>();
    dateScopedCampsForDistrict.forEach((camp) => {
      counts.set(camp.district, (counts.get(camp.district) || 0) + 1);
    });
    return counts;
  }, [dateScopedCampsForDistrict]);

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
        onRemove: () => setActiveCategories((prev) => prev.filter((item) => item !== category)),
      });
    });

    activeSubcategories.forEach((subcategory) => {
      const subcategoryOption = subcategoryOptionsByValue.get(subcategory);
      badges.push({
        id: `subcategory-${subcategory}`,
        label: `Tematyka: ${subcategoryOption?.label || subcategory}`,
        onRemove: () => setActiveSubcategories((prev) => prev.filter((item) => item !== subcategory)),
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
  }, [search, activeTypes, activeCategories, activeSubcategories, activeAgeGroups, activeDistricts, singleDate, rangeFrom, rangeTo, typeOptionsByValue, categoryOptionsByValue, subcategoryOptionsByValue]);

  function clearFilters() {
    setSearch("");
    setActiveTypes([]);
    setActiveCategories([]);
    setActiveSubcategories([]);
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
    setActiveSubcategories([]);
  }

  function toggleCategory(category: string) {
    setActiveCategories((prev) =>
      prev.includes(category) ? prev.filter((item) => item !== category) : [...prev, category]
    );
    setActiveSubcategories([]);
  }

  function toggleSubcategory(subcategory: string) {
    setActiveSubcategories((prev) =>
      prev.includes(subcategory) ? prev.filter((item) => item !== subcategory) : [...prev, subcategory]
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

  function toggleOrganizerSessions(organizerKey: string) {
    setExpandedOrganizers((prev) => ({ ...prev, [organizerKey]: !prev[organizerKey] }));
  }

  return (
    <div className="container-page pt-5 pb-10">
      <SubmissionCta
        mobile
        title="Prowadzisz kolonie lub półkolonie?"
        description="Pokaż ofertę rodzinom szukającym sprawdzonych wyjazdów i turnusów w Krakowie."
        buttonLabel="Dodaj ofertę"
        href="/dodaj?type=camp"
      />

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
          <FilterSection title={<p className="text-[11px] font-medium text-muted-foreground">Data</p>} defaultCollapsed>
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

          <FilterSection title={<p className="text-[11px] font-medium text-muted-foreground">Typ</p>} defaultCollapsed>
            <div className="flex flex-wrap gap-1">
              {typeOptions.map((option) => {
                const selected = activeTypes.includes(option.value);
                return (
                  <button
                    key={option.value}
                    onClick={() => toggleType(option.value)}
                    className={cn(
                      "inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-medium border transition-all duration-200",
                      selected
                        ? "bg-primary text-primary-foreground border-primary"
                        : "bg-background text-muted border-border hover:border-primary/30 hover:text-foreground"
                    )}
                  >
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
          </FilterSection>

          <FilterSection title={<p className="text-[11px] font-medium text-muted-foreground">Kategoria</p>} defaultCollapsed>
            <div className="flex flex-wrap gap-1">
              {categoryOptions.map((option) => {
                const selected = activeCategories.includes(option.value);
                return (
                  <button
                    key={option.value}
                    onClick={() => toggleCategory(option.value)}
                    className={cn(
                      "inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-medium border transition-all duration-200",
                      selected
                        ? "bg-primary text-primary-foreground border-primary"
                        : "bg-background text-muted border-border hover:border-primary/30 hover:text-foreground"
                    )}
                  >
                    <span>{option.icon}</span>
                    <span>{option.label}</span>
                    <span className="text-[10px] opacity-60">{option.count}</span>
                    {selected && <Check size={11} />}
                  </button>
                );
              })}
            </div>
          </FilterSection>

          <FilterSection title={<p className="text-[11px] font-medium text-muted-foreground">Tematyka</p>} defaultCollapsed>
            <div className="flex flex-wrap gap-1">
              {subcategoryOptions.map((option) => {
                const selected = activeSubcategories.includes(option.value);
                return (
                  <button
                    key={option.value}
                    onClick={() => toggleSubcategory(option.value)}
                    className={cn(
                      "inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-medium border transition-all duration-200",
                      selected
                        ? "bg-primary text-primary-foreground border-primary"
                        : "bg-background text-muted border-border hover:border-primary/30 hover:text-foreground"
                    )}
                  >
                    <span>{option.icon}</span>
                    <span>{option.label}</span>
                    <span className="text-[10px] opacity-60">{option.count}</span>
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
          </FilterSection>

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
        <aside className="hidden lg:block w-52 shrink-0">
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
                    <button
                      key={option.value}
                      onClick={() => toggleType(option.value)}
                      className={cn(
                        "flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] font-medium text-left transition-all duration-200",
                        selected ? "bg-primary text-primary-foreground" : "text-foreground hover:bg-accent"
                      )}
                    >
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
            </FilterSection>

            <FilterSection title={<p className="text-[9px] font-semibold text-muted-foreground uppercase tracking-wider">Kategoria</p>} defaultCollapsed>
              <div className="flex flex-col gap-0.5">
                {categoryOptions.map((option) => {
                  const selected = activeCategories.includes(option.value);
                  return (
                    <button
                      key={option.value}
                      onClick={() => toggleCategory(option.value)}
                      className={cn(
                        "flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] font-medium text-left transition-all duration-200",
                        selected ? "bg-primary text-primary-foreground" : "text-foreground hover:bg-accent"
                      )}
                    >
                      <span>{option.icon}</span>
                      <span className="flex-1">{option.label}</span>
                      {selected && <Check size={10} />}
                      <span className="text-[8px] opacity-40">{option.count}</span>
                    </button>
                  );
                })}
              </div>
            </FilterSection>

            <FilterSection title={<p className="text-[9px] font-semibold text-muted-foreground uppercase tracking-wider">Tematyka</p>} defaultCollapsed>
              <div className="flex flex-col gap-0.5">
                {subcategoryOptions.map((option) => {
                  const selected = activeSubcategories.includes(option.value);
                  return (
                    <button
                      key={option.value}
                      onClick={() => toggleSubcategory(option.value)}
                      className={cn(
                        "flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] font-medium text-left transition-all duration-200",
                        selected ? "bg-primary text-primary-foreground" : "text-foreground hover:bg-accent"
                      )}
                    >
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
          <div className="space-y-7">
            <SubmissionCta
              title="Prowadzisz kolonie lub półkolonie?"
              description="Pokaż ofertę rodzinom szukającym sprawdzonych wyjazdów i turnusów w Krakowie."
              buttonLabel="Dodaj ofertę"
              href="/dodaj?type=camp"
            />

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

                  <div className="rounded-xl border border-border bg-card px-2.5 py-2">
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
          </div>

          <div className="mt-4">
            {filteredCamps.length === 0 ? (
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
                    <div className="space-y-4">
                      {group.organizers.map((organizer) => {
                      const sortedCamps = sortCampsByNearest(organizer.camps, today);
                      const expanded = !!expandedOrganizers[organizer.organizerKey];
                      const visibleCamps = expanded ? sortedCamps : sortedCamps.slice(0, 3);
                      const hiddenCount = Math.max(organizer.camps.length - visibleCamps.length, 0);

                      return (
                        <article
                          key={organizer.organizerKey}
                          className="rounded-xl border border-border bg-card shadow-[var(--shadow-card)] hover:shadow-[var(--shadow-card-hover)] hover:-translate-y-0.5 transition-all duration-200 overflow-hidden"
                        >
                          <div className="group flex flex-col overflow-hidden sm:min-h-[180px] sm:flex-row">
                            <Link
                              href={`/kolonie/${organizer.leadCamp.slug}`}
                              className="relative aspect-video w-full shrink-0 bg-accent sm:aspect-auto sm:h-auto sm:w-[210px] sm:self-stretch"
                            >
                              {(() => {
                                const imgSrc = organizer.leadCamp.image_url;
                                return imgSrc ? (
                                  <ImageWithFallback
                                    src={thumbUrl(organizer.leadCamp.image_thumb, imgSrc) || imgSrc}
                                    alt={organizer.organizerName}
                                    className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
                                    loading="lazy"
                                  />
                                ) : (
                                  <div className="flex h-full w-full items-center justify-center text-3xl text-muted-foreground/30">
                                    {group.icon}
                                  </div>
                                );
                              })()}
                            </Link>

                            <div className="flex-1 min-w-0 p-3">
                              <div className="flex h-full min-w-0 flex-col gap-2.5">
                                <div className="flex items-start justify-between gap-2">
                                  <div className="min-w-0">
                                    <Link
                                      href={`/kolonie/${organizer.leadCamp.slug}`}
                                      className="font-semibold text-[13px] text-foreground leading-snug group-hover:text-primary transition-colors duration-200 line-clamp-2"
                                    >
                                      {organizer.organizerName}
                                    </Link>
                                    {(() => {
                                      const desc = organizer.leadCamp.description_short;
                                      return desc ? (
                                        <p className="mt-1 text-[11px] text-muted leading-relaxed line-clamp-2">{desc}</p>
                                      ) : null;
                                    })()}
                                  </div>
                                  <span className="shrink-0 rounded-full border border-border bg-background px-2 py-0.5 text-[9px] font-semibold text-muted">
                                    {getSessionLabel(organizer.camps.length)}
                                  </span>
                                </div>

                                <div className="min-w-0 rounded-lg border border-border/70 bg-background/40 px-3 py-2.5">
                                  <div className="min-w-0">
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
                                        {visibleCamps.map((camp) => {
                                          return (
                                            <tr
                                              key={camp.id}
                                              className="group border-b border-border/40 last:border-0 cursor-pointer"
                                              onClick={() => window.location.href = `/kolonie/${camp.slug}`}
                                            >
                                              <td className="py-1.5 pr-2 text-foreground align-top group-hover:bg-stone-100 transition-colors rounded-l">
                                                <div className="min-w-0">
                                                  <span className="block truncate whitespace-nowrap font-medium group-hover:text-primary transition-colors" title={camp.title}>
                                                    {camp.title}
                                                  </span>
                                                </div>
                                              </td>
                                              <td className="px-2 py-1.5 text-muted align-top whitespace-nowrap group-hover:bg-stone-100 transition-colors">
                                                {getDateChipLabel(camp)}
                                              </td>
                                              <td className="px-2 py-1.5 align-top whitespace-nowrap group-hover:bg-stone-100 transition-colors rounded-r">
                                                <span className="font-medium text-primary">
                                                  <span className="hidden sm:inline">Zobacz</span>
                                                  <svg className="sm:hidden" xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>
                                                </span>
                                              </td>
                                            </tr>
                                          );
                                        })}
                                      </tbody>
                                    </table>
                                  </div>

                                  {organizer.camps.length > 3 && (
                                    <div className="mt-2 flex justify-end">
                                      <button
                                        type="button"
                                        onClick={() => toggleOrganizerSessions(organizer.organizerKey)}
                                        className="text-[10px] font-medium text-primary hover:text-primary-hover transition-colors"
                                      >
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
                      })}
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
