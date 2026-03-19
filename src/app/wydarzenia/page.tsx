"use client";

import { useState, useMemo } from "react";
import { Search } from "lucide-react";
import { mockEvents, CATEGORY_LABELS } from "@/lib/mock-data";
import { filterEvents } from "@/lib/filter-events";
import { ContentFilters } from "@/components/ui/event-filters";
import { ContentList } from "@/components/ui/content-list";
import type { EventFilters, EventCategory } from "@/types/database";

const categoryOptions = (Object.entries(CATEGORY_LABELS) as [EventCategory, string][]).map(([key, label]) => ({ value: key, label }));

export default function EventsPage() {
  const [filters, setFilters] = useState<EventFilters>({});
  const [search, setSearch] = useState("");
  const filtered = useMemo(() => filterEvents(mockEvents, { ...filters, search: search || undefined }), [filters, search]);

  return (
    <div className="container-page py-10">
      <h1 className="text-2xl font-bold text-foreground tracking-[-0.02em] mb-1">Wydarzenia</h1>
      <p className="text-[14px] text-muted mb-6">Warsztaty, spektakle, festyny i więcej</p>
      <div className="relative mb-5">
        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground/50" />
        <input type="text" placeholder="Szukaj..." value={search} onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-9 pr-3 py-2 rounded-md border border-border bg-white text-[13px] text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-foreground/20 transition-shadow" />
      </div>
      <div className="mb-6">
        <ContentFilters filters={filters} onChange={setFilters} specificFilters={[{ label: "Kategoria", key: "category", options: categoryOptions, type: "pills" }]} />
      </div>
      <p className="text-[12px] text-muted-foreground mb-4">{filtered.length} wyników</p>
      <ContentList items={filtered} />
    </div>
  );
}
