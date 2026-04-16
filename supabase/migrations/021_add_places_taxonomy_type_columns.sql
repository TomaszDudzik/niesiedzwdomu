BEGIN;

ALTER TABLE IF EXISTS places
  ADD COLUMN IF NOT EXISTS type_lvl_1_id UUID,
  ADD COLUMN IF NOT EXISTS type_lvl_2_id UUID;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'type_lvl_1'
  ) AND NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'places_type_lvl_1_id_fkey'
  ) THEN
    ALTER TABLE places
      ADD CONSTRAINT places_type_lvl_1_id_fkey
      FOREIGN KEY (type_lvl_1_id) REFERENCES type_lvl_1(id) ON DELETE SET NULL;
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'type_lvl_2'
  ) AND NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'places_type_lvl_2_id_fkey'
  ) THEN
    ALTER TABLE places
      ADD CONSTRAINT places_type_lvl_2_id_fkey
      FOREIGN KEY (type_lvl_2_id) REFERENCES type_lvl_2(id) ON DELETE SET NULL;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_places_type_lvl_1_id ON places(type_lvl_1_id);
CREATE INDEX IF NOT EXISTS idx_places_type_lvl_2_id ON places(type_lvl_2_id);

COMMIT;