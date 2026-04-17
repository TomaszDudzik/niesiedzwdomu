ALTER TABLE public.events
  ADD COLUMN IF NOT EXISTS street TEXT,
  ADD COLUMN IF NOT EXISTS postcode TEXT,
  ADD COLUMN IF NOT EXISTS city TEXT NOT NULL DEFAULT 'Kraków';

UPDATE public.events
SET
  street = CASE
    WHEN COALESCE(NULLIF(BTRIM(street), ''), '') <> '' THEN BTRIM(street)
    WHEN COALESCE(NULLIF(BTRIM(venue_address), ''), '') = '' THEN ''
    WHEN venue_address ~ ',' THEN BTRIM(REGEXP_REPLACE(venue_address, '\s*,\s*[^,]+$', ''))
    ELSE BTRIM(venue_address)
  END,
  postcode = CASE
    WHEN COALESCE(NULLIF(BTRIM(postcode), ''), '') <> '' THEN BTRIM(postcode)
    WHEN COALESCE(NULLIF(BTRIM(venue_address), ''), '') = '' THEN NULL
    WHEN venue_address ~ '\m[0-9]{2}-[0-9]{3}\M' THEN SUBSTRING(venue_address FROM '\m([0-9]{2}-[0-9]{3})\M')
    ELSE NULL
  END,
  city = CASE
    WHEN COALESCE(NULLIF(BTRIM(city), ''), '') <> '' THEN BTRIM(city)
    WHEN COALESCE(NULLIF(BTRIM(venue_address), ''), '') = '' THEN 'Kraków'
    WHEN venue_address ~ ',' AND venue_address ~ '\m[0-9]{2}-[0-9]{3}\M' THEN BTRIM(REGEXP_REPLACE(SUBSTRING(venue_address FROM '[^,]+$'), '\m[0-9]{2}-[0-9]{3}\M\s*', ''))
    WHEN venue_address ~ ',' THEN BTRIM(SUBSTRING(venue_address FROM '[^,]+$'))
    ELSE 'Kraków'
  END;

ALTER TABLE public.events
  ALTER COLUMN street SET NOT NULL,
  ALTER COLUMN street SET DEFAULT '',
  ALTER COLUMN city SET NOT NULL,
  ALTER COLUMN city SET DEFAULT 'Kraków';

ALTER TABLE public.events
  DROP COLUMN IF EXISTS venue_name,
  DROP COLUMN IF EXISTS venue_address;
