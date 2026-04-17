CREATE EXTENSION IF NOT EXISTS pg_trgm;

DROP TABLE IF EXISTS public.company CASCADE;

CREATE TABLE public.company (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organizer_name TEXT NOT NULL,
  company_name TEXT,
  email TEXT,
  phone TEXT,
  street TEXT NOT NULL DEFAULT '',
  postcode TEXT NOT NULL DEFAULT '',
  city TEXT NOT NULL DEFAULT 'Krakow',
  note TEXT,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_company_organizer_name ON public.company(organizer_name);
CREATE INDEX idx_company_company_name ON public.company(company_name);
CREATE INDEX idx_company_city ON public.company(city);
CREATE INDEX idx_company_status ON public.company(status);
CREATE INDEX idx_company_organizer_name_trgm ON public.company USING gin (organizer_name gin_trgm_ops);

DROP TRIGGER IF EXISTS company_updated_at ON public.company;

CREATE TRIGGER company_updated_at
  BEFORE UPDATE ON public.company
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();