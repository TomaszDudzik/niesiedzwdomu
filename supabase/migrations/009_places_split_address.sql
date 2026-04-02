-- Split address into street + city
ALTER TABLE places RENAME COLUMN address TO street;
ALTER TABLE places ADD COLUMN city TEXT NOT NULL DEFAULT 'Kraków';
ALTER TABLE places ADD COLUMN facebook_url TEXT;

-- Migrate existing data: if address contains a comma, split into street and city
UPDATE places
SET
  city = TRIM(SPLIT_PART(street, ',', -1)),
  street = TRIM(LEFT(street, LENGTH(street) - LENGTH(SPLIT_PART(street, ',', -1)) - 1))
WHERE street LIKE '%,%';
