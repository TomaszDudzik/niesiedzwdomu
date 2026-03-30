import Link from "next/link";
import { Calendar, MapPin } from "lucide-react";
import type { DiscoveryItem } from "@/types/database";
import { formatPrice } from "@/lib/utils";
import { getItemHref, getTypeBadgeLabel, getSubcategoryLabel, getDateText, getLocationText, getSecondaryInfo, getPlaceholderIcon } from "@/lib/content-helpers";

interface ContentCardProps {
  item: DiscoveryItem;
}

export function ContentCard({ item }: ContentCardProps) {
  const isPlace = item.content_type === "place";

  return (
    <Link
      href={getItemHref(item)}
      className="group block rounded-xl border border-border bg-card shadow-[var(--shadow-card)] hover:shadow-[var(--shadow-card-hover)] hover:-translate-y-0.5 transition-all duration-200 p-3"
    >
      <div className="flex gap-3">
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-[13px] text-foreground leading-snug group-hover:text-primary transition-colors duration-200 line-clamp-2">
            {item.title}
          </h3>
          {item.description_short && (
            <p className="text-[11px] text-muted leading-relaxed mt-1 line-clamp-2">
              {item.description_short}
            </p>
          )}
        </div>

        <div className="w-20 h-20 shrink-0 rounded-lg overflow-hidden bg-accent">
          {item.image_url ? (
            <img
              src={item.image_url}
              alt={item.title}
              className="w-full h-full object-cover group-hover:scale-[1.05] transition-transform duration-300"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-xl text-muted-foreground/30">
              {getPlaceholderIcon(item)}
            </div>
          )}
        </div>
      </div>

      <div className="mt-2 space-y-1">
        <div className="flex items-center gap-1.5">
          <span className="text-[10px] font-medium text-primary uppercase tracking-wide">
            {getTypeBadgeLabel(item)}
          </span>
          {getSubcategoryLabel(item) && (
            <>
              <span className="text-muted-foreground/30">·</span>
              <span className="text-[10px] text-muted-foreground">
                {getSubcategoryLabel(item)}
              </span>
            </>
          )}
          {!isPlace && getSecondaryInfo(item) && (
            <>
              <span className="text-muted-foreground/30">·</span>
              <span className="text-[10px] text-muted-foreground">{getSecondaryInfo(item)}</span>
            </>
          )}
        </div>

        <div className="flex items-center gap-3 text-[10px] text-muted">
          {!isPlace && (
            <span className="flex items-center gap-1">
              <Calendar size={10} className="text-secondary/60" />
              {getDateText(item)}
            </span>
          )}
          <span className="flex items-center gap-1">
            <MapPin size={10} className="text-secondary/60" />
            <span className="truncate">{getLocationText(item)}</span>
          </span>
        </div>
      </div>
    </Link>
  );
}
