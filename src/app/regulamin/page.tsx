import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Regulamin | NieSiedzWDomu",
  description:
    "Regulamin korzystania z serwisu NieSiedzWDomu. Zasady korzystania z tresci, odpowiedzialnosci i kontaktu z administratorem serwisu.",
  alternates: {
    canonical: "/regulamin",
  },
};

export default function TermsPage() {
  return (
    <section className="container-page py-8 md:py-10">
      <div className="max-w-3xl space-y-8">
        <header className="space-y-3">
          <h1 className="text-[28px] md:text-[36px] font-semibold tracking-[-0.02em] text-foreground leading-tight">
            Regulamin
          </h1>
          <p className="text-[15px] md:text-[16px] text-muted leading-relaxed">
            Niniejszy regulamin okresla zasady korzystania z serwisu NieSiedzWDomu.
          </p>
        </header>

        <div className="space-y-6">
          <section className="rounded-xl border border-border bg-card p-5 md:p-6 space-y-3">
            <h2 className="text-[18px] font-semibold text-foreground">1. Postanowienia ogolne</h2>
            <p className="text-[14px] text-muted leading-relaxed">
              Serwis NieSiedzWDomu ma charakter informacyjny i sluzy prezentowaniu wydarzen,
              miejsc oraz innych propozycji dla rodzin z dziecmi, w szczegolnosci na terenie Krakowa.
            </p>
          </section>

          <section className="rounded-xl border border-border bg-card p-5 md:p-6 space-y-3">
            <h2 className="text-[18px] font-semibold text-foreground">2. Zakres uslug</h2>
            <p className="text-[14px] text-muted leading-relaxed">
              Administrator doklada staran, aby publikowane informacje byly aktualne i rzetelne,
              jednak nie gwarantuje ich pelnej kompletnosci ani nieprzerwanej dostepnosci serwisu.
            </p>
          </section>

          <section className="rounded-xl border border-border bg-card p-5 md:p-6 space-y-3">
            <h2 className="text-[18px] font-semibold text-foreground">3. Odpowiedzialnosc</h2>
            <p className="text-[14px] text-muted leading-relaxed">
              Korzystanie z informacji publikowanych w serwisie odbywa sie na odpowiedzialnosc uzytkownika.
              Przed udzialem w wydarzeniu lub odwiedzeniem miejsca zalecamy weryfikacje szczegolow
              bezposrednio u organizatora lub operatora obiektu.
            </p>
          </section>

          <section className="rounded-xl border border-border bg-card p-5 md:p-6 space-y-3">
            <h2 className="text-[18px] font-semibold text-foreground">4. Prawa autorskie</h2>
            <p className="text-[14px] text-muted leading-relaxed">
              Tresci wlasne publikowane w serwisie podlegaja ochronie prawnej. Kopiowanie,
              rozpowszechnianie lub wykorzystywanie materialow bez zgody administratora moze byc ograniczone
              przez obowiazujace przepisy prawa.
            </p>
          </section>

          <section className="rounded-xl border border-border bg-card p-5 md:p-6 space-y-3">
            <h2 className="text-[18px] font-semibold text-foreground">5. Kontakt</h2>
            <p className="text-[14px] text-muted leading-relaxed">
              W sprawach dotyczacych serwisu mozna skontaktowac sie z administratorem pod adresem:
              kontakt.niesiedzwdomu@gmail.com.
            </p>
          </section>
        </div>
      </div>
    </section>
  );
}