import type { DiscoveryItem } from "@/types/database";
import { ContentCard } from "./content-card";
import { EmptyState } from "./empty-state";

interface ContentListProps {
  items: DiscoveryItem[];
  emptyMessage?: string;
}

export function ContentList({ items, emptyMessage }: ContentListProps) {
  if (items.length === 0) {
    return <EmptyState description={emptyMessage} />;
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
      {items.map((item) => (
        <ContentCard key={item.id} item={item} />
      ))}
    </div>
  );
}
