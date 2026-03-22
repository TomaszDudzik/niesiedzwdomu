-- Add content_type column to scrape_sources
-- Allows categorizing sources by what they provide: events, camps, or places
ALTER TABLE scrape_sources
  ADD COLUMN IF NOT EXISTS content_type TEXT NOT NULL DEFAULT 'wydarzenia'
  CHECK (content_type IN ('wydarzenia', 'kolonie', 'miejsca'));

CREATE INDEX idx_scrape_sources_content_type ON scrape_sources (content_type);
