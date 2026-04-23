import type { Metadata } from "next";

const CONTACT_EMAIL = "kontakt@niesiedzwdomu.pl";

export const metadata: Metadata = {
  title: "Kontakt | NieSiedzWDomu",
  description:
    "Skontaktuj sie z NieSiedzWDomu. Napisz do nas, jesli chcesz dodac wydarzenie, miejsce, kolonie lub zajecia dla dzieci w Krakowie.",
  alternates: {
    canonical: "/kontakt",
  },
};

export default function ContactPage() {
  return (
    <section className="container-page py-8 md:py-10">
      <div className="max-w-3xl space-y-8">
        <header className="space-y-3">
          <h1 className="text-[28px] md:text-[36px] font-semibold tracking-[-0.02em] text-foreground leading-tight">
            Kontakt
          </h1>
          <p className="text-[15px] md:text-[16px] text-muted leading-relaxed">
            Masz pytanie, sugestie albo chcesz wspoltworzyc NieSiedzWDomu? Napisz do nas.
            Odpowiadamy najszybciej, jak to mozliwe.
          </p>
        </header>

        <div className="rounded-xl border border-border bg-card p-5 md:p-6 space-y-4">
          <h2 className="text-[18px] font-semibold text-foreground">Napisz do nas</h2>
          <p className="text-[14px] text-muted leading-relaxed">
            Email kontaktowy: {" "}
            <a
              href={`mailto:${CONTACT_EMAIL}`}
              className="font-medium text-primary hover:text-primary-hover transition-colors"
            >
              {CONTACT_EMAIL}
            </a>
          </p>
        </div>

        <div className="rounded-xl border border-border bg-card p-5 md:p-6 space-y-4">
          <h2 className="text-[18px] font-semibold text-foreground">Co mozemy dodac do serwisu</h2>
          <p className="text-[14px] text-muted leading-relaxed">
            Jesli chcesz dodac do serwisu nowe wydarzenie, miejsce, kolonie
            lub zajecia dla dzieci, skorzystaj z formularza zgłoszeniowego.
          </p>
          <a
            href="/dodaj"
            className="inline-flex items-center rounded-full bg-sky-900 px-4 py-2 text-[13px] font-semibold text-white transition-colors hover:bg-sky-800"
          >
            Przejdz do formularza
          </a>
          <ul className="space-y-2 text-[14px] text-muted leading-relaxed list-disc pl-5">
            <li>Wydarzenia jednorazowe i cykliczne</li>
            <li>Miejsca przyjazne rodzinom</li>
            <li>Kolonie i polkolonie</li>
            <li>Zajecia dodatkowe dla dzieci</li>
          </ul>
        </div>
      </div>
    </section>
  );
}