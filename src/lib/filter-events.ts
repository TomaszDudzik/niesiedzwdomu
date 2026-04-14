import type { Event, Camp, Place, EventFilters, CampFilters, PlaceFilters } from "@/types/database";
import { AGE_GROUPS } from "./mock-data";
import { getNextWeekend, toLocalDateKey } from "./utils";

// ============================================
// Shared filter logic
// ============================================

function matchesAge(ageMin: number | null, ageMax: number | null, ageGroup?: string): boolean {
  if (!ageGroup) return true;
  const group = AGE_GROUPS.find((g) => g.value === ageGroup);
  if (!group) return true;
  const min = ageMin ?? 0;
  const max = ageMax ?? 99;
  return !(max < group.min || min > group.max);
}

function matchesSearch(searchable: (string | null | undefined)[], query?: string): boolean {
  if (!query) return true;
  const q = query.toLowerCase();
  return searchable.filter(Boolean).join(" ").toLowerCase().includes(q);
}

function matchesDateRange(dateStart: string, dateRange?: string): boolean {
  if (!dateRange) return true;
  const eventDate = new Date(dateStart);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  switch (dateRange) {
    case "today":
      return dateStart === toLocalDateKey(today);
    case "weekend": {
      const { start, end } = getNextWeekend();
      return eventDate >= start && eventDate <= end;
    }
    case "week": {
      const weekEnd = new Date(today);
      weekEnd.setDate(today.getDate() + 7);
      return eventDate >= today && eventDate <= weekEnd;
    }
    case "month": {
      const monthEnd = new Date(today);
      monthEnd.setMonth(today.getMonth() + 1);
      return eventDate >= today && eventDate <= monthEnd;
    }
    case "summer": {
      const year = today.getFullYear();
      return dateStart >= `${year}-06-01` && dateStart <= `${year}-08-31`;
    }
    case "winter": {
      const year = today.getFullYear();
      return dateStart >= `${year}-01-01` && dateStart <= `${year}-02-28` || dateStart >= `${year}-12-01`;
    }
    default:
      return true;
  }
}

// ============================================
// Event filtering
// ============================================

export function filterEvents(events: Event[], filters: EventFilters): Event[] {
  return events.filter((event) => {
    if (event.status !== "published") return false;
    if (filters.category && event.category !== filters.category) return false;
    if (filters.district && event.district !== filters.district) return false;
    if (filters.isFree && !event.is_free) return false;
    if (!matchesAge(event.age_min, event.age_max, filters.ageGroup)) return false;
    if (!matchesDateRange(event.date_start, filters.dateRange)) return false;
    if (!matchesSearch([event.title, event.description_short, event.venue_name, event.district, event.organizer], filters.search)) return false;
    return true;
  });
}

// ============================================
// Camp filtering
// ============================================

export function filterCamps(camps: Camp[], filters: CampFilters): Camp[] {
  return camps.filter((camp) => {
    if (camp.status !== "published") return false;
    if (filters.mainCategory && camp.main_category !== filters.mainCategory) return false;
    if (filters.season && camp.season !== filters.season) return false;
    if (filters.district && camp.district !== filters.district) return false;
    if (filters.isFree && !camp.is_free) return false;
    if (filters.mealsIncluded && !camp.meals_included) return false;
    if (!matchesAge(camp.age_min, camp.age_max, filters.ageGroup)) return false;
    if (!matchesDateRange(camp.date_start, filters.dateRange)) return false;
    if (!matchesSearch([camp.title, camp.description_short, camp.venue_name, camp.district, camp.organizer], filters.search)) return false;
    return true;
  });
}

// ============================================
// Place filtering
// ============================================

export function filterPlaces(places: Place[], filters: PlaceFilters): Place[] {
  return places.filter((place) => {
    if (place.status !== "published") return false;
    if (filters.placeType && place.place_type !== filters.placeType) return false;
    if (filters.district && place.district !== filters.district) return false;
    if (filters.isFree && !place.is_free) return false;
    if (filters.isIndoor !== undefined && place.is_indoor !== filters.isIndoor) return false;
    if (!matchesAge(place.age_min, place.age_max, filters.ageGroup)) return false;
    if (!matchesSearch([place.title, place.description_short, place.street, place.city, place.district], filters.search)) return false;
    return true;
  });
}

// ============================================
// Calendar helpers
// ============================================

export function getEventsForDate(events: Event[], date: Date): Event[] {
  const dateStr = toLocalDateKey(date);
  return events.filter((e) => {
    if (e.status !== "published") return false;
    if (e.date_start === dateStr) return true;
    if (e.date_end) return dateStr >= e.date_start && dateStr <= e.date_end;
    return false;
  });
}
