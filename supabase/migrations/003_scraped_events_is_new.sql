-- Track new vs updated scraped events
ALTER TABLE scraped_events
  ADD COLUMN IF NOT EXISTS is_new BOOLEAN NOT NULL DEFAULT true;

-- Track if content changed on last scrape
ALTER TABLE scraped_events
  ADD COLUMN IF NOT EXISTS last_change_at TIMESTAMPTZ;

CREATE INDEX idx_scraped_events_is_new ON scraped_events (is_new)
  WHERE is_new = true;
