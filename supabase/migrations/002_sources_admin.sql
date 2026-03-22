-- ============================================
-- Expand scrape_sources for admin management
-- Moves source config from YAML to DB-managed.
-- ============================================

-- Add explicit columns for fields previously only in scrape_config JSONB
ALTER TABLE scrape_sources
  ADD COLUMN IF NOT EXISTS pre_filtered       BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS listing_urls       TEXT[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS pagination         TEXT NOT NULL DEFAULT 'none'
                                              CHECK (pagination IN ('none', 'path', 'query')),
  ADD COLUMN IF NOT EXISTS max_pages          INT NOT NULL DEFAULT 5,
  ADD COLUMN IF NOT EXISTS page_pattern       TEXT,
  ADD COLUMN IF NOT EXISTS events_mode        TEXT NOT NULL DEFAULT 'inline'
                                              CHECK (events_mode IN ('inline', 'links')),
  ADD COLUMN IF NOT EXISTS link_selector      TEXT DEFAULT 'a',
  ADD COLUMN IF NOT EXISTS default_venue_name TEXT,
  ADD COLUMN IF NOT EXISTS default_venue_address TEXT,
  ADD COLUMN IF NOT EXISTS default_district   TEXT,
  ADD COLUMN IF NOT EXISTS default_organizer  TEXT,
  ADD COLUMN IF NOT EXISTS default_is_free    BOOLEAN;

-- Unique constraint on source name to prevent duplicates
ALTER TABLE scrape_sources
  ADD CONSTRAINT scrape_sources_name_unique UNIQUE (name);
