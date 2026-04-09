import Link from "next/link";
import { Calendar, MapPin, ThumbsUp } from "lucide-react";
import type { DiscoveryItem } from "@/types/database";
import { getItemHref, getDateText, getLocationText, getPlaceholderIcon } from "@/lib/content-helpers";

interface ContentCardProps {
  item: DiscoveryItem;
  largeImage?: boolean;
}

export function ContentCard({ item }: ContentCardProps) {
  const isPlace = item.content_type === "place";
  const isEvent = item.content_type === "event";
  const likesCount = typeof item.likes === "number" ? item.likes : 0;

  return (
    <Link
      href={getItemHref(item)}
      className="group flex rounded-xl border border-border bg-card shadow-[var(--shadow-card)] hover:shadow-[var(--shadow-card-hover)] hover:-translate-y-0.5 transition-all duration-200 overflow-hidden h-[160px]"
    >
      {/* Image — left */}
      <div className="w-[160px] shrink-0 relative self-stretch">
        {item.image_url ? (
          <img
            src={item.image_url}
            alt={item.title}
            className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-300"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-2xl text-muted-foreground/30 bg-accent">
            {getPlaceholderIcon(item)}
          </div>
        )}
        <span className="absolute bottom-2 right-2 inline-flex items-center gap-1 rounded-full bg-white px-2 py-1 text-[10px] font-semibold text-foreground shadow-[var(--shadow-soft)] border border-border/70">
          <ThumbsUp size={11} className="text-primary" />
          {likesCount}
        </span>
      </div>

      {/* Text — right */}
      <div className="flex-1 min-w-0 p-3 flex flex-col gap-1.5">
        <h3 className="font-semibold text-[13px] text-foreground leading-snug group-hover:text-primary transition-colors duration-200 line-clamp-2">
          {item.title}
        </h3>
        {item.description_short && (
          <p className="text-[11px] text-muted leading-relaxed line-clamp-2">
            {item.description_short}
          </p>
        )}
        <div className="mt-auto space-y-0.5">
          {isEvent && (
            <div className="flex items-center gap-1 text-[10px] text-muted">
              <Calendar size={9} className="text-secondary/60 shrink-0" />
              <span className="truncate">{getDateText(item)}</span>
            </div>
          )}
          <div className="flex items-center gap-1 text-[10px] text-muted">
            <MapPin size={9} className="text-secondary/60 shrink-0" />
            <span className="truncate">{getLocationText(item)}</span>
          </div>
        </div>
      </div>
    </Link>
  );
}
