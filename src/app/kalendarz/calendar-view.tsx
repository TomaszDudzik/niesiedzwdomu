"use client";

import { useState, useMemo } from "react";
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Clock, MapPin } from "lucide-react";
import Link from "next/link";
import { cn, formatPrice, formatAgeRange } from "@/lib/utils";
import { getEventsForDate } from "@/lib/filter-events";
import { EmptyState } from "@/components/ui/empty-state";
import type { Event } from "@/types/database";

const DAYS_PL = ["Pn", "Wt", "Śr", "Cz", "Pt", "So", "Nd"];
const MONTHS_PL = ["Styczeń", "Luty", "Marzec", "Kwiecień", "Maj", "Czerwiec", "Lipiec", "Sierpień", "Wrzesień", "Październik", "Listopad", "Grudzień"];

function getDaysInMonth(year: number, month: number) { return new Date(year, month + 1, 0).getDate(); }
function getFirstDayOfMonth(year: number, month: number) { const d = new Date(year, month, 1).getDay(); return d === 0 ? 6 : d - 1; }
function isSameDay(a: Date, b: Date) { return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate(); }
function isToday(date: Date) { return isSameDay(date, new Date()); }

interface CalendarViewProps {
  events: Event[];
}

export function CalendarView({ events }: CalendarViewProps) {
  const today = new Date();
  const [currentMonth, setCurrentMonth] = useState(today.getMonth());
  const [currentYear, setCurrentYear] = useState(today.getFullYear());
  const [selectedDate, setSelectedDate] = useState<Date>(today);

  const daysInMonth = getDaysInMonth(currentYear, currentMonth);
  const firstDay = getFirstDayOfMonth(currentYear, currentMonth);
  const selectedEvents = useMemo(() => getEventsForDate(events, selectedDate), [events, selectedDate]);

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

  return (
    <>
      <button onClick={goToToday} className="px-3 py-1.5 rounded-md text-[13px] font-medium bg-foreground text-white hover:bg-[#333] transition-colors mb-6">Dziś</button>

      <div className="grid lg:grid-cols-5 gap-8">
        <div className="lg:col-span-3">
          <div className="rounded-lg border border-border p-5">
            <div className="flex items-center justify-between mb-5">
              <button onClick={prevMonth} className="p-1.5 rounded-md hover:bg-accent transition-colors"><ChevronLeft size={16} /></button>
              <h2 className="text-[14px] font-semibold text-foreground">{MONTHS_PL[currentMonth]} {currentYear}</h2>
              <button onClick={nextMonth} className="p-1.5 rounded-md hover:bg-accent transition-colors"><ChevronRight size={16} /></button>
            </div>
            <div className="grid grid-cols-7 mb-1">
              {DAYS_PL.map((day) => (<div key={day} className="text-center text-[11px] font-medium text-muted-foreground py-1.5">{day}</div>))}
            </div>
            <div className="grid grid-cols-7 gap-0.5">
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
                    className={cn("aspect-square rounded-md flex flex-col items-center justify-center relative transition-all text-[13px]",
                      selected ? "bg-foreground text-white font-medium" : todayFlag ? "bg-accent text-foreground font-medium" : isPast ? "text-muted-foreground/40" : "text-foreground hover:bg-accent",
                      count > 0 && !selected && "font-medium")}>
                    <span>{day}</span>
                    {count > 0 && (<div className="flex gap-px mt-0.5">{Array.from({ length: Math.min(count, 3) }).map((_, di) => (<div key={di} className={cn("w-0.5 h-0.5 rounded-full", selected ? "bg-white/60" : "bg-foreground/40")} />))}</div>)}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <div className="lg:col-span-2">
          <div className="sticky top-20">
            <h3 className="text-[14px] font-semibold text-foreground mb-0.5">
              {selectedDate.toLocaleDateString("pl-PL", { weekday: "long", day: "numeric", month: "long" })}
            </h3>
            <p className="text-[12px] text-muted-foreground mb-4">
              {selectedEvents.length === 0 ? "Brak wydarzeń" : `${selectedEvents.length} wydarzeń`}
            </p>
            {selectedEvents.length === 0 ? (
              <EmptyState title="Brak wydarzeń" description="Wybierz inną datę." icon={<CalendarIcon size={20} />} />
            ) : (
              <div className="space-y-2">
                {selectedEvents.map((event) => (
                  <Link key={event.id} href={`/wydarzenia/${event.slug}`}
                    className="block rounded-lg border border-border p-3 hover:border-[#CCC] transition-all group">
                    <h4 className="font-medium text-[13px] text-foreground group-hover:text-muted transition-colors line-clamp-2 mb-1.5">{event.title}</h4>
                    <div className="flex items-center gap-3 text-[11px] text-muted">
                      {event.time_start && (<span className="flex items-center gap-1"><Clock size={10} />{event.time_start}{event.time_end && ` – ${event.time_end}`}</span>)}
                      {event.venue_name && (<span className="flex items-center gap-1"><MapPin size={10} />{event.venue_name}</span>)}
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
      </div>
    </>
  );
}
