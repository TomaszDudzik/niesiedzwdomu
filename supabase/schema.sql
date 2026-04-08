-- ============================================
-- Rodzic w Tarapatach — Supabase Schema
-- Expanded: Events + Camps + Places
-- ============================================

-- Shared enums
CREATE TYPE content_status AS ENUM ('draft', 'published', 'cancelled', 'deleted');

CREATE TYPE district AS ENUM (
  'Stare Miasto', 'Kazimierz', 'Podgórze', 'Nowa Huta',
  'Krowodrza', 'Bronowice', 'Zwierzyniec', 'Dębniki',
  'Prądnik Czerwony', 'Prądnik Biały', 'Czyżyny', 'Bieżanów', 'Inne'
);

-- Event-specific enums
CREATE TYPE event_category AS ENUM (
  'warsztaty', 'spektakl', 'muzyka', 'sport',
  'natura', 'edukacja', 'festyn', 'kino', 'wystawa', 'inne'
);

-- Camp-specific enums
CREATE TYPE camp_type AS ENUM ('kolonie', 'polkolonie', 'warsztaty_wakacyjne');
CREATE TYPE camp_season AS ENUM ('lato', 'zima', 'ferie_zimowe', 'ferie_wiosenne', 'caly_rok');

-- Activity-specific enums
CREATE TYPE activity_type AS ENUM ('sportowe', 'artystyczne', 'edukacyjne', 'muzyczne', 'taneczne', 'jezykowe', 'sensoryczne', 'inne');

-- Place-specific enums
CREATE TYPE place_type AS ENUM ('plac_zabaw', 'sala_zabaw', 'kawiarnia_rodzinna', 'inne');

-- ============================================
-- Auto-update trigger function
-- ============================================
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- Venues
-- ============================================
CREATE TABLE venues (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT NOT NULL,
  address     TEXT NOT NULL,
  district    district NOT NULL DEFAULT 'Inne',
  lat         DOUBLE PRECISION,
  lng         DOUBLE PRECISION,
  website     TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_venues_district ON venues(district);

-- ============================================
-- Events
-- ============================================
CREATE TABLE events (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title             TEXT NOT NULL,
  slug              TEXT NOT NULL UNIQUE,
  description_short TEXT NOT NULL DEFAULT '',
  description_long  TEXT NOT NULL DEFAULT '',
  image_url         TEXT,
  date_start        DATE NOT NULL,
  date_end          DATE,
  time_start        TIME,
  time_end          TIME,
  age_min           INT,
  age_max           INT,
  price             NUMERIC(10,2),
  is_free           BOOLEAN NOT NULL DEFAULT false,
  category          event_category NOT NULL DEFAULT 'inne',
  district          district NOT NULL DEFAULT 'Inne',
  venue_id          UUID REFERENCES venues(id) ON DELETE SET NULL,
  venue_name        TEXT NOT NULL DEFAULT '',
  venue_address     TEXT NOT NULL DEFAULT '',
  source_url        TEXT,
  facebook_url      TEXT,
  organizer         TEXT,
  is_featured       BOOLEAN NOT NULL DEFAULT false,
  status            content_status NOT NULL DEFAULT 'draft',
  likes             INT NOT NULL DEFAULT 0,
  dislikes          INT NOT NULL DEFAULT 0,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_events_date_start ON events(date_start);
CREATE INDEX idx_events_category ON events(category);
CREATE INDEX idx_events_district ON events(district);
CREATE INDEX idx_events_status ON events(status);
CREATE INDEX idx_events_is_featured ON events(is_featured) WHERE is_featured = true;
CREATE INDEX idx_events_slug ON events(slug);
CREATE INDEX idx_events_is_free ON events(is_free) WHERE is_free = true;

CREATE TRIGGER events_updated_at
  BEFORE UPDATE ON events FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================
-- Camps
-- ============================================
CREATE TABLE camps (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title               TEXT NOT NULL,
  slug                TEXT NOT NULL UNIQUE,
  description_short   TEXT NOT NULL DEFAULT '',
  description_long    TEXT NOT NULL DEFAULT '',
  image_url           TEXT,
  date_start          DATE NOT NULL,
  date_end            DATE NOT NULL,
  camp_type           camp_type NOT NULL,
  season              camp_season NOT NULL,
  duration_days       INT NOT NULL,
  meals_included      BOOLEAN NOT NULL DEFAULT false,
  transport_included  BOOLEAN NOT NULL DEFAULT false,
  age_min             INT,
  age_max             INT,
  price               NUMERIC(10,2),
  is_free             BOOLEAN NOT NULL DEFAULT false,
  district            district NOT NULL DEFAULT 'Inne',
  venue_name          TEXT NOT NULL DEFAULT '',
  venue_address       TEXT NOT NULL DEFAULT '',
  organizer           TEXT,
  source_url          TEXT,
  facebook_url        TEXT,
  is_featured         BOOLEAN NOT NULL DEFAULT false,
  status              content_status NOT NULL DEFAULT 'draft',
  likes               INT NOT NULL DEFAULT 0,
  dislikes            INT NOT NULL DEFAULT 0,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_camps_date_start ON camps(date_start);
CREATE INDEX idx_camps_season ON camps(season);
CREATE INDEX idx_camps_camp_type ON camps(camp_type);
CREATE INDEX idx_camps_district ON camps(district);
CREATE INDEX idx_camps_status ON camps(status);
CREATE INDEX idx_camps_slug ON camps(slug);

CREATE TRIGGER camps_updated_at
  BEFORE UPDATE ON camps FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================
-- Activities
-- ============================================
CREATE TABLE activities (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title             TEXT NOT NULL,
  slug              TEXT NOT NULL UNIQUE,
  description_short TEXT NOT NULL DEFAULT '',
  description_long  TEXT NOT NULL DEFAULT '',
  image_url         TEXT,
  activity_type     activity_type NOT NULL DEFAULT 'inne',
  schedule_summary  TEXT,
  days_of_week      TEXT[] NOT NULL DEFAULT '{}',
  date_start        DATE NOT NULL,
  date_end          DATE,
  time_start        TIME,
  time_end          TIME,
  age_min           INT,
  age_max           INT,
  price_from        NUMERIC(10,2),
  price_to          NUMERIC(10,2),
  is_free           BOOLEAN NOT NULL DEFAULT false,
  district          district NOT NULL DEFAULT 'Inne',
  venue_name        TEXT NOT NULL DEFAULT '',
  venue_address     TEXT NOT NULL DEFAULT '',
  organizer         TEXT NOT NULL DEFAULT '',
  source_url        TEXT,
  facebook_url      TEXT,
  is_featured       BOOLEAN NOT NULL DEFAULT false,
  status            content_status NOT NULL DEFAULT 'draft',
  likes             INT NOT NULL DEFAULT 0,
  dislikes          INT NOT NULL DEFAULT 0,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT activities_price_range_check CHECK (
    price_from IS NULL OR price_to IS NULL OR price_from <= price_to
  )
);

CREATE INDEX idx_activities_date_start ON activities(date_start);
CREATE INDEX idx_activities_activity_type ON activities(activity_type);
CREATE INDEX idx_activities_district ON activities(district);
CREATE INDEX idx_activities_status ON activities(status);
CREATE INDEX idx_activities_slug ON activities(slug);

CREATE TRIGGER activities_updated_at
  BEFORE UPDATE ON activities FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================
-- Places
-- ============================================
CREATE TABLE places (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title             TEXT NOT NULL,
  slug              TEXT NOT NULL UNIQUE,
  description_short TEXT NOT NULL DEFAULT '',
  description_long  TEXT NOT NULL DEFAULT '',
  image_url         TEXT,
  place_type        place_type NOT NULL,
  is_indoor         BOOLEAN NOT NULL DEFAULT false,
  street            TEXT NOT NULL DEFAULT '',
  city              TEXT NOT NULL DEFAULT 'Kraków',
  district          district NOT NULL DEFAULT 'Inne',
  lat               DOUBLE PRECISION,
  lng               DOUBLE PRECISION,
  age_min           INT,
  age_max           INT,
  price             NUMERIC(10,2),
  is_free           BOOLEAN NOT NULL DEFAULT true,
  amenities         TEXT[] NOT NULL DEFAULT '{}',
  opening_hours     TEXT,
  source_url        TEXT,
  facebook_url      TEXT,
  is_featured       BOOLEAN NOT NULL DEFAULT false,
  status            content_status NOT NULL DEFAULT 'draft',
  likes             INT NOT NULL DEFAULT 0,
  dislikes          INT NOT NULL DEFAULT 0,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_places_place_type ON places(place_type);
CREATE INDEX idx_places_district ON places(district);
CREATE INDEX idx_places_is_indoor ON places(is_indoor);
CREATE INDEX idx_places_status ON places(status);
CREATE INDEX idx_places_slug ON places(slug);

CREATE TRIGGER places_updated_at
  BEFORE UPDATE ON places FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================
-- Feedback (supports all content types)
-- ============================================
CREATE TABLE feedback (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  content_type  TEXT NOT NULL DEFAULT 'event',
  event_id      UUID REFERENCES events(id) ON DELETE CASCADE,
  camp_id       UUID REFERENCES camps(id) ON DELETE CASCADE,
  place_id      UUID REFERENCES places(id) ON DELETE CASCADE,
  is_positive   BOOLEAN NOT NULL,
  session_id    TEXT NOT NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- Exactly one target must be set
  CONSTRAINT feedback_one_target CHECK (
    (event_id IS NOT NULL)::int +
    (camp_id IS NOT NULL)::int +
    (place_id IS NOT NULL)::int = 1
  ),

  -- One vote per session per target
  CONSTRAINT feedback_unique_event UNIQUE (event_id, session_id),
  CONSTRAINT feedback_unique_camp UNIQUE (camp_id, session_id),
  CONSTRAINT feedback_unique_place UNIQUE (place_id, session_id)
);

CREATE INDEX idx_feedback_event ON feedback(event_id) WHERE event_id IS NOT NULL;
CREATE INDEX idx_feedback_camp ON feedback(camp_id) WHERE camp_id IS NOT NULL;
CREATE INDEX idx_feedback_place ON feedback(place_id) WHERE place_id IS NOT NULL;

-- ============================================
-- Discovery feed view (for homepage mixed queries)
-- ============================================
CREATE VIEW discovery_feed AS
  SELECT id, 'event' as content_type, title, slug, description_short,
         image_url, date_start, district, age_min, age_max, price,
         is_free, is_featured, status, likes, created_at
  FROM events WHERE status = 'published'
UNION ALL
  SELECT id, 'camp' as content_type, title, slug, description_short,
         image_url, date_start, district, age_min, age_max, price,
         is_free, is_featured, status, likes, created_at
  FROM camps WHERE status = 'published'
UNION ALL
  SELECT id, 'place' as content_type, title, slug, description_short,
         image_url, NULL as date_start, district, age_min, age_max, price,
         is_free, is_featured, status, likes, created_at
  FROM places WHERE status = 'published';

-- ============================================
-- Row Level Security
-- ============================================
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE camps ENABLE ROW LEVEL SECURITY;
ALTER TABLE places ENABLE ROW LEVEL SECURITY;
ALTER TABLE venues ENABLE ROW LEVEL SECURITY;
ALTER TABLE feedback ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can read published events" ON events FOR SELECT USING (status = 'published');
CREATE POLICY "Public can read published camps" ON camps FOR SELECT USING (status = 'published');
CREATE POLICY "Public can read published places" ON places FOR SELECT USING (status = 'published');
CREATE POLICY "Public can read venues" ON venues FOR SELECT USING (true);
CREATE POLICY "Public can insert feedback" ON feedback FOR INSERT WITH CHECK (true);
CREATE POLICY "Public can read feedback" ON feedback FOR SELECT USING (true);

-- Service role has full access (used in admin via service key)
