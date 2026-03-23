"use client";

import { useState, useMemo, useEffect } from "react";
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Clock, MapPin } from "lucide-react";
import Link from "next/link";
import { cn, formatPrice, formatAgeRange } from "@/lib/utils";
import { getEventsForDate } from "@/lib/filter-events";
import { EmptyState } from "@/components/ui/empty-state";
import type { Event } from "@/types/database";

/* ── Calendar helpers ── */
const DAYS_PL = ["Pn", "Wt", "Śr", "Cz", "Pt", "So", "Nd"];
const MONTHS_PL_SHORT = ["Sty", "Lut", "Mar", "Kwi", "Maj", "Cze", "Lip", "Sie", "Wrz", "Paź", "Lis", "Gru"];

function getDaysInMonth(year: number, month: number) { return new Date(year, month + 1, 0).getDate(); }
function getFirstDayOfMonth(year: number, month: number) { const d = new Date(year, month, 1).getDay(); return d === 0 ? 6 : d - 1; }
function isSameDay(a: Date, b: Date) { return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate(); }
function isToday(date: Date) { return isSameDay(date, new Date()); }

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

/* ── Main component ── */
interface CalendarMapViewProps {
  events: Event[];
}

export function CalendarMapView({ events }: CalendarMapViewProps) {
  const today = new Date();
  const [currentMonth, setCurrentMonth] = useState(today.getMonth());
  const [currentYear, setCurrentYear] = useState(today.getFullYear());
  const [selectedDate, setSelectedDate] = useState<Date>(today);
  const [MapComponent, setMapComponent] = useState<React.ComponentType<{ groups: MarkerGroup[] }> | null>(null);

  const daysInMonth = getDaysInMonth(currentYear, currentMonth);
  const firstDay = getFirstDayOfMonth(currentYear, currentMonth);
  const selectedEvents = useMemo(() => getEventsForDate(events, selectedDate), [events, selectedDate]);
  const groups = useMemo(() => groupByLocation(events), [events]);

  const eventCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (let d = 1; d <= daysInMonth; d++) {
      const dayEvents = getEventsForDate(events, new Date(currentYear, currentMonth, d));
      if (dayEvents.length > 0) counts[d] = dayEvents.length;
    }
    return counts;
  }, [events, currentMonth, currentYear, daysInMonth]);

  const prevMonth = () => { if (currentMonth === 0) { setCurrentMonth(11); setCurrentYear(currentYear - 1); } else { setCurrentMonth(currentMonth - 1); } };
  const nextMonth = () => { if (currentMonth === 11) { setCurrentMonth(0); setCurrentYear(currentYear + 1); } else { setCurrentMonth(currentMonth + 1); } };
  const goToToday = () => { setCurrentMonth(today.getMonth()); setCurrentYear(today.getFullYear()); setSelectedDate(today); };

  useEffect(() => {
    import("./map-leaflet").then((mod) => setMapComponent(() => mod.MapLeaflet));
  }, []);

  return (
    <div className="space-y-4">
      {/* Row 1: compact calendar + map side by side */}
      <div className="grid lg:grid-cols-2 gap-4">
        {/* Compact calendar */}
        <div className="rounded-lg border border-border p-3">
          <div className="flex items-center justify-between mb-2">
            <button onClick={prevMonth} className="p-1 rounded hover:bg-accent transition-colors"><ChevronLeft size={14} /></button>
            <div className="flex items-center gap-2">
              <h2 className="text-[13px] font-semibold text-foreground">{MONTHS_PL_SHORT[currentMonth]} {currentYear}</h2>
              <button onClick={goToToday} className="px-2 py-0.5 rounded text-[11px] font-medium bg-accent text-foreground hover:bg-accent/80 transition-colors">
                Dziś
              </button>
            </div>
            <button onClick={nextMonth} className="p-1 rounded hover:bg-accent transition-colors"><ChevronRight size={14} /></button>
          </div>
          <div className="grid grid-cols-7 mb-0.5">
            {DAYS_PL.map((day) => (<div key={day} className="text-center text-[10px] font-medium text-muted-foreground py-1">{day}</div>))}
          </div>
          <div className="grid grid-cols-7 gap-px">
            {Array.from({ length: firstDay }).map((_, i) => (<div key={`empty-${i}`} className="aspect-square" />))}
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const day = i + 1;
              const date = new Date(currentYear, currentMonth, day);
              const selected = isSameDay(date, selectedDate);
              const todayFlag = isToday(date);
              const count = eventCounts[day] || 0;
              const isPast = date < new Date(today.getFullYear(), today.getMonth(), today.getDate());
              return (
                <button key={day} onClick={() => setSelectedDate(date)}
                  className={cn("aspect-square rounded flex flex-col items-center justify-center transition-all text-[12px]",
                    selected ? "bg-foreground text-white font-medium" : todayFlag ? "bg-accent text-foreground font-medium" : isPast ? "text-muted-foreground/40" : "text-foreground hover:bg-accent",
                    count > 0 && !selected && "font-medium")}>
                  <span>{day}</span>
                  {count > 0 && (<div className="flex gap-px mt-px">{Array.from({ length: Math.min(count, 3) }).map((_, di) => (<div key={di} className={cn("w-[3px] h-[3px] rounded-full", selected ? "bg-white/60" : "bg-foreground/40")} />))}</div>)}
                </button>
              );
            })}
          </div>
        </div>

        {/* Map */}
        <div className="rounded-lg border border-border overflow-hidden min-h-[280px]">
          {MapComponent ? (
            <MapComponent groups={groups} />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-accent/30">
              <p className="text-[13px] text-muted-foreground">Ładowanie mapy…</p>
            </div>
          )}
        </div>
      </div>

      {/* Row 2: selected date events */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <div>
            <h3 className="text-[14px] font-semibold text-foreground">
              {selectedDate.toLocaleDateString("pl-PL", { weekday: "long", day: "numeric", month: "long" })}
            </h3>
            <p className="text-[12px] text-muted-foreground">
              {selectedEvents.length === 0 ? "Brak wydarzeń" : `${selectedEvents.length} wydarzeń`}
            </p>
          </div>
        </div>
        {selectedEvents.length === 0 ? (
          <EmptyState title="Brak wydarzeń" description="Wybierz inną datę w kalendarzu." icon={<CalendarIcon size={20} />} />
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-2">
            {selectedEvents.map((event) => (
              <Link
                key={event.id}
                href={`/wydarzenia/${event.slug}`}
                className="block rounded-lg border border-border p-3 hover:border-[#CCC] transition-all group"
              >
                <h4 className="font-medium text-[13px] text-foreground group-hover:text-muted transition-colors line-clamp-2 mb-1.5">
                  {event.title}
                </h4>
                <div className="flex items-center gap-3 text-[11px] text-muted">
                  {event.time_start && (
                    <span className="flex items-center gap-1">
                      <Clock size={10} />
                      {event.time_start}{event.time_end && ` – ${event.time_end}`}
                    </span>
                  )}
                  {event.venue_name && (
                    <span className="flex items-center gap-1 truncate">
                      <MapPin size={10} className="shrink-0" />
                      <span className="truncate">{event.venue_name}</span>
                    </span>
                  )}
                </div>
                <div className="flex items-center justify-between mt-1.5">
                  <span className="text-[11px] text-muted">{formatAgeRange(event.age_min, event.age_max)}</span>
                  <span className="text-[12px] font-medium text-foreground">{formatPrice(event.price)}</span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
