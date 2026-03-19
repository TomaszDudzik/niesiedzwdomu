import { Search } from "lucide-react";

interface EmptyStateProps {
  title?: string;
  description?: string;
  icon?: React.ReactNode;
}

export function EmptyState({
  title = "Brak wyników",
  description = "Nie znaleźliśmy nic pasującego do Twoich kryteriów. Spróbuj zmienić filtry.",
  icon,
}: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-20 px-4 text-center">
      <div className="text-muted-foreground/40 mb-4">
        {icon || <Search size={24} />}
      </div>
      <h3 className="font-medium text-foreground text-[15px] mb-1">{title}</h3>
      <p className="text-[13px] text-muted max-w-xs">{description}</p>
    </div>
  );
}
