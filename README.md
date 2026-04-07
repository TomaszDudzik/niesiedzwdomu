# niesiedzwdomu

Serwis dla rodzicow do odkrywania:
- wydarzen
- kolonii i polkolonii
- miejsc przyjaznych dzieciom

Projekt laczy aplikacje Next.js (frontend + admin API routes) z pipeline scrapingowym w Pythonie oraz baza danych Supabase.

## Project details

- Nazwa robocza repo: `niesiedzwdomu`
- Domena produkcyjna: `niesiedzwdomu.pl` (wykupiona w home.pl)
- Hosting aplikacji web: Vercel
- Baza danych i storage: Supabase
- Pipeline danych: Python (scraping, ekstrakcja, walidacja, review/publish)

## Tech stack

- Frontend: Next.js 16, React 19, TypeScript, Tailwind CSS 4
- Mapy: Leaflet + react-leaflet
- Backend danych: Supabase Postgres + RLS
- Pipeline scrapingowy: Python 3.11+, requests/playwright, BeautifulSoup, OpenAI
- Generowanie grafik (admin): OpenAI Images API

## Struktura projektu (skrot)

- `src/` - aplikacja Next.js (strony publiczne, SEO, panel admina, API routes)
- `backend/` - pipeline scrapingowy i logika przetwarzania
- `supabase/schema.sql` - glowny schemat tabel publicznych
- `supabase/migrations/` - migracje dla pipeline scrapingowego
- `scripts/` - narzedzia pomocnicze (seed, test extraction, image scripts)

## Supabase information

### Co jest w bazie

Schemat glowny (`supabase/schema.sql`) zawiera m.in.:
- `events`
- `camps`
- `places`
- `venues`
- `feedback`
- `discovery_feed` (widok laczacy content)

Migracje (`supabase/migrations/*`) rozszerzaja baze o pipeline scrapingowy, m.in.:
- `scrape_sources`
- `source_runs`
- `raw_pages`
- `scraped_events`
- `event_duplicates`

### RLS i bezpieczenstwo

- Klucz `NEXT_PUBLIC_SUPABASE_ANON_KEY` sluzy tylko do publicznych odczytow.
- Klucz `SUPABASE_SERVICE_ROLE_KEY` daje pelne uprawnienia i musi byc tylko po stronie serwera.
- W tym projekcie service role key jest uzywany przez server-side API routes i pipeline Pythona.

### Inicjalizacja Supabase

1. Utworz projekt w Supabase.
2. Uruchom SQL z pliku `supabase/schema.sql`.
3. Uruchom kolejno migracje z `supabase/migrations/`:
   - `001_scraping_pipeline.sql`
   - `002_source_content_type.sql`
   - `002_sources_admin.sql`
   - `003_scraped_events_is_new.sql`
   - `004_source_extraction_instructions.sql`

W przypadku dwoch migracji z prefiksem `002` uruchom je recznie jedna po drugiej (jak wyzej).

## Environment variables

### Frontend / Next.js (`.env.local` lokalnie, Variables w Vercel)

```bash
NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=YOUR_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY=YOUR_SUPABASE_SERVICE_ROLE_KEY
OPENAI_API_KEY=YOUR_OPENAI_API_KEY
NEXT_PUBLIC_SITE_URL=https://niesiedzwdomu.pl
```

### Pipeline Python (`.env` w root projektu lokalnie)

```bash
SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
SUPABASE_SERVICE_ROLE_KEY=YOUR_SUPABASE_SERVICE_ROLE_KEY
DATABASE_URL=postgresql://...
OPENAI_API_KEY=YOUR_OPENAI_API_KEY
OPENAI_MODEL=gpt-4o-mini
OPENAI_MODEL_FALLBACK=gpt-4o
```

Uwagi:
- `SUPABASE_URL` (Python) i `NEXT_PUBLIC_SUPABASE_URL` (Next.js) wskazuja ten sam projekt Supabase.
- Nigdy nie wystawiaj `SUPABASE_SERVICE_ROLE_KEY` do klienta przegladarki.

## Uruchomienie lokalne

### 1) Frontend

```bash
npm install
npm run dev
```

Aplikacja bedzie dostepna domyslnie pod `http://localhost:3000`.

### 2) Pipeline Python

```bash
python -m venv .venv
# Windows PowerShell
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
```

Uruchomienie pelnego pipeline:

```bash
python -m backend.jobs.run_pipeline
```

Uruchomienie pojedynczego zrodla:

```bash
python -m backend.jobs.run_single_source <source_id>
python -m backend.jobs.run_single_source <source_id> --force
```

Seed zrodel (przyklad):

```bash
python scripts/seed_sources.py
```

## Deploy na Vercel

1. Podlacz repozytorium do Vercel.
2. Framework preset: Next.js.
3. Ustaw wszystkie zmienne srodowiskowe z sekcji frontendowej.
4. Deploy.
5. Po deployu sprawdz:
   - strony publiczne
   - panel admina
   - API routes w `src/app/api/admin/*`

Wazne: pipeline Python nie powinien byc uruchamiany jako funkcje Vercel. To osobny proces (cron/worker/serwer).

## Domena `niesiedzwdomu.pl` z home.pl + Vercel

Najprostszy i bezpieczny wariant:

1. W Vercel: `Project -> Settings -> Domains` dodaj:
   - `niesiedzwdomu.pl`
   - `www.niesiedzwdomu.pl`
2. Vercel pokaze docelowe rekordy DNS.
3. W panelu home.pl ustaw rekordy zgodnie z Vercel (najczesciej):
   - `A` dla apex (`@`) -> `76.76.21.21`
   - `CNAME` dla `www` -> `cname.vercel-dns.com`
4. Poczekaj na propagacje DNS (czasem do 24h).
5. W Vercel potwierdz status domeny i wymus HTTPS.

Jesli Vercel poda inne rekordy dla Twojego projektu, priorytet ma konfiguracja pokazana w panelu Vercel.

## Operacyjnie (rekomendacja)

- Vercel: frontend + server-side routes Next.js.
- Supabase: baza, RLS, storage.
- Scraping Python: odpalany cyklicznie poza Vercel (np. GitHub Actions cron, VPS, Railway worker).

## Troubleshooting

- `npm run dev` nie startuje:
  - sprawdz `.env.local`
  - sprawdz zgodnosc wersji Node.js (zalecane LTS)
- Brak polaczenia z Supabase:
  - zweryfikuj `NEXT_PUBLIC_SUPABASE_URL` i klucze
- Bledy pipeline Pythona:
  - sprawdz `.env` i `SUPABASE_SERVICE_ROLE_KEY`
  - uruchom pojedyncze zrodlo `run_single_source`, latwiej debugowac

## License

Brak jawnie zdefiniowanej licencji w repozytorium. Dodaj plik `LICENSE`, jesli projekt ma byc publiczny.
