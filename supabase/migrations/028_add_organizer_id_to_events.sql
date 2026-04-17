ALTER TABLE public.events
  ADD COLUMN IF NOT EXISTS organizer_id UUID NULL;

ALTER TABLE public.events
  DROP CONSTRAINT IF EXISTS events_organizer_id_fkey;

UPDATE public.events e
SET organizer_id = NULL
WHERE organizer_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1
    FROM public.organizers o
    WHERE o.id = e.organizer_id
  );

ALTER TABLE public.events
  ADD CONSTRAINT events_organizer_id_fkey
  FOREIGN KEY (organizer_id)
  REFERENCES public.organizers(id)
  ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_events_organizer_id
  ON public.events(organizer_id);