DO $$
BEGIN
  CREATE TYPE activity_type AS ENUM ('sportowe', 'artystyczne', 'edukacyjne', 'muzyczne', 'taneczne', 'jezykowe', 'sensoryczne', 'inne');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS activities (
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

CREATE INDEX IF NOT EXISTS idx_activities_date_start ON activities(date_start);
CREATE INDEX IF NOT EXISTS idx_activities_activity_type ON activities(activity_type);
CREATE INDEX IF NOT EXISTS idx_activities_district ON activities(district);
CREATE INDEX IF NOT EXISTS idx_activities_status ON activities(status);
CREATE INDEX IF NOT EXISTS idx_activities_slug ON activities(slug);

DROP TRIGGER IF EXISTS activities_updated_at ON activities;
CREATE TRIGGER activities_updated_at
  BEFORE UPDATE ON activities FOR EACH ROW EXECUTE FUNCTION update_updated_at();