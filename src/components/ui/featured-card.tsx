import Link from "next/link";
import { Calendar, MapPin, ArrowRight, Clock } from "lucide-react";
import type { DiscoveryItem } from "@/types/database";
import { formatPrice, formatAgeRange, cn } from "@/lib/utils";
import { getItemHref, getTypeBadgeLabel, getSubcategoryLabel, getDateText, getLocationText, getPlaceholderIcon } from "@/lib/content-helpers";

interface FeaturedCardProps {
  item: DiscoveryItem;
}

export function FeaturedCard({ item }: FeaturedCardProps) {
  const isPlace = item.content_type === "place";

  return (
    <Link
      href={getItemHref(item)}
      className="group block rounded-lg border border-border hover:border-[#CCC] transition-all duration-150"
    >
      <div className="grid md:grid-cols-2 gap-0">
        <div className="relative aspect-[16/10] md:aspect-auto overflow-hidden rounded-t-lg md:rounded-l-lg md:rounded-tr-none bg-[#FAFAFA]">
          {item.image_url ? (
            <img
              src={item.image_url}
              alt={item.title}
              className="w-full h-full object-cover group-hover:scale-[1.02] transition-transform duration-300"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-5xl text-muted-foreground/30">
              {getPlaceholderIcon(item)}
            </div>
          )}
          {item.is_free && (
            <span className="absolute top-3 left-3 bg-white/90 backdrop-blur-sm text-foreground text-[11px] font-medium px-2 py-0.5 rounded">
              Bezpłatnie
            </span>
          )}
        </div>

        <div className="p-6 md:p-8 flex flex-col justify-center">
          <div className="flex items-center gap-1.5 mb-3">
            <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">
              {getTypeBadgeLabel(item)}
            </span>
            <span className="text-muted-foreground/40">·</span>
            <span className="text-[11px] text-muted-foreground">
              {getSubcategoryLabel(item)}
            </span>
            <span className="text-muted-foreground/40">·</span>
            <span className="text-[11px] text-muted-foreground">
              {formatAgeRange(item.age_min, item.age_max)}
            </span>
          </div>

          <h3 className="font-semibold text-xl md:text-2xl text-foreground leading-tight mb-2 tracking-[-0.02em]">
            {item.title}
          </h3>

          <p className="text-[14px] text-muted leading-relaxed mb-5 line-clamp-3">
            {item.description_short}
          </p>

          <div className="flex items-center gap-4 text-[13px] text-muted mb-5">
            <span className="flex items-center gap-1.5">
              {isPlace ? <Clock size={14} className="text-muted-foreground/60" /> : <Calendar size={14} className="text-muted-foreground/60" />}
              {getDateText(item)}
            </span>
            <span className="flex items-center gap-1.5">
              <MapPin size={14} className="text-muted-foreground/60" />
              {getLocationText(item)}
            </span>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-lg font-semibold text-foreground">
              {formatPrice(item.price)}
            </span>
            <span className="flex items-center gap-1.5 text-[13px] font-medium text-muted group-hover:text-foreground transition-colors">
              Szczegóły
              <ArrowRight size={14} className="group-hover:translate-x-0.5 transition-transform duration-150" />
            </span>
          </div>
        </div>
      </div>
    </Link>
  );
}
