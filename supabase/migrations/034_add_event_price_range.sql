ALTER TABLE public.events
  ADD COLUMN IF NOT EXISTS price_from NUMERIC NULL,
  ADD COLUMN IF NOT EXISTS price_to NUMERIC NULL;

UPDATE public.events
SET
  price_from = COALESCE(price_from, price),
  price_to = COALESCE(price_to, price)
WHERE price IS NOT NULL
  AND (price_from IS NULL OR price_to IS NULL);

UPDATE public.events
SET is_free = TRUE
WHERE COALESCE(price_from, price_to) = 0;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'events_price_range_check'
      AND conrelid = 'public.events'::regclass
  ) THEN
    ALTER TABLE public.events
      ADD CONSTRAINT events_price_range_check CHECK (
        price_from IS NULL
        OR price_to IS NULL
        OR price_from <= price_to
      );
  END IF;
END $$;

ALTER TABLE public.events
  DROP COLUMN IF EXISTS price;