-- ============================================================
-- FRESH START: Drop all old tables and create clean schema
-- ============================================================

-- Drop in dependency order
DROP TABLE IF EXISTS event_duplicates CASCADE;
DROP TABLE IF EXISTS feedback CASCADE;
DROP TABLE IF EXISTS raw_pages CASCADE;
DROP TABLE IF EXISTS source_runs CASCADE;
DROP TABLE IF EXISTS scraped_events CASCADE;
DROP TABLE IF EXISTS events CASCADE;
DROP TABLE IF EXISTS scrape_sources CASCADE;
DROP TABLE IF EXISTS camps CASCADE;
DROP TABLE IF EXISTS places CASCADE;
DROP TABLE IF EXISTS venues CASCADE;

-- Drop old enum types if they exist
DROP TYPE IF EXISTS scrape_status CASCADE;
DROP TYPE IF EXISTS content_status CASCADE;
DROP TYPE IF EXISTS event_category CASCADE;
DROP TYPE IF EXISTS district CASCADE;
DROP TYPE IF EXISTS camp_type CASCADE;
DROP TYPE IF EXISTS camp_season CASCADE;
DROP TYPE IF EXISTS place_type CASCADE;

-- ============================================================
-- Enums
-- ============================================================

CREATE TYPE content_status AS ENUM ('draft', 'published', 'cancelled');
CREATE TYPE event_category AS ENUM (
  'warsztaty', 'spektakl', 'muzyka', 'sport',
  'natura', 'edukacja', 'festyn', 'kino', 'wystawa', 'inne'
);
CREATE TYPE district AS ENUM (
  'Stare Miasto', 'Kazimierz', 'Podgórze', 'Nowa Huta',
  'Krowodrza', 'Bronowice', 'Zwierzyniec', 'Dębniki',
  'Prądnik Czerwony', 'Prądnik Biały', 'Czyżyny', 'Bieżanów', 'Inne'
);

-- ============================================================
-- 1. scrape_sources — where to scrape from
-- ============================================================

CREATE TABLE scrape_sources (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name            text NOT NULL UNIQUE,
  base_url        text NOT NULL,
  extractor_type  text NOT NULL DEFAULT 'generic',   -- adapter name or 'generic'
  is_active       boolean NOT NULL DEFAULT true,
  content_type    text NOT NULL DEFAULT 'wydarzenia',
  listing_urls    text[] NOT NULL DEFAULT '{}',
  scrape_interval_hours integer NOT NULL DEFAULT 24,
  last_scraped_at timestamptz,
  total_events_pushed integer NOT NULL DEFAULT 0,
  -- defaults applied when scraper doesn't find them
  default_venue_name    text,
  default_venue_address text,
  default_district      text,
  default_organizer     text,
  default_is_free       boolean,
  notes           text,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

-- ============================================================
-- 2. events — canonical events shown on frontend
-- ============================================================

CREATE TABLE events (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title           text NOT NULL,
  slug            text NOT NULL UNIQUE,
  description_short text NOT NULL DEFAULT '',
  description_long  text NOT NULL DEFAULT '',
  image_url       text,
  date_start      date NOT NULL,
  date_end        date,
  time_start      time,
  time_end        time,
  age_min         integer,
  age_max         integer,
  price           numeric,
  is_free         boolean NOT NULL DEFAULT false,
  category        event_category NOT NULL DEFAULT 'inne',
  district        district NOT NULL DEFAULT 'Inne',
  venue_name      text NOT NULL DEFAULT '',
  venue_address   text NOT NULL DEFAULT '',
  organizer       text,
  source_url      text,
  is_featured     boolean NOT NULL DEFAULT false,
  status          content_status NOT NULL DEFAULT 'draft',
  likes           integer NOT NULL DEFAULT 0,
  dislikes        integer NOT NULL DEFAULT 0,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

-- ============================================================
-- 3. scraped_events — staging area for review before publishing
-- ============================================================

CREATE TABLE scraped_events (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_id         uuid NOT NULL REFERENCES scrape_sources(id) ON DELETE CASCADE,
  canonical_event_id uuid REFERENCES events(id) ON DELETE SET NULL,
  status            text NOT NULL DEFAULT 'review',  -- review, published, rejected
  title             text NOT NULL,
  description_short text,
  description_long  text,
  start_at          timestamptz,
  end_at            timestamptz,
  age_min           integer,
  age_max           integer,
  price_from        numeric,
  price_to          numeric,
  is_free           boolean,
  venue_name        text,
  venue_address     text,
  district          text,
  organizer_name    text,
  source_url        text NOT NULL,
  image_url         text,
  categories        text[] DEFAULT '{}',
  tags              text[] DEFAULT '{}',
  registration_url  text,
  confidence_score  real NOT NULL DEFAULT 0 CHECK (confidence_score >= 0 AND confidence_score <= 1),
  is_new            boolean NOT NULL DEFAULT true,
  last_change_at    timestamptz,
  source_first_seen timestamptz NOT NULL DEFAULT now(),
  source_last_seen  timestamptz NOT NULL DEFAULT now(),
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now()
);

-- ============================================================
-- Indexes
-- ============================================================

CREATE INDEX idx_events_status ON events(status);
CREATE INDEX idx_events_date_start ON events(date_start);
CREATE INDEX idx_events_category ON events(category);
CREATE INDEX idx_events_is_featured ON events(is_featured) WHERE is_featured = true;

CREATE INDEX idx_scraped_source ON scraped_events(source_id);
CREATE INDEX idx_scraped_status ON scraped_events(status);
CREATE INDEX idx_scraped_source_url ON scraped_events(source_id, source_url);

-- ============================================================
-- RLS (disabled for service role, enable if needed)
-- ============================================================

ALTER TABLE scrape_sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE scraped_events ENABLE ROW LEVEL SECURITY;

-- Allow public read for published events
CREATE POLICY "Public can read published events"
  ON events FOR SELECT USING (status = 'published');

-- Service role has full access (used by backend + admin)
CREATE POLICY "Service role full access to events"
  ON events FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access to scrape_sources"
  ON scrape_sources FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access to scraped_events"
  ON scraped_events FOR ALL USING (true) WITH CHECK (true);
