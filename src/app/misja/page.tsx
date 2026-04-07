import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Misja | NieSiedzWDomu",
  description:
    "Nasza misja to ulatwiac rodzinom z dziecmi odkrywanie wartosciowych wydarzen i miejsc w Krakowie poprzez rzetelne, czytelne i aktualne informacje.",
  alternates: {
    canonical: "/misja",
  },
};

export default function MissionPage() {
  return (
    <section className="container-page py-8 md:py-10">
      <div className="max-w-3xl space-y-8">
        <header className="space-y-3">
          <h1 className="text-[28px] md:text-[36px] font-semibold tracking-[-0.02em] text-foreground leading-tight">
            Misja
          </h1>
          <p className="text-[15px] md:text-[16px] text-muted leading-relaxed">
            Tworzymy NieSiedzWDomu, aby rodzice i opiekunowie mogli szybciej znajdowac ciekawe,
            bezpieczne i rozwijajace aktywnosci dla dzieci w Krakowie.
          </p>
        </header>

        <div className="rounded-xl border border-border bg-card p-5 md:p-6 space-y-4">
          <h2 className="text-[18px] font-semibold text-foreground">Nasz cel</h2>
          <p className="text-[14px] text-muted leading-relaxed">
            Chcemy byc pierwszym wyborem dla rodzin, ktore szukaja sprawdzonych pomyslow na wspolny czas:
            od wydarzen weekendowych, przez miejsca warte odwiedzenia, po kolonie i zajecia dodatkowe.
          </p>
        </div>

        <div className="rounded-xl border border-border bg-card p-5 md:p-6 space-y-4">
          <h2 className="text-[18px] font-semibold text-foreground">W co wierzymy</h2>
          <ul className="space-y-2 text-[14px] text-muted leading-relaxed list-disc pl-5">
            <li>Rodzice potrzebuja prostych i wiarygodnych informacji w jednym miejscu.</li>
            <li>Dobre doswiadczenia dziecka zaczynaja sie od dobrze wybranego miejsca i aktywnosci.</li>
            <li>Lokalna spolecznosc rozwija sie dzieki wspolpracy rodzin, organizatorow i instytucji.</li>
          </ul>
        </div>

        <div className="rounded-xl border border-border bg-card p-5 md:p-6 space-y-4">
          <h2 className="text-[18px] font-semibold text-foreground">Jak realizujemy misje</h2>
          <ul className="space-y-2 text-[14px] text-muted leading-relaxed list-disc pl-5">
            <li>Selekcjonujemy tresci tak, aby byly praktyczne i aktualne.</li>
            <li>Ulatwiamy porownywanie opcji wedlug potrzeb rodziny i wieku dziecka.</li>
            <li>Stale rozwijamy serwis na podstawie opinii rodzicow i opiekunow.</li>
          </ul>
        </div>
      </div>
    </section>
  );
}