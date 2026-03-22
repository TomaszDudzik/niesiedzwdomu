-- Custom extraction instructions per source
-- Appended to the LLM prompt so it knows how to handle each page differently
ALTER TABLE scrape_sources
  ADD COLUMN IF NOT EXISTS extraction_instructions TEXT;
