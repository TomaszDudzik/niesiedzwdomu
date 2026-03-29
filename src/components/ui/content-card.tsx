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
      className="group block rounded-xl border border-border bg-card shadow-[var(--shadow-card)] hover:shadow-[var(--shadow-card-hover)] hover:-translate-y-0.5 transition-all duration-200"
    >
      <div className="relative aspect-[3/2] overflow-hidden rounded-t-xl bg-accent">
        {item.image_url ? (
          <img
            src={item.image_url}
            alt={item.title}
            className="w-full h-full object-contain group-hover:scale-[1.03] transition-transform duration-300"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-3xl text-muted-foreground/30">
            {getPlaceholderIcon(item)}
          </div>
        )}
      </div>

      <div className="p-3">
        {!isPlace && (
          <div className="flex items-center gap-1.5 mb-1">
            <span className="text-[10px] font-medium text-primary uppercase tracking-wide">
              {getTypeBadgeLabel(item)}
            </span>
            <span className="text-muted-foreground/30">·</span>
            <span className="text-[10px] text-muted-foreground">
              {getSubcategoryLabel(item)}
            </span>
            {getSecondaryInfo(item) && (
              <>
                <span className="text-muted-foreground/30">·</span>
                <span className="text-[10px] text-muted-foreground">{getSecondaryInfo(item)}</span>
              </>
            )}

          </div>
        )}

        <h3 className="font-semibold text-[13px] text-foreground leading-snug group-hover:text-primary transition-colors duration-200 line-clamp-2">
          {item.title}
        </h3>

        {isPlace && (
          <div className="flex items-center justify-between text-[10px] text-muted mt-1">
            <span>{getSubcategoryLabel(item)}</span>
            <span className="flex items-center gap-1">
              <MapPin size={10} className="text-secondary/60" />
              <span className="truncate max-w-[100px]">{getLocationText(item)}</span>
            </span>
          </div>
        )}

        {!isPlace && (
          <div className="flex items-center justify-between text-[10px] text-muted mt-1.5">
            <span className="flex items-center gap-1">
              <Calendar size={10} className="text-secondary/60" />
              {getDateText(item)}
            </span>
            <span className="flex items-center gap-1">
              <MapPin size={10} className="text-secondary/60" />
              <span className="truncate max-w-[100px]">{getLocationText(item)}</span>
            </span>
          </div>
        )}
      </div>
    </Link>
  );
}
