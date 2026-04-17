// ============================================
// Enums
// ============================================

export type ContentType = "event" | "camp" | "place" | "activity";

export type ContentStatus = "draft" | "published" | "cancelled" | "deleted";

export type District =
  | "Stare Miasto"
  | "Grzegórzki"
  | "Prądnik Czerwony"
  | "Prądnik Biały"
  | "Krowodrza"
  | "Bronowice"
  | "Zwierzyniec"
  | "Dębniki"
  | "Łagiewniki-Borek Fałęcki"
  | "Swoszowice"
  | "Podgórze"
  | "Bieżanów-Prokocim"
  | "Czyżyny"
  | "Mistrzejowice"
  | "Wzgórza Krzesławickie"
  | "Nowa Huta"
  | "Kazimierz"
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

export type CampMainCategory = "kolonie" | "polkolonie" | "warsztaty_wakacyjne";

export type CampCategory = "sportowe" | "edukacyjne" | "integracyjne" | "przygodowe" | "artystyczne" | "kulinarne" | "przyrodnicze";

export type CampSeason = "lato" | "zima" | "ferie_zimowe" | "ferie_wiosenne" | "caly_rok";

export type ActivityType =
  | "sportowe"
  | "artystyczne"
  | "edukacyjne"
  | "muzyczne"
  | "taneczne"
  | "jezykowe"
  | "sensoryczne"
  | "inne";

export type PlaceType =
  | "Relaks i natura"
  | "Nauka przez zabawę"
  | "Szybka rozrywka / atrakcje"
  | "Ruch i aktywność fizyczna"
  | "Oglądanie / kultura"
  | "Kreatywność i warsztaty"
  | "Sala zabaw"
  | "Plac zabaw"
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
  image_cover?: string | null;
  image_thumb?: string | null;
  image_set?: string | null;
  type_lvl_1_id?: string | null;
  type_lvl_2_id?: string | null;
  category_lvl_1?: string | null;
  category_lvl_3?: string | null;
  date_start: string;
  date_end: string | null;
  time_start: string | null;
  time_end: string | null;
  age_min: number | null;
  age_max: number | null;
  price: number | null;
  is_free: boolean;
  category_lvl_2?: EventCategory;
  district: District;
  street: string;
  city: string;
  lat: number | null;
  lng: number | null;
  organizer: string | null;
  organizer_id?: string | null;
  organizer_data?: Organizer | null;
  source_url: string | null;
  facebook_url: string | null;
  is_featured: boolean;
  status: ContentStatus;
  likes: number;
  dislikes: number;
  created_at: string;
  updated_at: string;
  type_id?: string | null;
  subtype_id?: string | null;
  main_category?: string | null;
  category: EventCategory;
  subcategory?: string | null;
}

// ============================================
// Organizers
// ============================================

export interface Organizer {
  id: string;
  organizer_name: string;
  description?: string | null;
  contact_first_name?: string | null;
  contact_last_name?: string | null;
  email: string | null;
  phone: string | null;
  street: string;
  postcode: string;
  city: string;
  note?: string | null;
  organizer_note?: string | null;
  status: "draft" | "published" | "archived";
  created_at: string;
  updated_at: string;
}

export interface Camp {
  content_type: "camp";
  id: string;
  title: string;
  slug: string;
  description_short: string;
  description_long: string;
  image_url: string | null;
  image_cover?: string | null;
  image_thumb?: string | null;
  image_set?: string | null;
  type_lvl_1_id?: string | null;
  type_lvl_2_id?: string | null;
  date_start: string;
  date_end: string;
  category_lvl_1?: CampMainCategory;
  category_lvl_2?: CampCategory | null;
  category_lvl_3?: string | null;
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
  lat: number | null;
  lng: number | null;
  organizer: string;
  organizer_id?: string | null;
  organizer_data?: Organizer | null;
  source_url: string | null;
  facebook_url: string | null;
  is_featured: boolean;
  status: ContentStatus;
  likes: number;
  dislikes: number;
  created_at: string;
  updated_at: string;
  type_id?: string | null;
  subtype_id?: string | null;
  main_category: CampMainCategory;
  category: CampCategory | null;
  subcategory: string | null;
}

export interface Activity {
  content_type: "activity";
  id: string;
  title: string;
  slug: string;
  description_short: string;
  description_long: string;
  image_url: string | null;
  image_cover?: string | null;
  image_thumb?: string | null;
  image_set?: string | null;
  type_lvl_1_id?: string | null;
  type_lvl_2_id?: string | null;
  category_lvl_1?: string | null;
  category_lvl_2?: string | null;
  category_lvl_3?: string | null;
  activity_type: ActivityType;
  schedule_summary: string | null;
  days_of_week: string[];
  date_start: string;
  date_end: string | null;
  time_start: string | null;
  time_end: string | null;
  age_min: number | null;
  age_max: number | null;
  price_from: number | null;
  price_to: number | null;
  is_free: boolean;
  district: District;
  venue_name: string;
  venue_address: string;
  organizer: string;
  organizer_id?: string | null;
  organizer_data?: Organizer | null;
  source_url: string | null;
  facebook_url: string | null;
  is_featured: boolean;
  status: ContentStatus;
  likes: number;
  dislikes: number;
  created_at: string;
  updated_at: string;
  type_id?: string | null;
  subtype_id?: string | null;
  main_category?: string | null;
  category?: string | null;
  subcategory?: string | null;
}

export interface Place {
  content_type: "place";
  id: string;
  title: string;
  slug: string;
  description_short: string;
  description_long: string;
  image_url: string | null;
  image_cover?: string | null;
  image_thumb?: string | null;
  image_set?: string | null;
  type_lvl_1_id?: string | null;
  type_lvl_2_id?: string | null;
  category_lvl_1?: string | null;
  category_lvl_2?: string | null;
  category_lvl_3?: string | null;
  place_type: PlaceType;
  is_indoor: boolean;
  street: string;
  postcode: string;
  city: string;
  district: District;
  lat: number | null;
  lng: number | null;
  age_min: number | null;
  age_max: number | null;
  note?: string | null;
  price?: number | null;
  is_free?: boolean;
  amenities?: string[];
  opening_hours?: string | null;
  organizer_id?: string | null;
  organizer_data?: Organizer | null;
  source_url: string | null;
  facebook_url: string | null;
  is_featured: boolean;
  status: ContentStatus;
  likes: number;
  dislikes: number;
  created_at: string;
  updated_at: string;
  type_id?: string | null;
  subtype_id?: string | null;
  main_category?: string | null;
  category?: string | null;
  subcategory?: string | null;
}

// Union type for mixed-content displays (homepage, search)
export type DiscoveryItem = Event | Camp | Place | Activity;

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
  mainCategory?: CampMainCategory;
  season?: CampSeason;
  dateRange?: "week" | "month" | "summer" | "winter";
  mealsIncluded?: boolean;
}

export interface PlaceFilters extends SharedFilters {
  placeType?: string;
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
      activities: {
        Row: Activity;
        Insert: Omit<Activity, "id" | "created_at" | "updated_at" | "likes" | "dislikes">;
        Update: Partial<Omit<Activity, "id" | "created_at" | "updated_at">>;
      };
      camps: {
        Row: Camp;
        Insert: Omit<Camp, "id" | "created_at" | "updated_at" | "likes" | "dislikes">;
        Update: Partial<Omit<Camp, "id" | "created_at" | "updated_at">>;
      };
      places: {
        Row: Place;
        Insert: Omit<Place, "id" | "created_at" | "updated_at" | "likes" | "dislikes">;
        Update: Partial<Omit<Place, "id" | "created_at" | "updated_at">>;
      };
      scrape_sources: {
        Row: ScrapeSource;
        Insert: Omit<ScrapeSource, "id" | "created_at" | "updated_at" | "last_scraped_at" | "total_events_pushed">;
        Update: Partial<Omit<ScrapeSource, "id" | "created_at" | "updated_at">>;
      };
    };
  };
}
