BEGIN;

ALTER TABLE IF EXISTS types RENAME TO type_lvl_1;
ALTER TABLE IF EXISTS subtypes RENAME TO type_lvl_2;

ALTER TABLE IF EXISTS type_lvl_2 RENAME COLUMN type_id TO type_lvl_1_id;

ALTER TABLE IF EXISTS events RENAME COLUMN type_id TO type_lvl_1_id;
ALTER TABLE IF EXISTS events RENAME COLUMN subtype_id TO type_lvl_2_id;
ALTER TABLE IF EXISTS events RENAME COLUMN main_category TO category_lvl_1;
ALTER TABLE IF EXISTS events RENAME COLUMN category TO category_lvl_2;
ALTER TABLE IF EXISTS events RENAME COLUMN subcategory TO category_lvl_3;

ALTER TABLE IF EXISTS camps RENAME COLUMN type_id TO type_lvl_1_id;
ALTER TABLE IF EXISTS camps RENAME COLUMN subtype_id TO type_lvl_2_id;
ALTER TABLE IF EXISTS camps RENAME COLUMN main_category TO category_lvl_1;
ALTER TABLE IF EXISTS camps RENAME COLUMN category TO category_lvl_2;
ALTER TABLE IF EXISTS camps RENAME COLUMN subcategory TO category_lvl_3;

ALTER TABLE IF EXISTS activities RENAME COLUMN type_id TO type_lvl_1_id;
ALTER TABLE IF EXISTS activities RENAME COLUMN subtype_id TO type_lvl_2_id;
ALTER TABLE IF EXISTS activities RENAME COLUMN main_category TO category_lvl_1;
ALTER TABLE IF EXISTS activities RENAME COLUMN category TO category_lvl_2;
ALTER TABLE IF EXISTS activities RENAME COLUMN subcategory TO category_lvl_3;

ALTER TABLE IF EXISTS places RENAME COLUMN type_id TO type_lvl_1_id;
ALTER TABLE IF EXISTS places RENAME COLUMN subtype_id TO type_lvl_2_id;
ALTER TABLE IF EXISTS places RENAME COLUMN main_category TO category_lvl_1;
ALTER TABLE IF EXISTS places RENAME COLUMN category TO category_lvl_2;
ALTER TABLE IF EXISTS places RENAME COLUMN subcategory TO category_lvl_3;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'subtypes_type_id_fkey'
  ) THEN
    ALTER TABLE type_lvl_2 RENAME CONSTRAINT subtypes_type_id_fkey TO type_lvl_2_type_lvl_1_id_fkey;
  END IF;

  IF EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'activities_type_id_fkey'
  ) THEN
    ALTER TABLE activities RENAME CONSTRAINT activities_type_id_fkey TO activities_type_lvl_1_id_fkey;
  END IF;

  IF EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'activities_subtype_id_fkey'
  ) THEN
    ALTER TABLE activities RENAME CONSTRAINT activities_subtype_id_fkey TO activities_type_lvl_2_id_fkey;
  END IF;

  IF EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'camps_type_id_fkey'
  ) THEN
    ALTER TABLE camps RENAME CONSTRAINT camps_type_id_fkey TO camps_type_lvl_1_id_fkey;
  END IF;

  IF EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'camps_subtype_id_fkey'
  ) THEN
    ALTER TABLE camps RENAME CONSTRAINT camps_subtype_id_fkey TO camps_type_lvl_2_id_fkey;
  END IF;

  IF EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'events_type_id_fkey'
  ) THEN
    ALTER TABLE events RENAME CONSTRAINT events_type_id_fkey TO events_type_lvl_1_id_fkey;
  END IF;

  IF EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'events_subtype_id_fkey'
  ) THEN
    ALTER TABLE events RENAME CONSTRAINT events_subtype_id_fkey TO events_type_lvl_2_id_fkey;
  END IF;

  IF EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'places_type_id_fkey'
  ) THEN
    ALTER TABLE places RENAME CONSTRAINT places_type_id_fkey TO places_type_lvl_1_id_fkey;
  END IF;

  IF EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'places_subtype_id_fkey'
  ) THEN
    ALTER TABLE places RENAME CONSTRAINT places_subtype_id_fkey TO places_type_lvl_2_id_fkey;
  END IF;
END $$;

ALTER INDEX IF EXISTS idx_activities_type_id RENAME TO idx_activities_type_lvl_1_id;
ALTER INDEX IF EXISTS idx_activities_subtype_id RENAME TO idx_activities_type_lvl_2_id;
ALTER INDEX IF EXISTS idx_camps_type_id RENAME TO idx_camps_type_lvl_1_id;
ALTER INDEX IF EXISTS idx_camps_subtype_id RENAME TO idx_camps_type_lvl_2_id;
ALTER INDEX IF EXISTS idx_events_type_id RENAME TO idx_events_type_lvl_1_id;
ALTER INDEX IF EXISTS idx_events_subtype_id RENAME TO idx_events_type_lvl_2_id;
ALTER INDEX IF EXISTS idx_places_type_id RENAME TO idx_places_type_lvl_1_id;
ALTER INDEX IF EXISTS idx_places_subtype_id RENAME TO idx_places_type_lvl_2_id;

ALTER INDEX IF EXISTS idx_type_lvl_2_type_id RENAME TO idx_type_lvl_2_type_lvl_1_id;
ALTER INDEX IF EXISTS idx_subtypes_type_id RENAME TO idx_type_lvl_2_type_lvl_1_id;

COMMIT;