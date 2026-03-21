"use client";

import { useState, useMemo } from "react";
import { Search } from "lucide-react";
import { CATEGORY_LABELS } from "@/lib/mock-data";
import { filterEvents } from "@/lib/filter-events";
import { ContentFilters } from "@/components/ui/event-filters";
import { ContentList } from "@/components/ui/content-list";
import type { Event, EventFilters, EventCategory } from "@/types/database";

const categoryOptions = (Object.entries(CATEGORY_LABELS) as [EventCategory, string][]).map(
  ([key, label]) => ({ value: key, label })
);

interface EventsListViewProps {
  events: Event[];
}

export function EventsListView({ events }: EventsListViewProps) {
  const [filters, setFilters] = useState<EventFilters>({});
  const [search, setSearch] = useState("");

  const filtered = useMemo(
    () => filterEvents(events, { ...filters, search: search || undefined }),
    [events, filters, search]
  );

  return (
    <div className="container-page py-10">
      <h1 className="text-2xl font-bold text-foreground tracking-[-0.02em] mb-1">Wydarzenia</h1>
      <p className="text-[14px] text-muted mb-6">Warsztaty, spektakle, festyny i więcej</p>
      <div className="relative mb-5">
        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground/50" />
        <input
          type="text"
          placeholder="Szukaj..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-9 pr-3 py-2 rounded-md border border-border bg-white text-[13px] text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-foreground/20 transition-shadow"
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
            className="text-[12px] text-muted hover:text-foreground transition-colors"
          >
            Wyczyść filtry
          </button>
        )}
      </div>
      {filtered.length === 0 ? (
        <div className="text-center py-16">
          <Search size={32} className="mx-auto text-muted-foreground/30 mb-3" />
          <p className="text-[14px] text-muted">Brak wydarzeń pasujących do filtrów.</p>
          <p className="text-[13px] text-muted-foreground mt-1">Spróbuj zmienić kryteria wyszukiwania.</p>
        </div>
      ) : (
        <ContentList items={filtered} />
      )}
    </div>
  );
}
