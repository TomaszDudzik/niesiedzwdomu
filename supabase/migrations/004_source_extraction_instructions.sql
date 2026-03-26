-- Custom extraction instructions per source
ALTER TABLE scrape_sources
  ADD COLUMN IF NOT EXISTS extraction_instructions TEXT;
