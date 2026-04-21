"use client";

import { useEffect, useMemo, useState } from "react";
import { MapPin, Clock, ExternalLink } from "lucide-react";
import Link from "next/link";
import { getSubcategoryIcon } from "@/lib/content-helpers";
import { cn, formatAgeRange, formatHourMinuteRange, formatPriceRange } from "@/lib/utils";
import type { Event } from "@/types/database";

/* ── Kraków centre & district rough coords for fallback ── */
const KRAKOW_CENTER: [number, number] = [50.0614, 19.9372];

const DISTRICT_COORDS: Record<string, [number, number]> = {
  "Stare Miasto": [50.0614, 19.9372],
  "Kazimierz": [50.0500, 19.9460],
  "Podgórze": [50.0420, 19.9510],
  "Nowa Huta": [50.0720, 20.0370],
  "Krowodrza": [50.0770, 19.9130],
  "Bronowice": [50.0810, 19.8900],
  "Zwierzyniec": [50.0560, 19.8900],
  "Dębniki": [50.0430, 19.9200],
  "Prądnik Czerwony": [50.0870, 19.9550],
  "Prądnik Biały": [50.0950, 19.9200],
  "Czyżyny": [50.0720, 20.0050],
  "Bieżanów-Prokocim": [50.0150, 20.0050],
};

function getEventCoords(event: Event): [number, number] {
  return DISTRICT_COORDS[event.district] || KRAKOW_CENTER;
}

/* ── Group events by location ── */
interface MarkerGroup {
  coords: [number, number];
  events: Event[];
  label: string;
  markerEmoji?: string;
}

function groupByLocation(events: Event[]): MarkerGroup[] {
  const groups: Record<string, MarkerGroup> = {};
  for (const event of events) {
    const coords = getEventCoords(event);
    const key = `${coords[0]},${coords[1]}`;
    if (!groups[key]) {
      groups[key] = {
        coords,
        events: [],
        label: event.street || event.city || event.district,
        markerEmoji: getSubcategoryIcon(event),
      };
    }
    groups[key].events.push(event);
  }
  return Object.values(groups);
}

/* ── Map component (dynamic import avoids SSR issues with Leaflet) ── */
interface MapViewProps {
  events: Event[];
}

export function MapView({ events }: MapViewProps) {
  const [MapComponent, setMapComponent] = useState<React.ComponentType<{ groups: MarkerGroup[] }> | null>(null);
  const [selectedGroup, setSelectedGroup] = useState<MarkerGroup | null>(null);

  const groups = useMemo(() => groupByLocation(events), [events]);

  useEffect(() => {
    // Dynamic import to avoid SSR issues with Leaflet
    import("./map-leaflet").then((mod) => setMapComponent(() => mod.MapLeaflet));
  }, []);

  return (
    <div className="grid lg:grid-cols-5 gap-6">
      <div className="lg:col-span-3">
        <div className="rounded-lg border border-border overflow-hidden" style={{ height: 500 }}>
          {MapComponent ? (
            <MapComponent groups={groups} />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-accent/30">
              <p className="text-[13px] text-muted-foreground">Ładowanie mapy…</p>
            </div>
          )}
        </div>
        <p className="text-[11px] text-muted-foreground mt-2">
          Lokalizacje przybliżone na podstawie dzielnicy. Kliknij marker, aby zobaczyć wydarzenia.
        </p>
      </div>

      <div className="lg:col-span-2">
        <div className="sticky top-20">
          <h3 className="text-[14px] font-semibold text-foreground mb-0.5">
            {selectedGroup ? selectedGroup.label : "Wydarzenia na mapie"}
          </h3>
          <p className="text-[12px] text-muted-foreground mb-4">
            {selectedGroup
              ? `${selectedGroup.events.length} wydarzeń`
              : `${events.length} wydarzeń w ${groups.length} lokalizacjach`}
          </p>

          <div className="space-y-2 max-h-[420px] overflow-y-auto">
            {(selectedGroup ? selectedGroup.events : events.slice(0, 20)).map((event) => (
              <Link
                key={event.id}
                href={`/wydarzenia/${event.slug}`}
                className="block rounded-xl border border-border bg-card p-3 hover:border-primary/25 hover:shadow-[var(--shadow-soft)] transition-all duration-200 group"
              >
                <h4 className="font-medium text-[13px] text-foreground group-hover:text-primary transition-colors duration-200 line-clamp-2 mb-1.5">
                  {event.title}
                </h4>
                <div className="flex items-center gap-3 text-[11px] text-muted">
                  {formatHourMinuteRange(event.time_start, event.time_end) && (
                    <span className="flex items-center gap-1">
                      <Clock size={10} />
                      {formatHourMinuteRange(event.time_start, event.time_end)}
                    </span>
                  )}
                  {(event.street || event.city) && (
                    <span className="flex items-center gap-1">
                      <MapPin size={10} />
                      {[event.street, event.city].filter(Boolean).join(", ")}
                    </span>
                  )}
                </div>
                <div className="flex items-center justify-between mt-1.5">
                  <span className="text-[11px] text-muted">{formatAgeRange(event.age_min, event.age_max)}</span>
                  <span className="text-[12px] font-medium text-foreground">{formatPriceRange(event.price_from, event.price_to, event.is_free)}</span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
