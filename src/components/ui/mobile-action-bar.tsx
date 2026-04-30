"use client";

import { SlidersHorizontal, LayoutGrid, MapIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface MobileActionBarProps {
  filtersOpen: boolean;
  hasActiveFilters: boolean;
  onToggleFilters: () => void;
  addHref: string;
  addLabel: string;
  /** When provided, shows the Lista/Mapa segmented toggle */
  view?: "list" | "map";
  onSetView?: (view: "list" | "map") => void;
}

export function MobileActionBar({
  filtersOpen,
  hasActiveFilters,
  onToggleFilters,
  addHref,
  addLabel,
  view,
  onSetView,
}: MobileActionBarProps) {
  const hasViewToggle = view !== undefined && onSetView !== undefined;

  return (
    <div className="lg:hidden w-full -mt-4 mb-8">
      <div className="w-full flex items-stretch gap-2">
        <button
          onClick={onToggleFilters}
          className={cn(
            "flex-1 h-10 inline-flex items-center justify-center gap-1.5 rounded-xl border px-4 text-[12px] font-semibold transition-all duration-200",
            filtersOpen || hasActiveFilters
              ? "border-primary bg-primary text-primary-foreground"
              : "border-border bg-background text-muted-foreground hover:text-foreground"
          )}
        >
          <SlidersHorizontal size={12} />
          Filtry
          {hasActiveFilters && <span className="w-1.5 h-1.5 rounded-full bg-primary-foreground" />}
        </button>

        <a
          href={addHref}
          className="flex-1 h-10 inline-flex items-center justify-center rounded-xl border border-[#e60100] bg-[#e60100] px-4 text-[12px] font-bold text-white whitespace-nowrap transition-colors hover:bg-[#c40000] hover:border-[#c40000]"
        >
          {addLabel}
        </a>
      </div>

      {hasViewToggle && (
          <div className="mt-2 h-9 w-full inline-flex items-center gap-1 rounded-lg border border-border bg-accent/50 p-0.5">
            <button
              onClick={() => onSetView!("list")}
              className={cn(
                "flex-1 h-full inline-flex items-center justify-center gap-1 rounded-md text-[10px] font-semibold transition-all duration-200",
                view === "list"
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <LayoutGrid size={10} />
              Lista
            </button>
            <button
              onClick={() => onSetView!("map")}
              className={cn(
                "flex-1 h-full inline-flex items-center justify-center gap-1 rounded-md text-[10px] font-semibold transition-all duration-200",
                view === "map"
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <MapIcon size={10} />
              Mapa
            </button>
          </div>
      )}
    </div>
  );
}
