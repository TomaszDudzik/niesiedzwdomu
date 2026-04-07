import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "O nas | NieSiedzWDomu",
  description:
    "Poznaj NieSiedzWDomu: serwis tworzony przez rodziców dla rodziców. Pomagamy odkrywać wartościowe wydarzenia i miejsca dla rodzin z dziećmi w Krakowie.",
  alternates: {
    canonical: "/o-nas",
  },
};

export default function AboutPage() {
  return (
    <section className="container-page py-8 md:py-10">
      <div className="max-w-3xl space-y-8">
        <header className="space-y-3">
          <h1 className="text-[28px] md:text-[36px] font-semibold tracking-[-0.02em] text-foreground leading-tight">
            O nas
          </h1>
          <p className="text-[15px] md:text-[16px] text-muted leading-relaxed">
            NieSiedzWDomu to lokalny przewodnik dla rodzin z dziecmi w Krakowie. Tworzymy miejsce,
            ktore pomaga szybko znalezc ciekawe wydarzenia, wartosciowe zajecia i sprawdzone miejsca
            na wspolny czas.
          </p>
        </header>

        <div className="rounded-xl border border-border bg-card p-5 md:p-6 space-y-4">
          <h2 className="text-[18px] font-semibold text-foreground">Dlaczego to robimy</h2>
          <p className="text-[14px] text-muted leading-relaxed">
            Wiemy, jak trudno jest na co dzien przeszukiwac dziesiatki stron i social mediow,
            zeby znalezc cos naprawde ciekawego dla dziecka. Dlatego zbieramy wszystko w jednym
            miejscu i podajemy w prostej, czytelnej formie.
          </p>
        </div>

        <div className="rounded-xl border border-border bg-card p-5 md:p-6 space-y-4">
          <h2 className="text-[18px] font-semibold text-foreground">Jak pracujemy</h2>
          <ul className="space-y-2 text-[14px] text-muted leading-relaxed list-disc pl-5">
            <li>Codziennie monitorujemy nowe wydarzenia i aktualizacje lokalnych organizatorow.</li>
            <li>Porzadkujemy informacje, aby latwiej porownac opcje dla roznych grup wiekowych.</li>
            <li>Stawiamy na jakosc, przejrzystosc i tresci przydatne dla rodzicow.</li>
          </ul>
        </div>

        <div className="rounded-xl border border-border bg-card p-5 md:p-6 space-y-4">
          <h2 className="text-[18px] font-semibold text-foreground">Dla kogo jest NieSiedzWDomu</h2>
          <p className="text-[14px] text-muted leading-relaxed">
            Dla rodzicow, opiekunow i wszystkich, ktorzy chca aktywnie spedzac czas z dziecmi.
            Niezaleznie od tego, czy szukasz pomyslu na weekend, planujesz wakacje, czy interesuja
            Cie regularne aktywnosci po szkole.
          </p>
        </div>

        <div className="rounded-xl border border-border bg-card p-5 md:p-6 space-y-4">
          <h2 className="text-[18px] font-semibold text-foreground">Masz sugestie?</h2>
          <p className="text-[14px] text-muted leading-relaxed">
            Chcemy rozwijac serwis razem z rodzicami. Jesli znasz miejsce lub wydarzenie, ktore
            warto dodac, napisz do nas.
          </p>
          <Link
            href="/kontakt"
            className="inline-flex items-center rounded-lg border border-primary/30 bg-primary/5 px-3 py-2 text-[13px] font-medium text-primary hover:bg-primary/10 transition-colors"
          >
            Przejdz do kontaktu
          </Link>
        </div>
      </div>
    </section>
  );
}