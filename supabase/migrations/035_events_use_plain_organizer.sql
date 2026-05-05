ALTER TABLE public.events
  ADD COLUMN IF NOT EXISTS organizer TEXT;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'events'
      AND column_name = 'organizer_id'
  ) AND EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name = 'organizers'
  ) THEN
    EXECUTE '
      UPDATE public.events e
      SET organizer = COALESCE(NULLIF(BTRIM(e.organizer), ''''), o.organizer_name)
      FROM public.organizers o
      WHERE e.organizer_id = o.id
        AND (e.organizer IS NULL OR BTRIM(e.organizer) = '''')
    ';
  END IF;
END $$;

DO $$
DECLARE
  fk_name text;
BEGIN
  SELECT tc.constraint_name
  INTO fk_name
  FROM information_schema.table_constraints tc
  JOIN information_schema.key_column_usage kcu
    ON tc.constraint_name = kcu.constraint_name
   AND tc.table_schema = kcu.table_schema
  WHERE tc.table_schema = 'public'
    AND tc.table_name = 'events'
    AND tc.constraint_type = 'FOREIGN KEY'
    AND kcu.column_name = 'organizer_id'
  LIMIT 1;

  IF fk_name IS NOT NULL THEN
    EXECUTE format('ALTER TABLE public.events DROP CONSTRAINT %I', fk_name);
  END IF;
END $$;

DROP INDEX IF EXISTS public.idx_events_organizer_id;

ALTER TABLE public.events
  DROP COLUMN IF EXISTS organizer_id;