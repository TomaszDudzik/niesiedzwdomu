ALTER TABLE public.organizers
  ADD COLUMN IF NOT EXISTS status TEXT,
  ADD COLUMN IF NOT EXISTS content_types TEXT[];

UPDATE public.organizers
SET status = 'draft'
WHERE status IS NULL OR status NOT IN ('draft', 'published');

UPDATE public.organizers
SET content_types = '{}'::TEXT[]
WHERE content_types IS NULL;

ALTER TABLE public.organizers
  ALTER COLUMN status SET DEFAULT 'draft',
  ALTER COLUMN status SET NOT NULL,
  ALTER COLUMN content_types SET DEFAULT '{}'::TEXT[],
  ALTER COLUMN content_types SET NOT NULL;

ALTER TABLE public.organizers DROP CONSTRAINT IF EXISTS organizers_status_check;
ALTER TABLE public.organizers
  ADD CONSTRAINT organizers_status_check
  CHECK (status IN ('draft', 'published'));

ALTER TABLE public.organizers DROP CONSTRAINT IF EXISTS organizers_content_types_check;
ALTER TABLE public.organizers
  ADD CONSTRAINT organizers_content_types_check
  CHECK (content_types <@ ARRAY['miejsca', 'wydarzenia', 'kolonie', 'zajecia']::TEXT[]);

ALTER TABLE public.organizers DROP COLUMN IF EXISTS image_url;
ALTER TABLE public.organizers DROP COLUMN IF EXISTS type;

CREATE INDEX IF NOT EXISTS idx_organizers_status ON public.organizers(status);