"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { Search, ArrowRight, SlidersHorizontal, X, MapPin, Users } from "lucide-react";
import { ContentCard } from "@/components/ui/content-card";
import { ImageWithFallback } from "@/components/ui/image-with-fallback";
import { CATEGORY_LABELS, CATEGORY_ICONS, PLACE_TYPE_LABELS, PLACE_TYPE_ICONS } from "@/lib/mock-data";
import { cn, formatDateShort, formatAgeRange, thumbUrl } from "@/lib/utils";
import type { Event, Place, Camp, Activity, EventCategory, PlaceType } from "@/types/database";

const DAYS_PL = ["Nd", "Pn", "Wt", "Śr", "Cz", "Pt", "So"];

interface OrganizerTile {
  key: string;
  name: string;
  leadCamp: Camp;
  camps: Camp[];
}

function getOrganizerName(camp: Camp): string {
  return camp.organizer?.trim() || camp.venue_name?.trim() || camp.title;
}

function getSessionLabel(count: number): string {
  if (count === 1) return "1 turnus";
  if (count < 5) return `${count} turnusy`;
  return `${count} turnusów`;
}

function getOrganizerDistrictSummary(camps: Camp[]): string {
  return Array.from(new Set(camps.map((c) => c.district))).join(" • ");
}

function getOrganizerAgeSummary(camps: Camp[]): string {
  const mins = camps.map((c) => c.age_min).filter((a): a is number => a !== null);
  const maxes = camps.map((c) => c.age_max).filter((a): a is number => a !== null);
  const min = mins.length > 0 ? Math.min(...mins) : null;
  const max = maxes.length > 0 ? Math.max(...maxes) : null;
  return formatAgeRange(min, max);
}

function getDateChipLabel(camp: Camp): string {
  const start = new Date(camp.date_start + "T00:00:00");
  const end = new Date(camp.date_end + "T00:00:00");
  const startLabel = `${DAYS_PL[start.getDay()]} ${formatDateShort(camp.date_start)}`;
  if (camp.date_start === camp.date_end) return startLabel;
  return `${startLabel} – ${DAYS_PL[end.getDay()]} ${formatDateShort(camp.date_end)}`;
}

function SectionLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link href={href} className="group inline-flex items-center gap-1 text-[13px] font-medium text-primary hover:text-primary-hover transition-colors">
      {children}
      <ArrowRight size={13} className="group-hover:translate-x-0.5 transition-transform duration-200" />
    </Link>
  );
}

const categoryKeys = Object.keys(CATEGORY_LABELS).filter((k) => k !== "inne") as EventCategory[];
const placeTypeKeys = Object.keys(PLACE_TYPE_LABELS).filter((k) => k !== "inne") as PlaceType[];

const AGE_GROUPS = [
  { key: "0-3", label: "0–3 lata", icon: "👶", min: 0, max: 3 },
  { key: "4-6", label: "4–6 lat", icon: "🧒", min: 4, max: 6 },
  { key: "7-10", label: "7–10 lat", icon: "🎒", min: 7, max: 10 },
  { key: "11-14", label: "11–14 lat", icon: "🧑", min: 11, max: 14 },
  { key: "15+", label: "15+ lat", icon: "🎓", min: 15, max: 99 },
] as const;

interface HomeFilteredViewProps {
  events: Event[];
  places: Place[];
  camps: Camp[];
  activities: Activity[];
}

export function HomeFilteredView({ events, places, camps, activities }: HomeFilteredViewProps) {
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState<EventCategory | null>(null);
  const [activePlaceType, setActivePlaceType] = useState<PlaceType | null>(null);
  const [activeAgeGroup, setActiveAgeGroup] = useState<string | null>(null);
  const [filtersOpen, setFiltersOpen] = useState(false);

  const ageGroup = AGE_GROUPS.find((g) => g.key === activeAgeGroup) ?? null;
  const hasActiveFilters = !!(search || activeCategory || activePlaceType || activeAgeGroup !== null);
  const hasEventFilters = !!(search || activeCategory || activeAgeGroup !== null);
  const hasPlaceFilters = !!(search || activePlaceType || activeAgeGroup !== null);
  const hasEventTypeFilter = !!activeCategory;
  const hasPlaceTypeFilter = !!activePlaceType;

  const filteredEvents = useMemo(() => {
    let result = events;
    if (search) {
      const q = search.toLowerCase();
      result = result.filter((e) =>
        [e.title, e.description_short, e.venue_name, e.district].join(" ").toLowerCase().includes(q)
      );
    }
    if (activeCategory) result = result.filter((e) => e.category === activeCategory);
    if (ageGroup) {
      result = result.filter((e) =>
        (e.age_min === null || e.age_min <= ageGroup.max) &&
        (e.age_max === null || e.age_max >= ageGroup.min)
      );
    }
    return [...result].sort((a, b) => b.likes - a.likes);
  }, [events, search, activeCategory, ageGroup]);

  const filteredPlaces = useMemo(() => {
    let result = places;
    if (search) {
      const q = search.toLowerCase();
      result = result.filter((p) =>
        [p.title, p.description_short, p.street, p.city, p.district].join(" ").toLowerCase().includes(q)
      );
    }
    if (activePlaceType) result = result.filter((p) => p.place_type === activePlaceType);
    if (ageGroup) {
      result = result.filter((p) =>
        (p.age_min === null || p.age_min <= ageGroup.max) &&
        (p.age_max === null || p.age_max >= ageGroup.min)
      );
    }
    return [...result].sort((a, b) => b.likes - a.likes);
  }, [places, search, activePlaceType, ageGroup]);

  function toggleCategoryFilter(nextCategory: EventCategory) {
    const willActivate = activeCategory !== nextCategory;
    setActiveCategory(willActivate ? nextCategory : null);
    if (willActivate) setActivePlaceType(null);
  }

  function togglePlaceTypeFilter(nextPlaceType: PlaceType) {
    const willActivate = activePlaceType !== nextPlaceType;
    setActivePlaceType(willActivate ? nextPlaceType : null);
    if (willActivate) setActiveCategory(null);
  }

  function clearFilters() {
    setSearch("");
    setActiveCategory(null);
    setActivePlaceType(null);
    setActiveAgeGroup(null);
  }

  const organizers = useMemo<OrganizerTile[]>(() => {
    const map = new Map<string, OrganizerTile>();
    [...camps]
      .sort((a, b) => new Date(a.date_start).getTime() - new Date(b.date_start).getTime())
      .forEach((camp) => {
        const name = camp.organizer_data?.name ?? getOrganizerName(camp);
        const key = camp.organizer_id ? `id:${camp.organizer_id}` : name.toLowerCase();
        const existing = map.get(key);
        if (!existing) {
          map.set(key, { key, name, leadCamp: camp, camps: [camp] });
        } else {
          existing.camps.push(camp);
          if (!existing.leadCamp.image_url && camp.image_url) {
            existing.leadCamp = camp;
          }
        }
      });
    return Array.from(map.values()).slice(0, 8);
  }, [camps]);

  const visiblePlaces = hasPlaceFilters ? filteredPlaces : filteredPlaces.slice(0, 8);
  const visibleEvents = hasEventFilters ? filteredEvents : filteredEvents.slice(0, 8);

  const showPlacesSection = !hasEventTypeFilter || hasPlaceTypeFilter;
  const showEventsSection = !hasPlaceTypeFilter || hasEventTypeFilter;

  const showPlaces = showPlacesSection && places.length > 0 && visiblePlaces.length > 0;
  const showEvents = showEventsSection && events.length > 0 && visibleEvents.length > 0;
  const showEmpty = (hasEventFilters || hasPlaceFilters) && !showPlaces && !showEvents;

  return (
    <div className="container-page pt-5 pb-10">
      {/* Mobile top bar */}
      <div className="lg:hidden rounded-xl border border-border bg-card p-3 mb-4 flex items-center gap-2">
        <button
          onClick={() => setFiltersOpen(!filtersOpen)}
          className={cn("inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-[12px] font-semibold border-2 transition-all duration-200",
            filtersOpen || hasActiveFilters ? "bg-primary text-primary-foreground border-primary" : "bg-primary/5 text-foreground border-primary/20 hover:bg-primary/10")}
        >
          <SlidersHorizontal size={13} />
          Filtry
          {hasActiveFilters && <span className="w-1.5 h-1.5 rounded-full bg-primary-foreground" />}
        </button>
        <div className="relative flex-1">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground/50" />
          <input type="text" placeholder="Szukaj wydarzeń i miejsc..." value={search} onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 rounded-lg border border-border bg-background text-[12px] text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/40 transition-all duration-200" />
        </div>
      </div>

      {/* Mobile filters dropdown */}
      {filtersOpen && (
        <div className="lg:hidden rounded-xl border border-border bg-card p-4 mb-4 space-y-3">
          <div>
            <p className="text-[11px] font-medium text-muted-foreground mb-1.5">Typ miejsca</p>
            <div className="flex flex-wrap gap-1.5">
              {placeTypeKeys.map((type) => {
                const count = places.filter((p) => p.place_type === type).length;
                if (count === 0) return null;
                return (
                  <button key={type} onClick={() => togglePlaceTypeFilter(type)}
                    className={cn("px-2.5 py-1 rounded-lg text-[11px] font-medium border transition-all duration-200",
                      activePlaceType === type ? "bg-primary text-primary-foreground border-primary" : "bg-background text-muted border-border hover:border-primary/30 hover:text-foreground")}>
                    {PLACE_TYPE_ICONS[type]} {PLACE_TYPE_LABELS[type]}
                  </button>
                );
              })}
            </div>
          </div>
          <div>
            <p className="text-[11px] font-medium text-muted-foreground mb-1.5">Kategoria wydarzeń</p>
            <div className="flex flex-wrap gap-1.5">
              {categoryKeys.map((key) => {
                const count = events.filter((e) => e.category === key).length;
                if (count === 0) return null;
                return (
                  <button key={key} onClick={() => toggleCategoryFilter(key)}
                    className={cn("px-2.5 py-1 rounded-lg text-[11px] font-medium border transition-all duration-200",
                      activeCategory === key ? "bg-primary text-primary-foreground border-primary" : "bg-background text-muted border-border hover:border-primary/30 hover:text-foreground")}>
                    {CATEGORY_ICONS[key]} {CATEGORY_LABELS[key]}
                  </button>
                );
              })}
            </div>
          </div>
          <div>
            <p className="text-[11px] font-medium text-muted-foreground mb-1.5">Wiek dziecka</p>
            <div className="flex flex-wrap gap-1.5">
              {AGE_GROUPS.map((group) => (
                <button key={group.key} onClick={() => setActiveAgeGroup(activeAgeGroup === group.key ? null : group.key)}
                  className={cn("px-2.5 py-1 rounded-lg text-[11px] font-medium border transition-all duration-200",
                    activeAgeGroup === group.key ? "bg-primary text-primary-foreground border-primary" : "bg-background text-muted border-border hover:border-primary/30 hover:text-foreground")}>
                  {group.icon} {group.label}
                </button>
              ))}
            </div>
          </div>
          {hasActiveFilters && (
            <button onClick={clearFilters} className="inline-flex items-center gap-1 text-[11px] font-medium text-muted-foreground hover:text-foreground transition-colors">
              <X size={11} /> Wyczyść filtry
            </button>
          )}
        </div>
      )}

      {/* Desktop layout */}
      <div className="lg:flex lg:gap-6 lg:items-start">

        {/* Sidebar — desktop only */}
        <aside className="hidden lg:block w-56 shrink-0 sticky top-20">
          <div className="rounded-xl border border-border bg-card p-3 space-y-3">
            <div className="relative">
              <Search size={11} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground/50" />
              <input type="text" placeholder="Szukaj..." value={search} onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-7 pr-2 py-1 rounded-lg border border-border bg-background text-[11px] text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/40 transition-all duration-200" />
            </div>

            <div className="border-t border-border" />

            <div>
              <p className="text-[9px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">Typ miejsca</p>
              <div className="flex flex-col gap-0.5">
                {placeTypeKeys.map((type) => {
                  const count = places.filter((p) => p.place_type === type).length;
                  if (count === 0) return null;
                  return (
                    <button key={type} onClick={() => togglePlaceTypeFilter(type)}
                      className={cn("flex items-center gap-1.5 px-2 py-1 rounded-md text-[11px] font-medium text-left transition-all duration-200",
                        activePlaceType === type ? "bg-primary text-primary-foreground" : "text-foreground hover:bg-accent")}>
                      <span>{PLACE_TYPE_ICONS[type]}</span>
                      <span className="flex-1">{PLACE_TYPE_LABELS[type]}</span>
                      <span className="text-[9px] opacity-40">{count}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <p className="text-[9px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">Kategoria wydarzeń</p>
              <div className="flex flex-col gap-0.5">
                {categoryKeys.map((key) => {
                  const count = events.filter((e) => e.category === key).length;
                  if (count === 0) return null;
                  return (
                    <button key={key} onClick={() => toggleCategoryFilter(key)}
                      className={cn("flex items-center gap-1.5 px-2 py-1 rounded-md text-[11px] font-medium text-left transition-all duration-200",
                        activeCategory === key ? "bg-primary text-primary-foreground" : "text-foreground hover:bg-accent")}>
                      <span>{CATEGORY_ICONS[key]}</span>
                      <span className="flex-1">{CATEGORY_LABELS[key]}</span>
                      <span className="text-[9px] opacity-40">{count}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <p className="text-[9px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">Wiek</p>
              <div className="flex flex-col gap-0.5">
                {AGE_GROUPS.map((group) => (
                  <button key={group.key} onClick={() => setActiveAgeGroup(activeAgeGroup === group.key ? null : group.key)}
                    className={cn("flex items-center gap-1.5 px-2 py-1 rounded-md text-[11px] font-medium text-left transition-all duration-200",
                      activeAgeGroup === group.key ? "bg-primary text-primary-foreground" : "text-foreground hover:bg-accent")}>
                    <span>{group.icon}</span>
                    <span>{group.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {hasActiveFilters && (
              <button onClick={clearFilters} className="inline-flex items-center gap-1 text-[10px] font-medium text-muted-foreground hover:text-foreground transition-colors pt-2 border-t border-border w-full">
                <X size={10} />Wyczyść filtry
              </button>
            )}
          </div>
        </aside>

        {/* Main content */}
        <div className="flex-1 min-w-0 space-y-10">

          {/* Empty state */}
          {showEmpty && (
            <div className="text-center py-16">
              <Search size={32} className="mx-auto text-muted-foreground/20 mb-3" />
              <p className="text-[14px] text-muted mb-3">Brak wyników pasujących do filtrów.</p>
              <button onClick={clearFilters} className="text-[12px] font-medium text-primary hover:text-primary-hover transition-colors">
                Wyczyść filtry
              </button>
            </div>
          )}

          {/* Places section */}
          {showPlaces && (
            <section>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-[15px] font-semibold text-foreground">
                  Ciekawe miejsca
                  {hasPlaceFilters && <span className="ml-2 text-[12px] font-normal text-muted-foreground">({filteredPlaces.length})</span>}
                </h2>
                <SectionLink href="/miejsca">Wszystkie</SectionLink>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {visiblePlaces.map((place, idx) => (
                  <div key={place.id} className={!hasPlaceFilters && idx >= 4 ? "hidden sm:block" : ""}>
                    <ContentCard item={place} />
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Events section */}
          {showEvents && (
            <section>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-[15px] font-semibold text-foreground">
                  Nadchodzące wydarzenia
                  {hasEventFilters && <span className="ml-2 text-[12px] font-normal text-muted-foreground">({filteredEvents.length})</span>}
                </h2>
                <SectionLink href="/wydarzenia">Wszystkie</SectionLink>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {visibleEvents.map((event, idx) => (
                  <div key={event.id} className={!hasEventFilters && idx >= 4 ? "hidden sm:block" : ""}>
                    <ContentCard item={event} />
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Camps section */}
          {!hasActiveFilters && organizers.length > 0 && (
            <section>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-[15px] font-semibold text-foreground">Kolonie dla dzieci</h2>
                <SectionLink href="/kolonie">Wszystkie</SectionLink>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {organizers.map((organizer, idx) => (
                  <div key={organizer.key} className={idx >= 4 ? "hidden sm:block" : ""}>
                    <article className="rounded-xl border border-border bg-card shadow-[var(--shadow-card)] hover:shadow-[var(--shadow-card-hover)] hover:-translate-y-0.5 transition-all duration-200 overflow-hidden">
                      <Link href={`/kolonie/${organizer.leadCamp.slug}`} className="group flex overflow-hidden h-[160px]">
                        <div className="w-[160px] shrink-0 relative self-stretch bg-accent">
                          {organizer.leadCamp.image_url ? (
                            <ImageWithFallback
                              src={thumbUrl(organizer.leadCamp.image_thumb, organizer.leadCamp.image_url) || organizer.leadCamp.image_url}
                              alt={organizer.name}
                              className="h-full w-full object-contain bg-accent/30 transition-transform duration-300 group-hover:scale-[1.03]"
                              loading="lazy"
                            />
                          ) : (
                            <div className="flex h-full w-full items-center justify-center text-3xl text-muted-foreground/30">⛺</div>
                          )}
                          <span className="absolute bottom-2 left-2 inline-flex items-center gap-1 rounded-full bg-white px-2 py-1 text-[10px] font-semibold text-foreground shadow-[var(--shadow-soft)] border border-border/70">
                            {getSessionLabel(organizer.camps.length)}
                          </span>
                        </div>
                        <div className="flex-1 min-w-0 p-3 flex flex-col gap-1.5">
                          <h3 className="font-semibold text-[13px] text-foreground leading-snug group-hover:text-primary transition-colors duration-200 line-clamp-2">
                            {organizer.name}
                          </h3>
                          {organizer.leadCamp.description_short && (
                            <p className="text-[11px] text-muted leading-relaxed line-clamp-2">
                              {organizer.leadCamp.description_short}
                            </p>
                          )}
                          <div className="mt-auto space-y-0.5">
                            <div className="flex items-center gap-1 text-[10px] text-muted">
                              <MapPin size={9} className="text-secondary/60 shrink-0" />
                              <span className="truncate">{getOrganizerDistrictSummary(organizer.camps)}</span>
                            </div>
                            <div className="flex items-center gap-1 text-[10px] text-muted">
                              <Users size={9} className="text-secondary/60 shrink-0" />
                              <span className="truncate">{getOrganizerAgeSummary(organizer.camps)}</span>
                            </div>
                          </div>
                        </div>
                      </Link>
                      <div className="border-t border-border/70 bg-background/40 px-3 py-2.5">
                        <div className="flex flex-wrap gap-1.5">
                          {organizer.camps.map((camp) => (
                            <span
                              key={camp.id}
                              className="inline-flex items-center rounded-full border border-border/80 bg-background px-2 py-0.5 text-[9px] font-medium text-foreground"
                            >
                              {getDateChipLabel(camp)}
                            </span>
                          ))}
                        </div>
                      </div>
                    </article>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Activities section */}
          {!hasActiveFilters && activities.length > 0 && (
            <section>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-[15px] font-semibold text-foreground">Zajęcia pozaszkolne</h2>
                <SectionLink href="/zajecia">Wszystkie</SectionLink>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {activities.map((activity, idx) => (
                  <div key={activity.id} className={idx >= 4 ? "hidden sm:block" : ""}>
                    <ContentCard item={activity} />
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>
      </div>
    </div>
  );
}
