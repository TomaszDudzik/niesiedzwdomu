"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Calendar, DoorOpen, MapPin, Tent, Users } from "lucide-react";
import { cn } from "@/lib/utils";
import { ComingSoonBadge } from "@/components/ui/coming-soon";

const NAV_LINKS = [
  { href: "/miejsca", label: "Miejsca", icon: MapPin, color: "bg-secondary/10 text-secondary" },
  { href: "/wydarzenia", label: "Wydarzenia", icon: Calendar, color: "bg-primary/10 text-primary" },
  { href: "/kolonie", label: "Kolonie", icon: Tent, color: "bg-amber-500/10 text-amber-600" },
  { href: "/zajecia", label: "Zajęcia", icon: Users, color: "bg-secondary/10 text-secondary" },
];

type RouteCopy = {
  route: string;
  heading: string;
  subheading: string;
};

const DEFAULT_COPY: Omit<RouteCopy, "route"> = {
  heading: "Odkryj Krakow",
  subheading: "Na NieSiedzWDomu znajdziesz sprawdzone wydarzenia, miejsca i inspiracje dla rodzin z dziecmi w Krakowie.",
};

const ROUTE_COPY: RouteCopy[] = [
  {
    route: "/wydarzenia",
    heading: "Wydarzenia",
    subheading: "Przegladaj aktualne wydarzenia dla dzieci i rodzin - od warsztatow po spektakle i aktywnosci na weekend.",
  },
  {
    route: "/miejsca",
    heading: "Miejsca",
    subheading: "Sprawdzone miejsca przyjazne rodzinom: sale zabaw, parki, muzea i przestrzenie na wspolny czas.",
  },
  {
    route: "/kolonie",
    heading: "Kolonie",
    subheading: "Porownuj kolonie i polkolonie po wieku, terminie i lokalizacji, zeby szybciej znalezc dobra oferte.",
  },
  {
    route: "/zajecia",
    heading: "Zajecia",
    subheading: "Regularne zajecia dla dzieci: sportowe, artystyczne i edukacyjne - wygodnie przefiltrujesz je po potrzebach.",
  },
  {
    route: "/dodaj",
    heading: "Dodaj",
    subheading: "Masz wydarzenie, miejsce lub zajecia? Przeslij zgloszenie, a po weryfikacji dodamy je do serwisu.",
  },
  {
    route: "/o-nas",
    heading: "O nas",
    subheading: "Poznaj nasza misje i sposob pracy z tresciami dla rodzin z dziecmi.",
  },
  {
    route: "/misja",
    heading: "Misja",
    subheading: "Poznaj wartosci i cele, ktore stoja za NieSiedzWDomu.",
  },
  {
    route: "/kontakt",
    heading: "Kontakt",
    subheading: "Napisz do nas, jesli chcesz dodac wydarzenie, miejsce, kolonie lub zajecia.",
  },
  {
    route: "/regulamin",
    heading: "Regulamin",
    subheading: "Poznaj zasady korzystania z serwisu NieSiedzWDomu.",
  },
  {
    route: "/prywatnosc",
    heading: "Prywatnosc",
    subheading: "Sprawdz, jak przetwarzamy dane i korzystamy z plikow cookies.",
  },
  {
    route: "/co-robic-z-dzieckiem-w-krakowie",
    heading: "Przewodnik",
    subheading: "Szybki punkt startowy: wydarzenia, miejsca i inspiracje na wspolny czas z dzieckiem w Krakowie.",
  },
  {
    route: "/wydarzenia-dla-dzieci-krakow",
    heading: "Wydarzenia Dla Dzieci",
    subheading: "Zebrane w jednym miejscu warsztaty, spektakle i atrakcje dla dzieci na dzis i weekend.",
  },
  {
    route: "/polkolonie-krakow",
    heading: "Polkolonie",
    subheading: "Przeglad ofert polkolonii i kolonii z naciskiem na praktyczne porownanie terminow i programu.",
  },
  {
    route: "/place-zabaw-krakow",
    heading: "Place Zabaw",
    subheading: "Najciekawsze place zabaw i strefy aktywnosci dla dzieci w Krakowie - wygodnie do zaplanowania wyjscia.",
  },
  {
    route: "/krakow/dla-rodzicow",
    heading: "Krakow Dla Rodzicow",
    subheading: "Skrocona sciezka dla rodzicow: gdzie isc, co wybrac i jak szybko zaplanowac dzien z dzieckiem.",
  },
  {
    route: "/krakow/dla-sportowcow",
    heading: "Krakow Dla Sportowcow",
    subheading: "Aktywna strona miasta: wydarzenia, miejsca i treningowe inspiracje dla osob lubiacych ruch.",
  },
  {
    route: "/krakow",
    heading: "Krakow",
    subheading: "Miejski przewodnik po wydarzeniach i miejscach, ktore pomagaja szybciej ulozyc plan na wolny czas.",
  },
];

function resolveRouteCopy(pathname: string): Omit<RouteCopy, "route"> {
  const match = ROUTE_COPY.find((item) => pathname === item.route || pathname.startsWith(`${item.route}/`));
  if (!match) return DEFAULT_COPY;

  return {
    heading: match.heading,
    subheading: match.subheading,
  };
}

export function NavSection() {
  const pathname = usePathname();
  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(href + "/");
  const { heading: pageHeading, subheading } = resolveRouteCopy(pathname);

  return (
    <section className="container-page pt-4 pb-4 md:pt-5 md:pb-5 bg-white rounded-xl border border-border/20">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div className="flex items-start md:items-center gap-3">
          <div>
            <h1 className="text-lg md:text-xl font-bold text-foreground tracking-[-0.02em] leading-tight">
              <Link
                href="/"
                className="inline-flex items-center gap-2 rounded-lg text-primary transition-colors duration-200 hover:text-primary/80"
                title="Strona główna"
              >
                <span>NieSiedzWDomu</span>
                <span
                  className={cn(
                    "inline-flex items-center rounded-full border px-1.5 py-1 transition-colors duration-200",
                    pathname === "/"
                      ? "border-primary/25 bg-primary/10 text-primary"
                      : "border-border bg-background text-muted-foreground"
                  )}
                >
                  <DoorOpen size={14} strokeWidth={2.2} />
                </span>
              </Link>
              <span className="mx-1.5 text-muted-foreground/55">|</span>
              <span>{pageHeading}</span>
            </h1>
            <p className="text-[12px] text-muted mt-0.5 max-w-md">
              {subheading}
            </p>
          </div>
        </div>
        <div className="flex gap-1.5">
          {NAV_LINKS.map((link) => {
            const disabled = "disabled" in link && link.disabled;
            return disabled ? (
              <span
                key={link.href}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-medium border border-border bg-card text-muted-foreground/40 cursor-default"
              >
                <link.icon size={13} />
                {link.label}
              </span>
            ) : (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-medium border transition-all duration-200",
                  isActive(link.href)
                    ? "border-primary/30 bg-primary/5 text-primary"
                    : "border-border bg-card text-muted hover:text-foreground hover:border-primary/30"
                )}
              >
                <link.icon size={13} />
                {link.label}
              </Link>
            );
          })}
        </div>
      </div>
    </section>
  );
}
