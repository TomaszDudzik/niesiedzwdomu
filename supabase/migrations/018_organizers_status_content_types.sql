ALTER TABLE organizers ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published'));
ALTER TABLE organizers ADD COLUMN IF NOT EXISTS content_types TEXT[] NOT NULL DEFAULT '{}';
-- content_types stores array of: 'miejsca', 'wydarzenia', 'kolonie', 'zajecia'

ALTER TABLE organizers DROP COLUMN IF EXISTS image_url;
ALTER TABLE organizers DROP COLUMN IF EXISTS type;
