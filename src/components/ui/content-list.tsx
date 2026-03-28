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
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
      {items.map((item) => (
        <ContentCard key={item.id} item={item} />
      ))}
    </div>
  );
}
