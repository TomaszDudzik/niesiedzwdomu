-- Migration 023: Keep organizers table as primary source
-- Do NOT rename to companies - use organizers everywhere

CREATE TABLE IF NOT EXISTS public.organizers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  business_name TEXT,
  street TEXT NOT NULL DEFAULT '',
  postcode TEXT NOT NULL DEFAULT '',
  city TEXT NOT NULL DEFAULT 'Kraków',
  email TEXT,
  phone TEXT,
  website_url TEXT,
  note TEXT,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Add columns if they don't exist
ALTER TABLE public.organizers
  ADD COLUMN IF NOT EXISTS business_name TEXT,
  ADD COLUMN IF NOT EXISTS street TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS postcode TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS city TEXT NOT NULL DEFAULT 'Kraków',
  ADD COLUMN IF NOT EXISTS email TEXT,
  ADD COLUMN IF NOT EXISTS phone TEXT,
  ADD COLUMN IF NOT EXISTS website_url TEXT,
  ADD COLUMN IF NOT EXISTS note TEXT,
  ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'draft',
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now();

-- Create indices
DROP INDEX IF EXISTS public.idx_organizers_status;
DROP INDEX IF EXISTS public.idx_organizers_name;
DROP INDEX IF EXISTS public.idx_organizers_city;
DROP INDEX IF EXISTS public.idx_organizers_email;

CREATE INDEX idx_organizers_status ON public.organizers(status);
CREATE INDEX idx_organizers_name ON public.organizers(name);
CREATE INDEX idx_organizers_city ON public.organizers(city);
CREATE INDEX idx_organizers_email ON public.organizers(email);

-- Create trigger for updated_at
DROP TRIGGER IF EXISTS organizers_updated_at ON public.organizers;
CREATE TRIGGER organizers_updated_at
  BEFORE UPDATE ON public.organizers
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
