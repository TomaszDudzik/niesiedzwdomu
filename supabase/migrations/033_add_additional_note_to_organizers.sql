ALTER TABLE public.organizers
  ADD COLUMN IF NOT EXISTS additional_note TEXT;

COMMENT ON COLUMN public.organizers.additional_note IS 'Dodatkowa notatka dla redakcji';