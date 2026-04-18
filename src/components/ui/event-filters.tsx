"use client";

import { useState } from "react";
import { SlidersHorizontal, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { DISTRICT_LIST } from "@/lib/mock-data";
import type { District } from "@/types/database";
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
  const selectedDistricts = filters.district || [];

  const activeCount = Object.values(filters).filter(
    (v) => v !== undefined && v !== "" && v !== false && (!Array.isArray(v) || v.length > 0)
  ).length;

  const update = (key: string, value: string | string[] | boolean | undefined) => {
    const next = { ...filters, [key]: value } as T;
    if (value === undefined || value === "" || value === false || (Array.isArray(value) && value.length === 0)) {
      delete (next as Record<string, unknown>)[key];
    }
    onChange(next);
  };

  const clear = () => onChange({} as T);

  const toggleDistrict = (district: District) => {
    const nextDistricts = selectedDistricts.includes(district)
      ? selectedDistricts.filter((item) => item !== district)
      : [...selectedDistricts, district];

    update("district", nextDistricts.length > 0 ? nextDistricts : undefined);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-1.5 flex-wrap">
        <button
          onClick={() => setExpanded(!expanded)}
          className={cn(
            "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[13px] font-medium border transition-all duration-200",
            expanded
              ? "bg-primary text-primary-foreground border-primary"
              : "bg-card text-muted border-border hover:border-primary/30 hover:text-foreground"
          )}
        >
          <SlidersHorizontal size={13} />
          Filtry
          {activeCount > 0 && (
            <span className="bg-primary-foreground text-primary text-[10px] w-4 h-4 rounded-full flex items-center justify-center ml-0.5">
              {activeCount}
            </span>
          )}
        </button>

        {showDateRange && dateRangeOptions.map((opt) => (
          <button
            key={opt.value}
            onClick={() => update("dateRange", (filters as Record<string, unknown>).dateRange === opt.value ? undefined : opt.value)}
            className={cn(
              "px-3 py-1.5 rounded-lg text-[13px] font-medium border transition-all duration-200",
              (filters as Record<string, unknown>).dateRange === opt.value
                ? "bg-primary text-primary-foreground border-primary"
                : "bg-card text-muted border-border hover:border-primary/30 hover:text-foreground"
            )}
          >
            {opt.label}
          </button>
        ))}

        {activeCount > 0 && (
          <button onClick={clear} className="flex items-center gap-1 px-2 py-1.5 text-[12px] text-muted hover:text-primary transition-colors duration-200">
            <X size={12} /> Wyczyść
          </button>
        )}
      </div>

      {expanded && (
        <div className="rounded-xl border border-border bg-card p-4 grid grid-cols-1 sm:grid-cols-3 gap-4 shadow-[var(--shadow-soft)]">
          {specificFilters.map((config) => (
            <div key={config.key}>
              <label className="block text-[11px] font-medium text-muted-foreground mb-1.5 uppercase tracking-wider">{config.label}</label>
              {config.type === "pills" ? (
                <div className="flex flex-wrap gap-1">
                  {config.options.map((opt) => (
                    <button
                      key={opt.value}
                      onClick={() => update(config.key, (filters as Record<string, unknown>)[config.key] === opt.value ? undefined : opt.value)}
                      className={cn(
                        "px-2.5 py-1 rounded-lg text-[12px] font-medium transition-all duration-200",
                        (filters as Record<string, unknown>)[config.key] === opt.value
                          ? "bg-primary text-primary-foreground"
                          : "bg-accent text-muted hover:text-foreground"
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
                  className="w-full px-2.5 py-1.5 rounded-lg border border-border text-[13px] bg-card text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/40 transition-all duration-200"
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
            <div className="flex flex-wrap gap-1">
              {DISTRICT_LIST.map((d) => (
                <button
                  type="button"
                  key={d}
                  onClick={() => toggleDistrict(d)}
                  className={cn(
                    "px-2.5 py-1 rounded-lg text-[12px] font-medium transition-all duration-200",
                    selectedDistricts.includes(d)
                      ? "bg-primary text-primary-foreground"
                      : "bg-accent text-muted hover:text-foreground"
                  )}
                >
                  {d}
                </button>
              ))}
            </div>
          </div>

        </div>
      )}
    </div>
  );
}
