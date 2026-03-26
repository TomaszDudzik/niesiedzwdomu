-- Change extractor_type from LLM/rule_based enum to adapter name (e.g. 'biletyna', 'ck_podgorza', 'generic')
-- LLM extraction was never used; all extraction is done via adapters or the generic CSS/JSON-LD pipeline.

-- Drop the old CHECK constraint
ALTER TABLE scrape_sources
  DROP CONSTRAINT IF EXISTS scrape_sources_extractor_type_check;

-- Update existing 'llm' / 'rule_based' values to 'generic'
UPDATE scrape_sources
  SET extractor_type = 'generic'
  WHERE extractor_type IN ('llm', 'rule_based');

-- Set default to 'generic'
ALTER TABLE scrape_sources
  ALTER COLUMN extractor_type SET DEFAULT 'generic';

-- Also clean up extraction_method on scraped_events if it exists
ALTER TABLE scraped_events
  DROP CONSTRAINT IF EXISTS scraped_events_extraction_method_check;
