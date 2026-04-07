import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Polityka prywatnosci | NieSiedzWDomu",
  description:
    "Polityka prywatnosci serwisu NieSiedzWDomu. Informacje o przetwarzaniu danych, plikach cookies i prawach uzytkownikow.",
  alternates: {
    canonical: "/prywatnosc",
  },
};

export default function PrivacyPage() {
  return (
    <section className="container-page py-8 md:py-10">
      <div className="max-w-3xl space-y-8">
        <header className="space-y-3">
          <h1 className="text-[28px] md:text-[36px] font-semibold tracking-[-0.02em] text-foreground leading-tight">
            Polityka prywatnosci
          </h1>
          <p className="text-[15px] md:text-[16px] text-muted leading-relaxed">
            Ponizej znajduja sie podstawowe informacje dotyczace przetwarzania danych i korzystania
            z plikow cookies w serwisie NieSiedzWDomu.
          </p>
        </header>

        <div className="space-y-6">
          <section className="rounded-xl border border-border bg-card p-5 md:p-6 space-y-3">
            <h2 className="text-[18px] font-semibold text-foreground">1. Administrator danych</h2>
            <p className="text-[14px] text-muted leading-relaxed">
              Administratorem danych przetwarzanych w zwiazku z dzialaniem serwisu jest administrator
              serwisu NieSiedzWDomu. Kontakt: kontakt.niesiedzwdomu@gmail.com.
            </p>
          </section>

          <section className="rounded-xl border border-border bg-card p-5 md:p-6 space-y-3">
            <h2 className="text-[18px] font-semibold text-foreground">2. Zakres danych</h2>
            <p className="text-[14px] text-muted leading-relaxed">
              Serwis moze przetwarzac dane przekazywane dobrowolnie przez uzytkownika,
              w szczegolnosci podczas kontaktu mailowego, a takze dane techniczne zwiazane
              z korzystaniem ze strony internetowej.
            </p>
          </section>

          <section className="rounded-xl border border-border bg-card p-5 md:p-6 space-y-3">
            <h2 className="text-[18px] font-semibold text-foreground">3. Cel przetwarzania</h2>
            <p className="text-[14px] text-muted leading-relaxed">
              Dane moga byc wykorzystywane w celu obslugi kontaktu, poprawy dzialania serwisu,
              analizy statystycznej oraz zapewnienia bezpieczenstwa technicznego strony.
            </p>
          </section>

          <section className="rounded-xl border border-border bg-card p-5 md:p-6 space-y-3">
            <h2 className="text-[18px] font-semibold text-foreground">4. Pliki cookies</h2>
            <p className="text-[14px] text-muted leading-relaxed">
              Serwis moze korzystac z plikow cookies w celu prawidlowego dzialania strony,
              analityki oraz poprawy wygody korzystania z serwisu. Uzytkownik moze zarzadzac cookies
              w ustawieniach swojej przegladarki.
            </p>
          </section>

          <section className="rounded-xl border border-border bg-card p-5 md:p-6 space-y-3">
            <h2 className="text-[18px] font-semibold text-foreground">5. Prawa uzytkownika</h2>
            <p className="text-[14px] text-muted leading-relaxed">
              Uzytkownik ma prawo do uzyskania informacji o przetwarzaniu swoich danych,
              ich sprostowania, usuniecia lub ograniczenia przetwarzania, jezeli ma to zastosowanie
              zgodnie z obowiazujacymi przepisami.
            </p>
          </section>
        </div>
      </div>
    </section>
  );
}