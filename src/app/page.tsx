import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { getPublishedEvents, getPublishedPlaces } from "@/lib/data";
import { HomeFilteredView } from "./home-filtered-view";

export const revalidate = 60;
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://www.niesiedzwdomu.pl";

export const metadata: Metadata = {
  title: "Nie siedź w domu - Odkryj Kraków z dzieckiem | NieSiedzWDomu",
  description:
    "NieSiedzWDomu to wydarzenia, miejsca, kolonie i pomysly na rodzinny czas w Krakowie. Sprawdzone propozycje w jednym miejscu.",
  alternates: {
    canonical: "/",
  },
};

export default async function HomePage() {
  const [upcomingEvents, places] = await Promise.all([
    getPublishedEvents(8),
    getPublishedPlaces(8),
  ]);

  const organizationSchema = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "NieSiedzWDomu",
    url: SITE_URL,
    logo: `${SITE_URL}/logo.svg`,
    contactPoint: [
      {
        "@type": "ContactPoint",
        email: "kontakt.niesiedzwdomu@gmail.com",
        contactType: "customer support",
        availableLanguage: ["pl"],
      },
    ],
  };

  const websiteSchema = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "NieSiedzWDomu",
    url: SITE_URL,
    inLanguage: "pl-PL",
    potentialAction: {
      "@type": "SearchAction",
      target: `${SITE_URL}/wydarzenia?search={search_term_string}`,
      "query-input": "required name=search_term_string",
    },
  };

  return (
    <div>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteSchema) }}
      />

      <HomeFilteredView events={upcomingEvents} places={places} />

      <section className="container-page mt-14 opacity-40 pointer-events-none">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-[15px] font-semibold text-foreground">Kolonie dla dzieci</h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {[1,2,3,4].map((i) => (
            <div key={i} className="rounded-xl border border-border bg-card">
              <div className="aspect-[3/2] rounded-t-xl bg-accent" />
              <div className="p-3 space-y-2">
                <div className="h-3 bg-accent rounded w-3/4" />
                <div className="h-2 bg-accent rounded w-1/2" />
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="container-page mt-14 opacity-40 pointer-events-none">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-[15px] font-semibold text-foreground">Zajęcia pozaszkolne</h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {[1,2,3,4].map((i) => (
            <div key={i} className="rounded-xl border border-border bg-card">
              <div className="aspect-[3/2] rounded-t-xl bg-accent" />
              <div className="p-3 space-y-2">
                <div className="h-3 bg-accent rounded w-3/4" />
                <div className="h-2 bg-accent rounded w-1/2" />
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="container-page mt-14 mb-8">
        <h2 className="text-[15px] font-semibold text-foreground mb-5">Przewodniki</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {[
            { href: "/co-robic-z-dzieckiem-w-krakowie", label: "Odkryj Kraków z dzieckiem", description: "Wydarzenia, miejsca i pomysły" },
            { href: "/wydarzenia-dla-dzieci-krakow", label: "Wydarzenia dla dzieci", description: "Warsztaty, spektakle, atrakcje" },
            { href: "/polkolonie-krakow", label: "Półkolonie", description: "Oferty na wakacje i ferie" },
            { href: "/place-zabaw-krakow", label: "Place zabaw", description: "Najlepsze place zabaw w mieście" },
          ].map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="group flex items-center justify-between rounded-xl border border-border bg-card px-4 py-3.5 hover:border-primary/25 hover:shadow-[var(--shadow-soft)] transition-all duration-200"
            >
              <div className="min-w-0">
                <span className="text-[13px] font-medium text-foreground">{link.label}</span>
                <p className="text-[12px] text-muted mt-0.5">{link.description}</p>
              </div>
              <ArrowRight size={13} className="text-muted-foreground/30 shrink-0 ml-3 group-hover:text-primary group-hover:translate-x-0.5 transition-all duration-200" />
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
