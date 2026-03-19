"use client";

import { useState } from "react";
import { SlidersHorizontal, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { DISTRICT_LIST, AGE_GROUPS } from "@/lib/mock-data";
import type { SharedFilters } from "@/types/database";

interface FilterConfig {
  label: string;
  key: string;
  options: { value: string; label: string }[];
  type: "pills" | "select";
}

interface ContentFiltersProps<T extends SharedFilters> {
  filters: T;
  onChange: (filters: T) => void;
  specificFilters?: FilterConfig[];
  showDateRange?: boolean;
  dateRangeOptions?: { value: string; label: string }[];
}

const DEFAULT_DATE_RANGE = [
  { value: "today", label: "Dziś" },
  { value: "weekend", label: "Weekend" },
  { value: "week", label: "7 dni" },
];

export function ContentFilters<T extends SharedFilters>({
  filters,
  onChange,
  specificFilters = [],
  showDateRange = true,
  dateRangeOptions = DEFAULT_DATE_RANGE,
}: ContentFiltersProps<T>) {
  const [expanded, setExpanded] = useState(false);

  const activeCount = Object.values(filters).filter(
    (v) => v !== undefined && v !== "" && v !== false
  ).length;

  const update = (key: string, value: string | boolean | undefined) => {
    const next = { ...filters, [key]: value } as T;
    if (value === undefined || value === "" || value === false) {
      delete (next as Record<string, unknown>)[key];
    }
    onChange(next);
  };

  const clear = () => onChange({} as T);

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-1.5 flex-wrap">
        <button
          onClick={() => setExpanded(!expanded)}
          className={cn(
            "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[13px] font-medium border transition-colors",
            expanded
              ? "bg-foreground text-white border-foreground"
              : "bg-white text-muted border-border hover:border-[#CCC] hover:text-foreground"
          )}
        >
          <SlidersHorizontal size={13} />
          Filtry
          {activeCount > 0 && (
            <span className="bg-foreground text-white text-[10px] w-4 h-4 rounded-full flex items-center justify-center ml-0.5">
              {activeCount}
            </span>
          )}
        </button>

        {showDateRange && dateRangeOptions.map((opt) => (
          <button
            key={opt.value}
            onClick={() => update("dateRange", (filters as Record<string, unknown>).dateRange === opt.value ? undefined : opt.value)}
            className={cn(
              "px-3 py-1.5 rounded-md text-[13px] font-medium border transition-colors",
              (filters as Record<string, unknown>).dateRange === opt.value
                ? "bg-foreground text-white border-foreground"
                : "bg-white text-muted border-border hover:border-[#CCC] hover:text-foreground"
            )}
          >
            {opt.label}
          </button>
        ))}

        <button
          onClick={() => update("isFree", filters.isFree ? undefined : true)}
          className={cn(
            "px-3 py-1.5 rounded-md text-[13px] font-medium border transition-colors",
            filters.isFree
              ? "bg-foreground text-white border-foreground"
              : "bg-white text-muted border-border hover:border-[#CCC] hover:text-foreground"
          )}
        >
          Bezpłatne
        </button>

        {activeCount > 0 && (
          <button onClick={clear} className="flex items-center gap-1 px-2 py-1.5 text-[12px] text-muted hover:text-foreground transition-colors">
            <X size={12} /> Wyczyść
          </button>
        )}
      </div>

      {expanded && (
        <div className="rounded-lg border border-border p-4 grid grid-cols-1 sm:grid-cols-3 gap-4">
          {specificFilters.map((config) => (
            <div key={config.key}>
              <label className="block text-[11px] font-medium text-muted-foreground mb-1.5 uppercase tracking-wider">
                {config.label}
              </label>
              {config.type === "pills" ? (
                <div className="flex flex-wrap gap-1">
                  {config.options.map((opt) => (
                    <button
                      key={opt.value}
                      onClick={() => update(config.key, (filters as Record<string, unknown>)[config.key] === opt.value ? undefined : opt.value)}
                      className={cn(
                        "px-2 py-1 rounded text-[12px] font-medium transition-colors",
                        (filters as Record<string, unknown>)[config.key] === opt.value
                          ? "bg-foreground text-white"
                          : "bg-[#F5F5F5] text-muted hover:text-foreground"
                      )}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              ) : (
                <select
                  value={((filters as Record<string, unknown>)[config.key] as string) || ""}
                  onChange={(e) => update(config.key, e.target.value || undefined)}
                  className="w-full px-2.5 py-1.5 rounded-md border border-border text-[13px] bg-white text-foreground focus:outline-none focus:ring-1 focus:ring-foreground/20"
                >
                  <option value="">Wszystkie</option>
                  {config.options.map((opt) => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              )}
            </div>
          ))}

          <div>
            <label className="block text-[11px] font-medium text-muted-foreground mb-1.5 uppercase tracking-wider">Dzielnica</label>
            <select
              value={filters.district || ""}
              onChange={(e) => update("district", e.target.value || undefined)}
              className="w-full px-2.5 py-1.5 rounded-md border border-border text-[13px] bg-white text-foreground focus:outline-none focus:ring-1 focus:ring-foreground/20"
            >
              <option value="">Wszystkie</option>
              {DISTRICT_LIST.map((d) => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-medium text-muted-foreground mb-1.5 uppercase tracking-wider">Wiek</label>
            <div className="flex flex-wrap gap-1">
              {AGE_GROUPS.map((group) => (
                <button
                  key={group.value}
                  onClick={() => update("ageGroup", filters.ageGroup === group.value ? undefined : group.value)}
                  className={cn(
                    "px-2 py-1 rounded text-[12px] font-medium transition-colors",
                    filters.ageGroup === group.value
                      ? "bg-foreground text-white"
                      : "bg-[#F5F5F5] text-muted hover:text-foreground"
                  )}
                >
                  {group.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
