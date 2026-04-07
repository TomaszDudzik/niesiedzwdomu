"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { Calendar, Clock, ExternalLink, MapPin, Search, SlidersHorizontal, Users, X } from "lucide-react";
import { CAMP_TYPE_ICONS, CAMP_TYPE_LABELS, DISTRICT_LIST } from "@/lib/mock-data";
import { cn, formatAgeRange, formatDateShort, formatPrice } from "@/lib/utils";
import type { Camp, CampType, District } from "@/types/database";

const campTypes = Object.keys(CAMP_TYPE_LABELS) as CampType[];

const AGE_GROUPS = [
  { key: "0-5", label: "0-5 lat", icon: "👶", min: 0, max: 5 },
  { key: "6-8", label: "6-8 lat", icon: "🧒", min: 6, max: 8 },
  { key: "9-12", label: "9-12 lat", icon: "🎒", min: 9, max: 12 },
  { key: "13+", label: "13+ lat", icon: "🧑", min: 13, max: 99 },
] as const;

interface CampsListViewProps {
  camps: Camp[];
}

interface TimelineCamp {
  camp: Camp;
  startDay: number;
  endDay: number;
  durationDays: number;
}

const MS_DAY = 24 * 60 * 60 * 1000;

function dayNumber(dateLike: string): number {
  const date = new Date(dateLike);
  return Math.floor(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) / MS_DAY);
}

function durationInclusive(from: string, to: string): number {
  return Math.max(1, dayNumber(to) - dayNumber(from) + 1);
}

function typeBarClass(type: CampType): string {
  if (type === "kolonie") return "bg-blue-500";
  if (type === "polkolonie") return "bg-emerald-500";
  return "bg-amber-500";
}

function organizerKey(organizer: string | null | undefined): string {
  return (organizer || "Organizator").trim().toLocaleLowerCase("pl-PL");
}

function getCampDisplayTitle(title: string, organizer: string | null | undefined): string {
  const normalizedOrganizer = (organizer || "").trim();
  if (!normalizedOrganizer) return title;

  const escapedOrganizer = normalizedOrganizer.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const prefixPattern = new RegExp(`^${escapedOrganizer}[\s:,-]+`, "i");
  return title.replace(prefixPattern, "").trim() || title;
}

function formatDateShortWithWeekday(date: Date): string {
  const shortDate = formatDateShort(date);
  const weekday = date.toLocaleDateString("pl-PL", { weekday: "short" }).replace(".", "");
  return `${shortDate} (${weekday})`;
}

export function CampsListView({ camps }: CampsListViewProps) {
  const [search, setSearch] = useState("");
  const [activeType, setActiveType] = useState<CampType | null>(null);
  const [activeDistrict, setActiveDistrict] = useState<District | null>(null);
  const [activeAgeGroup, setActiveAgeGroup] = useState<string | null>(null);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [selectedDayRange, setSelectedDayRange] = useState<{ from: number; to: number } | null>(null);
  const [draggingHandle, setDraggingHandle] = useState<"from" | "to" | null>(null);
  const [expandedCampId, setExpandedCampId] = useState<string | null>(null);
  const sliderRef = useRef<HTMLDivElement | null>(null);

  const ageGroup = AGE_GROUPS.find((g) => g.key === activeAgeGroup) ?? null;
  const hasActiveFilters = search || activeType || activeDistrict || activeAgeGroup !== null;

  const filtered = useMemo(() => {
    let result = camps;
    if (search) {
      const q = search.toLowerCase();
      result = result.filter((c) =>
        [c.title, c.description_short, c.venue_name, c.venue_address, c.organizer]
          .join(" ")
          .toLowerCase()
          .includes(q)
      );
    }
    if (activeType) {
      result = result.filter((c) => c.camp_type === activeType);
    }
    if (activeDistrict) {
      result = result.filter((c) => c.district === activeDistrict);
    }
    if (ageGroup) {
      result = result.filter(
        (c) =>
          (c.age_min === null || c.age_min <= ageGroup.max) &&
          (c.age_max === null || c.age_max >= ageGroup.min)
      );
    }
    return result;
  }, [camps, search, activeType, activeDistrict, ageGroup]);

  const availableDistricts = useMemo(() => {
    const set = new Set<string>();
    camps.forEach((c) => set.add(c.district));
    return DISTRICT_LIST.filter((d) => set.has(d));
  }, [camps]);

  const timeline = useMemo(() => {
    if (filtered.length === 0) return null;

    const rows: TimelineCamp[] = filtered
      .map((camp) => {
        const startDay = dayNumber(camp.date_start);
        const endDay = dayNumber(camp.date_end || camp.date_start);
        return {
          camp,
          startDay,
          endDay,
          durationDays: durationInclusive(camp.date_start, camp.date_end || camp.date_start),
        };
      })
      .sort((a, b) => a.startDay - b.startDay);

    const rangeStart = Math.min(...rows.map((row) => row.startDay));
    const rangeEnd = Math.max(...rows.map((row) => row.endDay));

    const monthList: { key: string; label: string; year: number; month: number; dayStart: number; dayEnd: number }[] = [];
    const startDate = new Date(rows[0].camp.date_start);
    const markerDate = new Date(startDate.getFullYear(), startDate.getMonth(), 1);

    while (dayNumber(markerDate.toISOString()) <= rangeEnd) {
      const mYear = markerDate.getFullYear();
      const mMonth = markerDate.getMonth();
      const firstOfMonth = dayNumber(new Date(mYear, mMonth, 1).toISOString());
      const lastOfMonth = dayNumber(new Date(mYear, mMonth + 1, 0).toISOString());
      monthList.push({
        key: `${mYear}-${mMonth}`,
        label: markerDate.toLocaleDateString("pl-PL", { month: "long" }),
        year: mYear,
        month: mMonth,
        dayStart: Math.max(rangeStart, firstOfMonth),
        dayEnd: Math.min(rangeEnd, lastOfMonth),
      });
      markerDate.setMonth(markerDate.getMonth() + 1);
    }

    return { rows, rangeStart, rangeEnd, totalDays: Math.max(1, rangeEnd - rangeStart + 1), monthList };
  }, [filtered]);

  const { displayRows, displayRangeStart, displayTotalDays, activeFromDay, activeToDay } = useMemo(() => {
    if (!timeline) {
      return {
        displayRows: [],
        displayRangeStart: 0,
        displayTotalDays: 1,
        activeFromDay: 0,
        activeToDay: 0,
      };
    }

    const fromDay = selectedDayRange
      ? Math.max(timeline.rangeStart, Math.min(selectedDayRange.from, timeline.rangeEnd))
      : timeline.rangeStart;
    const toDay = selectedDayRange
      ? Math.max(timeline.rangeStart, Math.min(selectedDayRange.to, timeline.rangeEnd))
      : timeline.rangeEnd;
    const rangeStart = Math.min(fromDay, toDay);
    const rangeEnd = Math.max(fromDay, toDay);

    const rows = timeline.rows.filter((row) =>
      row.startDay <= rangeEnd && row.endDay >= rangeStart
    );

    return {
      displayRows: rows,
      displayRangeStart: rangeStart,
      displayTotalDays: Math.max(1, rangeEnd - rangeStart + 1),
      activeFromDay: rangeStart,
      activeToDay: rangeEnd,
    };
  }, [timeline, selectedDayRange]);

  const displayGroups = useMemo(() => {
    const groupedRows = new Map<string, { organizer: string; rows: TimelineCamp[] }>();

    for (const row of displayRows) {
      const key = organizerKey(row.camp.organizer);
      const existing = groupedRows.get(key);
      if (existing) {
        existing.rows.push(row);
      } else {
        groupedRows.set(key, {
          organizer: row.camp.organizer || "Organizator",
          rows: [row],
        });
      }
    }

    return Array.from(groupedRows.values()).map((group) => ({
      ...group,
      rows: group.rows.sort((a, b) => a.startDay - b.startDay),
    }));
  }, [displayRows]);

  const dayFromClientX = (clientX: number) => {
    if (!timeline || !sliderRef.current) return 0;
    const rect = sliderRef.current.getBoundingClientRect();
    const ratio = Math.max(0, Math.min(1, (clientX - rect.left) / Math.max(1, rect.width)));
    const daySpan = Math.max(1, timeline.rangeEnd - timeline.rangeStart);
    return timeline.rangeStart + Math.round(ratio * daySpan);
  };

  useEffect(() => {
    if (!draggingHandle || !timeline) return;

    const onMove = (e: MouseEvent) => {
      const nextDay = dayFromClientX(e.clientX);
      setSelectedDayRange((prev) => {
        const base = prev ?? { from: timeline.rangeStart, to: timeline.rangeEnd };
        if (draggingHandle === "from") {
          return { from: Math.min(nextDay, base.to), to: base.to };
        }
        return { from: base.from, to: Math.max(nextDay, base.from) };
      });
    };

    const onUp = () => setDraggingHandle(null);

    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
  }, [draggingHandle, timeline]);

  function clearFilters() {
    setSearch("");
    setActiveType(null);
    setActiveDistrict(null);
    setActiveAgeGroup(null);
  }

  return (
    <div className="container-page pt-5 pb-10">
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
            {hasActiveFilters && <span className="ml-0.5 w-1.5 h-1.5 rounded-full bg-primary-foreground" />}
          </button>

          <div className="relative flex-1 hidden sm:block">
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
          <div className="mt-3 pt-3 border-t border-border space-y-3">
            <div className="relative sm:hidden">
              <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground/50" />
              <input
                type="text"
                placeholder="Szukaj kolonii..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-8 pr-3 py-2 rounded-lg border border-border bg-background text-[13px] text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/40 transition-all duration-200"
              />
            </div>

            <div>
              <p className="text-[11px] font-medium text-muted-foreground mb-1.5">Typ kolonii</p>
              <div className="flex flex-wrap gap-1.5">
                {campTypes.map((type) => {
                  const count = camps.filter((c) => c.camp_type === type).length;
                  if (count === 0) return null;
                  return (
                    <button
                      key={type}
                      onClick={() => setActiveType(activeType === type ? null : type)}
                      className={cn(
                        "px-2.5 py-1 rounded-lg text-[11px] font-medium border transition-all duration-200",
                        activeType === type
                          ? "bg-primary text-primary-foreground border-primary"
                          : "bg-background text-muted border-border hover:border-primary/30 hover:text-foreground"
                      )}
                    >
                      {CAMP_TYPE_ICONS[type]} {CAMP_TYPE_LABELS[type]}
                    </button>
                  );
                })}
              </div>
            </div>

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
                  {availableDistricts.map((district) => (
                    <option key={district} value={district}>
                      {district}
                    </option>
                  ))}
                </select>
              </div>
            </div>

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

      {filtered.length === 0 ? (
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
        <div className="rounded-xl border border-border bg-card p-4 sm:p-5">
          <div className="mb-4">
            <h2 className="text-[15px] sm:text-[16px] font-semibold text-foreground">Harmonogram turnusów</h2>
            <p className="text-[12px] text-muted-foreground mt-1">
              Wszystkie szczegóły turnusu są dostępne po kliknięciu paska.
            </p>
          </div>

          {!timeline ? null : (
            <div className="space-y-3">
              <div className="rounded-lg border border-border bg-card px-3 py-2">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-[11px] text-muted-foreground">Możesz wybrać daty, które Cię interesują</p>
                  {selectedDayRange !== null && (
                    <button
                      onClick={() => setSelectedDayRange(null)}
                      className="inline-flex items-center gap-1 text-[10px] font-medium text-muted-foreground hover:text-foreground transition-colors"
                    >
                      <X size={10} /> Wyczyść
                    </button>
                  )}
                </div>

                {timeline.monthList.length > 0 && (
                  <>
                    <div
                      ref={sliderRef}
                      className="relative h-5 mb-2 cursor-pointer"
                      onMouseDown={(e) => {
                        const nextDay = dayFromClientX(e.clientX);
                        const pick: "from" | "to" = Math.abs(nextDay - activeFromDay) <= Math.abs(nextDay - activeToDay) ? "from" : "to";
                        setSelectedDayRange((prev) => {
                          const base = prev ?? { from: timeline.rangeStart, to: timeline.rangeEnd };
                          if (pick === "from") {
                            return { from: Math.min(nextDay, base.to), to: base.to };
                          }
                          return { from: base.from, to: Math.max(nextDay, base.from) };
                        });
                        setDraggingHandle(pick);
                      }}
                    >
                      <div className="absolute left-0 right-0 top-1/2 -translate-y-1/2 h-1.5 rounded-full bg-accent" />
                      <div
                        className="absolute top-1/2 -translate-y-1/2 h-1.5 rounded-full bg-[#a8c4e0]/70"
                        style={{
                          left: `${((activeFromDay - timeline.rangeStart) / timeline.totalDays) * 100}%`,
                          width: `${((activeToDay - activeFromDay) / timeline.totalDays) * 100}%`,
                        }}
                      />
                      <button
                        type="button"
                        aria-label="Początek zakresu"
                        onMouseDown={(e) => {
                          e.stopPropagation();
                          setDraggingHandle("from");
                        }}
                        className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 h-3 w-3 rounded-full bg-white border-2 border-[#a8c4e0] shadow"
                        style={{ left: `${((activeFromDay - timeline.rangeStart) / timeline.totalDays) * 100}%` }}
                      />
                      <button
                        type="button"
                        aria-label="Koniec zakresu"
                        onMouseDown={(e) => {
                          e.stopPropagation();
                          setDraggingHandle("to");
                        }}
                        className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 h-3 w-3 rounded-full bg-white border-2 border-[#a8c4e0] shadow"
                        style={{ left: `${((activeToDay - timeline.rangeStart) / timeline.totalDays) * 100}%` }}
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-medium text-foreground bg-accent rounded px-1.5 py-0.5">{new Date(activeFromDay * MS_DAY).toLocaleDateString("pl-PL", { day: "numeric", month: "long" })}</span>
                      <span className="text-[10px] text-muted-foreground">—</span>
                      <span className="text-[10px] font-medium text-foreground bg-accent rounded px-1.5 py-0.5">{new Date(activeToDay * MS_DAY).toLocaleDateString("pl-PL", { day: "numeric", month: "long" })}</span>
                    </div>
                  </>
                )}
              </div>

              {displayRows.length === 0 ? (
                <p className="text-center text-[12px] text-muted-foreground py-6">Brak kolonii w tym miesiącu.</p>
              ) : (
              <div className="space-y-4">
                {displayGroups.map((group) => {
                  const expandedRow = group.rows.find((row) => row.camp.id === expandedCampId) ?? null;

                  return (
                  <section key={group.organizer} className="rounded-lg border border-border bg-background p-2 sm:p-2.5">
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between gap-2">
                        <div className="min-w-0 flex items-center gap-1.5">
                          <h3 className="text-[11px] font-semibold text-foreground truncate">{group.organizer}</h3>
                          <span className="text-[9px] text-muted-foreground whitespace-nowrap">{group.rows.length} turn.</span>
                        </div>
                      </div>

                      <div className="relative h-12 min-w-0">
                        <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 h-3.5 rounded-full bg-accent/50" />

                        {group.rows.map((row) => {
                          const visibleStart = Math.max(row.startDay, displayRangeStart);
                          const left = ((visibleStart - displayRangeStart) / displayTotalDays) * 100;
                          const visibleEnd = Math.min(row.endDay, displayRangeStart + displayTotalDays - 1);
                          const width = ((visibleEnd - visibleStart + 1) / displayTotalDays) * 100;
                          const labelRight = Math.min(left + Math.max(width, 1.6), 100);
                          const isClipped = row.startDay < displayRangeStart || row.endDay > displayRangeStart + displayTotalDays - 1;
                          const rangeLabel = `${formatDateShort(new Date(visibleStart * MS_DAY))} - ${formatDateShort(new Date(visibleEnd * MS_DAY))}`;

                          return (
                            <div key={row.camp.id}>
                              <span
                                className="absolute top-0.5 text-[9px] text-muted-foreground whitespace-nowrap bg-card/90 px-0.5 rounded"
                                style={{ left: `${left}%` }}
                              >
                                {formatDateShortWithWeekday(new Date(visibleStart * MS_DAY))}
                              </span>
                              <span
                                className="absolute bottom-0.5 -translate-x-full text-[9px] text-muted-foreground whitespace-nowrap bg-card/90 px-0.5 rounded"
                                style={{ left: `${labelRight}%` }}
                              >
                                {formatDateShortWithWeekday(new Date(visibleEnd * MS_DAY))}
                              </span>

                              <button
                                type="button"
                                title={`${getCampDisplayTitle(row.camp.title, row.camp.organizer)} (${rangeLabel})`}
                                aria-label={`Pokaż szczegóły turnusu ${getCampDisplayTitle(row.camp.title, row.camp.organizer)}`}
                                onClick={() => setExpandedCampId((prev) => (prev === row.camp.id ? null : row.camp.id))}
                                className={cn(
                                  "absolute top-1/2 -translate-y-1/2 h-3.5 rounded-full transition-all duration-200",
                                  isClipped
                                    ? expandedCampId === row.camp.id ? "bg-slate-500 shadow-sm z-10" : "bg-slate-300 hover:bg-slate-400"
                                    : expandedCampId === row.camp.id ? "bg-red-300 shadow-sm z-10" : "bg-[#a8c4e0] hover:bg-[#4a6fa0]"
                                )}
                                style={{ left: `${left}%`, width: `${Math.max(width, 1.6)}%` }}
                              />
                            </div>
                          );
                        })}
                      </div>

                      {expandedRow && (
                        <div className="mt-2 rounded-xl border border-border bg-card overflow-hidden shadow-sm">
                          {/* Header */}
                          <div className="px-4 py-3 bg-[#a8c4e0]/10 border-b border-[#a8c4e0]/20 flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <p className="text-[13px] font-semibold text-foreground leading-snug">
                                {CAMP_TYPE_ICONS[expandedRow.camp.camp_type]} {expandedRow.camp.title}
                              </p>
                              <p className="text-[11px] text-muted-foreground mt-0.5">{expandedRow.camp.organizer}</p>
                            </div>
                            <span className="shrink-0 text-[10px] font-semibold text-[#a8c4e0] bg-[#a8c4e0]/15 rounded-full px-2.5 py-1 whitespace-nowrap">
                              {CAMP_TYPE_LABELS[expandedRow.camp.camp_type]}
                            </span>
                          </div>

                          {/* Info chips */}
                          <div className="px-4 py-3 flex flex-wrap gap-2">
                            <span className="inline-flex items-center gap-1.5 text-[11px] text-foreground bg-accent rounded-lg px-2.5 py-1.5">
                              <Calendar size={11} className="text-[#a8c4e0]" />
                              {formatDateShort(expandedRow.camp.date_start)} – {formatDateShort(expandedRow.camp.date_end)}
                            </span>
                            <span className="inline-flex items-center gap-1.5 text-[11px] text-foreground bg-accent rounded-lg px-2.5 py-1.5">
                              <Clock size={11} className="text-[#a8c4e0]" />
                              {expandedRow.durationDays} dni
                            </span>
                            <span className="inline-flex items-center gap-1.5 text-[11px] text-foreground bg-accent rounded-lg px-2.5 py-1.5">
                              <Users size={11} className="text-[#a8c4e0]" />
                              {formatAgeRange(expandedRow.camp.age_min, expandedRow.camp.age_max)}
                            </span>
                            <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-foreground bg-accent rounded-lg px-2.5 py-1.5">
                              {formatPrice(expandedRow.camp.price)}
                            </span>
                          </div>

                          {/* Location + description */}
                          <div className="px-4 pb-3 space-y-1.5">
                            {(expandedRow.camp.venue_name || expandedRow.camp.venue_address) && (
                              <p className="flex items-start gap-1.5 text-[11px] text-muted-foreground">
                                <MapPin size={11} className="mt-0.5 shrink-0 text-[#a8c4e0]" />
                                {[expandedRow.camp.venue_name, expandedRow.camp.venue_address].filter(Boolean).join(", ")}
                              </p>
                            )}
                            {expandedRow.camp.description_short && (
                              <p className="text-[11px] text-foreground/80 leading-relaxed line-clamp-2">{expandedRow.camp.description_short}</p>
                            )}
                          </div>

                          {/* Actions */}
                          <div className="px-4 py-3 border-t border-border flex items-center gap-2">
                            <Link
                              href={`/kolonie/${expandedRow.camp.slug}`}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-semibold bg-[#a8c4e0] text-white hover:bg-[#4a6fa0] transition-colors"
                            >
                              Pełne szczegóły <ExternalLink size={11} />
                            </Link>
                            {expandedRow.camp.source_url && (
                              <a
                                href={expandedRow.camp.source_url}
                                target="_blank"
                                rel="noopener"
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-medium border border-border text-muted-foreground hover:text-foreground hover:border-foreground/20 transition-colors"
                              >
                                Strona organizatora <ExternalLink size={11} />
                              </a>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  </section>
                );})}
              </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
