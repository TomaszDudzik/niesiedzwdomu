import type { SeoPageConfig } from "@/types/seo";

export const seoPages: SeoPageConfig[] = [
  {
    slug: "co-robic-z-dzieckiem-w-krakowie",
    metaTitle: "Odkryj Kraków z dzieckiem | nie siedź w domu",
    metaDescription:
      "Odkryj Kraków z dzieckiem. Wydarzenia, miejsca, półkolonie i pomysły na czas z dzieckiem w jednym miejscu.",
    h1: "Odkryj Kraków z dzieckiem",
    lead: "Szukasz pomysłu na czas z dzieckiem w Krakowie? Niezależnie od pogody i wieku dziecka, znajdziesz tu wydarzenia, miejsca i aktywności, które naprawdę warto sprawdzić.",
    ctaLabel: "Przeglądaj wydarzenia",
    ctaHref: "/wydarzenia",
    secondaryCtaLabel: "Zobacz miejsca",
    secondaryCtaHref: "/miejsca",
    intro: [
      "Kraków oferuje mnóstwo możliwości dla rodzin z dziećmi — od warsztatów i spektakli, przez place zabaw, aż po zajęcia dodatkowe i półkolonie. Problem w tym, że informacje są rozproszone i trudno szybko znaleźć coś sensownego.",
      "Dlatego zbieramy wszystko w jednym miejscu. Sprawdź, odkryć Kraków z dzieckiem dziś, w weekend albo w najbliższym czasie — bez przekopywania dziesiątek stron i grup na Facebooku.",
      "Niezależnie od tego, czy masz godzinę po pracy, czy planujesz cały dzień z dzieckiem, znajdziesz tu sprawdzone pomysły dopasowane do wieku i sytuacji.",
    ],
    quickFilters: [
      { label: "Dziś", href: "/wydarzenia?range=today" },
      { label: "Ten weekend", href: "/wydarzenia?range=weekend" },
      { label: "Bezpłatne", href: "/wydarzenia?free=true" },
      { label: "Place zabaw", href: "/place-zabaw-krakow" },
      { label: "Półkolonie", href: "/polkolonie-krakow" },
    ],
    listings: [
      {
        contentType: "event",
        heading: "Nadchodzące wydarzenia",
        limit: 6,
        viewAllHref: "/wydarzenia",
        viewAllLabel: "Wszystkie wydarzenia",
      },
      {
        contentType: "place",
        heading: "Polecane miejsca",
        limit: 3,
        viewAllHref: "/miejsca",
        viewAllLabel: "Wszystkie miejsca",
      },
      {
        contentType: "camp",
        heading: "Półkolonie i kolonie",
        limit: 3,
        viewAllHref: "/kolonie",
        viewAllLabel: "Wszystkie oferty",
      },
    ],
    faq: [
      {
        question: "Gdzie iść z dzieckiem w Krakowie?",
        answer:
          "Najlepiej sprawdzić aktualne wydarzenia i miejsca — od warsztatów po place zabaw. W tym serwisie znajdziesz je w jednym miejscu.",
      },
      {
        question: "Co robić z dzieckiem w weekend w Krakowie?",
        answer:
          "W weekendy odbywa się najwięcej wydarzeń dla dzieci — spektakle, zajęcia i atrakcje rodzinne. Warto sprawdzić aktualne propozycje na weekend.",
      },
      {
        question: "Czy są darmowe atrakcje dla dzieci w Krakowie?",
        answer:
          "Tak — wiele wydarzeń i miejsc jest darmowych, szczególnie w parkach, bibliotekach i domach kultury.",
      },
    ],
    relatedLinks: [
      { href: "/wydarzenia-dla-dzieci-krakow", label: "Wydarzenia dla dzieci", description: "Warsztaty, spektakle i atrakcje" },
      { href: "/polkolonie-krakow", label: "Półkolonie", description: "Oferty na wakacje i ferie" },
      { href: "/place-zabaw-krakow", label: "Place zabaw", description: "Najlepsze place zabaw w mieście" },
    ],
  },

  {
    slug: "wydarzenia-dla-dzieci-krakow",
    metaTitle: "Wydarzenia dla dzieci Kraków | nie siedź w domu",
    metaDescription:
      "Sprawdź aktualne wydarzenia dla dzieci w Krakowie. Warsztaty, spektakle i atrakcje dla dzieci na dziś i weekend.",
    h1: "Wydarzenia dla dzieci w Krakowie",
    lead: "Sprawdź aktualne wydarzenia dla dzieci w Krakowie — warsztaty, spektakle, zajęcia i rodzinne atrakcje na dziś i weekend.",
    ctaLabel: "Zobacz wydarzenia",
    ctaHref: "/wydarzenia",
    secondaryCtaLabel: "Kalendarz",
    secondaryCtaHref: "/kalendarz",
    intro: [
      "W Krakowie codziennie dzieje się coś dla dzieci — od kameralnych warsztatów po duże wydarzenia rodzinne. Problem? Trudno je wszystkie znaleźć w jednym miejscu.",
      "Dlatego zbieramy najciekawsze wydarzenia dla dzieci w Krakowie i pokazujemy je w prosty sposób — możesz szybko sprawdzić, co dzieje się dziś, w weekend albo w konkretnym terminie.",
      "Filtruj wydarzenia według wieku dziecka, ceny i lokalizacji i wybierz coś, co naprawdę pasuje do Twojego dnia.",
    ],
    quickFilters: [
      { label: "Warsztaty", href: "/wydarzenia?category=warsztaty" },
      { label: "Spektakle", href: "/wydarzenia?category=spektakl" },
      { label: "Muzyka", href: "/wydarzenia?category=muzyka" },
      { label: "Sport", href: "/wydarzenia?category=sport" },
      { label: "Bezpłatne", href: "/wydarzenia?free=true" },
    ],
    listings: [
      {
        contentType: "event",
        heading: "Nadchodzące wydarzenia",
        limit: 9,
        viewAllHref: "/wydarzenia",
        viewAllLabel: "Wszystkie wydarzenia",
      },
    ],
    faq: [
      {
        question: "Jakie wydarzenia dla dzieci są w Krakowie?",
        answer:
          "To m.in. warsztaty, zajęcia kreatywne, spektakle, wydarzenia rodzinne i aktywności sportowe.",
      },
      {
        question: "Gdzie znaleźć wydarzenia dla dzieci na weekend?",
        answer:
          "Najlepiej sprawdzić aktualną listę wydarzeń — są regularnie aktualizowane i pogrupowane według daty.",
      },
    ],
    relatedLinks: [
      { href: "/co-robic-z-dzieckiem-w-krakowie", label: "Odkryj Kraków z dzieckiem", description: "Pełny przegląd atrakcji" },
      { href: "/polkolonie-krakow", label: "Półkolonie", description: "Oferty na wakacje i ferie" },
    ],
  },

  {
    slug: "polkolonie-krakow",
    metaTitle: "Półkolonie Kraków dla dzieci | nie siedź w domu",
    metaDescription:
      "Znajdź półkolonie dla dzieci w Krakowie. Sprawdź oferty, terminy i zapisz dziecko na zajęcia.",
    h1: "Półkolonie w Krakowie",
    lead: "Szukasz półkolonii dla dziecka w Krakowie? Sprawdź aktualne oferty — sportowe, kreatywne i edukacyjne.",
    ctaLabel: "Zobacz oferty",
    ctaHref: "/kolonie",
    intro: [
      "Półkolonie to jedna z najwygodniejszych opcji dla rodziców w czasie wakacji i ferii. W Krakowie dostępnych jest wiele programów — od sportowych, przez językowe, po kreatywne i naukowe.",
      "Zbieramy półkolonie dla dzieci w Krakowie w jednym miejscu, żeby łatwo porównać opcje i znaleźć coś dopasowanego do wieku dziecka, terminu i budżetu.",
      "Możesz sprawdzić dostępne turnusy, lokalizacje i program zajęć — bez przeszukiwania wielu stron.",
    ],
    quickFilters: [
      { label: "Letnie", href: "/kolonie?season=lato" },
      { label: "Ferie zimowe", href: "/kolonie?season=ferie_zimowe" },
    ],
    listings: [
      {
        contentType: "camp",
        filterCampType: "polkolonie",
        heading: "Półkolonie w Krakowie",
        limit: 6,
        viewAllHref: "/kolonie",
        viewAllLabel: "Wszystkie kolonie i półkolonie",
      },
    ],
    faq: [
      {
        question: "Ile kosztują półkolonie w Krakowie?",
        answer:
          "Ceny zależą od programu i czasu trwania — zazwyczaj od kilkuset do ponad tysiąca złotych za turnus.",
      },
      {
        question: "Jak zapisać dziecko na półkolonie?",
        answer:
          "Najczęściej przez stronę organizatora lub kontakt bezpośredni — możesz przejść do zapisów z poziomu oferty.",
      },
    ],
    relatedLinks: [
      { href: "/wydarzenia-dla-dzieci-krakow", label: "Wydarzenia", description: "Warsztaty i zajęcia jednorazowe" },
      { href: "/co-robic-z-dzieckiem-w-krakowie", label: "Odkryj Kraków z dzieckiem", description: "Pełny przegląd atrakcji" },
    ],
  },

  {
    slug: "place-zabaw-krakow",
    metaTitle: "Najlepsze place zabaw Kraków | nie siedź w domu",
    metaDescription:
      "Sprawdź najlepsze place zabaw w Krakowie dla dzieci. Znajdź miejsca do zabawy w swojej okolicy.",
    h1: "Place zabaw w Krakowie",
    lead: "Szukasz miejsca, gdzie dziecko może się wyszaleć? Sprawdź najlepsze place zabaw w Krakowie — dla maluchów i starszych dzieci.",
    ctaLabel: "Przeglądaj miejsca",
    ctaHref: "/miejsca",
    intro: [
      "Place zabaw to najprostszy i często najlepszy pomysł na szybkie wyjście z dzieckiem. W Krakowie znajdziesz zarówno małe, lokalne place, jak i duże, nowoczesne przestrzenie.",
      "Zebraliśmy miejsca, które warto odwiedzić — możesz sprawdzić je według dzielnicy, wieku dziecka i typu atrakcji.",
      "To dobry wybór zarówno na spontaniczne wyjście po szkole, jak i na dłuższy spacer z dzieckiem.",
    ],
    listings: [
      {
        contentType: "place",
        filterPlaceType: "Ruch i aktywność fizyczna",
        heading: "Polecane place zabaw",
        limit: 6,
        viewAllHref: "/miejsca",
        viewAllLabel: "Wszystkie miejsca",
      },
    ],
    faq: [
      {
        question: "Gdzie są najlepsze place zabaw w Krakowie?",
        answer:
          "W wielu dzielnicach są dobrze wyposażone place — warto sprawdzić listę polecanych miejsc.",
      },
      {
        question: "Czy są place zabaw dla małych dzieci?",
        answer:
          "Tak — wiele placów ma wydzielone strefy dla najmłodszych.",
      },
    ],
    relatedLinks: [
      { href: "/co-robic-z-dzieckiem-w-krakowie", label: "Odkryj Kraków z dzieckiem", description: "Pełny przegląd atrakcji" },
      { href: "/wydarzenia-dla-dzieci-krakow", label: "Wydarzenia", description: "Warsztaty, spektakle i atrakcje" },
    ],
  },
];

export function getSeoPageBySlug(slug: string): SeoPageConfig | undefined {
  return seoPages.find((p) => p.slug === slug);
}

export function getAllSeoSlugs(): string[] {
  return seoPages.map((p) => p.slug);
}
