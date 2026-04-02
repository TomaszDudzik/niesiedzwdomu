// ============================================
// Enums
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

export type CampType = "kolonie" | "polkolonie" | "warsztaty_wakacyjne";

export type CampSeason = "lato" | "zima" | "ferie_zimowe" | "ferie_wiosenne" | "caly_rok";

export type PlaceType =
  | "Relaks i natura"
  | "Nauka przez zabawę"
  | "Szybka rozrywka / atrakcje"
  | "Ruch i aktywność fizyczna"
  | "Oglądanie / kultura"
  | "Kreatywność i warsztaty"
  | "inne";

// ============================================
// Events — canonical events shown on frontend
// ============================================

export interface Event {
  content_type: "event";
  id: string;
  title: string;
  slug: string;
  description_short: string;
  description_long: string;
  image_url: string | null;
  date_start: string;
  date_end: string | null;
  time_start: string | null;
  time_end: string | null;
  age_min: number | null;
  age_max: number | null;
  price: number | null;
  is_free: boolean;
  category: EventCategory;
  district: District;
  venue_name: string;
  venue_address: string;
  lat: number | null;
  lng: number | null;
  organizer: string | null;
  source_url: string | null;
  is_featured: boolean;
  status: ContentStatus;
  likes: number;
  dislikes: number;
  created_at: string;
  updated_at: string;
}

// ============================================
// Camp & Place — frontend types (DB tables TBD)
// ============================================

export interface Camp {
  content_type: "camp";
  id: string;
  title: string;
  slug: string;
  description_short: string;
  description_long: string;
  image_url: string | null;
  date_start: string;
  date_end: string;
  camp_type: CampType;
  season: CampSeason;
  duration_days: number;
  meals_included: boolean;
  transport_included: boolean;
  age_min: number | null;
  age_max: number | null;
  price: number | null;
  is_free: boolean;
  district: District;
  venue_name: string;
  venue_address: string;
  organizer: string;
  source_url: string | null;
  is_featured: boolean;
  status: ContentStatus;
  likes: number;
  dislikes: number;
  created_at: string;
  updated_at: string;
}

export interface Place {
  content_type: "place";
  id: string;
  title: string;
  slug: string;
  description_short: string;
  description_long: string;
  image_url: string | null;
  place_type: PlaceType;
  is_indoor: boolean;
  street: string;
  city: string;
  district: District;
  lat: number | null;
  lng: number | null;
  age_min: number | null;
  age_max: number | null;
  price: number | null;
  is_free: boolean;
  amenities: string[];
  opening_hours: string | null;
  source_url: string | null;
  facebook_url: string | null;
  is_featured: boolean;
  status: ContentStatus;
  likes: number;
  dislikes: number;
  created_at: string;
  updated_at: string;
}

// Union type for mixed-content displays (homepage, search)
export type DiscoveryItem = Event | Camp | Place;

// ============================================
// Scrape source (pipeline config)
// ============================================

export interface ScrapeSource {
  id: string;
  name: string;
  base_url: string;
  extractor_type: string;
  is_active: boolean;
  content_type: string;
  listing_urls: string[];
  scrape_interval_hours: number;
  last_scraped_at: string | null;
  total_events_pushed: number;
  default_venue_name: string | null;
  default_venue_address: string | null;
  default_district: string | null;
  default_organizer: string | null;
  default_is_free: boolean | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
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
        Insert: Omit<Event, "id" | "created_at" | "updated_at" | "likes" | "dislikes">;
        Update: Partial<Omit<Event, "id" | "created_at" | "updated_at">>;
      };
      scrape_sources: {
        Row: ScrapeSource;
        Insert: Omit<ScrapeSource, "id" | "created_at" | "updated_at" | "last_scraped_at" | "total_events_pushed">;
        Update: Partial<Omit<ScrapeSource, "id" | "created_at" | "updated_at">>;
      };
    };
  };
}
