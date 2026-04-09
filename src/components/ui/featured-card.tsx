import Link from "next/link";
import { Calendar, MapPin, ArrowRight, Clock, ThumbsUp } from "lucide-react";
import type { DiscoveryItem } from "@/types/database";
import { formatPrice, formatAgeRange, cn } from "@/lib/utils";
import { getItemHref, getTypeBadgeLabel, getSubcategoryLabel, getDateText, getLocationText, getPlaceholderIcon } from "@/lib/content-helpers";

interface FeaturedCardProps {
  item: DiscoveryItem;
}

export function FeaturedCard({ item }: FeaturedCardProps) {
  const isPlace = item.content_type === "place";
  const likesCount = typeof item.likes === "number" ? item.likes : 0;

  return (
    <Link
      href={getItemHref(item)}
      className="group block rounded-xl border border-border bg-card shadow-[var(--shadow-card)] hover:shadow-[var(--shadow-card-hover)] hover:-translate-y-0.5 transition-all duration-200"
    >
      <div className="grid md:grid-cols-2 gap-0">
        <div className="relative aspect-[15/8] md:aspect-auto overflow-hidden rounded-t-xl md:rounded-l-xl md:rounded-tr-none bg-accent">
          {item.image_url ? (
            <img src={item.image_url} alt={item.title} className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-300" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-5xl text-muted-foreground/20">
              {getPlaceholderIcon(item)}
            </div>
          )}
          {item.is_free && (
            <span className="absolute top-3 left-3 bg-success text-white text-[11px] font-medium px-2.5 py-1 rounded-lg shadow-sm">
              Bezpłatnie
            </span>
          )}
          <span className="absolute bottom-3 right-3 inline-flex items-center gap-1 rounded-full bg-white px-2.5 py-1 text-[11px] font-semibold text-foreground shadow-[var(--shadow-soft)] border border-border/70">
            <ThumbsUp size={12} className="text-primary" />
            {likesCount}
          </span>
        </div>

        <div className="p-6 md:p-8 flex flex-col justify-center">
          <div className="flex items-center gap-1.5 mb-3">
            <span className="text-[11px] font-medium text-primary uppercase tracking-wide">{getTypeBadgeLabel(item)}</span>
            <span className="text-muted-foreground/30">·</span>
            <span className="text-[11px] text-muted-foreground">{getSubcategoryLabel(item)}</span>
            <span className="text-muted-foreground/30">·</span>
            <span className="text-[11px] text-muted-foreground">{formatAgeRange(item.age_min, item.age_max)}</span>
          </div>

          <h3 className="font-semibold text-xl md:text-2xl text-foreground leading-tight mb-2 tracking-[-0.02em] group-hover:text-primary transition-colors duration-200">
            {item.title}
          </h3>

          <p className="text-[14px] text-muted leading-relaxed mb-5 line-clamp-3">{item.description_short}</p>

          <div className="flex items-center gap-4 text-[13px] text-muted mb-5">
            <span className="flex items-center gap-1.5">
              {isPlace ? <Clock size={14} className="text-secondary/60" /> : <Calendar size={14} className="text-secondary/60" />}
              {getDateText(item)}
            </span>
            <span className="flex items-center gap-1.5">
              <MapPin size={14} className="text-secondary/60" />
              {getLocationText(item)}
            </span>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-lg font-semibold text-foreground">{formatPrice(item.price)}</span>
            <span className="flex items-center gap-1.5 text-[13px] font-medium text-primary group-hover:text-primary-hover transition-colors duration-200">
              Szczegóły
              <ArrowRight size={14} className="group-hover:translate-x-0.5 transition-transform duration-200" />
            </span>
          </div>
        </div>
      </div>
    </Link>
  );
}
