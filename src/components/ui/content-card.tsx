import Link from "next/link";
import { Calendar, MapPin, Clock, Users } from "lucide-react";
import type { DiscoveryItem } from "@/types/database";
import { formatPrice, formatAgeRange } from "@/lib/utils";
import { getItemHref, getTypeBadgeLabel, getSubcategoryLabel, getDateText, getLocationText, getSecondaryInfo, getPlaceholderIcon } from "@/lib/content-helpers";
import { cn } from "@/lib/utils";

interface ContentCardProps {
  item: DiscoveryItem;
}

export function ContentCard({ item }: ContentCardProps) {
  const isPlace = item.content_type === "place";

  return (
    <Link
      href={getItemHref(item)}
      className="group block rounded-lg border border-border hover:border-[#CCC] transition-all duration-150"
    >
      {/* Image */}
      <div className="relative aspect-[16/10] overflow-hidden rounded-t-lg bg-[#FAFAFA]">
        {item.image_url ? (
          <img
            src={item.image_url}
            alt={item.title}
            className="w-full h-full object-cover group-hover:scale-[1.02] transition-transform duration-300"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-3xl text-muted-foreground/40">
            {getPlaceholderIcon(item)}
          </div>
        )}
        {item.is_free && (
          <span className="absolute top-2.5 right-2.5 bg-white/90 backdrop-blur-sm text-foreground text-[11px] font-medium px-2 py-0.5 rounded">
            Bezpłatnie
          </span>
        )}
      </div>

      {/* Content */}
      <div className="p-4">
        <div className="flex items-center gap-1.5 mb-2">
          <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">
            {getTypeBadgeLabel(item)}
          </span>
          <span className="text-muted-foreground/40">·</span>
          <span className="text-[11px] text-muted-foreground">
            {getSubcategoryLabel(item)}
          </span>
          {getSecondaryInfo(item) && (
            <>
              <span className="text-muted-foreground/40">·</span>
              <span className="text-[11px] text-muted-foreground">{getSecondaryInfo(item)}</span>
            </>
          )}
        </div>

        <h3 className="font-semibold text-[15px] text-foreground leading-snug mb-1.5 group-hover:text-muted transition-colors line-clamp-2">
          {item.title}
        </h3>

        <p className="text-[13px] text-muted leading-relaxed mb-3 line-clamp-2">
          {item.description_short}
        </p>

        <div className="flex items-center justify-between text-[12px] text-muted">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1">
              {isPlace ? <Clock size={12} className="text-muted-foreground/60" /> : <Calendar size={12} className="text-muted-foreground/60" />}
              {getDateText(item)}
            </span>
            <span className="flex items-center gap-1">
              <MapPin size={12} className="text-muted-foreground/60" />
              <span className="truncate max-w-[120px]">{getLocationText(item)}</span>
            </span>
          </div>
          <span className="font-medium text-foreground text-[13px]">
            {formatPrice(item.price)}
          </span>
        </div>
      </div>
    </Link>
  );
}
