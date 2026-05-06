import Link from "next/link";
import { Calendar, MapPin } from "lucide-react";
import type { DiscoveryItem } from "@/types/database";
import { getItemHref, getDateText, getLocationText, getPlaceholderIcon } from "@/lib/content-helpers";
import { thumbUrl } from "@/lib/utils";

interface ContentCardProps {
  item: DiscoveryItem;
  variant?: "horizontal" | "vertical";
  showImageTag?: boolean;
  mobileTitleTop?: boolean;
}

const TYPE_BADGE_COLOR: Record<string, string> = {
  place:    "var(--color-secondary)",
  event:    "var(--color-primary)",
  activity: "var(--color-purple)",
  camp:     "#2563EB",
};

function getTagBadgeColor(tag: string, contentType: DiscoveryItem["content_type"]): string {
  const normalized = tag.trim().toLowerCase();

  if (normalized.includes("sala zabaw")) return "#D97706";
  if (normalized.includes("plac zabaw")) return "#65A30D";
  if (normalized.includes("kreatyw") || normalized.includes("artystycz")) return "#E11D48";
  if (normalized.includes("kultura") || normalized.includes("spektakl") || normalized.includes("wystaw")) return "#7C3AED";
  if (normalized.includes("nauka") || normalized.includes("edukac")) return "#0284C7";
  if (normalized.includes("przyro") || normalized.includes("natura")) return "#059669";
  if (normalized.includes("sport")) return "#EA580C";
  if (normalized.includes("muzyka")) return "#C026D3";
  if (normalized.includes("kino")) return "#475569";
  if (normalized.includes("warsztat")) return "#CA8A04";
  if (normalized.includes("kulinar")) return "#DC2626";
  if (normalized.includes("integrac")) return "#DB2777";
  if (normalized.includes("przygod")) return "#0F766E";
  if (normalized.includes("jezyk")) return "#0891B2";
  if (normalized.includes("sensory")) return "#4F46E5";

  return TYPE_BADGE_COLOR[contentType] ?? "var(--color-primary)";
}

function getTag(item: DiscoveryItem): string {
  return ((item as unknown as Record<string, unknown>).main_category as string)
    || ((item as unknown as Record<string, unknown>).category as string)
    || item.content_type;
}

export function ContentCard({ item, variant = "horizontal", showImageTag = false, mobileTitleTop = false }: ContentCardProps) {
  const isEvent = item.content_type === "event";
  const href = getItemHref(item);
  const tag = getTag(item);
  const badgeColor = getTagBadgeColor(tag, item.content_type);

  /* ── Vertical card (product-style) ── */
  if (variant === "vertical") {
    if (mobileTitleTop) {
      return (
        <Link
          href={href}
          className="group flex h-[152px] rounded-xl border border-border bg-card overflow-hidden shadow-[var(--shadow-card)] hover:shadow-[var(--shadow-card-hover)] hover:-translate-y-0.5 transition-all duration-200 sm:h-auto sm:flex-col sm:rounded-2xl sm:hover:-translate-y-1.5"
        >
          {/* Image */}
          <div className="relative w-[115px] shrink-0 self-stretch overflow-hidden bg-accent sm:w-full sm:aspect-[4/3]">
            {item.image_url ? (
              <img
                src={thumbUrl(item.image_thumb, item.image_url) || item.image_url}
                alt={item.title}
                className="h-full w-full object-cover group-hover:scale-[1.04] transition-transform duration-300 sm:group-hover:scale-[1.06] sm:duration-400"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-2xl text-muted-foreground/25 sm:text-5xl sm:text-muted-foreground/20">
                {getPlaceholderIcon(item)}
              </div>
            )}
            {tag && (
              <span
                className="absolute left-2.5 top-2.5 rounded-full px-2.5 py-0.5 text-[10px] font-bold text-white leading-none shadow-sm sm:left-3 sm:top-3 sm:py-1 sm:text-[11px]"
                style={{ background: badgeColor }}
              >
                {tag}
              </span>
            )}
          </div>

          {/* Body */}
          <div className="flex min-w-0 flex-1 flex-col gap-0.5 p-2.5 pt-1.5 sm:gap-2 sm:p-4">
            <div className="-mx-2.5 -mt-1.5 mb-1 px-2.5 py-1.5 bg-accent/50 sm:m-0 sm:bg-transparent sm:p-0">
              <h3 className="font-heading font-bold text-[12px] leading-snug truncate sm:line-clamp-2 sm:whitespace-normal text-foreground group-hover:text-[#e60100] transition-colors duration-150 sm:text-[14px]">
                {item.title}
              </h3>
            </div>
            {item.description_short && (
              <p className="text-[10px] text-muted-foreground leading-relaxed line-clamp-3 sm:line-clamp-2 sm:text-[12px]">
                {item.description_short}
              </p>
            )}
            <div className="mt-auto space-y-1 border-t border-border/50 pt-2">
              {isEvent && (
                <div className="flex items-center gap-1 text-[10px] text-muted-foreground font-medium sm:text-[11px]">
                  <Calendar size={9} className="shrink-0 sm:size-[10px]" />
                  <span className="truncate">{getDateText(item)}</span>
                </div>
              )}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1 text-[10px] text-muted-foreground sm:text-[11px]">
                  <MapPin size={9} className="shrink-0 text-secondary sm:size-[10px]" />
                  <span className="truncate">{getLocationText(item)}</span>
                </div>
              </div>
            </div>
          </div>
        </Link>
      );
    }

    return (
      <Link
        href={href}
        className="group flex h-[152px] rounded-xl border border-border bg-card overflow-hidden shadow-[var(--shadow-card)] hover:shadow-[var(--shadow-card-hover)] hover:-translate-y-0.5 transition-all duration-200 sm:h-auto sm:flex-col sm:rounded-2xl sm:hover:-translate-y-1.5"
      >
        {/* Image */}
        <div className="relative w-[148px] shrink-0 self-stretch overflow-hidden bg-accent sm:w-full sm:aspect-[4/3]">
          {item.image_url ? (
            <img
              src={thumbUrl(item.image_thumb, item.image_url) || item.image_url}
              alt={item.title}
              className="h-full w-full object-cover group-hover:scale-[1.04] transition-transform duration-300 sm:group-hover:scale-[1.06] sm:duration-400"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-2xl text-muted-foreground/25 sm:text-5xl sm:text-muted-foreground/20">
              {getPlaceholderIcon(item)}
            </div>
          )}
          {tag && (
            <span
              className="absolute left-2.5 top-2.5 rounded-full px-2.5 py-0.5 text-[10px] font-bold text-white leading-none shadow-sm sm:left-3 sm:top-3 sm:py-1 sm:text-[11px]"
              style={{ background: badgeColor }}
            >
              {tag}
            </span>
          )}
        </div>

        {/* Body */}
        <div className="flex min-w-0 flex-1 flex-col gap-1.5 p-3.5 sm:gap-2 sm:p-4">
          <h3 className="font-heading font-bold text-[13px] leading-snug line-clamp-2 text-foreground group-hover:text-[#e60100] transition-colors duration-150 sm:text-[14px]">
            {item.title}
          </h3>
          {item.description_short && (
            <p className="text-[11px] text-muted-foreground leading-relaxed line-clamp-2 sm:text-[12px]">
              {item.description_short}
            </p>
          )}
          <div className="mt-auto space-y-1 border-t border-border/50 pt-2">
            {isEvent && (
              <div className="flex items-center gap-1 text-[10px] text-muted-foreground font-medium sm:text-[11px]">
                <Calendar size={9} className="shrink-0 sm:size-[10px]" />
                <span className="truncate">{getDateText(item)}</span>
              </div>
            )}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1 text-[10px] text-muted-foreground sm:text-[11px]">
                <MapPin size={9} className="shrink-0 text-secondary sm:size-[10px]" />
                <span className="truncate">{getLocationText(item)}</span>
              </div>
            </div>
          </div>
        </div>
      </Link>
    );
  }

  /* ── Horizontal card (default) ── */
  return (
    <Link
      href={href}
      className="group flex rounded-xl border border-border bg-card shadow-[var(--shadow-card)] hover:shadow-[var(--shadow-card-hover)] hover:-translate-y-0.5 transition-all duration-200 overflow-hidden h-[152px]"
    >
      <div className="w-[148px] shrink-0 relative self-stretch bg-accent">
        {item.image_url ? (
          <img
            src={thumbUrl(item.image_thumb, item.image_url) || item.image_url}
            alt={item.title}
            className="w-full h-full object-cover group-hover:scale-[1.04] transition-transform duration-300"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-2xl text-muted-foreground/25">
            {getPlaceholderIcon(item)}
          </div>
        )}
        {(showImageTag || true) && tag && (
          <span
            className="absolute left-2.5 top-2.5 rounded-full px-2.5 py-0.5 text-[10px] font-bold text-white leading-none"
            style={{ background: badgeColor }}
          >
            {tag}
          </span>
        )}
      </div>

      <div className="flex-1 min-w-0 p-3.5 flex flex-col gap-1.5">
        <h3 className="font-heading font-bold text-[13px] text-foreground leading-snug group-hover:text-[#e60100] transition-colors duration-150 line-clamp-2">
          {item.title}
        </h3>
        {item.description_short && (
          <p className="text-[11px] text-muted-foreground leading-relaxed line-clamp-2">
            {item.description_short}
          </p>
        )}
        <div className="mt-auto space-y-1">
          {isEvent && (
            <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
              <Calendar size={9} className="shrink-0 text-muted-foreground/60" />
              <span className="truncate">{getDateText(item)}</span>
            </div>
          )}
          <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
            <MapPin size={9} className="shrink-0 text-secondary/70" />
            <span className="truncate">{getLocationText(item)}</span>
          </div>
        </div>
      </div>
    </Link>
  );
}
