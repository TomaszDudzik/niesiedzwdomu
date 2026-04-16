CREATE TABLE IF NOT EXISTS submission_contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  content_type TEXT NOT NULL CHECK (content_type IN ('event', 'place', 'camp', 'activity')),
  event_id UUID REFERENCES events(id) ON DELETE CASCADE,
  place_id UUID REFERENCES places(id) ON DELETE CASCADE,
  camp_id UUID REFERENCES camps(id) ON DELETE CASCADE,
  activity_id UUID REFERENCES activities(id) ON DELETE CASCADE,
  submitter_name TEXT NOT NULL,
  submitter_email TEXT NOT NULL,
  submitter_phone TEXT,
  organization_name TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT submission_contacts_one_target CHECK (
    (event_id IS NOT NULL)::int +
    (place_id IS NOT NULL)::int +
    (camp_id IS NOT NULL)::int +
    (activity_id IS NOT NULL)::int = 1
  )
);

CREATE INDEX IF NOT EXISTS idx_submission_contacts_event_id ON submission_contacts(event_id);
CREATE INDEX IF NOT EXISTS idx_submission_contacts_place_id ON submission_contacts(place_id);
CREATE INDEX IF NOT EXISTS idx_submission_contacts_camp_id ON submission_contacts(camp_id);
CREATE INDEX IF NOT EXISTS idx_submission_contacts_activity_id ON submission_contacts(activity_id);
CREATE INDEX IF NOT EXISTS idx_submission_contacts_email ON submission_contacts(submitter_email);
CREATE INDEX IF NOT EXISTS idx_submission_contacts_created_at ON submission_contacts(created_at DESC);
