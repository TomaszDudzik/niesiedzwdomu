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

      <section className="container-page mt-12 mb-7">
        <div className="overflow-hidden rounded-[22px] border border-[#9ECDB0] bg-[#D0EBD8] px-4 py-5 shadow-[0_18px_52px_-38px_rgba(26,92,53,0.12)] sm:px-5 lg:px-6 lg:py-6">
          <div className="mx-auto mb-4 max-w-lg text-center">
            <h2 className="text-[20px] font-bold tracking-[-0.03em] text-[#2D1B4E] sm:text-[24px]">
              Przewodniki po Krakowie
            </h2>
          </div>

          <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { href: "/co-robic-z-dzieckiem-w-krakowie", label: "Odkryj Kraków z dzieckiem", description: "Sprawdzone miejsca i pomysły na rodzinny czas", icon: "🗺️", accent: "text-[#c96b2c]" },
            { href: "/wydarzenia-dla-dzieci-krakow", label: "Wydarzenia dla dzieci", description: "Warsztaty, spektakle i atrakcje na każdy tydzień", icon: "🎪", accent: "text-[#0f766e]" },
            { href: "/polkolonie-krakow", label: "Półkolonie Kraków", description: "Oferty na wakacje, ferie i wolne dni", icon: "🏕️", accent: "text-[#6d28d9]" },
            { href: "/place-zabaw-krakow", label: "Place zabaw", description: "Najlepsze place zabaw w mieście i okolicach", icon: "🛝", accent: "text-[#be185d]" },
          ].map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="group rounded-[18px] border border-[#9ECDB0] bg-[#E6F5EC] px-3.5 py-3.5 shadow-[0_8px_20px_-16px_rgba(26,92,53,0.15)] transition-all duration-200 hover:-translate-y-1 hover:border-[#84BB9A] hover:bg-[#F0FAF3] hover:shadow-[0_14px_28px_-14px_rgba(26,92,53,0.18)]"
            >
              <div className="flex h-full flex-col">
                <span className="text-[16px] leading-none">{link.icon}</span>
                <span className="mt-3 text-[16px] font-semibold leading-[1.18] tracking-[-0.02em] text-[#2D1B4E]">
                  {link.label}
                </span>
                <p className="mt-2 text-[12px] leading-5 text-[#6B5A88]">{link.description}</p>
                <span className={`mt-4 inline-flex items-center gap-1 text-[12px] font-semibold transition-transform duration-200 group-hover:translate-x-0.5 ${link.accent}`}>
                  Czytaj
                  <ArrowRight size={12} />
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
