"use client";

import { useState, useMemo } from "react";
import { Search, LayoutGrid, CalendarDays } from "lucide-react";
import { CATEGORY_LABELS } from "@/lib/mock-data";
import { ContentCard } from "@/components/ui/content-card";
import { CalendarMapView } from "./calendar-map-view";
import { cn } from "@/lib/utils";
import type { Event, EventCategory } from "@/types/database";

const categories = Object.entries(CATEGORY_LABELS) as [EventCategory, string][];

type ViewMode = "list" | "calendar-map";

interface EventsListViewProps {
  events: Event[];
}

export function EventsListView({ events }: EventsListViewProps) {
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState<EventCategory | null>(null);
  const [view, setView] = useState<ViewMode>("list");

  const filtered = useMemo(() => {
    let result = events;
    if (search) {
      const q = search.toLowerCase();
      result = result.filter((e) =>
        [e.title, e.description_short, e.venue_name, e.district].join(" ").toLowerCase().includes(q)
      );
    }
    if (activeCategory) {
      result = result.filter((e) => e.category === activeCategory);
    }
    return result;
  }, [events, search, activeCategory]);

  return (
    <div className="container-page pt-5 pb-10">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-6">
        <div>
          <h1 className="text-lg md:text-xl font-bold text-foreground tracking-[-0.02em] leading-tight">Wydarzenia</h1>
          <p className="text-[12px] text-muted mt-0.5">Wydarzenia, zajęcia, kolonie i miejsca dla rodzin</p>
        </div>
        <div className="flex items-center gap-1 rounded-lg border border-border p-0.5 bg-accent/50">
          <button
            onClick={() => setView("list")}
            className={cn(
              "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-medium transition-all duration-200",
              view === "list"
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground hover:bg-card/60"
            )}
          >
            <LayoutGrid size={13} />
            Lista
          </button>
          <button
            onClick={() => setView("calendar-map")}
            className={cn(
              "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-medium transition-all duration-200",
              view === "calendar-map"
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground hover:bg-card/60"
            )}
          >
            <CalendarDays size={13} />
            Kalendarz
          </button>
        </div>
      </div>

      <div className="relative mb-4">
        <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground/50" />
        <input
          type="text"
          placeholder="Szukaj..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-8 pr-3 py-1.5 rounded-lg border border-border bg-card text-[12px] text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/40 transition-all duration-200"
        />
      </div>

      <div className="flex flex-wrap gap-1.5 mb-6">
        <button
          onClick={() => setActiveCategory(null)}
          className={cn(
            "px-2.5 py-1 rounded-lg text-[11px] font-medium border transition-all duration-200",
            !activeCategory
              ? "bg-primary text-primary-foreground border-primary"
              : "bg-card text-muted border-border hover:border-primary/30 hover:text-foreground"
          )}
        >
          Wszystkie
        </button>
        {categories.map(([key, label]) => {
          const count = events.filter((e) => e.category === key).length;
          if (count === 0) return null;
          return (
            <button
              key={key}
              onClick={() => setActiveCategory(activeCategory === key ? null : key)}
              className={cn(
                "px-2.5 py-1 rounded-lg text-[11px] font-medium border transition-all duration-200",
                activeCategory === key
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-card text-muted border-border hover:border-primary/30 hover:text-foreground"
              )}
            >
              {label}
              <span className="ml-1 text-[11px] opacity-70">({count})</span>
            </button>
          );
        })}
      </div>

      {view === "calendar-map" ? (
        <CalendarMapView events={filtered} />
      ) : filtered.length === 0 ? (
        <div className="text-center py-16">
          <Search size={32} className="mx-auto text-muted-foreground/20 mb-3" />
          <p className="text-[14px] text-muted">Brak wydarzeń pasujących do filtrów.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {filtered.map((event) => (
            <ContentCard key={event.id} item={event} />
          ))}
        </div>
      )}
    </div>
  );
}
