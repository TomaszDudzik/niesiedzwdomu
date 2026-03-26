"use client";

import { useState, useMemo } from "react";
import { Search, LayoutGrid, CalendarDays } from "lucide-react";
import { CATEGORY_LABELS } from "@/lib/mock-data";
import { filterEvents } from "@/lib/filter-events";
import { ContentFilters } from "@/components/ui/event-filters";
import { ContentList } from "@/components/ui/content-list";
import { CalendarMapView } from "./calendar-map-view";
import { cn } from "@/lib/utils";
import type { Event, EventFilters, EventCategory } from "@/types/database";

const categoryOptions = (Object.entries(CATEGORY_LABELS) as [EventCategory, string][]).map(
  ([key, label]) => ({ value: key, label })
);

type ViewMode = "list" | "calendar-map";

interface EventsListViewProps {
  events: Event[];
}

export function EventsListView({ events }: EventsListViewProps) {
  const [filters, setFilters] = useState<EventFilters>({});
  const [search, setSearch] = useState("");
  const [view, setView] = useState<ViewMode>("list");

  const filtered = useMemo(
    () => filterEvents(events, { ...filters, search: search || undefined }),
    [events, filters, search]
  );

  return (
    <div className="container-page py-10">
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
      <div className="mb-6">
        <ContentFilters
          filters={filters}
          onChange={setFilters}
          specificFilters={[
            { label: "Kategoria", key: "category", options: categoryOptions, type: "pills" },
          ]}
        />
      </div>

      <div className="flex items-center justify-between mb-4">
        <p className="text-[12px] text-muted-foreground">{filtered.length} wyników</p>
        {filtered.length === 0 && (filters.isFree || filters.category || filters.district || search) && (
          <button
            onClick={() => { setFilters({}); setSearch(""); }}
            className="text-[12px] text-muted hover:text-primary transition-colors duration-200"
          >
            Wyczyść filtry
          </button>
        )}
      </div>

      {view === "calendar-map" ? (
        <CalendarMapView events={filtered} />
      ) : filtered.length === 0 ? (
        <div className="text-center py-16">
          <Search size={32} className="mx-auto text-muted-foreground/20 mb-3" />
          <p className="text-[14px] text-muted">Brak wydarzeń pasujących do filtrów.</p>
          <p className="text-[13px] text-muted-foreground mt-1">Spróbuj zmienić kryteria wyszukiwania.</p>
        </div>
      ) : (
        <ContentList items={filtered} />
      )}
    </div>
  );
}
