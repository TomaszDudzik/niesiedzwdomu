import type { SeoPageConfig } from "@/types/seo";

type CityConfig = {
  slug: string;
  label: string;
  locative: string;
};

type GroupTemplate = {
  slug: string;
  buildPage: (city: CityConfig) => SeoPageConfig;
};

const cities: CityConfig[] = [
  {
    slug: "krakow",
    label: "Kraków",
    locative: "Krakowie",
  },
];

const cityPages: SeoPageConfig[] = cities.map((city) => ({
  slug: city.slug,
  metaTitle: `${city.label} | nie siedź w domu`,
  metaDescription:
    `Sprawdź ${city.label.toLowerCase()} z perspektywy rodzin, aktywnych osób i codziennych planów. Wydarzenia, miejsca i praktyczne przewodniki w jednym miejscu.`,
  h1: city.label,
  lead: `Przewodnik po ${city.locative} dla osób, które chcą szybciej znaleźć wydarzenia, miejsca i gotowe pomysły na wyjście.`,
  ctaLabel: "Zobacz wydarzenia",
  ctaHref: "/wydarzenia",
  secondaryCtaLabel: "Zobacz miejsca",
  secondaryCtaHref: "/miejsca",
  intro: [
    `${city.label} można przeglądać na wiele sposobów. Jedni szukają planów dla rodziny, inni chcą znaleźć aktywne miejsca, a jeszcze inni po prostu potrzebują szybkiej inspiracji na dziś albo weekend.`,
    `Ta strona zbiera główne ścieżki poruszania się po serwisie dla ${city.locative}. Zamiast zaczynać od pustej listy, możesz od razu wejść w bardziej dopasowany przewodnik.`,
    `To dobry punkt startowy, jeśli chcesz przejść do wydarzeń, miejsc albo bardziej konkretnych stron tematycznych.`
  ],
  quickFilters: [
    { label: "Dla rodziców", href: `/${city.slug}/dla-rodzicow` },
    { label: "Dla sportowców", href: `/${city.slug}/dla-sportowcow` },
    { label: "Wydarzenia", href: "/wydarzenia" },
    { label: "Miejsca", href: "/miejsca" },
  ],
  listings: [
    {
      contentType: "mixed",
      heading: `Co warto sprawdzić w ${city.locative}`,
      limit: 6,
      viewAllHref: "/wydarzenia",
      viewAllLabel: "Przeglądaj serwis",
    },
    {
      contentType: "event",
      heading: `Nadchodzące wydarzenia w ${city.locative}`,
      limit: 6,
      viewAllHref: "/wydarzenia",
      viewAllLabel: "Wszystkie wydarzenia",
    },
    {
      contentType: "place",
      heading: `Miejsca warte uwagi w ${city.locative}`,
      limit: 4,
      viewAllHref: "/miejsca",
      viewAllLabel: "Wszystkie miejsca",
    },
  ],
  faq: [
    {
      question: `Od czego zacząć szukanie atrakcji w ${city.locative}?`,
      answer:
        "Najlepiej zacząć od strony miasta albo od bardziej konkretnego przewodnika tematycznego, jeśli wiesz już, czy interesują Cię rodzinne wyjścia, sport czy konkretne typy miejsc.",
    },
    {
      question: `Czy ta strona pokazuje różne typy aktywności w ${city.locative}?`,
      answer:
        "Tak. Łączy wydarzenia, miejsca i przewodniki tematyczne, żeby łatwiej było przejść od ogólnego przeglądu do konkretnego planu.",
    },
  ],
  relatedLinks: [
    { href: `/${city.slug}/dla-rodzicow`, label: `${city.label} dla rodziców`, description: "Rodzinne plany i praktyczne wyjścia" },
    { href: `/${city.slug}/dla-sportowcow`, label: `${city.label} dla sportowców`, description: "Aktywne miejsca i wydarzenia" },
    { href: "/co-robic-z-dzieckiem-w-krakowie", label: "Odkryj Kraków z dzieckiem", description: "Szerszy rodzinny przewodnik" },
  ],
}));

const groupTemplates: GroupTemplate[] = [
  {
    slug: "dla-rodzicow",
    buildPage: (city) => ({
      slug: `${city.slug}/dla-rodzicow`,
      metaTitle: `${city.label} dla rodziców | nie siedź w domu`,
      metaDescription:
        `Sprawdź ${city.label.toLowerCase()} dla rodziców. Wydarzenia, miejsca i rodzinne aktywności w ${city.locative} zebrane w jednym miejscu.`,
      h1: `${city.label} dla rodziców`,
      lead: `Praktyczny przewodnik dla rodziców, którzy chcą szybko znaleźć sensowne wydarzenia, miejsca i aktywności w ${city.locative}.`,
      ctaLabel: "Przeglądaj wydarzenia",
      ctaHref: "/wydarzenia",
      secondaryCtaLabel: "Zobacz miejsca",
      secondaryCtaHref: "/miejsca",
      intro: [
        `${city.label} ma dużo do zaoferowania rodzinom, ale informacje są rozrzucone między stronami instytucji, wydarzeniami na Facebooku i pojedynczymi kalendarzami. Ta strona porządkuje najważniejsze opcje dla rodziców w jednym miejscu.`,
        `Znajdziesz tu aktualne wydarzenia dla dzieci, sprawdzone miejsca na wyjście po szkole albo w weekend oraz praktyczne punkty startowe, kiedy potrzebujesz szybkiego planu na dzień z dzieckiem.`,
        `To nie jest katalog wszystkiego. To selekcja tras, miejsc i wydarzeń, od których rodzic może zacząć bez przekopywania internetu.`
      ],
      quickFilters: [
        { label: "Dziś", href: "/wydarzenia?range=today" },
        { label: "Ten weekend", href: "/wydarzenia?range=weekend" },
        { label: "Bezpłatne", href: "/wydarzenia?free=true" },
        { label: "Miejsca", href: "/miejsca" },
        { label: "Półkolonie", href: "/kolonie" },
      ],
      listings: [
        {
          contentType: "event",
          heading: `Nadchodzące wydarzenia dla rodzin w ${city.locative}`,
          limit: 6,
          viewAllHref: "/wydarzenia",
          viewAllLabel: "Wszystkie wydarzenia",
        },
        {
          contentType: "place",
          heading: `Sprawdzone miejsca dla rodziców w ${city.locative}`,
          limit: 4,
          viewAllHref: "/miejsca",
          viewAllLabel: "Wszystkie miejsca",
        },
        {
          contentType: "camp",
          filterCampType: "polkolonie",
          heading: `Półkolonie, które warto sprawdzić w ${city.locative}`,
          limit: 3,
          viewAllHref: "/kolonie",
          viewAllLabel: "Wszystkie oferty",
        },
      ],
      faq: [
        {
          question: `Jak znaleźć dobre aktywności dla rodziców z dziećmi w ${city.locative}?`,
          answer:
            "Najkrótsza droga to sprawdzić aktualne wydarzenia, miejsca i oferty sezonowe w jednym serwisie, zamiast szukać osobno na stronach organizatorów.",
        },
        {
          question: `Co robić z dzieckiem po szkole albo w weekend w ${city.locative}?`,
          answer:
            "Najczęściej sprawdzają się warsztaty, spektakle, aktywne miejsca i bezpłatne atrakcje. Warto filtrować propozycje według terminu i budżetu.",
        },
      ],
      relatedLinks: [
        { href: `/${city.slug}/dla-sportowcow`, label: `${city.label} dla sportowców`, description: "Aktywne wydarzenia i miejsca" },
        { href: "/co-robic-z-dzieckiem-w-krakowie", label: "Odkryj Kraków z dzieckiem", description: "Szeroki przewodnik po mieście" },
        { href: "/wydarzenia-dla-dzieci-krakow", label: "Wydarzenia dla dzieci", description: "Warsztaty, spektakle i atrakcje" },
      ],
    }),
  },
  {
    slug: "dla-sportowcow",
    buildPage: (city) => ({
      slug: `${city.slug}/dla-sportowcow`,
      metaTitle: `${city.label} dla sportowców | nie siedź w domu`,
      metaDescription:
        `Aktywny ${city.label.toLowerCase()} dla sportowców. Sprawdź sportowe wydarzenia, ruchowe miejsca i rodzinne aktywności w ${city.locative}.`,
      h1: `${city.label} dla sportowców`,
      lead: `Strona dla osób, które szukają w ${city.locative} ruchu, aktywnych miejsc i wydarzeń sportowych dla siebie albo całej rodziny.`,
      ctaLabel: "Zobacz sportowe wydarzenia",
      ctaHref: "/wydarzenia?category=sport",
      secondaryCtaLabel: "Aktywne miejsca",
      secondaryCtaHref: "/miejsca",
      intro: [
        `${city.label} daje dużo możliwości aktywnego spędzania czasu, ale sportowe wydarzenia i miejsca są zwykle rozrzucone między wieloma serwisami. Tutaj zebrane są w jednym układzie.`,
        `Jeśli interesują Cię biegi rodzinne, zajęcia ruchowe, aktywne place i miejsca, gdzie można po prostu wyjść i się poruszać, ten zestaw jest punktem startowym.`,
        `To dobra ścieżka zarówno dla rodziców z dziećmi, jak i dla osób, które po prostu chcą znaleźć bardziej dynamiczną stronę miasta.`
      ],
      quickFilters: [
        { label: "Sport", href: "/wydarzenia?category=sport" },
        { label: "Ten weekend", href: "/wydarzenia?range=weekend" },
        { label: "Bezpłatne", href: "/wydarzenia?free=true" },
        { label: "Aktywne miejsca", href: "/miejsca" },
      ],
      listings: [
        {
          contentType: "event",
          filterCategory: "sport",
          heading: `Sportowe wydarzenia w ${city.locative}`,
          limit: 6,
          viewAllHref: "/wydarzenia?category=sport",
          viewAllLabel: "Wszystkie wydarzenia sportowe",
        },
        {
          contentType: "place",
          filterPlaceType: "Ruch i aktywność fizyczna",
          heading: `Miejsca na ruch i aktywność w ${city.locative}`,
          limit: 6,
          viewAllHref: "/miejsca",
          viewAllLabel: "Wszystkie aktywne miejsca",
        },
      ],
      faq: [
        {
          question: `Gdzie znaleźć aktywne miejsca i wydarzenia sportowe w ${city.locative}?`,
          answer:
            "Najlepiej zacząć od wydarzeń sportowych oraz miejsc związanych z ruchem i aktywnością fizyczną. Dzięki temu szybciej znajdziesz coś dopasowanego do wieku i poziomu energii.",
        },
        {
          question: `Czy w ${city.locative} są sportowe aktywności dla rodzin?`,
          answer:
            "Tak. Poza klasycznymi zajęciami i obiektami sportowymi warto sprawdzać też rodzinne wydarzenia plenerowe, ruchowe warsztaty i miejsca rekreacyjne.",
        },
      ],
      relatedLinks: [
        { href: `/${city.slug}/dla-rodzicow`, label: `${city.label} dla rodziców`, description: "Praktyczne wyjścia i rodzinne plany" },
        { href: "/place-zabaw-krakow", label: "Place zabaw w Krakowie", description: "Ruch i zabawa na świeżym powietrzu" },
        { href: "/wydarzenia-dla-dzieci-krakow", label: "Wydarzenia dla dzieci", description: "Także aktywne i sportowe propozycje" },
      ],
    }),
  },
];

const groupPages: SeoPageConfig[] = cities.flatMap((city) =>
  groupTemplates.map((group) => group.buildPage(city)),
);

export const nestedSeoPages: SeoPageConfig[] = [...cityPages, ...groupPages];

export function getCitySeoPage(citySlug: string): SeoPageConfig | undefined {
  return cityPages.find((page) => page.slug === citySlug);
}

export function getNestedSeoPage(citySlug: string, groupSlug: string): SeoPageConfig | undefined {
  const fullSlug = `${citySlug}/${groupSlug}`;
  return groupPages.find((page) => page.slug === fullSlug);
}

export function getAllNestedSeoParams(): Array<{ city: string; group: string }> {
  return groupPages.map((page) => {
    const [city, group] = page.slug.split("/");
    return { city, group };
  });
}

export function getAllNestedSeoPaths(): string[] {
  return nestedSeoPages.map((page) => page.slug);
}