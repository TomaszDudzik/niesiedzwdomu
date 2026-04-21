"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { MapPin, List, Map as MapIcon, X } from "lucide-react";
import { cn, formatPriceRange } from "@/lib/utils";
import { normalizeDistrictName } from "@/lib/districts";
import type { Event, Place, Activity } from "@/types/database";

/* ─── Coordinates ─────────────────────────────────────────── */
const KRAKOW_CENTER: [number, number] = [50.0614, 19.9372];
const DISTRICT_COORDS: Record<string, [number, number]> = {
  "Stare Miasto":        [50.0614, 19.9372],
  "Kazimierz":           [50.0500, 19.9460],
  "Podgórze":            [50.0420, 19.9510],
  "Nowa Huta":           [50.0720, 20.0370],
  "Krowodrza":           [50.0770, 19.9130],
  "Bronowice":           [50.0810, 19.8900],
  "Zwierzyniec":         [50.0560, 19.8900],
  "Dębniki":             [50.0430, 19.9200],
  "Prądnik Czerwony":    [50.0870, 19.9550],
  "Prądnik Biały":       [50.0950, 19.9200],
  "Czyżyny":             [50.0720, 20.0050],
  "Bieżanów-Prokocim":   [50.0150, 20.0050],
  "Łagiewniki-Borek Fałęcki": [50.0270, 19.9100],
  "Swoszowice":          [49.9960, 19.9220],
  "Mistrzejowice":       [50.0940, 19.9840],
  "Wzgórza Krzesławickie": [50.0810, 20.0440],
};

function coords(lat: number | null, lng: number | null, district?: string | null): [number, number] {
  if (lat && lng) return [lat, lng];
  if (district) return DISTRICT_COORDS[normalizeDistrictName(district)] ?? KRAKOW_CENTER;
  return KRAKOW_CENTER;
}

/* ─── Unified item type ───────────────────────────────────── */
type ContentKind = "event" | "place" | "activity";

interface MapItem {
  id: string;
  kind: ContentKind;
  title: string;
  href: string;
  emoji: string;
  color: string;       // marker fill color
  bgClass: string;     // sidebar icon bg
  textClass: string;   // sidebar icon text
  coords: [number, number];
  street?: string | null;
  city?: string | null;
  district?: string | null;
  category?: string | null;
  priceLabel: string;
  isFree: boolean;
  ageLabel?: string;
}

const KIND_META: Record<ContentKind, { emoji: string; color: string; bgClass: string; textClass: string; label: string }> = {
  event:    { emoji: "🎪", color: "#D4623C", bgClass: "bg-[#FFF5F2]", textClass: "text-[#D4623C]", label: "Wydarzenie" },
  place:    { emoji: "📍", color: "#3D8B7A", bgClass: "bg-[#F0F9F7]", textClass: "text-[#3D8B7A]", label: "Miejsce" },
  activity: { emoji: "🎯", color: "#7B5EA7", bgClass: "bg-purple-50",  textClass: "text-purple-600", label: "Zajęcia" },
};

/* ─── Normalise raw DB types into MapItem ─────────────────── */
function fromEvent(e: Event): MapItem {
  const meta = KIND_META.event;
  const isFree = e.is_free || (e.price_from === 0 && e.price_to === 0) || (e.price_from === null && e.price_to === null);
  return {
    id: e.id,
    kind: "event",
    title: e.title,
    href: `/wydarzenia/${e.slug}`,
    emoji: meta.emoji,
    color: meta.color,
    bgClass: meta.bgClass,
    textClass: meta.textClass,
    coords: coords(e.lat, e.lng, e.district),
    street: e.street,
    city: e.city,
    district: e.district,
    category: e.main_category ?? e.category ?? null,
    priceLabel: formatPriceRange(e.price_from, e.price_to, !!e.is_free),
    isFree: !!isFree,
  };
}

function fromPlace(p: Place): MapItem {
  const meta = KIND_META.place;
  return {
    id: p.id,
    kind: "place",
    title: p.title,
    href: `/miejsca/${p.slug}`,
    emoji: meta.emoji,
    color: meta.color,
    bgClass: meta.bgClass,
    textClass: meta.textClass,
    coords: coords(p.lat, p.lng, p.district),
    street: p.street,
    city: p.city,
    district: p.district,
    category: p.main_category ?? p.category ?? null,
    priceLabel: "Wstęp wolny",
    isFree: true,
  };
}

function fromActivity(a: Activity): MapItem {
  const meta = KIND_META.activity;
  const isFree = a.is_free || (a.price_from === 0 && a.price_to === 0);
  return {
    id: a.id,
    kind: "activity",
    title: a.title,
    href: `/zajecia/${a.slug}`,
    emoji: meta.emoji,
    color: meta.color,
    bgClass: meta.bgClass,
    textClass: meta.textClass,
    coords: coords(a.lat ?? null, a.lng ?? null, a.district),
    street: a.venue_address ?? null,
    city: a.city ?? null,
    district: a.district,
    category: a.main_category ?? a.activity_type ?? null,
    priceLabel: formatPriceRange(a.price_from ?? null, a.price_to ?? null, !!a.is_free),
    isFree: !!isFree,
  };
}

/* ─── Sidebar row ─────────────────────────────────────────── */
function SidebarRow({
  item,
  selected,
  onClick,
  rowRef,
}: {
  item: MapItem;
  selected: boolean;
  onClick: () => void;
  rowRef?: React.Ref<HTMLButtonElement>;
}) {
  return (
    <button
      ref={rowRef}
      type="button"
      onClick={onClick}
      className={cn(
        "w-full text-left flex items-start gap-3 px-4 py-3.5 border-b border-border transition-colors duration-150",
        selected ? "bg-accent/80" : "hover:bg-accent/50"
      )}
    >
      {/* Icon circle */}
      <span className={cn("flex shrink-0 h-9 w-9 items-center justify-center rounded-full text-[18px] mt-0.5", item.bgClass)}>
        {item.emoji}
      </span>

      {/* Text */}
      <div className="flex-1 min-w-0">
        <p className={cn("text-[13px] font-semibold leading-snug line-clamp-2", selected ? "text-primary" : "text-foreground")}>
          {item.title}
        </p>
        {(item.street || item.city || item.district) && (
          <p className="mt-0.5 text-[11px] text-muted truncate flex items-center gap-1">
            <MapPin size={9} className="shrink-0" />
            {[item.street, item.city || item.district].filter(Boolean).join(", ")}
          </p>
        )}
        <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
          {item.category && (
            <span className={cn("inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium", item.bgClass, item.textClass)}>
              {item.category}
            </span>
          )}
          {item.isFree ? (
            <span className="inline-flex items-center rounded-full bg-[#F0F9F7] px-2 py-0.5 text-[10px] font-medium text-[#3D8B7A]">
              Bezpłatny
            </span>
          ) : (
            <span className="inline-flex items-center rounded-full bg-accent px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
              {item.priceLabel}
            </span>
          )}
        </div>
      </div>
    </button>
  );
}

/* ─── Main view ───────────────────────────────────────────── */
interface MapaViewProps {
  events: Event[];
  places: Place[];
  activities: Activity[];
}

type MobileTab = "map" | "list";

export function MapaView({ events, places, activities }: MapaViewProps) {
  const [MapComponent, setMapComponent] = useState<React.ComponentType<{
    markers: import("./mapa-leaflet").MapaMarker[];
    selectedId: string | null;
    onMarkerClick: (id: string) => void;
  }> | null>(null);

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [mobileTab, setMobileTab] = useState<MobileTab>("map");
  const selectedRowRef = useRef<HTMLButtonElement>(null);

  // Load Leaflet dynamically to avoid SSR issues
  useEffect(() => {
    import("./mapa-leaflet").then((mod) => setMapComponent(() => mod.MapaLeaflet));
  }, []);

  const items = useMemo<MapItem[]>(
    () => [
      ...events.map(fromEvent),
      ...places.map(fromPlace),
      ...activities.map(fromActivity),
    ],
    [events, places, activities]
  );

  const markers = useMemo(
    () =>
      items.map((item) => ({
        id: item.id,
        coords: item.coords,
        title: item.title,
        href: item.href,
        emoji: item.emoji,
        color: item.color,
        street: item.street,
        city: item.city,
      })),
    [items]
  );

  function handleMarkerClick(id: string) {
    setSelectedId((prev) => (prev === id ? null : id));
    setMobileTab("list");
  }

  // Scroll selected row into view
  useEffect(() => {
    if (selectedId && selectedRowRef.current) {
      selectedRowRef.current.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }
  }, [selectedId]);

  const selectedItem = items.find((i) => i.id === selectedId) ?? null;

  return (
    <div className="flex flex-col" style={{ height: "calc(100vh - 3.5rem)" }}>
      {/* Mobile tab bar */}
      <div className="md:hidden flex border-b border-border bg-card shrink-0">
        {(["map", "list"] as MobileTab[]).map((tab) => (
          <button
            key={tab}
            type="button"
            onClick={() => setMobileTab(tab)}
            className={cn(
              "flex-1 flex items-center justify-center gap-2 py-2.5 text-[13px] font-medium transition-colors",
              mobileTab === tab ? "text-primary border-b-2 border-primary" : "text-muted-foreground"
            )}
          >
            {tab === "map" ? <MapIcon size={14} /> : <List size={14} />}
            {tab === "map" ? "Mapa" : "Lista"}
          </button>
        ))}
      </div>

      {/* Split layout */}
      <div className="flex flex-1 overflow-hidden">

        {/* ── MAP ───────────────────────────────────────────── */}
        <div className={cn("flex-1 relative", mobileTab === "list" ? "hidden md:block" : "block")}>
          {MapComponent ? (
            <MapComponent markers={markers} selectedId={selectedId} onMarkerClick={handleMarkerClick} />
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center bg-accent/30 gap-3">
              <div className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
              <p className="text-[13px] text-muted-foreground">Ładowanie mapy…</p>
            </div>
          )}
        </div>

        {/* ── SIDEBAR ───────────────────────────────────────── */}
        <aside
          className={cn(
            "w-full md:w-[380px] shrink-0 flex flex-col bg-card border-l border-border overflow-hidden",
            mobileTab === "map" ? "hidden md:flex" : "flex"
          )}
        >
          {/* Sidebar header */}
          <div className="px-4 py-4 border-b border-border shrink-0">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-[15px] font-bold text-foreground">
                  {items.length} wyników
                </h2>
                <p className="text-[12px] text-muted-foreground mt-0.5">Kraków · wszystkie typy</p>
              </div>
              <div className="flex items-center gap-1.5">
                {Object.entries(KIND_META).map(([kind, meta]) => (
                  <span
                    key={kind}
                    title={meta.label}
                    className={cn("inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium", meta.bgClass, meta.textClass)}
                  >
                    {meta.emoji} {meta.label}
                  </span>
                ))}
              </div>
            </div>

            {selectedItem && (
              <div className="mt-3 flex items-center justify-between rounded-lg bg-accent/60 px-3 py-2">
                <Link
                  href={selectedItem.href}
                  className="text-[12px] font-medium text-primary hover:underline line-clamp-1 flex-1 min-w-0"
                >
                  {selectedItem.title}
                </Link>
                <button
                  type="button"
                  onClick={() => setSelectedId(null)}
                  className="shrink-0 ml-2 text-muted-foreground hover:text-foreground transition-colors"
                  aria-label="Odznacz"
                >
                  <X size={13} />
                </button>
              </div>
            )}
          </div>

          {/* Scrollable list */}
          <div className="flex-1 overflow-y-auto">
            {items.map((item) => {
              const isSelected = item.id === selectedId;
              return (
                <SidebarRow
                  key={item.id}
                  item={item}
                  selected={isSelected}
                  onClick={() => setSelectedId((prev) => (prev === item.id ? null : item.id))}
                  rowRef={isSelected ? selectedRowRef : undefined}
                />
              );
            })}
          </div>
        </aside>
      </div>
    </div>
  );
}
