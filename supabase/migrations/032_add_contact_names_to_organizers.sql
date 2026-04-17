ALTER TABLE public.organizers
  ADD COLUMN IF NOT EXISTS contact_first_name TEXT,
  ADD COLUMN IF NOT EXISTS contact_last_name TEXT;

UPDATE public.organizers
SET
  contact_first_name = COALESCE(contact_first_name, ''),
  contact_last_name = COALESCE(contact_last_name, '');

ALTER TABLE public.organizers
  ALTER COLUMN contact_first_name SET DEFAULT '',
  ALTER COLUMN contact_last_name SET DEFAULT '';