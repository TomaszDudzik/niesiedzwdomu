ALTER TABLE public.camps
  ADD COLUMN IF NOT EXISTS organizer_id UUID NULL;

ALTER TABLE public.camps
  DROP CONSTRAINT IF EXISTS camps_organizer_id_fkey;

UPDATE public.camps c
SET organizer_id = NULL
WHERE organizer_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1
    FROM public.organizers o
    WHERE o.id = c.organizer_id
  );

ALTER TABLE public.camps
  ADD CONSTRAINT camps_organizer_id_fkey
  FOREIGN KEY (organizer_id)
  REFERENCES public.organizers(id)
  ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_camps_organizer_id
  ON public.camps(organizer_id);