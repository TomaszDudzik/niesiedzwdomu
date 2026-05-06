ALTER TABLE public.activities
  ADD COLUMN IF NOT EXISTS type_lvl_1        TEXT,
  ADD COLUMN IF NOT EXISTS type_lvl_2        TEXT,
  ADD COLUMN IF NOT EXISTS category_lvl_1    TEXT,
  ADD COLUMN IF NOT EXISTS category_lvl_2    TEXT,
  ADD COLUMN IF NOT EXISTS category_lvl_3    TEXT,
  ADD COLUMN IF NOT EXISTS list_of_activities TEXT,
  ADD COLUMN IF NOT EXISTS organizer_id       UUID REFERENCES public.organizers(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS note               TEXT;
