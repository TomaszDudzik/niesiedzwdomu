"use client";

import { useState, useMemo, useEffect } from "react";
import {
  Clock,
  MapPin,
  Map as MapIcon,
  List,
  Sparkles,
} from "lucide-react";
import Link from "next/link";
import { cn, formatHourMinuteRange, toLocalDateKey } from "@/lib/utils";
import { getEventsForDate } from "@/lib/filter-events";
import type { Event } from "@/types/database";

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
function getDaysInMonth(year: number, month: number) { return new Date(year, month + 1, 0).getDate(); }

function getTodayStart(): Date {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  return now;
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
  "Bieżanów-Prokocim": [50.0150, 20.0050],
};

export interface MarkerGroup {
  coords: [number, number];
  events: Event[];
  label: string;
}

function groupByLocation(events: Event[]): MarkerGroup[] {
  const groups: Record<string, MarkerGroup> = {};
  for (const event of events) {
    // Use exact coordinates if available, otherwise fall back to district center
    const coords: [number, number] = (event.lat && event.lng)
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

/* ── Main component ── */
interface CalendarMapViewProps {
  events: Event[];
}

export function CalendarMapView({ events }: CalendarMapViewProps) {
  const today = getTodayStart();
  const startYear = today.getFullYear();
  const startMonth = today.getMonth();

  const [selectedDate, setSelectedDate] = useState<Date>(() => getTodayStart());
  const [currentMonth, setCurrentMonth] = useState(() => today.getMonth());
  const [currentYear, setCurrentYear] = useState(() => today.getFullYear());
  const [mobileView, setMobileView] = useState<"map" | "list">("list");
  const [MapComponent, setMapComponent] = useState<React.ComponentType<{ groups: MarkerGroup[] }> | null>(null);

  // Always open on today's local date.
  useEffect(() => {
    const current = getTodayStart();
    setSelectedDate(current);
    setCurrentMonth(current.getMonth());
    setCurrentYear(current.getFullYear());
  }, []);

  // Events for selected date
  const selectedEvents = useMemo(() => getEventsForDate(events, selectedDate), [events, selectedDate]);
  // Map groups filtered to selected date
  const groups = useMemo(() => groupByLocation(selectedEvents), [selectedEvents]);

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

  // Event counts per date (same matching logic as selectedEvents)
  const eventCountMap = useMemo(() => {
    const counts = new Map<string, number>();
    for (const date of monthDays) {
      const key = toLocalDateKey(date);
      counts.set(key, getEventsForDate(events, date).length);
    }
    return counts;
  }, [events, monthDays]);

  // Load map component
  useEffect(() => {
    import("./map-leaflet").then((mod) => setMapComponent(() => mod.MapLeaflet));
  }, []);

  const updateDisplayedMonth = (year: number, month: number) => {
    setCurrentYear(year);
    setCurrentMonth(month);
    setSelectedDate((prev) => {
      const safeDay = Math.min(prev.getDate(), getDaysInMonth(year, month));
      return new Date(year, month, safeDay);
    });
  };

  return (
    <div className="space-y-0">
      {/* ── MONTH CALENDAR ── */}
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

        <div className="grid grid-flow-col auto-cols-fr gap-0.5 py-2 px-2">
          {monthDays.map((date) => {
            const key = toLocalDateKey(date);
            const selected = isSameDay(date, selectedDate);
            const todayFlag = isToday(date);
            const weekend = isWeekend(date);
            const count = eventCountMap.get(key) || 0;
            const isPast = date < today;

            return (
              <button
                key={key}
                onClick={() => setSelectedDate(date)}
                title={`${date.toLocaleDateString("pl-PL")}${count > 0 ? ` • ${count} wydarzeń` : ""}`}
                className={cn(
                  "flex flex-col items-center justify-center min-h-[42px] px-0.5 py-1 rounded-md transition-all relative",
                  selected
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : todayFlag
                      ? "bg-accent/80 text-foreground ring-1 ring-primary/30"
                      : isPast
                        ? "text-muted-foreground/40 hover:bg-accent/40"
                        : weekend
                          ? "text-foreground hover:bg-accent/60 bg-accent/20"
                          : "text-foreground hover:bg-accent/50"
                )}
              >
                <span className={cn("text-[8px] font-medium uppercase leading-none", selected ? "text-white/70" : "text-muted-foreground")}>
                  {DAYS_PL[date.getDay()]}
                </span>
                <span className={cn("text-[11px] font-semibold leading-tight mt-0.5", selected && "text-white")}>
                  {date.getDate()}
                </span>
                <span
                  className={cn(
                    "mt-0.5 text-[8px] leading-none font-semibold",
                    selected
                      ? "text-primary-foreground/85"
                      : count > 0
                        ? "text-danger/80"
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

      {/* ── CONTENT AREA: Map + Event List ── */}
      <div className="mt-3">
        {/* Mobile view toggle */}
        <div className="flex lg:hidden items-center gap-1 mb-3 rounded-lg border border-border p-1 bg-accent/30 w-fit">
          <button
            onClick={() => setMobileView("list")}
            className={cn(
              "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[12px] font-medium transition-all",
              mobileView === "list" ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
            )}
          >
            <List size={13} /> Lista
          </button>
          <button
            onClick={() => setMobileView("map")}
            className={cn(
              "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[12px] font-medium transition-all",
              mobileView === "map" ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
            )}
          >
            <MapIcon size={13} /> Mapa
          </button>
        </div>

        {/* Split layout */}
        <div className="grid lg:grid-cols-5 gap-3">
          {/* Event list panel */}
          <div className={cn(
            "lg:col-span-3",
            mobileView === "map" ? "hidden lg:block" : "block",
          )}>
            {selectedEvents.length === 0 ? (
              <div className="rounded-xl border border-dashed border-border/60 flex flex-col items-center justify-center py-16 px-6 text-center bg-accent/10 min-h-[320px]">
                <div className="w-12 h-12 rounded-full bg-accent/50 flex items-center justify-center mb-3">
                  <Sparkles size={20} className="text-muted-foreground/50" />
                </div>
                <p className="text-[14px] font-medium text-foreground/80 mb-1">Brak wydarzeń</p>
                <p className="text-[12px] text-muted-foreground max-w-[220px]">
                  Wybierz inny dzień w wierszu powyżej, aby zobaczyć dostępne wydarzenia.
                </p>
              </div>
            ) : (
              <div className="space-y-2.5">
                {selectedEvents.map((event) => (
                  <EventCard key={event.id} event={event} />
                ))}
              </div>
            )}
          </div>

          {/* Map panel */}
          <div className={cn(
            "lg:col-span-2 rounded-xl border border-border overflow-hidden",
            mobileView === "list" ? "hidden lg:block" : "block",
            "min-h-[320px] lg:min-h-[400px]"
          )}>
            {MapComponent ? (
              <MapComponent groups={groups} />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-accent/20 min-h-[320px]">
                <div className="text-center">
                  <MapIcon size={24} className="mx-auto text-muted-foreground/30 mb-2" />
                  <p className="text-[13px] text-muted-foreground">Ładowanie mapy…</p>
                </div>
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
  const timeLabel = formatHourMinuteRange(event.time_start, event.time_end) || "Godzina wkrótce";
  const addressLabel = [event.street, event.city].filter(Boolean).join(", ") || event.district;

  return (
    <Link
      href={`/wydarzenia/${event.slug}`}
      className="group flex rounded-xl border border-border bg-card shadow-[var(--shadow-card)] hover:shadow-[var(--shadow-card-hover)] hover:-translate-y-0.5 transition-all duration-200 overflow-hidden"
    >
      <div className="w-[116px] sm:w-[136px] shrink-0 relative self-stretch">
        {event.image_url ? (
          <img
            src={event.image_url}
            alt={event.title}
            className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-300"
          />
        ) : (
          <div className="w-full h-full min-h-[112px] flex items-center justify-center bg-accent text-muted-foreground/35 text-xl">
            🗓️
          </div>
        )}
      </div>

      <div className="flex-1 min-w-0 p-3.5 flex flex-col gap-2">
        <h4 className="font-semibold text-[15px] text-foreground group-hover:text-primary transition-colors duration-200 line-clamp-2 leading-snug">
          {event.title}
        </h4>
        <div className="mt-auto space-y-1 text-[12px] text-muted">
          <div className="flex items-center gap-1.5">
            <Clock size={11} className="text-secondary/60 shrink-0" />
            <span className="truncate">{timeLabel}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <MapPin size={11} className="text-secondary/60 shrink-0" />
            <span className="truncate">{addressLabel}</span>
          </div>
        </div>
      </div>
    </Link>
  );
}
