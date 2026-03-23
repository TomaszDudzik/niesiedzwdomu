"use client";

import { useState, useMemo, useEffect, useRef, useCallback } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Clock,
  MapPin,
  Calendar as CalendarIcon,
  Users,
  Map as MapIcon,
  List,
  Sparkles,
} from "lucide-react";
import Link from "next/link";
import { cn, formatPrice, formatAgeRange } from "@/lib/utils";
import { getEventsForDate } from "@/lib/filter-events";
import { CATEGORY_ICONS } from "@/lib/mock-data";
import type { Event, EventCategory } from "@/types/database";

/* ── Helpers ── */
const DAYS_PL = ["Nd", "Pn", "Wt", "Śr", "Cz", "Pt", "So"];
const MONTHS_PL = [
  "Styczeń", "Luty", "Marzec", "Kwiecień", "Maj", "Czerwiec",
  "Lipiec", "Sierpień", "Wrzesień", "Październik", "Listopad", "Grudzień",
];

function isSameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}
function isToday(date: Date) { return isSameDay(date, new Date()); }
function isWeekend(date: Date) { const d = date.getDay(); return d === 0 || d === 6; }

function generateDateRange(centerDate: Date, daysBefore: number, daysAfter: number): Date[] {
  const dates: Date[] = [];
  for (let i = -daysBefore; i <= daysAfter; i++) {
    const d = new Date(centerDate);
    d.setDate(centerDate.getDate() + i);
    dates.push(d);
  }
  return dates;
}

/* ── Map helpers ── */
const KRAKOW_CENTER: [number, number] = [50.0614, 19.9372];
const DISTRICT_COORDS: Record<string, [number, number]> = {
  "Stare Miasto": [50.0614, 19.9372],
  "Kazimierz": [50.0500, 19.9460],
  "Podgórze": [50.0420, 19.9510],
  "Nowa Huta": [50.0720, 20.0370],
  "Krowodrza": [50.0770, 19.9130],
  "Bronowice": [50.0810, 19.8900],
  "Zwierzyniec": [50.0560, 19.8900],
  "Dębniki": [50.0430, 19.9200],
  "Prądnik Czerwony": [50.0870, 19.9550],
  "Prądnik Biały": [50.0950, 19.9200],
  "Czyżyny": [50.0720, 20.0050],
  "Bieżanów": [50.0150, 20.0050],
};

export interface MarkerGroup {
  coords: [number, number];
  events: Event[];
  label: string;
}

function groupByLocation(events: Event[]): MarkerGroup[] {
  const groups: Record<string, MarkerGroup> = {};
  for (const event of events) {
    const coords = DISTRICT_COORDS[event.district] || KRAKOW_CENTER;
    const key = `${coords[0]},${coords[1]}`;
    if (!groups[key]) {
      groups[key] = { coords, events: [], label: event.venue_name || event.district };
    }
    groups[key].events.push(event);
  }
  return Object.values(groups);
}

/* ── Category colors ── */
const CATEGORY_COLORS: Record<EventCategory, string> = {
  warsztaty: "bg-amber-100 text-amber-700 border-amber-200",
  spektakl: "bg-purple-100 text-purple-700 border-purple-200",
  muzyka: "bg-blue-100 text-blue-700 border-blue-200",
  sport: "bg-green-100 text-green-700 border-green-200",
  natura: "bg-emerald-100 text-emerald-700 border-emerald-200",
  edukacja: "bg-indigo-100 text-indigo-700 border-indigo-200",
  festyn: "bg-rose-100 text-rose-700 border-rose-200",
  kino: "bg-slate-100 text-slate-700 border-slate-200",
  wystawa: "bg-teal-100 text-teal-700 border-teal-200",
  inne: "bg-gray-100 text-gray-700 border-gray-200",
};

/* ── Main component ── */
interface CalendarMapViewProps {
  events: Event[];
}

export function CalendarMapView({ events }: CalendarMapViewProps) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const [selectedDate, setSelectedDate] = useState<Date>(today);
  const [mobileView, setMobileView] = useState<"map" | "list">("list");
  const [highlightedDistrict, setHighlightedDistrict] = useState<string | null>(null);
  const [MapComponent, setMapComponent] = useState<React.ComponentType<{ groups: MarkerGroup[] }> | null>(null);

  const scrollRef = useRef<HTMLDivElement>(null);
  const todayRef = useRef<HTMLButtonElement>(null);

  // Generate 60 days: 7 before today, 52 after
  const dateRange = useMemo(() => generateDateRange(today, 7, 52), []);

  // Events for selected date
  const selectedEvents = useMemo(() => getEventsForDate(events, selectedDate), [events, selectedDate]);
  // Map groups filtered to selected date
  const groups = useMemo(() => groupByLocation(selectedEvents), [selectedEvents]);

  // Event counts per date (for the strip)
  const eventCountMap = useMemo(() => {
    const counts = new Map<string, number>();
    for (const date of dateRange) {
      const dateEvents = getEventsForDate(events, date);
      if (dateEvents.length > 0) {
        counts.set(date.toISOString().split("T")[0], dateEvents.length);
      }
    }
    return counts;
  }, [events, dateRange]);

  // Scroll to today on mount
  useEffect(() => {
    if (todayRef.current && scrollRef.current) {
      const container = scrollRef.current;
      const todayEl = todayRef.current;
      const offset = todayEl.offsetLeft - container.offsetWidth / 2 + todayEl.offsetWidth / 2;
      container.scrollTo({ left: offset, behavior: "instant" });
    }
  }, []);

  // Load map component
  useEffect(() => {
    import("./map-leaflet").then((mod) => setMapComponent(() => mod.MapLeaflet));
  }, []);

  const scrollTimeline = useCallback((direction: "left" | "right") => {
    if (!scrollRef.current) return;
    const amount = scrollRef.current.offsetWidth * 0.6;
    scrollRef.current.scrollBy({ left: direction === "left" ? -amount : amount, behavior: "smooth" });
  }, []);

  const jumpToToday = () => {
    setSelectedDate(today);
    if (todayRef.current && scrollRef.current) {
      const container = scrollRef.current;
      const todayEl = todayRef.current;
      const offset = todayEl.offsetLeft - container.offsetWidth / 2 + todayEl.offsetWidth / 2;
      container.scrollTo({ left: offset, behavior: "smooth" });
    }
  };

  const jumpToWeekend = () => {
    const d = new Date(today);
    const day = d.getDay();
    const daysUntilSat = (6 - day + 7) % 7 || 7;
    d.setDate(d.getDate() + (day === 6 ? 0 : daysUntilSat));
    setSelectedDate(d);
    // scroll to it
    setTimeout(() => {
      if (scrollRef.current) {
        const targetKey = d.toISOString().split("T")[0];
        const el = scrollRef.current.querySelector(`[data-date="${targetKey}"]`) as HTMLElement | null;
        if (el) {
          const container = scrollRef.current;
          const offset = el.offsetLeft - container.offsetWidth / 2 + el.offsetWidth / 2;
          container.scrollTo({ left: offset, behavior: "smooth" });
        }
      }
    }, 50);
  };

  // Current month label from selected date
  const monthLabel = `${MONTHS_PL[selectedDate.getMonth()]} ${selectedDate.getFullYear()}`;
  const dayLabel = selectedDate.toLocaleDateString("pl-PL", { weekday: "long", day: "numeric", month: "long" });

  return (
    <div className="space-y-0">
      {/* ── DATE TIMELINE STRIP ── */}
      <div className="rounded-xl border border-border bg-white overflow-hidden">
        {/* Header row */}
        <div className="flex items-center justify-between px-4 py-2.5 border-b border-border/60 bg-accent/20">
          <div className="flex items-center gap-2">
            <CalendarIcon size={15} className="text-foreground/70" />
            <span className="text-[13px] font-semibold text-foreground">{monthLabel}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <button
              onClick={jumpToToday}
              className={cn(
                "px-2.5 py-1 rounded-md text-[11px] font-medium transition-all",
                isToday(selectedDate)
                  ? "bg-foreground text-white"
                  : "bg-accent text-foreground hover:bg-accent/80"
              )}
            >
              Dziś
            </button>
            <button
              onClick={jumpToWeekend}
              className="px-2.5 py-1 rounded-md text-[11px] font-medium bg-accent text-foreground hover:bg-accent/80 transition-all"
            >
              Weekend
            </button>
            <div className="w-px h-4 bg-border/60 mx-1" />
            <button onClick={() => scrollTimeline("left")} className="p-1 rounded hover:bg-accent transition-colors">
              <ChevronLeft size={14} />
            </button>
            <button onClick={() => scrollTimeline("right")} className="p-1 rounded hover:bg-accent transition-colors">
              <ChevronRight size={14} />
            </button>
          </div>
        </div>

        {/* Scrollable date cells */}
        <div ref={scrollRef} className="flex overflow-x-auto scrollbar-hide py-2 px-2 gap-1" style={{ scrollbarWidth: "none" }}>
          {dateRange.map((date) => {
            const key = date.toISOString().split("T")[0];
            const selected = isSameDay(date, selectedDate);
            const todayFlag = isToday(date);
            const weekend = isWeekend(date);
            const count = eventCountMap.get(key) || 0;
            const isPast = date < today;

            return (
              <button
                key={key}
                data-date={key}
                ref={todayFlag ? todayRef : undefined}
                onClick={() => setSelectedDate(date)}
                className={cn(
                  "flex flex-col items-center min-w-[52px] px-2 py-2 rounded-lg transition-all shrink-0 relative",
                  selected
                    ? "bg-foreground text-white shadow-md scale-105"
                    : todayFlag
                      ? "bg-accent/80 text-foreground ring-1 ring-foreground/20"
                      : isPast
                        ? "text-muted-foreground/40 hover:bg-accent/40"
                        : weekend
                          ? "text-foreground hover:bg-accent/60 bg-accent/20"
                          : "text-foreground hover:bg-accent/50"
                )}
              >
                <span className={cn("text-[10px] font-medium uppercase", selected ? "text-white/70" : "text-muted-foreground")}>
                  {DAYS_PL[date.getDay()]}
                </span>
                <span className={cn("text-[16px] font-semibold leading-tight mt-0.5", selected && "text-white")}>
                  {date.getDate()}
                </span>
                {/* Event count indicator */}
                {count > 0 && (
                  <div className={cn(
                    "mt-1 flex items-center justify-center min-w-[18px] h-[14px] rounded-full text-[9px] font-bold leading-none px-1",
                    selected
                      ? "bg-white/25 text-white"
                      : count >= 5
                        ? "bg-foreground/15 text-foreground"
                        : "bg-foreground/10 text-foreground/70"
                  )}>
                    {count}
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── CONTENT AREA: Map + Event List ── */}
      <div className="mt-3">
        {/* Mobile view toggle */}
        <div className="flex lg:hidden items-center gap-1 mb-3 rounded-lg border border-border p-1 bg-accent/30 w-fit">
          <button
            onClick={() => setMobileView("list")}
            className={cn(
              "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[12px] font-medium transition-all",
              mobileView === "list" ? "bg-foreground text-white shadow-sm" : "text-muted-foreground hover:text-foreground"
            )}
          >
            <List size={13} /> Lista
          </button>
          <button
            onClick={() => setMobileView("map")}
            className={cn(
              "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[12px] font-medium transition-all",
              mobileView === "map" ? "bg-foreground text-white shadow-sm" : "text-muted-foreground hover:text-foreground"
            )}
          >
            <MapIcon size={13} /> Mapa
          </button>
        </div>

        {/* Selected date header */}
        <div className="flex items-center justify-between mb-3">
          <div>
            <h3 className="text-[15px] font-semibold text-foreground capitalize">{dayLabel}</h3>
            <p className="text-[12px] text-muted-foreground mt-0.5">
              {selectedEvents.length === 0
                ? "Brak wydarzeń w tym dniu"
                : `${selectedEvents.length} ${selectedEvents.length === 1 ? "wydarzenie" : selectedEvents.length < 5 ? "wydarzenia" : "wydarzeń"}`}
            </p>
          </div>
          {/* District summary pills */}
          {groups.length > 0 && (
            <div className="hidden md:flex items-center gap-1.5 flex-wrap justify-end">
              {groups.map((g) => (
                <button
                  key={g.label}
                  onClick={() => setHighlightedDistrict(highlightedDistrict === g.label ? null : g.label)}
                  className={cn(
                    "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium border transition-all",
                    highlightedDistrict === g.label
                      ? "bg-foreground text-white border-foreground"
                      : "bg-accent/50 text-muted-foreground border-border hover:border-foreground/30"
                  )}
                >
                  <MapPin size={9} />
                  {g.label}
                  <span className="opacity-60">({g.events.length})</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Split layout */}
        <div className="grid lg:grid-cols-5 gap-3">
          {/* Map panel */}
          <div className={cn(
            "lg:col-span-3 rounded-xl border border-border overflow-hidden",
            mobileView === "list" ? "hidden lg:block" : "block",
            "min-h-[350px] lg:min-h-[450px]"
          )}>
            {MapComponent ? (
              <MapComponent groups={groups} />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-accent/20 min-h-[350px]">
                <div className="text-center">
                  <MapIcon size={24} className="mx-auto text-muted-foreground/30 mb-2" />
                  <p className="text-[13px] text-muted-foreground">Ładowanie mapy…</p>
                </div>
              </div>
            )}
          </div>

          {/* Event list panel */}
          <div className={cn(
            "lg:col-span-2",
            mobileView === "map" ? "hidden lg:block" : "block",
          )}>
            {selectedEvents.length === 0 ? (
              <div className="rounded-xl border border-dashed border-border/60 flex flex-col items-center justify-center py-16 px-6 text-center bg-accent/10 min-h-[350px]">
                <div className="w-12 h-12 rounded-full bg-accent/50 flex items-center justify-center mb-3">
                  <Sparkles size={20} className="text-muted-foreground/50" />
                </div>
                <p className="text-[14px] font-medium text-foreground/80 mb-1">Brak wydarzeń</p>
                <p className="text-[12px] text-muted-foreground max-w-[220px]">
                  Wybierz inny dzień w osi czasu powyżej, aby zobaczyć dostępne wydarzenia.
                </p>
              </div>
            ) : (
              <div className="space-y-2 max-h-[450px] overflow-y-auto pr-1 scrollbar-thin">
                {selectedEvents
                  .filter((e) => !highlightedDistrict || e.venue_name === highlightedDistrict || e.district === highlightedDistrict)
                  .map((event) => (
                    <EventCard key={event.id} event={event} />
                  ))}
                {highlightedDistrict && selectedEvents.filter((e) => e.venue_name !== highlightedDistrict && e.district !== highlightedDistrict).length > 0 && (
                  <button
                    onClick={() => setHighlightedDistrict(null)}
                    className="w-full text-center py-2 text-[11px] text-muted-foreground hover:text-foreground transition-colors"
                  >
                    + {selectedEvents.filter((e) => e.venue_name !== highlightedDistrict && e.district !== highlightedDistrict).length} więcej wydarzeń — pokaż wszystkie
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── Event Card ── */
function EventCard({ event }: { event: Event }) {
  const categoryColor = CATEGORY_COLORS[event.category] || CATEGORY_COLORS.inne;
  const categoryIcon = CATEGORY_ICONS[event.category] || "✨";

  return (
    <Link
      href={`/wydarzenia/${event.slug}`}
      className="block rounded-xl border border-border bg-white p-3.5 hover:border-foreground/20 hover:shadow-sm transition-all group"
    >
      {/* Top row: category + price */}
      <div className="flex items-start justify-between gap-2 mb-2">
        <span className={cn("inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium border", categoryColor)}>
          <span>{categoryIcon}</span>
          {event.category}
        </span>
        <span className={cn(
          "text-[12px] font-semibold shrink-0",
          event.is_free ? "text-green-600" : "text-foreground"
        )}>
          {formatPrice(event.price)}
        </span>
      </div>

      {/* Title */}
      <h4 className="font-semibold text-[13px] text-foreground group-hover:text-foreground/80 transition-colors line-clamp-2 mb-2 leading-snug">
        {event.title}
      </h4>

      {/* Info row */}
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
        {event.time_start && (
          <span className="inline-flex items-center gap-1">
            <Clock size={10} className="shrink-0" />
            {event.time_start}{event.time_end && ` – ${event.time_end}`}
          </span>
        )}
        {event.venue_name && (
          <span className="inline-flex items-center gap-1">
            <MapPin size={10} className="shrink-0" />
            <span className="truncate max-w-[140px]">{event.venue_name}</span>
          </span>
        )}
        {(event.age_min !== null || event.age_max !== null) && (
          <span className="inline-flex items-center gap-1">
            <Users size={10} className="shrink-0" />
            {formatAgeRange(event.age_min, event.age_max)}
          </span>
        )}
      </div>
    </Link>
  );
}
