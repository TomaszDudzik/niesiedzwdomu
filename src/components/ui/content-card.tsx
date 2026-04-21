import Link from "next/link";
import { Calendar, MapPin } from "lucide-react";
import type { DiscoveryItem } from "@/types/database";
import { getItemHref, getDateText, getLocationText, getPlaceholderIcon } from "@/lib/content-helpers";
import { thumbUrl } from "@/lib/utils";

interface ContentCardProps {
  item: DiscoveryItem;
  variant?: "horizontal" | "vertical";
}

const TYPE_BADGE_COLOR: Record<string, string> = {
  place:    "var(--color-secondary)",
  event:    "var(--color-primary)",
  activity: "var(--color-purple)",
  camp:     "#2E7DBA",
};

function getTag(item: DiscoveryItem): string {
  return ((item as Record<string, unknown>).main_category as string)
    || ((item as Record<string, unknown>).category as string)
    || item.content_type;
}

export function ContentCard({ item, variant = "horizontal" }: ContentCardProps) {
  const isEvent = item.content_type === "event";
  const href = getItemHref(item);

  /* ── Vertical card (for places grid) ── */
  if (variant === "vertical") {
    const badgeColor = TYPE_BADGE_COLOR[item.content_type] ?? "var(--color-primary)";
    const tag = getTag(item);

    return (
      <Link
        href={href}
        className="group flex flex-col rounded-2xl border border-border bg-card overflow-hidden shadow-[var(--shadow-card)] hover:shadow-[var(--shadow-card-hover)] hover:-translate-y-1.5 transition-all duration-200"
      >
        {/* Image */}
        <div className="relative h-[180px] overflow-hidden bg-accent shrink-0">
          {item.image_url ? (
            <img
              src={thumbUrl(item.image_thumb, item.image_url) || item.image_url}
              alt={item.title}
              className="h-full w-full object-cover group-hover:scale-[1.05] transition-transform duration-300"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-4xl text-muted-foreground/25">
              {getPlaceholderIcon(item)}
            </div>
          )}
          {tag && (
            <span
              className="absolute left-3 top-3 rounded-full px-3 py-1 text-[11px] font-bold text-white leading-none"
              style={{ background: badgeColor }}
            >
              {tag}
            </span>
          )}
        </div>

        {/* Body */}
        <div className="flex flex-1 flex-col gap-2 p-4">
          <h3 className="font-heading font-bold text-[14px] leading-snug line-clamp-2 group-hover:text-primary transition-colors duration-200">
            {item.title}
          </h3>
          {item.description_short && (
            <p className="text-[12px] text-muted leading-relaxed line-clamp-2">
              {item.description_short}
            </p>
          )}
          <div className="mt-auto flex items-center gap-1 pt-1 text-[11px] font-semibold text-muted-foreground">
            <MapPin size={10} className="shrink-0" />
            <span className="truncate">{getLocationText(item)}</span>
          </div>
        </div>
      </Link>
    );
  }

  /* ── Horizontal card (default) ── */
  return (
    <Link
      href={href}
      className="group flex rounded-xl border border-border bg-card shadow-[var(--shadow-card)] hover:shadow-[var(--shadow-card-hover)] hover:-translate-y-0.5 transition-all duration-200 overflow-hidden h-[160px]"
    >
      <div className="w-[160px] shrink-0 relative self-stretch bg-accent">
        {item.image_url ? (
          <img
            src={thumbUrl(item.image_thumb, item.image_url) || item.image_url}
            alt={item.title}
            className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-300"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-2xl text-muted-foreground/30">
            {getPlaceholderIcon(item)}
          </div>
        )}
      </div>

      <div className="flex-1 min-w-0 p-3 flex flex-col gap-1.5">
        <h3 className="font-heading font-bold text-[13px] text-foreground leading-snug group-hover:text-primary transition-colors duration-200 line-clamp-2">
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
              <Calendar size={9} className="shrink-0" />
              <span className="truncate">{getDateText(item)}</span>
            </div>
          )}
          <div className="flex items-center gap-1 text-[10px] text-muted">
            <MapPin size={9} className="shrink-0" />
            <span className="truncate">{getLocationText(item)}</span>
          </div>
        </div>
      </div>
    </Link>
  );
}
