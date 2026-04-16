DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'organizers'
  ) AND NOT EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'companies'
  ) THEN
    ALTER TABLE public.organizers RENAME TO companies;
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.companies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  business_name TEXT,
  street TEXT NOT NULL DEFAULT '',
  postcode TEXT NOT NULL DEFAULT '',
  city TEXT NOT NULL DEFAULT 'Krakow',
  email TEXT,
  phone TEXT,
  website_url TEXT,
  note TEXT,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.companies
  ADD COLUMN IF NOT EXISTS business_name TEXT,
  ADD COLUMN IF NOT EXISTS street TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS postcode TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS city TEXT NOT NULL DEFAULT 'Krakow',
  ADD COLUMN IF NOT EXISTS email TEXT,
  ADD COLUMN IF NOT EXISTS phone TEXT,
  ADD COLUMN IF NOT EXISTS website_url TEXT,
  ADD COLUMN IF NOT EXISTS note TEXT,
  ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'draft',
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now();

ALTER TABLE public.companies DROP CONSTRAINT IF EXISTS organizers_status_check;
ALTER TABLE public.companies DROP CONSTRAINT IF EXISTS companies_status_check;
ALTER TABLE public.companies
  ADD CONSTRAINT companies_status_check
  CHECK (status IN ('draft', 'published'));

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'camps' AND column_name = 'organizer_id'
  ) THEN
    EXECUTE 'UPDATE public.camps SET organizer_id = NULL WHERE organizer_id IS NOT NULL';
  END IF;
END $$;

DELETE FROM public.companies;

ALTER TABLE public.companies DROP COLUMN IF EXISTS image_url;
ALTER TABLE public.companies DROP COLUMN IF EXISTS description_short;
ALTER TABLE public.companies DROP COLUMN IF EXISTS description_long;
ALTER TABLE public.companies DROP COLUMN IF EXISTS source_url;
ALTER TABLE public.companies DROP COLUMN IF EXISTS facebook_url;
ALTER TABLE public.companies DROP COLUMN IF EXISTS content_types;
ALTER TABLE public.companies DROP COLUMN IF EXISTS type;

DROP INDEX IF EXISTS public.idx_organizers_status;
DROP INDEX IF EXISTS public.idx_companies_status;
DROP INDEX IF EXISTS public.idx_companies_name;
DROP INDEX IF EXISTS public.idx_companies_city;
DROP INDEX IF EXISTS public.idx_companies_email;

CREATE INDEX idx_companies_status ON public.companies(status);
CREATE INDEX idx_companies_name ON public.companies(name);
CREATE INDEX idx_companies_city ON public.companies(city);
CREATE INDEX idx_companies_email ON public.companies(email);

DROP TRIGGER IF EXISTS companies_updated_at ON public.companies;
CREATE TRIGGER companies_updated_at
  BEFORE UPDATE ON public.companies
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
