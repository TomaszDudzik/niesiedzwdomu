"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Search, SlidersHorizontal, X, MapPin, Users, Wallet, ArrowUpRight } from "lucide-react";
import { ACTIVITY_TYPE_LABELS, ACTIVITY_TYPE_ICONS, DISTRICT_LIST } from "@/lib/mock-data";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { Activity, ActivityType, District } from "@/types/database";

const activityTypes = Object.keys(ACTIVITY_TYPE_LABELS).filter((key) => key !== "inne") as ActivityType[];

const AGE_GROUPS = [
  { key: "0-4", label: "0–4 lata", icon: "👶", min: 0, max: 4 },
  { key: "5-7", label: "5–7 lat", icon: "🧒", min: 5, max: 7 },
  { key: "8-10", label: "8–10 lat", icon: "🎒", min: 8, max: 10 },
  { key: "11-14", label: "11–14 lat", icon: "🧑", min: 11, max: 14 },
  { key: "15+", label: "15+ lat", icon: "🎓", min: 15, max: 99 },
] as const;

interface ActivitiesListViewProps {
  activities: Activity[];
}

function formatAge(activity: Activity): string {
  if (activity.age_min !== null && activity.age_max !== null) return `${activity.age_min}-${activity.age_max} lat`;
  if (activity.age_min !== null) return `od ${activity.age_min} lat`;
  if (activity.age_max !== null) return `do ${activity.age_max} lat`;
  return "Różne grupy wiekowe";
}

function formatPrice(activity: Activity): string {
  if (activity.is_free) return "Bezpłatne";
  if (activity.price_from !== null && activity.price_to !== null) return `${activity.price_from}-${activity.price_to} zł`;
  if (activity.price_from !== null) return `od ${activity.price_from} zł`;
  if (activity.price_to !== null) return `do ${activity.price_to} zł`;
  return "Cena do ustalenia";
}

export function ActivitiesListView({ activities }: ActivitiesListViewProps) {
  const [search, setSearch] = useState("");
  const [activeType, setActiveType] = useState<ActivityType | null>(null);
  const [activeDistrict, setActiveDistrict] = useState<District | null>(null);
  const [activeAgeGroup, setActiveAgeGroup] = useState<string | null>(null);
  const [freeOnly, setFreeOnly] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);

  const ageGroup = AGE_GROUPS.find((group) => group.key === activeAgeGroup) ?? null;
  const hasActiveFilters = search || activeType || activeDistrict || activeAgeGroup !== null || freeOnly;

  const filtered = useMemo(() => {
    let result = activities;
    if (search) {
      const query = search.toLowerCase();
      result = result.filter((activity) =>
        [activity.title, activity.description_short, activity.venue_name, activity.venue_address, activity.organizer]
          .join(" ").toLowerCase().includes(query)
      );
    }
    if (activeType) result = result.filter((activity) => activity.activity_type === activeType);
    if (activeDistrict) result = result.filter((activity) => activity.district === activeDistrict);
    if (freeOnly) result = result.filter((activity) => activity.is_free);
    if (ageGroup) {
      result = result.filter((activity) =>
        (activity.age_min === null || activity.age_min <= ageGroup.max) &&
        (activity.age_max === null || activity.age_max >= ageGroup.min)
      );
    }
    return result;
  }, [activities, search, activeType, activeDistrict, freeOnly, ageGroup]);

  const grouped = useMemo(() => {
    const groups: { type: ActivityType; label: string; icon: string; activities: Activity[] }[] = [];
    const seen = new Set<string>();
    for (const activity of filtered) {
      const type = activity.activity_type;
      if (!seen.has(type)) {
        seen.add(type);
        groups.push({ type, label: ACTIVITY_TYPE_LABELS[type] || type, icon: ACTIVITY_TYPE_ICONS[type] || "✨", activities: [] });
      }
      groups.find((group) => group.type === type)!.activities.push(activity);
    }
    return groups;
  }, [filtered]);

  const availableDistricts = useMemo(() => {
    const set = new Set<string>();
    activities.forEach((activity) => set.add(activity.district));
    return DISTRICT_LIST.filter((district) => set.has(district));
  }, [activities]);

  function clearFilters() {
    setSearch("");
    setActiveType(null);
    setActiveDistrict(null);
    setActiveAgeGroup(null);
    setFreeOnly(false);
  }

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
          <input type="text" placeholder="Szukaj zajęć..." value={search} onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 rounded-lg border border-border bg-background text-[12px] text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/40 transition-all duration-200" />
        </div>
        <button onClick={() => setFreeOnly(!freeOnly)}
          className={cn("px-2.5 py-1.5 rounded-lg text-[11px] font-medium border transition-all duration-200 shrink-0",
            freeOnly ? "bg-primary text-primary-foreground border-primary" : "bg-background text-muted border-border hover:border-primary/30")}>
          Bezpłatne
        </button>
      </div>

      {/* Mobile filters dropdown */}
      {filtersOpen && (
        <div className="lg:hidden rounded-xl border border-border bg-card p-4 mb-4 space-y-3">
          <div>
            <p className="text-[11px] font-medium text-muted-foreground mb-1.5">Typ zajęć</p>
            <div className="flex flex-wrap gap-1.5">
              {activityTypes.map((type) => {
                const count = activities.filter((a) => a.activity_type === type).length;
                if (count === 0) return null;
                return (
                  <button key={type} onClick={() => setActiveType(activeType === type ? null : type)}
                    className={cn("px-2.5 py-1 rounded-lg text-[11px] font-medium border transition-all duration-200",
                      activeType === type ? "bg-primary text-primary-foreground border-primary" : "bg-background text-muted border-border hover:border-primary/30 hover:text-foreground")}>
                    {ACTIVITY_TYPE_ICONS[type]} {ACTIVITY_TYPE_LABELS[type]}
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
          <select value={activeDistrict || ""} onChange={(e) => setActiveDistrict(e.target.value ? (e.target.value as District) : null)}
            className="w-full px-2.5 py-1.5 rounded-lg border border-border bg-background text-[11px] text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20">
            <option value="">Wszystkie dzielnice</option>
            {availableDistricts.map((d) => <option key={d} value={d}>{d}</option>)}
          </select>
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

            <div>
              <p className="text-[9px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">Typ zajęć</p>
              <div className="flex flex-col gap-0.5">
                {activityTypes.map((type) => {
                  const count = activities.filter((a) => a.activity_type === type).length;
                  if (count === 0) return null;
                  return (
                    <button key={type} onClick={() => setActiveType(activeType === type ? null : type)}
                      className={cn("flex items-center gap-1.5 px-2 py-1 rounded-md text-[11px] font-medium text-left transition-all duration-200",
                        activeType === type ? "bg-primary text-primary-foreground" : "text-foreground hover:bg-accent")}>
                      <span>{ACTIVITY_TYPE_ICONS[type]}</span>
                      <span className="flex-1">{ACTIVITY_TYPE_LABELS[type]}</span>
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

            <div>
              <p className="text-[9px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">
                <MapPin size={9} className="inline mr-1" />Dzielnica
              </p>
              <select value={activeDistrict || ""} onChange={(e) => setActiveDistrict(e.target.value ? (e.target.value as District) : null)}
                className="w-full px-2 py-1 rounded-lg border border-border bg-background text-[11px] text-foreground focus:outline-none focus:ring-1 focus:ring-primary/20 transition-all duration-200">
                <option value="">Wszystkie</option>
                {availableDistricts.map((d) => <option key={d} value={d}>{d}</option>)}
              </select>
            </div>

            <button onClick={() => setFreeOnly(!freeOnly)}
              className={cn("w-full px-2 py-1.5 rounded-lg text-[11px] font-medium border transition-all duration-200",
                freeOnly ? "bg-primary text-primary-foreground border-primary" : "bg-background text-muted border-border hover:border-primary/30 hover:text-foreground")}>
              Bezpłatne
            </button>

            {hasActiveFilters && (
              <button onClick={clearFilters} className="inline-flex items-center gap-1 text-[10px] font-medium text-muted-foreground hover:text-foreground transition-colors pt-2 border-t border-border w-full">
                <X size={10} />Wyczyść filtry
              </button>
            )}
          </div>
        </aside>

        {/* Main content */}
        <div className="flex-1 min-w-0">
          {filtered.length === 0 ? (
            <div className="text-center py-16">
              <Search size={32} className="mx-auto text-muted-foreground/20 mb-3" />
              <p className="text-[14px] text-muted mb-3">Brak zajęć pasujących do filtrów.</p>
              {hasActiveFilters && (
                <button onClick={clearFilters} className="text-[12px] font-medium text-primary hover:text-primary-hover transition-colors">
                  Wyczyść filtry
                </button>
              )}
            </div>
          ) : (
            <div className="space-y-12">
              {grouped.map((group) => (
                <section key={group.type}>
                  <div className="flex items-center gap-2 mb-4">
                    <span className="text-lg">{group.icon}</span>
                    <h2 className="text-[15px] font-semibold text-foreground">{group.label}</h2>
                    <span className="text-[12px] text-muted-foreground">({group.activities.length})</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {group.activities.map((activity) => (
                      <article key={activity.id}
                        className="rounded-xl border border-border bg-card shadow-[var(--shadow-card)] hover:shadow-[var(--shadow-card-hover)] hover:-translate-y-0.5 transition-all duration-200 overflow-hidden flex h-[160px]">
                        <div className="w-[120px] shrink-0 bg-accent flex items-center justify-center text-4xl text-muted-foreground/40 relative">
                          {activity.image_url ? (
                            <img src={activity.image_url} alt={activity.title} className="w-full h-full object-cover" />
                          ) : (
                            <span>{ACTIVITY_TYPE_ICONS[activity.activity_type]}</span>
                          )}
                        </div>
                        <div className="flex-1 min-w-0 p-3 flex flex-col justify-between">
                          <div>
                            <div className="flex items-center gap-1.5 mb-0.5 flex-wrap">
                              <span className="text-[10px] font-medium text-primary uppercase tracking-wide">
                                {ACTIVITY_TYPE_LABELS[activity.activity_type]}
                              </span>
                              {activity.is_featured && <Badge>polecane</Badge>}
                            </div>
                            <h3 className="font-semibold text-[13px] text-foreground leading-snug line-clamp-2">
                              {activity.title}
                            </h3>
                          </div>
                          <div className="space-y-0.5">
                            <div className="flex items-center gap-2 text-[10px] text-muted">
                              <span className="flex items-center gap-1"><Users size={9} className="text-secondary/60" />{formatAge(activity)}</span>
                              <span className="flex items-center gap-1"><Wallet size={9} className="text-secondary/60" />{formatPrice(activity)}</span>
                            </div>
                            <div className="flex items-center justify-between">
                              <span className="flex items-center gap-1 text-[10px] text-muted truncate">
                                <MapPin size={9} className="text-secondary/60 shrink-0" />
                                <span className="truncate">{activity.venue_name}</span>
                              </span>
                              {(activity.source_url || activity.facebook_url) && (
                                <Link href={activity.source_url || activity.facebook_url || ""} target="_blank" rel="noopener noreferrer"
                                  className="shrink-0 inline-flex items-center gap-0.5 text-[10px] font-medium text-primary hover:text-primary-hover transition-colors ml-1">
                                  <ArrowUpRight size={10} />
                                </Link>
                              )}
                            </div>
                          </div>
                        </div>
                      </article>
                    ))}
                  </div>
                </section>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
