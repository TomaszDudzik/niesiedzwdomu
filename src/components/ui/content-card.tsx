import Link from "next/link";
import { Calendar, MapPin } from "lucide-react";
import type { DiscoveryItem } from "@/types/database";
import { getItemHref, getDateText, getLocationText, getPlaceholderIcon, getSubcategoryLabel } from "@/lib/content-helpers";
import { cn } from "@/lib/utils";
import { thumbUrl } from "@/lib/utils";

interface ContentCardProps {
  item: DiscoveryItem;
  largeImage?: boolean;
}

const LABEL_COLOR_MAP: Record<string, string> = {
  nauka: "bg-[#2563EB] text-white",
  plac_zabaw: "bg-[#65A30D] text-white",
  sala_zabaw: "bg-[#C026D3] text-white",
  relaks: "bg-[#0F766E] text-white",
  kultura: "bg-[#A21CAF] text-white",
  kreatywnosc: "bg-[#E11D48] text-white",
  edukacja: "bg-[#0891B2] text-white",
  integracja: "bg-[#7C3AED] text-white",
  kulinaria: "bg-[#D97706] text-white",
  przygoda: "bg-[#B45309] text-white",
  przyroda: "bg-[#4D7C0F] text-white",
  sport: "bg-[#15803D] text-white",
  technologia: "bg-[#4338CA] text-white",
  kolonie: "bg-[#1D4ED8] text-white",
  polkolonie: "bg-[#0EA5E9] text-white",
  warsztaty_wakacyjne: "bg-[#14B8A6] text-white",
  inne: "bg-[#475569] text-white",
};

function normalizeLabelKey(label: string) {
  return label
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[\s/-]+/g, "_");
}

function getItemLabelClasses(_item: DiscoveryItem, label: string) {
  return LABEL_COLOR_MAP[normalizeLabelKey(label)] ?? "bg-slate-700 text-white";
}

export function ContentCard({ item }: ContentCardProps) {
  const isEvent = item.content_type === "event";
  const itemLabel = getSubcategoryLabel(item);

  return (
    <Link
      href={getItemHref(item)}
      className="group flex rounded-xl border border-border bg-card shadow-[var(--shadow-card)] hover:shadow-[var(--shadow-card-hover)] hover:-translate-y-0.5 transition-all duration-200 overflow-hidden h-[160px]"
    >
      {/* Image — left */}
      <div className="w-[160px] shrink-0 relative self-stretch">
        {item.image_url ? (
          <img
            src={thumbUrl(item.image_thumb, item.image_url) || item.image_url}
            alt={item.title}
            className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-300"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-2xl text-muted-foreground/30 bg-accent">
            {getPlaceholderIcon(item)}
          </div>
        )}
        {itemLabel ? (
          <span
            className={cn(
              "absolute left-2.5 top-2.5 inline-flex items-center rounded-full px-2 py-[5px] text-[10px] font-semibold leading-none shadow-sm",
              getItemLabelClasses(item, itemLabel)
            )}
          >
            {itemLabel}
          </span>
        ) : null}
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
