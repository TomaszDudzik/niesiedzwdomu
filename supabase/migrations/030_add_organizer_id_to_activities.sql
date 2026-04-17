ALTER TABLE public.activities
  ADD COLUMN IF NOT EXISTS organizer_id UUID NULL;

ALTER TABLE public.activities
  DROP CONSTRAINT IF EXISTS activities_organizer_id_fkey;

UPDATE public.activities a
SET organizer_id = NULL
WHERE organizer_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1
    FROM public.organizers o
    WHERE o.id = a.organizer_id
  );

ALTER TABLE public.activities
  ADD CONSTRAINT activities_organizer_id_fkey
  FOREIGN KEY (organizer_id)
  REFERENCES public.organizers(id)
  ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_activities_organizer_id
  ON public.activities(organizer_id);