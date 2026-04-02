-- Allow service role to delete feedback (for vote changes)
-- The API uses service role key so this is already covered,
-- but add update policy for completeness
CREATE POLICY "Service role full access feedback" ON feedback
  FOR ALL USING (true) WITH CHECK (true);
