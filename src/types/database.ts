// ============================================
// Shared enums
// ============================================

export type ContentType = "event" | "camp" | "place";

export type ContentStatus = "draft" | "published" | "cancelled";

export type District =
  | "Stare Miasto"
  | "Kazimierz"
  | "Podgórze"
  | "Nowa Huta"
  | "Krowodrza"
  | "Bronowice"
  | "Zwierzyniec"
  | "Dębniki"
  | "Prądnik Czerwony"
  | "Prądnik Biały"
  | "Czyżyny"
  | "Bieżanów"
  | "Inne";

// ============================================
// Event-specific enums
// ============================================

export type EventCategory =
  | "warsztaty"
  | "spektakl"
  | "muzyka"
  | "sport"
  | "natura"
  | "edukacja"
  | "festyn"
  | "kino"
  | "wystawa"
  | "inne";

// Keep old alias for backwards compat during migration
export type EventStatus = ContentStatus;

// ============================================
// Camp-specific enums
// ============================================

export type CampType = "kolonie" | "polkolonie" | "warsztaty_wakacyjne";

export type CampSeason = "lato" | "zima" | "ferie_zimowe" | "ferie_wiosenne" | "caly_rok";

// ============================================
// Place-specific enums
// ============================================

export type PlaceType = "plac_zabaw" | "sala_zabaw" | "kawiarnia_rodzinna" | "inne";

// ============================================
// Content models
// ============================================

interface ContentBase {
  id: string;
  title: string;
  slug: string;
  description_short: string;
  description_long: string;
  image_url: string | null;
  district: District;
  age_min: number | null;
  age_max: number | null;
  price: number | null;
  is_free: boolean;
  is_featured: boolean;
  status: ContentStatus;
  likes: number;
  dislikes: number;
  source_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface Event extends ContentBase {
  content_type: "event";
  date_start: string;
  date_end: string | null;
  time_start: string | null;
  time_end: string | null;
  category: EventCategory;
  venue_id: string | null;
  venue_name: string;
  venue_address: string;
  organizer: string | null;
}

export interface Camp extends ContentBase {
  content_type: "camp";
  date_start: string;
  date_end: string;
  camp_type: CampType;
  season: CampSeason;
  duration_days: number;
  meals_included: boolean;
  transport_included: boolean;
  venue_name: string;
  venue_address: string;
  organizer: string;
}

export interface Place extends ContentBase {
  content_type: "place";
  place_type: PlaceType;
  is_indoor: boolean;
  address: string;
  lat: number | null;
  lng: number | null;
  amenities: string[];
  opening_hours: string | null;
}

// Union type for mixed-content displays (homepage, search)
export type DiscoveryItem = Event | Camp | Place;

// ============================================
// Scrape source (pipeline config)
// ============================================

export type FetchMethod = "requests" | "playwright";
export type PaginationType = "none" | "path" | "query";
export type EventsMode = "inline" | "links";

export interface ScrapeSource {
  id: string;
  name: string;
  base_url: string;
  fetch_method: FetchMethod;
  extractor_type: string;
  is_active: boolean;
  pre_filtered: boolean;
  content_type: string;
  listing_urls: string[];
  pagination: PaginationType;
  max_pages: number;
  page_pattern: string | null;
  events_mode: EventsMode;
  link_selector: string | null;
  default_venue_name: string | null;
  default_venue_address: string | null;
  default_district: string | null;
  default_organizer: string | null;
  default_is_free: boolean | null;
  scrape_interval_hours: number;
  last_scraped_at: string | null;
  total_events_pushed: number;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

// ============================================
// Supporting models
// ============================================

export interface Venue {
  id: string;
  name: string;
  address: string;
  district: District;
  lat: number | null;
  lng: number | null;
  website: string | null;
  created_at: string;
}

export interface Feedback {
  id: string;
  content_type: ContentType;
  event_id: string | null;
  camp_id: string | null;
  place_id: string | null;
  is_positive: boolean;
  session_id: string;
  created_at: string;
}

// ============================================
// Filter types
// ============================================

export interface SharedFilters {
  district?: District;
  ageGroup?: string;
  isFree?: boolean;
  search?: string;
}

export interface EventFilters extends SharedFilters {
  category?: EventCategory;
  dateRange?: "today" | "weekend" | "week" | "month";
}

export interface CampFilters extends SharedFilters {
  campType?: CampType;
  season?: CampSeason;
  dateRange?: "week" | "month" | "summer" | "winter";
  mealsIncluded?: boolean;
}

export interface PlaceFilters extends SharedFilters {
  placeType?: PlaceType;
  isIndoor?: boolean;
}

// ============================================
// Supabase Database type (for typed client)
// ============================================

export interface Database {
  public: {
    Tables: {
      events: {
        Row: Event;
        Insert: Omit<Event, "id" | "created_at" | "updated_at" | "likes" | "dislikes" | "content_type">;
        Update: Partial<Omit<Event, "id" | "created_at" | "updated_at" | "content_type">>;
      };
      camps: {
        Row: Camp;
        Insert: Omit<Camp, "id" | "created_at" | "updated_at" | "likes" | "dislikes" | "content_type">;
        Update: Partial<Omit<Camp, "id" | "created_at" | "updated_at" | "content_type">>;
      };
      places: {
        Row: Place;
        Insert: Omit<Place, "id" | "created_at" | "updated_at" | "likes" | "dislikes" | "content_type">;
        Update: Partial<Omit<Place, "id" | "created_at" | "updated_at" | "content_type">>;
      };
      venues: {
        Row: Venue;
        Insert: Omit<Venue, "id" | "created_at">;
        Update: Partial<Omit<Venue, "id" | "created_at">>;
      };
      feedback: {
        Row: Feedback;
        Insert: Omit<Feedback, "id" | "created_at">;
        Update: Partial<Omit<Feedback, "id" | "created_at">>;
      };
      scrape_sources: {
        Row: ScrapeSource;
        Insert: Omit<ScrapeSource, "id" | "created_at" | "updated_at" | "last_scraped_at" | "total_events_pushed">;
        Update: Partial<Omit<ScrapeSource, "id" | "created_at" | "updated_at">>;
      };
    };
  };
}
