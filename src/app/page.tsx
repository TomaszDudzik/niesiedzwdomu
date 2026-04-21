import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { getPublishedEvents, getPublishedPlaces, getPublishedCamps, getPublishedActivities } from "@/lib/data";
import { HomeFilteredView } from "./home-filtered-view";

export const revalidate = 60;
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://www.niesiedzwdomu.pl";

export const metadata: Metadata = {
  title: "Odkryj Kraków | NieSiedzWDomu",
  description:
    "NieSiedzWDomu to wydarzenia, miejsca, kolonie i pomysly na rodzinny czas w Krakowie. Sprawdzone propozycje w jednym miejscu.",
  alternates: {
    canonical: "/",
  },
};

export default async function HomePage() {
  const [upcomingEvents, places, camps, activities] = await Promise.all([
    getPublishedEvents(200),
    getPublishedPlaces(200),
    getPublishedCamps(40),
    getPublishedActivities(8),
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
        email: "kontakt@niesiedzwdomu.pl",
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

      <HomeFilteredView events={upcomingEvents} places={places} camps={camps} activities={activities} />

      <section className="container-page mt-16 mb-10">
        <div className="overflow-hidden rounded-[32px] border border-[#ddd4c5] bg-[linear-gradient(180deg,#efe8dc_0%,#e8e0d4_100%)] px-5 py-8 shadow-[0_26px_70px_-48px_rgba(91,74,46,0.35)] sm:px-7 lg:px-10 lg:py-10">
          <div className="mx-auto mb-7 max-w-2xl text-center">
            <h2 className="text-[28px] font-bold tracking-[-0.03em] text-[#2f2417] sm:text-[34px]">
              Przewodniki po Krakowie
            </h2>
            <p className="mt-2 text-[14px] leading-6 text-[#6f614f] sm:text-[15px]">
              Gotowe zestawienia i wskazówki dla rodziców, zebrane w spokojnej, łatwej do przeglądania formie.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { href: "/co-robic-z-dzieckiem-w-krakowie", label: "Odkryj Kraków z dzieckiem", description: "Sprawdzone miejsca i pomysły na rodzinny czas", icon: "🗺️", accent: "text-[#c96b2c]" },
            { href: "/wydarzenia-dla-dzieci-krakow", label: "Wydarzenia dla dzieci", description: "Warsztaty, spektakle i atrakcje na każdy tydzień", icon: "🎪", accent: "text-[#0f766e]" },
            { href: "/polkolonie-krakow", label: "Półkolonie Kraków", description: "Oferty na wakacje, ferie i wolne dni", icon: "🏕️", accent: "text-[#6d28d9]" },
            { href: "/place-zabaw-krakow", label: "Place zabaw", description: "Najlepsze place zabaw w mieście i okolicach", icon: "🛝", accent: "text-[#be185d]" },
          ].map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="group rounded-[24px] border border-[#d7cdbc] bg-[rgba(255,252,247,0.72)] px-5 py-5 shadow-[0_18px_40px_-34px_rgba(79,60,35,0.35)] transition-all duration-200 hover:-translate-y-1 hover:border-[#cabda8] hover:bg-[rgba(255,252,247,0.92)] hover:shadow-[0_24px_52px_-32px_rgba(79,60,35,0.42)]"
            >
              <div className="flex h-full flex-col">
                <span className="text-[21px] leading-none">{link.icon}</span>
                <span className="mt-6 text-[21px] font-semibold leading-[1.2] tracking-[-0.02em] text-[#2f2417]">
                  {link.label}
                </span>
                <p className="mt-3 text-[14px] leading-7 text-[#766957]">{link.description}</p>
                <span className={`mt-6 inline-flex items-center gap-1 text-[14px] font-semibold transition-transform duration-200 group-hover:translate-x-0.5 ${link.accent}`}>
                  Czytaj
                  <ArrowRight size={14} />
                </span>
              </div>
            </Link>
          ))}
        </div>
        </div>
      </section>
    </div>
  );
}
