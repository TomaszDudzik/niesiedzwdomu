import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "readme.md | niesiedzwdomu",
  description: "Informacje o projekcie niesiedzwdomu: stack, architektura, setup i zmienne srodowiskowe.",
  robots: {
    index: false,
    follow: false,
  },
};

const envFrontend = [
  "NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY=YOUR_SUPABASE_ANON_KEY",
  "SUPABASE_SERVICE_ROLE_KEY=YOUR_SUPABASE_SERVICE_ROLE_KEY",
  "OPENAI_API_KEY=YOUR_OPENAI_API_KEY",
  "NEXT_PUBLIC_SITE_URL=https://www.niesiedzwdomu.pl",
];

const envPython = [
  "SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co",
  "SUPABASE_SERVICE_ROLE_KEY=YOUR_SUPABASE_SERVICE_ROLE_KEY",
  "DATABASE_URL=postgresql://...",
  "OPENAI_API_KEY=YOUR_OPENAI_API_KEY",
  "OPENAI_MODEL=gpt-4o-mini",
  "OPENAI_MODEL_FALLBACK=gpt-4o",
];

const frontendSetup = ["npm install", "npm run dev"];
const pipelineSetup = [
  "python -m venv .venv",
  ".\\.venv\\Scripts\\Activate.ps1",
  "pip install -r requirements.txt",
  "python -m backend.jobs.run_pipeline",
];

function CodeBlock({ lines }: { lines: string[] }) {
  return (
    <pre className="mt-3 overflow-x-auto rounded-xl border border-border bg-card p-4 text-[12px] leading-relaxed text-foreground">
      <code>{lines.join("\n")}</code>
    </pre>
  );
}

export default function ReadmeMdPage() {
  return (
    <section className="container-page py-8 md:py-10">
      <div className="max-w-4xl">
        <p className="text-[12px] uppercase tracking-[0.18em] text-muted-foreground">Dokumentacja projektu</p>
        <h1 className="mt-2 text-3xl font-semibold text-foreground md:text-4xl">README.md</h1>
        <p className="mt-3 text-sm text-muted-foreground">
          Serwis dla rodzicow do odkrywania wydarzen, kolonii i miejsc przyjaznych dzieciom w Krakowie.
        </p>

        <div className="mt-8 grid gap-4 sm:grid-cols-2">
          <article className="rounded-2xl border border-border bg-card p-5">
            <h2 className="text-base font-semibold text-foreground">Project details</h2>
            <ul className="mt-3 space-y-1 text-sm text-muted-foreground">
              <li>Nazwa repo: niesiedzwdomu</li>
              <li>Domena: niesiedzwdomu.pl</li>
              <li>Hosting: Vercel</li>
              <li>Baza danych i storage: Supabase</li>
            </ul>
          </article>

          <article className="rounded-2xl border border-border bg-card p-5">
            <h2 className="text-base font-semibold text-foreground">Tech stack</h2>
            <ul className="mt-3 space-y-1 text-sm text-muted-foreground">
              <li>Next.js 16 + React 19 + TypeScript</li>
              <li>Tailwind CSS 4</li>
              <li>Leaflet + react-leaflet</li>
              <li>Python 3.11+ pipeline (requests, BS4, Playwright)</li>
            </ul>
          </article>
        </div>

        <article className="mt-6 rounded-2xl border border-border bg-card p-5">
          <h2 className="text-base font-semibold text-foreground">Struktura projektu</h2>
          <ul className="mt-3 space-y-1 text-sm text-muted-foreground">
            <li>src/ - aplikacja Next.js (strony, SEO, admin, API routes)</li>
            <li>backend/ - scraping i przetwarzanie danych</li>
            <li>supabase/schema.sql - glowny schemat bazy</li>
            <li>supabase/migrations/ - migracje pipeline</li>
          </ul>
        </article>

        <article className="mt-6 rounded-2xl border border-border bg-card p-5">
          <h2 className="text-base font-semibold text-foreground">Environment variables</h2>
          <h3 className="mt-4 text-sm font-semibold text-foreground">Frontend / Next.js</h3>
          <CodeBlock lines={envFrontend} />

          <h3 className="mt-5 text-sm font-semibold text-foreground">Pipeline Python</h3>
          <CodeBlock lines={envPython} />
        </article>

        <article className="mt-6 rounded-2xl border border-border bg-card p-5">
          <h2 className="text-base font-semibold text-foreground">Uruchomienie lokalne</h2>
          <h3 className="mt-4 text-sm font-semibold text-foreground">Frontend</h3>
          <CodeBlock lines={frontendSetup} />
          <h3 className="mt-5 text-sm font-semibold text-foreground">Pipeline</h3>
          <CodeBlock lines={pipelineSetup} />
        </article>

        <div className="mt-8 flex flex-wrap items-center gap-3 text-sm">
          <Link
            href="/"
            className="rounded-lg border border-border bg-card px-3 py-2 text-foreground transition-colors hover:border-primary/30"
          >
            Powrot na strone glowna
          </Link>
          <span className="text-muted-foreground">Ta strona jest noindex i sluzy jako szybka dokumentacja in-app.</span>
        </div>
      </div>
    </section>
  );
}
