import { Search } from "lucide-react";

interface TopSearchBarProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

export function TopSearchBar({ value, onChange, placeholder = "Szukaj..." }: TopSearchBarProps) {
  return (
    <div className="rounded-xl border border-border bg-card p-2.5">
      <div className="space-y-1">
        <p className="text-[11px] font-semibold text-foreground uppercase tracking-wider">Szukaj</p>
        <div className="relative">
          <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
            className="w-full rounded-lg border border-border bg-background py-1.5 pl-7 pr-2 text-[11px] text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
          />
        </div>
      </div>
    </div>
  );
}
