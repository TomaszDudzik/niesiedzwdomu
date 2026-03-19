"use client";

import { useState, useMemo } from "react";
import { Search } from "lucide-react";
import { mockCamps, CAMP_TYPE_LABELS, CAMP_SEASON_LABELS } from "@/lib/mock-data";
import { filterCamps } from "@/lib/filter-events";
import { ContentFilters } from "@/components/ui/event-filters";
import { ContentList } from "@/components/ui/content-list";
import type { CampFilters, CampType, CampSeason } from "@/types/database";

const campTypeOptions = (Object.entries(CAMP_TYPE_LABELS) as [CampType, string][]).map(([key, label]) => ({ value: key, label }));
const seasonOptions = (Object.entries(CAMP_SEASON_LABELS) as [CampSeason, string][]).map(([key, label]) => ({ value: key, label }));

export default function CampsPage() {
  const [filters, setFilters] = useState<CampFilters>({});
  const [search, setSearch] = useState("");
  const filtered = useMemo(() => filterCamps(mockCamps, { ...filters, search: search || undefined }), [filters, search]);

  return (
    <div className="container-page py-10">
      <h1 className="text-2xl font-bold text-foreground tracking-[-0.02em] mb-1">Kolonie i półkolonie</h1>
      <p className="text-[14px] text-muted mb-6">Obozy, półkolonie i warsztaty wakacyjne</p>
      <div className="relative mb-5">
        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground/50" />
        <input type="text" placeholder="Szukaj..." value={search} onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-9 pr-3 py-2 rounded-md border border-border bg-white text-[13px] text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-foreground/20 transition-shadow" />
      </div>
      <div className="mb-6">
        <ContentFilters filters={filters} onChange={setFilters} showDateRange={false}
          specificFilters={[
            { label: "Typ", key: "campType", options: campTypeOptions, type: "pills" },
            { label: "Sezon", key: "season", options: seasonOptions, type: "pills" },
          ]} />
      </div>
      <p className="text-[12px] text-muted-foreground mb-4">{filtered.length} wyników</p>
      <ContentList items={filtered} />
    </div>
  );
}
