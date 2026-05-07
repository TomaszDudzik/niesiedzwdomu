import { Search, X } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface ListPageSidebarProps {
  search: string;
  onSearchChange: (v: string) => void;
  searchPlaceholder?: string;
  showSearch?: boolean;
  hasActiveFilters: boolean;
  onClearFilters: () => void;
  /** Slot rendered between the search input and the divider — use for ViewModeToggle or custom controls */
  topSlot?: ReactNode;
  children: ReactNode;
  className?: string;
}

export function ListPageSidebar({
  search,
  onSearchChange,
  searchPlaceholder = "Szukaj...",
  showSearch = true,
  hasActiveFilters,
  onClearFilters,
  topSlot,
  children,
  className,
}: ListPageSidebarProps) {
  return (
    <aside className={cn("hidden lg:block w-[240px] xl:w-[260px] shrink-0 rounded-2xl overflow-hidden -mt-3", className)}>
      <div className="p-2.5 space-y-2.5">
        {showSearch && (
          <div className="space-y-1">
            <p className="text-[11px] font-semibold text-foreground uppercase tracking-wider">Szukaj</p>
            <div className="relative">
              <Search size={11} className="absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                value={search}
                onChange={(e) => onSearchChange(e.target.value)}
                placeholder={searchPlaceholder}
                className="w-full rounded-lg border border-border bg-background py-1 pl-6 pr-2 text-[10px] text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>
          </div>
        )}

        {topSlot}

        <div className="border-t border-border" />

        {children}

        {hasActiveFilters && (
          <button
            onClick={onClearFilters}
            className="inline-flex items-center gap-1 text-[10px] font-medium text-muted-foreground hover:text-foreground transition-colors pt-2 border-t border-border w-full"
          >
            <X size={10} /> Wyczyść filtry
          </button>
        )}
      </div>
    </aside>
  );
}
