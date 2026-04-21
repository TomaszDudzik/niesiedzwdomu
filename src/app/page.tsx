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

      <section style={{ background: "oklch(14% 0.018 75)" }}>
        <div className="container-page py-14">
          <div className="text-center mb-10">
            <h2 className="font-heading font-black leading-tight text-white" style={{ fontSize: "clamp(26px, 4vw, 36px)" }}>
              Przewodniki po Krakowie
            </h2>
            <p className="text-[14px] mt-2" style={{ color: "oklch(60% 0.012 75)" }}>
              Gotowe zestawienia i wskazówki dla rodziców
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              {
                href: "/co-robic-z-dzieckiem-w-krakowie",
                icon: "🗺️",
                label: "Odkryj Kraków z dzieckiem",
                description: "Sprawdzone miejsca i pomysły na rodzinny czas",
                color: "var(--color-primary)",
              },
              {
                href: "/wydarzenia-dla-dzieci-krakow",
                icon: "🎪",
                label: "Wydarzenia dla dzieci",
                description: "Warsztaty, spektakle i atrakcje na każdy wiek",
                color: "var(--color-secondary)",
              },
              {
                href: "/polkolonie-krakow",
                icon: "⛺",
                label: "Półkolonie Kraków",
                description: "Oferty na wakacje, ferie i wolne dni",
                color: "var(--color-purple)",
              },
              {
                href: "/place-zabaw-krakow",
                icon: "🛝",
                label: "Place zabaw",
                description: "Najlepsze place zabaw w mieście i okolicach",
                color: "var(--color-pink)",
              },
            ].map((guide) => (
              <Link
                key={guide.href}
                href={guide.href}
                className="group flex flex-col rounded-2xl p-5 transition-all duration-200 hover:-translate-y-1"
                style={{ background: "oklch(20% 0.018 75)" }}
              >
                <div
                  className="w-12 h-12 rounded-xl flex items-center justify-center text-[22px] mb-4 shrink-0"
                  style={{ background: guide.color + "28" }}
                >
                  {guide.icon}
                </div>
                <h3 className="font-heading font-bold text-[15px] text-white leading-snug mb-1.5">
                  {guide.label}
                </h3>
                <p className="text-[12px] leading-relaxed flex-1" style={{ color: "oklch(60% 0.012 75)" }}>
                  {guide.description}
                </p>
                <span
                  className="mt-4 inline-flex items-center gap-1 text-[12px] font-semibold"
                  style={{ color: guide.color }}
                >
                  Czytaj
                  <ArrowRight size={11} className="group-hover:translate-x-0.5 transition-transform duration-200" />
                </span>
              </Link>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
