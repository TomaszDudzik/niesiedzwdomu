import type { Metadata } from "next";
import { PublicSubmissionForms } from "@/components/ui/public-submission-forms";
import { loadAdminTaxonomy } from "@/lib/admin-taxonomy-server";

type AddContentPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

function normalizeInitialType(value: string | string[] | undefined) {
  const raw = Array.isArray(value) ? value[0] : value;
  return raw === "event" || raw === "place" || raw === "camp" || raw === "activity" ? raw : undefined;
}

export const metadata: Metadata = {
  title: "Dodaj do serwisu | NieSiedzWDomu",
  description: "Dodaj wydarzenie, miejsce, kolonie lub zajęcia do serwisu NieSiedzWDomu. Zgłoszenie zapisze się jako szkic do weryfikacji.",
  alternates: {
    canonical: "/dodaj",
  },
};

export default async function AddContentPage({ searchParams }: AddContentPageProps) {
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const initialType = normalizeInitialType(resolvedSearchParams?.type);
  const initialTaxonomy = await loadAdminTaxonomy();

  return (
    <section className="container-page py-8 md:py-10">
      <div className="mx-auto max-w-5xl space-y-8">
        <header className="max-w-3xl space-y-3">
          <p className="inline-flex rounded-full border border-sky-200 bg-sky-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-sky-800">
            Formularz zgłoszeniowy
          </p>
          <h1 className="text-[30px] font-semibold leading-tight tracking-[-0.03em] text-foreground md:text-[42px]">
            Dodaj treść do serwisu
          </h1>
          <p className="text-[15px] leading-7 text-muted md:text-[16px]">
            Wybierz odpowiedni formularz, uzupełnij dane i wyślij zgłoszenie. Wpis trafi od razu do właściwej tabeli w bazie jako szkic,
            a po weryfikacji będzie mógł zostać opublikowany.
          </p>
        </header>

        <PublicSubmissionForms initialTab={initialType} initialTaxonomy={initialTaxonomy} />
      </div>
    </section>
  );
}