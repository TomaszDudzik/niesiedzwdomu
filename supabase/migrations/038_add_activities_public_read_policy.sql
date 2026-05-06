-- Ensure activities are readable publicly when published.
-- This fixes frontend listings that use the anon key.

ALTER TABLE activities ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can read published activities" ON activities;
CREATE POLICY "Public can read published activities"
  ON activities
  FOR SELECT
  USING (status = 'published');
