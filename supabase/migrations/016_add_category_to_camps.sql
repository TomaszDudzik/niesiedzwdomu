-- Replace old camp_type + category with main_category / category / subcategory
-- to match the Supabase storage folder hierarchy (e.g. kolonie/sportowe/pilka_nozna).

ALTER TABLE camps ADD COLUMN IF NOT EXISTS main_category TEXT;
ALTER TABLE camps ADD COLUMN IF NOT EXISTS subcategory TEXT;

-- Migrate existing data
UPDATE camps SET main_category = camp_type WHERE main_category IS NULL;

-- Drop old columns (category already exists, just needs re-purpose)
ALTER TABLE camps DROP COLUMN IF EXISTS camp_type;
