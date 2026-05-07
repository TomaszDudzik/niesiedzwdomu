import { X } from "lucide-react";

export interface FilterBadge {
  id: string;
  label: string;
  onRemove: () => void;
}

interface FilterBadgeBarProps {
  badges: FilterBadge[];
  onClearAll: () => void;
}

export function FilterBadgeBar({ badges, onClearAll }: FilterBadgeBarProps) {
  if (badges.length === 0) return null;
  return (
    <div className="rounded-xl border border-border bg-card px-2.5 py-2">
      <div className="flex flex-wrap items-center gap-1.5">
        <p className="shrink-0 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Filtry:</p>
        {badges.map((badge) => (
          <span
            key={badge.id}
            className="inline-flex max-w-full items-center gap-1 rounded-full bg-primary px-2 py-0.5 text-[10px] font-medium text-primary-foreground"
          >
            <span className="min-w-0 whitespace-normal break-words">{badge.label}</span>
            <button
              type="button"
              onClick={badge.onRemove}
              className="inline-flex h-3.5 w-3.5 items-center justify-center rounded-full text-muted-foreground hover:bg-border/70 hover:text-foreground transition-colors"
              aria-label={`Usuń filtr ${badge.label}`}
              title={`Usuń: ${badge.label}`}
            >
              <X size={9} />
            </button>
          </span>
        ))}
        <button
          type="button"
          onClick={onClearAll}
          className="inline-flex max-w-full items-center gap-1 rounded-full border border-border bg-background px-2 py-0.5 text-[10px] font-semibold text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
        >
          <X size={9} />
          Wyczyść
        </button>
      </div>
    </div>
  );
}
