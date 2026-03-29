"use client";

import { useState, useMemo, useEffect } from "react";
import { Search, LayoutGrid, MapIcon } from "lucide-react";
import { PLACE_TYPE_LABELS, PLACE_TYPE_ICONS } from "@/lib/mock-data";
import { ContentCard } from "@/components/ui/content-card";
import { cn } from "@/lib/utils";
import type { Place, PlaceType } from "@/types/database";

const placeTypes = Object.keys(PLACE_TYPE_LABELS).filter((k) => k !== "inne") as PlaceType[];

type ViewMode = "list" | "map";

interface MarkerGroup {
  coords: [number, number];
  events: { id: string; title: string; slug: string; venue_name: string }[];
  label: string;
}

interface PlacesListViewProps {
  places: Place[];
}

export function PlacesListView({ places }: PlacesListViewProps) {
  const [search, setSearch] = useState("");
  const [activeType, setActiveType] = useState<PlaceType | null>(null);
  const [view, setView] = useState<ViewMode>("list");
  const [MapComponent, setMapComponent] = useState<React.ComponentType<{ groups: MarkerGroup[] }> | null>(null);

  // Lazy load map component
  useEffect(() => {
    if (view === "map" && !MapComponent) {
      import("@/app/wydarzenia/map-leaflet").then((mod) => {
        setMapComponent(() => mod.MapLeaflet);
      });
    }
  }, [view, MapComponent]);

  const filtered = useMemo(() => {
    let result = places;
    if (search) {
      const q = search.toLowerCase();
      result = result.filter((p) =>
        [p.title, p.description_short, p.address].join(" ").toLowerCase().includes(q)
      );
    }
    if (activeType) {
      result = result.filter((p) => p.place_type === activeType);
    }
    return result;
  }, [places, search, activeType]);

  // Group by place_type preserving order
  const grouped = useMemo(() => {
    const groups: { type: PlaceType; label: string; icon: string; places: Place[] }[] = [];
    const seen = new Set<string>();
    for (const place of filtered) {
      const t = place.place_type;
      if (!seen.has(t)) {
        seen.add(t);
        groups.push({
          type: t,
          label: PLACE_TYPE_LABELS[t] || t,
          icon: PLACE_TYPE_ICONS[t] || "📍",
          places: [],
        });
      }
      groups.find((g) => g.type === t)!.places.push(place);
    }
    return groups;
  }, [filtered]);

  // Map marker groups
  const mapGroups = useMemo((): MarkerGroup[] => {
    const groups: Record<string, MarkerGroup> = {};
    for (const place of filtered) {
      if (!place.lat || !place.lng) continue;
      const key = `${place.lat},${place.lng}`;
      if (!groups[key]) {
        groups[key] = { coords: [place.lat, place.lng], events: [], label: place.title };
      }
      groups[key].events.push({
        id: place.id,
        title: place.title,
        slug: place.slug,
        venue_name: place.address,
      });
    }
    return Object.values(groups);
  }, [filtered]);

  return (
    <div className="container-page pt-5 pb-10">
      <div className="flex items-center justify-between mb-1">
        <h1 className="text-2xl font-bold text-foreground tracking-[-0.02em]">Miejsca</h1>
        <div className="flex items-center gap-1 rounded-xl border border-border p-1 bg-accent/50">
          <button
            onClick={() => setView("list")}
            className={cn(
              "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[13px] font-medium transition-all duration-200",
              view === "list"
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground hover:bg-card/60"
            )}
          >
            <LayoutGrid size={15} />
            Lista
          </button>
          <button
            onClick={() => setView("map")}
            className={cn(
              "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[13px] font-medium transition-all duration-200",
              view === "map"
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground hover:bg-card/60"
            )}
          >
            <MapIcon size={15} />
            Mapa
          </button>
        </div>
      </div>
      <p className="text-[14px] text-muted mb-6">Ciekawe miejsca dla rodzin w Krakowie</p>

      <div className="relative mb-5">
        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground/50" />
        <input
          type="text"
          placeholder="Szukaj..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-9 pr-3 py-2 rounded-xl border border-border bg-card text-[13px] text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/40 transition-all duration-200"
        />
      </div>

      <div className="flex flex-wrap gap-1.5 mb-8">
        <button
          onClick={() => setActiveType(null)}
          className={cn(
            "px-3 py-1.5 rounded-lg text-[13px] font-medium border transition-all duration-200",
            !activeType
              ? "bg-primary text-primary-foreground border-primary"
              : "bg-card text-muted border-border hover:border-primary/30 hover:text-foreground"
          )}
        >
          Wszystkie
        </button>
        {placeTypes.map((type) => {
          const count = places.filter((p) => p.place_type === type).length;
          if (count === 0) return null;
          return (
            <button
              key={type}
              onClick={() => setActiveType(activeType === type ? null : type)}
              className={cn(
                "px-3 py-1.5 rounded-lg text-[13px] font-medium border transition-all duration-200",
                activeType === type
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-card text-muted border-border hover:border-primary/30 hover:text-foreground"
              )}
            >
              {PLACE_TYPE_ICONS[type]} {PLACE_TYPE_LABELS[type]}
              <span className="ml-1 text-[11px] opacity-70">({count})</span>
            </button>
          );
        })}
      </div>

      {view === "map" ? (
        <div className="rounded-xl overflow-hidden border border-border" style={{ height: "500px" }}>
          {MapComponent ? (
            <MapComponent groups={mapGroups} />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-accent/20">
              <p className="text-[13px] text-muted">Ładowanie mapy...</p>
            </div>
          )}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16">
          <Search size={32} className="mx-auto text-muted-foreground/20 mb-3" />
          <p className="text-[14px] text-muted">Brak miejsc pasujących do filtrów.</p>
        </div>
      ) : (
        <div className="space-y-12">
          {grouped.map((group) => (
            <section key={group.type}>
              <div className="flex items-center gap-2 mb-4">
                <span className="text-lg">{group.icon}</span>
                <h2 className="text-[15px] font-semibold text-foreground">{group.label}</h2>
                <span className="text-[12px] text-muted-foreground">({group.places.length})</span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                {group.places.map((place) => (
                  <ContentCard key={place.id} item={place} />
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
