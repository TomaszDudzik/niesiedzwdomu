ALTER TABLE public.places
  ADD COLUMN IF NOT EXISTS organizer_id UUID NULL;

ALTER TABLE public.places
  DROP CONSTRAINT IF EXISTS places_company_id_fkey;

ALTER TABLE public.places
  DROP CONSTRAINT IF EXISTS places_organizer_id_fkey;

UPDATE public.places p
SET organizer_id = NULL
WHERE organizer_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1
    FROM public.organizers o
    WHERE o.id = p.organizer_id
  );

ALTER TABLE public.places
  ADD CONSTRAINT places_organizer_id_fkey
  FOREIGN KEY (organizer_id)
  REFERENCES public.organizers(id)
  ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_places_organizer_id
  ON public.places(organizer_id);