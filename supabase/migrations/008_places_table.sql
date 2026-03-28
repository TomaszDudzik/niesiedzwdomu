CREATE TABLE IF NOT EXISTS places (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title           TEXT NOT NULL,
  slug            TEXT NOT NULL UNIQUE,
  description_short TEXT NOT NULL DEFAULT '',
  description_long TEXT NOT NULL DEFAULT '',
  image_url       TEXT,
  place_type      TEXT NOT NULL DEFAULT 'inne',
  is_indoor       BOOLEAN NOT NULL DEFAULT false,
  address         TEXT NOT NULL DEFAULT '',
  district        TEXT NOT NULL DEFAULT 'Inne',
  lat             DOUBLE PRECISION,
  lng             DOUBLE PRECISION,
  age_min         INT,
  age_max         INT,
  price           NUMERIC(10,2),
  is_free         BOOLEAN NOT NULL DEFAULT false,
  amenities       TEXT[] DEFAULT '{}',
  opening_hours   TEXT,
  source_url      TEXT,
  is_featured     BOOLEAN NOT NULL DEFAULT false,
  status          TEXT NOT NULL DEFAULT 'published' CHECK (status IN ('draft', 'published', 'cancelled')),
  likes           INT NOT NULL DEFAULT 0,
  dislikes        INT NOT NULL DEFAULT 0,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- RLS: allow public read for published places
ALTER TABLE places ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public can read published places" ON places
  FOR SELECT USING (status = 'published');

-- Allow service role full access
CREATE POLICY "Service role full access" ON places
  FOR ALL USING (true) WITH CHECK (true);
