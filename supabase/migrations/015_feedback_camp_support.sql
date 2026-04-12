-- Ensure feedback supports camp votes on older databases

ALTER TABLE IF EXISTS feedback
  ADD COLUMN IF NOT EXISTS camp_id UUID REFERENCES camps(id) ON DELETE CASCADE;

-- Rebuild one-target check so exactly one of event/place/camp is set.
ALTER TABLE IF EXISTS feedback DROP CONSTRAINT IF EXISTS feedback_one_target;
ALTER TABLE IF EXISTS feedback
  ADD CONSTRAINT feedback_one_target CHECK (
    (event_id IS NOT NULL)::int +
    (camp_id IS NOT NULL)::int +
    (place_id IS NOT NULL)::int = 1
  );

-- Ensure uniqueness for camp votes per session.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'feedback_unique_camp'
  ) THEN
    ALTER TABLE feedback
      ADD CONSTRAINT feedback_unique_camp UNIQUE (camp_id, session_id);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_feedback_camp
  ON feedback(camp_id)
  WHERE camp_id IS NOT NULL;
