"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { Search, ArrowRight, SlidersHorizontal, X, MapPin, Users, Check, Tags } from "lucide-react";
import { ContentCard } from "@/components/ui/content-card";
import { FilterSection } from "@/components/ui/filter-section";
import { ImageWithFallback } from "@/components/ui/image-with-fallback";
import { useAdminTaxonomy } from "@/lib/use-admin-taxonomy";
import { CATEGORY_LABELS, CATEGORY_ICONS } from "@/lib/mock-data";
import { getTaxonomyOptions, matchesTaxonomyFilter } from "@/lib/taxonomy-filters";
import { cn, formatDateShort, formatAgeRange, thumbUrl } from "@/lib/utils";
import type { Event, Place, Camp, Activity, District } from "@/types/database";

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

function HomeSectionSubmissionCta({
  title,
  description,
  buttonLabel,
  href = "/dodaj",
}: {
  title: string;
  description: string;
  buttonLabel: string;
  href?: string;
}) {
  return (
    <Link
      href={href}
      className="group mb-4 flex w-full items-center gap-3 rounded-2xl border border-sky-200/80 bg-[linear-gradient(180deg,rgba(240,249,255,0.98),rgba(236,253,255,0.98))] px-3 py-3 shadow-[0_14px_34px_-30px_rgba(14,116,144,0.35)] transition-colors duration-200 hover:border-sky-300/90"
    >
      <div className="h-10 w-1 shrink-0 rounded-full bg-cyan-700" />
      <div className="min-w-0 flex-1">
        <p className="text-[12px] font-semibold leading-4 text-slate-900 sm:text-[13px] lg:text-[14px]">{title}</p>
        <p className="mt-1 text-[10px] leading-4 text-slate-600 sm:text-[11px] lg:text-[12px]">{description}</p>
      </div>
      <span className="inline-flex shrink-0 items-center gap-1 whitespace-nowrap rounded-full border border-cyan-700/15 bg-white/85 px-2.5 py-1.5 text-[10px] font-semibold text-cyan-800 shadow-[0_10px_22px_-18px_rgba(8,145,178,0.7)] transition-all duration-200 group-hover:border-cyan-700/30 group-hover:bg-cyan-700 group-hover:text-white sm:px-3 sm:text-[11px]">
        {buttonLabel}
        <ArrowRight size={13} className="transition-transform duration-200 group-hover:translate-x-0.5" />
      </span>
    </Link>
  );
}

const AGE_GROUPS = [
  { key: "0-3", label: "0–3 lata", icon: "👶", min: 0, max: 3 },
  { key: "4-6", label: "4–6 lat", icon: "🧒", min: 4, max: 6 },
  { key: "7-10", label: "7–10 lat", icon: "🎒", min: 7, max: 10 },
  { key: "11-14", label: "11–14 lat", icon: "🧑", min: 11, max: 14 },
  { key: "15+", label: "15+ lat", icon: "🎓", min: 15, max: 99 },
] as const;

const DISTRICT_ICONS: Partial<Record<District, string>> = {
  "Stare Miasto": "🏰",
  "Grzegórzki": "🚋",
  "Kazimierz": "🕍",
  "Podgórze": "🌉",
  "Nowa Huta": "🏭",
  "Krowodrza": "🌿",
  "Bronowice": "🌾",
  "Zwierzyniec": "🦬",
  "Dębniki": "🌊",
  "Prądnik Czerwony": "🌳",
  "Prądnik Biały": "🍃",
  "Czyżyny": "✈️",
  "Bieżanów-Prokocim": "🚋",
  "Łagiewniki-Borek Fałęcki": "⛪",
  "Swoszowice": "♨️",
  "Mistrzejowice": "🏘️",
  "Wzgórza Krzesławickie": "🌄",
  "Inne": "📍",
};

interface HomeFilteredViewProps {
  events: Event[];
  places: Place[];
  camps: Camp[];
  activities: Activity[];
}

interface UnifiedFilterEntry {
  typeLevel2: string | null;
  type: string | null;
  category: string | null;
  district: District;
}

function getEventCategoryLvl1(event: Event) {
  return event.category_lvl_1 ?? event.main_category ?? null;
}

function getEventCategoryLvl2(event: Event) {
  return event.category_lvl_2 ?? event.category;
}

function getEventCategoryLvl3(event: Event) {
  return event.category_lvl_3 ?? event.subcategory ?? null;
}

function getPlaceCategoryLvl1(place: Place) {
  return place.category_lvl_1 ?? place.main_category ?? null;
}

function getPlaceCategoryLvl2(place: Place) {
  return place.category_lvl_2 ?? place.category ?? null;
}

function getCampCategoryLvl1(camp: Camp) {
  return camp.category_lvl_1 ?? camp.main_category ?? null;
}

function getCampCategoryLvl2(camp: Camp) {
  return camp.category_lvl_2 ?? camp.category ?? null;
}

function getActivityCategoryLvl1(activity: Activity) {
  return activity.category_lvl_1 ?? activity.main_category ?? activity.activity_type ?? null;
}

function getActivityCategoryLvl2(activity: Activity) {
  return activity.category_lvl_2 ?? activity.category ?? null;
}

function matchesAgeFilter(ageMin: number | null, ageMax: number | null, ageGroup: typeof AGE_GROUPS[number] | null) {
  if (!ageGroup) {
    return true;
  }

  return (ageMin === null || ageMin <= ageGroup.max) && (ageMax === null || ageMax >= ageGroup.min);
}

export function HomeFilteredView({ events, places, camps, activities }: HomeFilteredViewProps) {
  const { typeLevel2Options: taxonomyTypeLevel2Options } = useAdminTaxonomy();
  const [search, setSearch] = useState("");
  const [activeTypeLevel2, setActiveTypeLevel2] = useState<string[]>([]);
  const [activeTypes, setActiveTypes] = useState<string[]>([]);
  const [activeCategories, setActiveCategories] = useState<string[]>([]);
  const [activeDistricts, setActiveDistricts] = useState<District[]>([]);
  const [activeAgeGroup, setActiveAgeGroup] = useState<string | null>(null);
  const [filtersOpen, setFiltersOpen] = useState(false);

  const ageGroup = AGE_GROUPS.find((g) => g.key === activeAgeGroup) ?? null;
  const hasActiveFilters = !!(search || activeTypeLevel2.length > 0 || activeTypes.length > 0 || activeCategories.length > 0 || activeDistricts.length > 0 || activeAgeGroup !== null);

  const unifiedFilterEntries = useMemo<UnifiedFilterEntry[]>(
    () => [
      ...events.map((event) => ({
        typeLevel2: event.type_lvl_2_id ?? null,
        type: getEventCategoryLvl1(event),
        category: getEventCategoryLvl2(event),
        district: event.district,
      })),
      ...places.map((place) => ({
        typeLevel2: place.type_lvl_2_id ?? null,
        type: getPlaceCategoryLvl1(place),
        category: getPlaceCategoryLvl2(place),
        district: place.district,
      })),
      ...camps.map((camp) => ({
        typeLevel2: camp.type_lvl_2_id ?? null,
        type: getCampCategoryLvl1(camp),
        category: getCampCategoryLvl2(camp),
        district: camp.district,
      })),
      ...activities.map((activity) => ({
        typeLevel2: activity.type_lvl_2_id ?? null,
        type: getActivityCategoryLvl1(activity),
        category: getActivityCategoryLvl2(activity),
        district: activity.district,
      })),
    ],
    [events, places, camps, activities]
  );

  const typeOptions = useMemo(
    () => getTaxonomyOptions(unifiedFilterEntries, (entry) => entry.type),
    [unifiedFilterEntries]
  );

  const typeLevel2LabelMap = useMemo(
    () => Object.fromEntries(taxonomyTypeLevel2Options.map((option) => [option.id, option.name])),
    [taxonomyTypeLevel2Options]
  );

  const typeLevel2Options = useMemo(
    () => getTaxonomyOptions(unifiedFilterEntries, (entry) => entry.typeLevel2, typeLevel2LabelMap),
    [unifiedFilterEntries, typeLevel2LabelMap]
  );

  const categoryOptions = useMemo(
    () => getTaxonomyOptions(unifiedFilterEntries, (entry) => entry.category, CATEGORY_LABELS as Record<string, string>),
    [unifiedFilterEntries]
  );

  const districtOptions = useMemo(() => {
    const counts = new Map<District, number>();

    unifiedFilterEntries.forEach((entry) => {
      counts.set(entry.district, (counts.get(entry.district) || 0) + 1);
    });

    return Array.from(counts.entries())
      .map(([value, count]) => ({ value, label: value, icon: DISTRICT_ICONS[value] || "📍", count }))
      .sort((left, right) => left.label.localeCompare(right.label, "pl"));
  }, [unifiedFilterEntries]);

  const filteredEvents = useMemo(() => {
    let result = events;
    if (search) {
      const q = search.toLowerCase();
      result = result.filter((e) =>
        [e.title, e.description_short, e.venue_name, e.district].join(" ").toLowerCase().includes(q)
      );
    }
    if (activeTypeLevel2.length > 0) {
      result = result.filter((event) => matchesTaxonomyFilter(event.type_lvl_2_id ?? null, activeTypeLevel2));
    }
    if (activeTypes.length > 0) {
      result = result.filter((event) => matchesTaxonomyFilter(getEventCategoryLvl1(event), activeTypes));
    }
    if (activeCategories.length > 0) {
      result = result.filter((event) => matchesTaxonomyFilter(getEventCategoryLvl2(event), activeCategories));
    }
    if (activeDistricts.length > 0) {
      result = result.filter((event) => activeDistricts.includes(event.district));
    }
    result = result.filter((event) => matchesAgeFilter(event.age_min, event.age_max, ageGroup));
    return [...result].sort((a, b) => b.likes - a.likes);
  }, [events, search, activeTypeLevel2, activeTypes, activeCategories, activeDistricts, ageGroup]);

  const filteredPlaces = useMemo(() => {
    let result = places;
    if (search) {
      const q = search.toLowerCase();
      result = result.filter((p) =>
        [p.title, p.description_short, p.street, p.city, p.district].join(" ").toLowerCase().includes(q)
      );
    }
    if (activeTypeLevel2.length > 0) {
      result = result.filter((place) => matchesTaxonomyFilter(place.type_lvl_2_id ?? null, activeTypeLevel2));
    }
    if (activeTypes.length > 0) {
      result = result.filter((place) => matchesTaxonomyFilter(getPlaceCategoryLvl1(place), activeTypes));
    }
    if (activeCategories.length > 0) {
      result = result.filter((place) => matchesTaxonomyFilter(getPlaceCategoryLvl2(place), activeCategories));
    }
    if (activeDistricts.length > 0) {
      result = result.filter((place) => activeDistricts.includes(place.district));
    }
    result = result.filter((place) => matchesAgeFilter(place.age_min, place.age_max, ageGroup));
    return [...result].sort((a, b) => b.likes - a.likes);
  }, [places, search, activeTypeLevel2, activeTypes, activeCategories, activeDistricts, ageGroup]);

  const filteredCamps = useMemo(() => {
    let result = camps;
    if (search) {
      const q = search.toLowerCase();
      result = result.filter((camp) =>
        [camp.title, camp.description_short, camp.venue_name, camp.venue_address, camp.organizer]
          .join(" ")
          .toLowerCase()
          .includes(q)
      );
    }
    if (activeTypeLevel2.length > 0) {
      result = result.filter((camp) => matchesTaxonomyFilter(camp.type_lvl_2_id ?? null, activeTypeLevel2));
    }
    if (activeTypes.length > 0) {
      result = result.filter((camp) => matchesTaxonomyFilter(getCampCategoryLvl1(camp), activeTypes));
    }
    if (activeCategories.length > 0) {
      result = result.filter((camp) => matchesTaxonomyFilter(getCampCategoryLvl2(camp), activeCategories));
    }
    if (activeDistricts.length > 0) {
      result = result.filter((camp) => activeDistricts.includes(camp.district));
    }
    result = result.filter((camp) => matchesAgeFilter(camp.age_min, camp.age_max, ageGroup));
    return [...result].sort((a, b) => new Date(a.date_start).getTime() - new Date(b.date_start).getTime());
  }, [camps, search, activeTypeLevel2, activeTypes, activeCategories, activeDistricts, ageGroup]);

  const filteredActivities = useMemo(() => {
    let result = activities;
    if (search) {
      const q = search.toLowerCase();
      result = result.filter((activity) =>
        [activity.title, activity.description_short, activity.venue_name, activity.venue_address, activity.organizer]
          .join(" ")
          .toLowerCase()
          .includes(q)
      );
    }
    if (activeTypeLevel2.length > 0) {
      result = result.filter((activity) => matchesTaxonomyFilter(activity.type_lvl_2_id ?? null, activeTypeLevel2));
    }
    if (activeTypes.length > 0) {
      result = result.filter((activity) => matchesTaxonomyFilter(getActivityCategoryLvl1(activity), activeTypes));
    }
    if (activeCategories.length > 0) {
      result = result.filter((activity) => matchesTaxonomyFilter(getActivityCategoryLvl2(activity), activeCategories));
    }
    if (activeDistricts.length > 0) {
      result = result.filter((activity) => activeDistricts.includes(activity.district));
    }
    result = result.filter((activity) => matchesAgeFilter(activity.age_min, activity.age_max, ageGroup));
    return [...result].sort((a, b) => b.likes - a.likes);
  }, [activities, search, activeTypeLevel2, activeTypes, activeCategories, activeDistricts, ageGroup]);

  function toggleTypeLevel2(nextTypeLevel2: string) {
    setActiveTypeLevel2((prev) =>
      prev.includes(nextTypeLevel2) ? prev.filter((item) => item !== nextTypeLevel2) : [...prev, nextTypeLevel2]
    );
  }

  function toggleType(nextType: string) {
    setActiveTypes((prev) =>
      prev.includes(nextType) ? prev.filter((item) => item !== nextType) : [...prev, nextType]
    );
  }

  function toggleCategory(nextCategory: string) {
    setActiveCategories((prev) =>
      prev.includes(nextCategory) ? prev.filter((item) => item !== nextCategory) : [...prev, nextCategory]
    );
  }

  function toggleDistrict(nextDistrict: District) {
    setActiveDistricts((prev) =>
      prev.includes(nextDistrict) ? prev.filter((item) => item !== nextDistrict) : [...prev, nextDistrict]
    );
  }

  function clearFilters() {
    setSearch("");
    setActiveTypeLevel2([]);
    setActiveTypes([]);
    setActiveCategories([]);
    setActiveDistricts([]);
    setActiveAgeGroup(null);
  }

  const organizers = useMemo<OrganizerTile[]>(() => {
    const map = new Map<string, OrganizerTile>();
    [...filteredCamps]
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
    return Array.from(map.values());
  }, [filteredCamps]);

  const visiblePlaces = hasActiveFilters ? filteredPlaces : filteredPlaces.slice(0, 8);
  const visibleEvents = hasActiveFilters ? filteredEvents : filteredEvents.slice(0, 8);
  const visibleOrganizers = hasActiveFilters ? organizers : organizers.slice(0, 8);
  const visibleActivities = hasActiveFilters ? filteredActivities : filteredActivities.slice(0, 8);

  const showPlaces = places.length > 0 && visiblePlaces.length > 0;
  const showEvents = events.length > 0 && visibleEvents.length > 0;
  const showCamps = camps.length > 0 && visibleOrganizers.length > 0;
  const showActivities = activities.length > 0 && visibleActivities.length > 0;
  const showEmpty = hasActiveFilters && !showPlaces && !showEvents && !showCamps && !showActivities;

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
          <input type="text" placeholder="Szukaj miejsc, wydarzeń, kolonii..." value={search} onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 rounded-lg border border-border bg-background text-[12px] text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/40 transition-all duration-200" />
        </div>
      </div>

      {/* Mobile filters dropdown */}
      {filtersOpen && (
        <div className="lg:hidden rounded-xl border border-border bg-card p-3 mb-4 space-y-2.5 max-h-[calc(100dvh-8rem)] overflow-y-auto overscroll-contain">
          <div className="flex items-center justify-between gap-3 pb-1 border-b border-border/70">
            <p className="text-[11px] font-semibold text-foreground">Filtry strony głównej</p>
            <button
              type="button"
              onClick={() => setFiltersOpen(false)}
              className="inline-flex items-center gap-1 rounded-lg border border-border bg-background px-2 py-1 text-[10px] font-medium text-muted-foreground hover:text-foreground hover:border-primary/20 transition-colors"
            >
              <X size={10} /> Zwiń
            </button>
          </div>

          <FilterSection title={<span className="inline-flex items-center gap-1 text-[11px] font-medium text-muted-foreground"><Tags size={11} /> Grupa</span>} defaultCollapsed={false}>
            <div className="flex flex-wrap gap-1">
              {typeLevel2Options.map((option) => {
                const selected = activeTypeLevel2.includes(option.value);
                return (
                  <button key={option.value} onClick={() => toggleTypeLevel2(option.value)}
                    className={cn("inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-medium border transition-all duration-200",
                      selected ? "bg-primary text-primary-foreground border-primary" : "bg-background text-muted border-border hover:border-primary/30 hover:text-foreground")}>
                    <span>{option.icon}</span>
                    <span>{option.label}</span>
                    <span className="text-[10px] opacity-60">{option.count}</span>
                    {selected && <Check size={11} />}
                  </button>
                );
              })}
            </div>
          </FilterSection>

          <FilterSection title={<span className="inline-flex items-center gap-1 text-[11px] font-medium text-muted-foreground"><Tags size={11} /> Typ</span>} defaultCollapsed={false}>
            <div className="flex flex-wrap gap-1">
              {typeOptions.map((option) => {
                const selected = activeTypes.includes(option.value);
                return (
                  <button key={option.value} onClick={() => toggleType(option.value)}
                    className={cn("inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-medium border transition-all duration-200",
                      selected ? "bg-primary text-primary-foreground border-primary" : "bg-background text-muted border-border hover:border-primary/30 hover:text-foreground")}>
                    <span>{option.icon}</span>
                    <span>{option.label}</span>
                    <span className="text-[10px] opacity-60">{option.count}</span>
                    {selected && <Check size={11} />}
                  </button>
                );
              })}
            </div>
          </FilterSection>

          <FilterSection title={<span className="text-[11px] font-medium text-muted-foreground">Wiek dziecka</span>} defaultCollapsed={false}>
            <div className="flex flex-wrap gap-1.5">
              {AGE_GROUPS.map((group) => (
                <button key={group.key} onClick={() => setActiveAgeGroup(activeAgeGroup === group.key ? null : group.key)}
                  className={cn("px-2.5 py-1 rounded-lg text-[11px] font-medium border transition-all duration-200",
                    activeAgeGroup === group.key ? "bg-primary text-primary-foreground border-primary" : "bg-background text-muted border-border hover:border-primary/30 hover:text-foreground")}>
                  {group.icon} {group.label}
                </button>
              ))}
            </div>
          </FilterSection>

          <FilterSection title={<span className="inline-flex items-center gap-1 text-[11px] font-medium text-muted-foreground"><Tags size={11} /> Kategoria</span>}>
            <div className="flex flex-wrap gap-1">
              {categoryOptions.map((option) => {
                const selected = activeCategories.includes(option.value);
                return (
                  <button key={option.value} onClick={() => toggleCategory(option.value)}
                    className={cn("inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-medium border transition-all duration-200",
                      selected ? "bg-primary text-primary-foreground border-primary" : "bg-background text-muted border-border hover:border-primary/30 hover:text-foreground")}>
                    <span>{option.icon}</span>
                    <span>{option.label}</span>
                    <span className="text-[10px] opacity-60">{option.count}</span>
                    {selected && <Check size={11} />}
                  </button>
                );
              })}
            </div>
          </FilterSection>

          <FilterSection title={<span className="inline-flex items-center gap-1 text-[11px] font-medium text-muted-foreground"><MapPin size={11} /> Dzielnica</span>}>
            <div className="flex flex-wrap gap-1">
              {districtOptions.map((option) => {
                const selected = activeDistricts.includes(option.value);
                return (
                  <button key={option.value} onClick={() => toggleDistrict(option.value)}
                    className={cn("inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-medium border transition-all duration-200",
                      selected ? "bg-primary text-primary-foreground border-primary" : "bg-background text-muted border-border hover:border-primary/30 hover:text-foreground")}>
                    <span>{option.icon}</span>
                    <span>{option.label}</span>
                    <span className="text-[10px] opacity-60">{option.count}</span>
                    {selected && <Check size={11} />}
                  </button>
                );
              })}
            </div>
          </FilterSection>
          {hasActiveFilters && (
            <button onClick={clearFilters} className="inline-flex items-center gap-1 text-[11px] font-medium text-muted-foreground hover:text-foreground transition-colors">
              <X size={11} /> Wyczyść filtry
            </button>
          )}

          <button
            type="button"
            onClick={() => setFiltersOpen(false)}
            className="w-full inline-flex items-center justify-center gap-1 rounded-lg border border-border bg-background px-3 py-2 text-[11px] font-semibold text-foreground hover:border-primary/20 hover:bg-accent/40 transition-colors"
          >
            Zamknij filtry
          </button>
        </div>
      )}

      {/* Desktop layout */}
      <div className="lg:flex lg:gap-6 lg:items-start">

        {/* Sidebar — desktop only */}
        <aside className="hidden lg:block w-56 shrink-0 sticky top-20">
          <div className="rounded-xl border border-border bg-card p-3 space-y-3 max-h-[calc(100vh-6rem)] overflow-y-auto overscroll-contain pr-1">
            <div className="relative">
              <Search size={11} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground/50" />
              <input type="text" placeholder="Szukaj..." value={search} onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-7 pr-2 py-1 rounded-lg border border-border bg-background text-[11px] text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/40 transition-all duration-200" />
            </div>

            <div className="border-t border-border" />

            <FilterSection title={<span className="inline-flex items-center gap-1 text-[9px] font-semibold text-muted-foreground uppercase tracking-wider"><Tags size={10} /> Grupa</span>} triggerClassName="px-2 py-1.5" contentClassName="px-2 pb-2.5" defaultCollapsed={false}>
              <div className="flex flex-col gap-0.5">
                {typeLevel2Options.map((option) => {
                  const selected = activeTypeLevel2.includes(option.value);
                  return (
                    <button key={option.value} onClick={() => toggleTypeLevel2(option.value)}
                      className={cn("flex items-center gap-1.5 px-2 py-1 rounded-md text-[11px] font-medium text-left transition-all duration-200",
                        selected ? "bg-primary text-primary-foreground" : "text-foreground hover:bg-accent")}>
                      <span>{option.icon}</span>
                      <span className="flex-1">{option.label}</span>
                      {selected && <Check size={10} />}
                      <span className="text-[9px] opacity-40">{option.count}</span>
                    </button>
                  );
                })}
              </div>
            </FilterSection>

            <FilterSection title={<span className="inline-flex items-center gap-1 text-[9px] font-semibold text-muted-foreground uppercase tracking-wider"><Tags size={10} /> Typ</span>} triggerClassName="px-2 py-1.5" contentClassName="px-2 pb-2.5" defaultCollapsed={false}>
              <div className="flex flex-col gap-0.5">
                {typeOptions.map((option) => {
                  const selected = activeTypes.includes(option.value);
                  return (
                    <button key={option.value} onClick={() => toggleType(option.value)}
                      className={cn("flex items-center gap-1.5 px-2 py-1 rounded-md text-[11px] font-medium text-left transition-all duration-200",
                        selected ? "bg-primary text-primary-foreground" : "text-foreground hover:bg-accent")}>
                      <span>{option.icon}</span>
                      <span className="flex-1">{option.label}</span>
                      {selected && <Check size={10} />}
                      <span className="text-[9px] opacity-40">{option.count}</span>
                    </button>
                  );
                })}
              </div>
            </FilterSection>

            <FilterSection title={<span className="text-[9px] font-semibold text-muted-foreground uppercase tracking-wider">Wiek</span>} triggerClassName="px-2 py-1.5" contentClassName="px-2 pb-2.5" defaultCollapsed={false}>
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
            </FilterSection>

            <FilterSection title={<span className="inline-flex items-center gap-1 text-[9px] font-semibold text-muted-foreground uppercase tracking-wider"><Tags size={10} /> Kategoria</span>} triggerClassName="px-2 py-1.5" contentClassName="px-2 pb-2.5">
              <div className="flex flex-col gap-0.5">
                {categoryOptions.map((option) => {
                  const selected = activeCategories.includes(option.value);
                  return (
                    <button key={option.value} onClick={() => toggleCategory(option.value)}
                      className={cn("flex items-center gap-1.5 px-2 py-1 rounded-md text-[11px] font-medium text-left transition-all duration-200",
                        selected ? "bg-primary text-primary-foreground" : "text-foreground hover:bg-accent")}>
                      <span>{option.icon}</span>
                      <span className="flex-1">{option.label}</span>
                      {selected && <Check size={10} />}
                      <span className="text-[9px] opacity-40">{option.count}</span>
                    </button>
                  );
                })}
              </div>
            </FilterSection>

            <FilterSection title={<span className="inline-flex items-center gap-1 text-[9px] font-semibold text-muted-foreground uppercase tracking-wider"><MapPin size={10} /> Dzielnica</span>} triggerClassName="px-2 py-1.5" contentClassName="px-2 pb-2.5">
              <div className="flex flex-col gap-0.5">
                {districtOptions.map((option) => {
                  const selected = activeDistricts.includes(option.value);
                  return (
                    <button key={option.value} onClick={() => toggleDistrict(option.value)}
                      className={cn("flex items-center gap-1.5 px-2 py-1 rounded-md text-[11px] font-medium text-left transition-all duration-200",
                        selected ? "bg-primary text-primary-foreground" : "text-foreground hover:bg-accent")}>
                      <span>{option.icon}</span>
                      <span className="flex-1">{option.label}</span>
                      {selected && <Check size={10} />}
                      <span className="text-[9px] opacity-40">{option.count}</span>
                    </button>
                  );
                })}
              </div>
            </FilterSection>

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
                  {hasActiveFilters && <span className="ml-2 text-[12px] font-normal text-muted-foreground">({filteredPlaces.length})</span>}
                </h2>
                <SectionLink href="/miejsca">Wszystkie</SectionLink>
              </div>
              <HomeSectionSubmissionCta
                title="Masz miejsce warte polecenia?"
                description="Dodaj je do mapy rodzinnych adresów i pomóż odkrywać kolejne sprawdzone miejscówki."
                buttonLabel="Dodaj"
                href="/dodaj?type=place"
              />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {visiblePlaces.map((place, idx) => (
                  <div key={place.id} className={!hasActiveFilters && idx >= 4 ? "hidden sm:block" : ""}>
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
                  {hasActiveFilters && <span className="ml-2 text-[12px] font-normal text-muted-foreground">({filteredEvents.length})</span>}
                </h2>
                <SectionLink href="/wydarzenia">Wszystkie</SectionLink>
              </div>
              <HomeSectionSubmissionCta
                title="Tworzysz wydarzenie dla dzieci?"
                description="Dodaj je do kalendarza, żeby rodziny szybciej trafiły na wartościowe wydarzenia w mieście."
                buttonLabel="Dodaj"
                href="/dodaj?type=event"
              />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {visibleEvents.map((event, idx) => (
                  <div key={event.id} className={!hasActiveFilters && idx >= 4 ? "hidden sm:block" : ""}>
                    <ContentCard item={event} />
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Camps section */}
          {showCamps && (
            <section>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-[15px] font-semibold text-foreground">
                  Kolonie dla dzieci
                  {hasActiveFilters && <span className="ml-2 text-[12px] font-normal text-muted-foreground">({organizers.length})</span>}
                </h2>
                <SectionLink href="/kolonie">Wszystkie</SectionLink>
              </div>
              <HomeSectionSubmissionCta
                title="Prowadzisz kolonie lub półkolonie?"
                description="Pokaż swoją ofertę w miejscu, gdzie rodzice szukają sprawdzonych wyjazdów i turnusów."
                buttonLabel="Dodaj"
                href="/dodaj?type=camp"
              />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {visibleOrganizers.map((organizer, idx) => (
                  <div key={organizer.key} className={!hasActiveFilters && idx >= 4 ? "hidden sm:block" : ""}>
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
          {showActivities && (
            <section>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-[15px] font-semibold text-foreground">
                  Zajęcia pozaszkolne
                  {hasActiveFilters && <span className="ml-2 text-[12px] font-normal text-muted-foreground">({filteredActivities.length})</span>}
                </h2>
                <SectionLink href="/zajecia">Wszystkie</SectionLink>
              </div>
              <HomeSectionSubmissionCta
                title="Prowadzisz zajęcia dla dzieci?"
                description="Dodaj je do katalogu i daj rodzicom prosty sposób na znalezienie regularnych aktywności."
                buttonLabel="Dodaj"
                href="/dodaj?type=activity"
              />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {visibleActivities.map((activity, idx) => (
                  <div key={activity.id} className={!hasActiveFilters && idx >= 4 ? "hidden sm:block" : ""}>
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
