ALTER TABLE public.places
  ADD COLUMN IF NOT EXISTS postcode TEXT NOT NULL DEFAULT '';

CREATE INDEX IF NOT EXISTS idx_places_postcode ON public.places(postcode);
