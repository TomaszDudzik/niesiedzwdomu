-- ============================================
-- Scraping Pipeline Tables
-- Works alongside existing events/camps/places tables.
-- scraped_events is the staging area; approved records
-- get inserted/updated into the canonical `events` table.
-- ============================================

-- Pipeline event status (separate from content_status used by canonical tables)
CREATE TYPE scrape_status AS ENUM (
  'extracted',    -- raw extraction done
  'validated',    -- passed validation + scoring
  'review',       -- waiting for admin review
  'approved',     -- admin approved, ready to push to canonical
  'published',    -- pushed to canonical events table
  'rejected',     -- discarded (low quality, not relevant)
  'expired'       -- event date has passed
);

-- ============================================
-- Scrape sources: where we fetch data from
-- ============================================
CREATE TABLE scrape_sources (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name                  TEXT NOT NULL,
  base_url              TEXT NOT NULL,
  fetch_method          TEXT NOT NULL DEFAULT 'requests'
                        CHECK (fetch_method IN ('requests', 'playwright')),
  extractor_type        TEXT NOT NULL DEFAULT 'llm'
                        CHECK (extractor_type IN ('llm', 'rule_based')),
  scrape_config         JSONB NOT NULL DEFAULT '{}',
  is_active             BOOLEAN NOT NULL DEFAULT true,
  scrape_interval_hours INT NOT NULL DEFAULT 24,
  last_scraped_at       TIMESTAMPTZ,
  total_events_pushed   INT NOT NULL DEFAULT 0,
  notes                 TEXT,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_scrape_sources_active ON scrape_sources (is_active)
  WHERE is_active = true;

CREATE TRIGGER scrape_sources_updated_at
  BEFORE UPDATE ON scrape_sources
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================
-- Source runs: one row per scrape execution
-- ============================================
CREATE TABLE source_runs (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_id       UUID NOT NULL REFERENCES scrape_sources(id) ON DELETE CASCADE,
  status          TEXT NOT NULL DEFAULT 'running'
                  CHECK (status IN ('running', 'completed', 'failed')),
  started_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  finished_at     TIMESTAMPTZ,
  pages_fetched   INT NOT NULL DEFAULT 0,
  events_extracted INT NOT NULL DEFAULT 0,
  events_new      INT NOT NULL DEFAULT 0,
  events_updated  INT NOT NULL DEFAULT 0,
  error_log       TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_source_runs_source ON source_runs (source_id, started_at DESC);

-- ============================================
-- Raw pages: stored HTML + cleaned text
-- ============================================
CREATE TABLE raw_pages (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_run_id   UUID NOT NULL REFERENCES source_runs(id) ON DELETE CASCADE,
  source_id       UUID NOT NULL REFERENCES scrape_sources(id) ON DELETE CASCADE,
  url             TEXT NOT NULL,
  url_hash        TEXT NOT NULL,
  http_status     INT,
  raw_html        TEXT,
  cleaned_text    TEXT,
  content_hash    TEXT,
  fetched_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_raw_pages_url_hash ON raw_pages (url_hash);
CREATE INDEX idx_raw_pages_source_run ON raw_pages (source_run_id);
-- Keep only latest page per URL for fast lookup
CREATE INDEX idx_raw_pages_url_latest ON raw_pages (url_hash, fetched_at DESC);

-- ============================================
-- Scraped events: staging table (pipeline output)
-- Once approved, data is copied to canonical `events` table.
-- ============================================
CREATE TABLE scraped_events (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_id           UUID NOT NULL REFERENCES scrape_sources(id) ON DELETE CASCADE,
  raw_page_id         UUID REFERENCES raw_pages(id) ON DELETE SET NULL,
  canonical_event_id  UUID REFERENCES events(id) ON DELETE SET NULL,

  -- Status
  status              scrape_status NOT NULL DEFAULT 'extracted',

  -- Extracted fields (mirror canonical events structure)
  title               TEXT NOT NULL,
  description_short   TEXT,
  description_long    TEXT,
  start_at            TIMESTAMPTZ,
  end_at              TIMESTAMPTZ,
  date_text_raw       TEXT,
  age_min             INT,
  age_max             INT,
  price_from          NUMERIC(10,2),
  price_to            NUMERIC(10,2),
  is_free             BOOLEAN,
  venue_name          TEXT,
  venue_address       TEXT,
  district            TEXT,
  city                TEXT DEFAULT 'Kraków',
  organizer_name      TEXT,
  source_url          TEXT NOT NULL,
  image_url           TEXT,
  categories          TEXT[] DEFAULT '{}',
  tags                TEXT[] DEFAULT '{}',
  registration_url    TEXT,

  -- Full LLM/rule extraction output
  extracted_data      JSONB NOT NULL DEFAULT '{}',
  extraction_method   TEXT NOT NULL DEFAULT 'llm'
                      CHECK (extraction_method IN ('llm', 'rule_based')),
  extraction_notes    TEXT,

  -- Quality scoring
  confidence_score    REAL NOT NULL DEFAULT 0
                      CHECK (confidence_score >= 0 AND confidence_score <= 1),
  field_confidence    JSONB DEFAULT '{}',
  validation_errors   JSONB DEFAULT '[]',

  -- Dedup
  fingerprint         TEXT,

  -- Tracking
  source_first_seen   TIMESTAMPTZ NOT NULL DEFAULT now(),
  source_last_seen    TIMESTAMPTZ NOT NULL DEFAULT now(),
  previous_data       JSONB,
  reviewed_by         TEXT,
  reviewed_at         TIMESTAMPTZ,
  published_at        TIMESTAMPTZ,

  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_scraped_events_status ON scraped_events (status);
CREATE INDEX idx_scraped_events_review ON scraped_events (status, confidence_score)
  WHERE status = 'review';
CREATE INDEX idx_scraped_events_fingerprint ON scraped_events (fingerprint)
  WHERE fingerprint IS NOT NULL;
CREATE INDEX idx_scraped_events_source_url ON scraped_events (source_url);
CREATE INDEX idx_scraped_events_source ON scraped_events (source_id);
-- Uniqueness is enforced by fingerprint, not source_url,
-- because inline sources have multiple events per page URL.
CREATE UNIQUE INDEX idx_scraped_events_fingerprint_active ON scraped_events (fingerprint)
  WHERE fingerprint IS NOT NULL AND status NOT IN ('rejected', 'expired');

CREATE TRIGGER scraped_events_updated_at
  BEFORE UPDATE ON scraped_events
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================
-- Event duplicates: candidate pairs
-- ============================================
CREATE TABLE event_duplicates (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_a_id  UUID NOT NULL REFERENCES scraped_events(id) ON DELETE CASCADE,
  event_b_id  UUID NOT NULL REFERENCES scraped_events(id) ON DELETE CASCADE,
  similarity  REAL NOT NULL,
  match_type  TEXT NOT NULL CHECK (match_type IN ('exact_url', 'fingerprint', 'fuzzy')),
  resolved    BOOLEAN NOT NULL DEFAULT false,
  resolution  TEXT CHECK (resolution IN ('merged', 'not_duplicate', 'ignored')),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT different_events CHECK (event_a_id != event_b_id)
);

CREATE INDEX idx_event_duplicates_unresolved ON event_duplicates (resolved)
  WHERE resolved = false;

-- ============================================
-- RLS: pipeline tables are backend-only (service role)
-- ============================================
ALTER TABLE scrape_sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE source_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE raw_pages ENABLE ROW LEVEL SECURITY;
ALTER TABLE scraped_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_duplicates ENABLE ROW LEVEL SECURITY;

-- No public access — only service_role can read/write pipeline tables
-- (Admin panel uses service role key via server-side API routes)

-- ============================================
-- Helper RPC: increment source trust counter
-- ============================================
CREATE OR REPLACE FUNCTION increment_source_events_pushed(source_id_param UUID)
RETURNS void AS $$
BEGIN
  UPDATE scrape_sources
  SET total_events_pushed = total_events_pushed + 1
  WHERE id = source_id_param;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
