import { LayoutGrid, MapIcon } from "lucide-react";
import { cn } from "@/lib/utils";

type ViewMode = "list" | "map";

interface ViewModeToggleProps {
  view: ViewMode;
  onSetView: (v: ViewMode) => void;
}

export function ViewModeToggle({ view, onSetView }: ViewModeToggleProps) {
  return (
    <div className="flex items-center gap-1 rounded-lg border border-border p-0.5 bg-accent/50">
      <button
        onClick={() => onSetView("list")}
        className={cn(
          "flex-1 inline-flex items-center justify-center gap-1 px-2 py-1 rounded-md text-[10px] font-medium transition-all duration-200",
          view === "list" ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
        )}
      >
        <LayoutGrid size={11} /> Lista
      </button>
      <button
        onClick={() => onSetView("map")}
        className={cn(
          "flex-1 inline-flex items-center justify-center gap-1 px-2 py-1 rounded-md text-[10px] font-medium transition-all duration-200",
          view === "map" ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
        )}
      >
        <MapIcon size={11} /> Mapa
      </button>
    </div>
  );
}
