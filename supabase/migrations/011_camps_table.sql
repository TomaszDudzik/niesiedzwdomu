CREATE TABLE IF NOT EXISTS camps (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title               TEXT NOT NULL,
  slug                TEXT NOT NULL UNIQUE,
  description_short   TEXT NOT NULL DEFAULT '',
  description_long    TEXT NOT NULL DEFAULT '',
  image_url           TEXT,
  date_start          DATE NOT NULL,
  date_end            DATE NOT NULL,
  camp_type           TEXT NOT NULL DEFAULT 'polkolonie' CHECK (camp_type IN ('kolonie', 'polkolonie', 'warsztaty_wakacyjne')),
  season              TEXT NOT NULL DEFAULT 'lato' CHECK (season IN ('lato', 'zima', 'ferie_zimowe', 'ferie_wiosenne', 'caly_rok')),
  duration_days       INT NOT NULL DEFAULT 5,
  meals_included      BOOLEAN NOT NULL DEFAULT false,
  transport_included  BOOLEAN NOT NULL DEFAULT false,
  age_min             INT,
  age_max             INT,
  price_from          NUMERIC(10,2),
  price_to            NUMERIC(10,2),
  is_free             BOOLEAN NOT NULL DEFAULT false,
  district            TEXT NOT NULL DEFAULT 'Inne',
  venue_name          TEXT NOT NULL DEFAULT '',
  venue_address       TEXT NOT NULL DEFAULT '',
  organizer           TEXT,
  source_url          TEXT,
  is_featured         BOOLEAN NOT NULL DEFAULT false,
  status              TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'cancelled')),
  likes               INT NOT NULL DEFAULT 0,
  dislikes            INT NOT NULL DEFAULT 0,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT camps_price_range_check CHECK (
    price_from IS NULL OR price_to IS NULL OR price_from <= price_to
  )
);

CREATE INDEX IF NOT EXISTS idx_camps_date_start ON camps(date_start);
CREATE INDEX IF NOT EXISTS idx_camps_camp_type ON camps(camp_type);
CREATE INDEX IF NOT EXISTS idx_camps_season ON camps(season);
CREATE INDEX IF NOT EXISTS idx_camps_district ON camps(district);
CREATE INDEX IF NOT EXISTS idx_camps_status ON camps(status);
CREATE INDEX IF NOT EXISTS idx_camps_slug ON camps(slug);

ALTER TABLE camps ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can read published camps" ON camps;
CREATE POLICY "Public can read published camps" ON camps
  FOR SELECT USING (status = 'published');

DROP POLICY IF EXISTS "Service role full access" ON camps;
CREATE POLICY "Service role full access" ON camps
  FOR ALL USING (true) WITH CHECK (true);
