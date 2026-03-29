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
      <div className="flex items-center justify-between mb-1">
        <h1 className="text-2xl font-bold text-foreground tracking-[-0.02em]">Wydarzenia</h1>
        <div className="flex items-center gap-1 rounded-xl border border-border p-1 bg-accent/50">
          <button
            onClick={() => setView("list")}
            className={cn(
              "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[13px] font-medium transition-all duration-200",
              view === "list"
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground hover:bg-card/60"
            )}
          >
            <LayoutGrid size={15} />
            Lista
          </button>
          <button
            onClick={() => setView("calendar-map")}
            className={cn(
              "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[13px] font-medium transition-all duration-200",
              view === "calendar-map"
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground hover:bg-card/60"
            )}
          >
            <CalendarDays size={15} />
            Kalendarz
          </button>
        </div>
      </div>
      <p className="text-[14px] text-muted mb-6">Warsztaty, spektakle, festyny i więcej</p>

      <div className="relative mb-5">
        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground/50" />
        <input
          type="text"
          placeholder="Szukaj..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-9 pr-3 py-2 rounded-xl border border-border bg-card text-[13px] text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/40 transition-all duration-200"
        />
      </div>

      <div className="flex flex-wrap gap-1.5 mb-8">
        <button
          onClick={() => setActiveCategory(null)}
          className={cn(
            "px-3 py-1.5 rounded-lg text-[13px] font-medium border transition-all duration-200",
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
                "px-3 py-1.5 rounded-lg text-[13px] font-medium border transition-all duration-200",
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
