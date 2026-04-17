ALTER TABLE public.events
  ADD COLUMN IF NOT EXISTS image_cover TEXT,
  ADD COLUMN IF NOT EXISTS image_thumb TEXT,
  ADD COLUMN IF NOT EXISTS image_set TEXT;

ALTER TABLE public.camps
  ADD COLUMN IF NOT EXISTS image_cover TEXT,
  ADD COLUMN IF NOT EXISTS image_thumb TEXT,
  ADD COLUMN IF NOT EXISTS image_set TEXT;

ALTER TABLE public.activities
  ADD COLUMN IF NOT EXISTS image_cover TEXT,
  ADD COLUMN IF NOT EXISTS image_thumb TEXT,
  ADD COLUMN IF NOT EXISTS image_set TEXT;

ALTER TABLE public.places
  ADD COLUMN IF NOT EXISTS image_cover TEXT,
  ADD COLUMN IF NOT EXISTS image_thumb TEXT,
  ADD COLUMN IF NOT EXISTS image_set TEXT;

ALTER TABLE IF EXISTS public.companies
  ADD COLUMN IF NOT EXISTS image_cover TEXT,
  ADD COLUMN IF NOT EXISTS image_thumb TEXT,
  ADD COLUMN IF NOT EXISTS image_set TEXT;

UPDATE public.events
SET image_cover = COALESCE(image_cover, image_url)
WHERE image_url IS NOT NULL;

UPDATE public.camps
SET image_cover = COALESCE(image_cover, image_url)
WHERE image_url IS NOT NULL;

UPDATE public.activities
SET image_cover = COALESCE(image_cover, image_url)
WHERE image_url IS NOT NULL;

UPDATE public.places
SET image_cover = COALESCE(image_cover, image_url)
WHERE image_url IS NOT NULL;

UPDATE public.events
SET image_thumb = REPLACE(image_url, '-cover.webp', '-thumb.webp')
WHERE image_thumb IS NULL
  AND image_url LIKE '%-cover.webp';

UPDATE public.camps
SET image_thumb = REPLACE(image_url, '-cover.webp', '-thumb.webp')
WHERE image_thumb IS NULL
  AND image_url LIKE '%-cover.webp';

UPDATE public.activities
SET image_thumb = REPLACE(image_url, '-cover.webp', '-thumb.webp')
WHERE image_thumb IS NULL
  AND image_url LIKE '%-cover.webp';

UPDATE public.places
SET image_thumb = REPLACE(image_url, '-cover.webp', '-thumb.webp')
WHERE image_thumb IS NULL
  AND image_url LIKE '%-cover.webp';