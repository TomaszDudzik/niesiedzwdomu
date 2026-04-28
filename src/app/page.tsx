import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { withPublicSubmissionTaxonomyFallback } from "@/lib/admin-taxonomy";
import { loadAdminTaxonomy } from "@/lib/admin-taxonomy-server";
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
  const [upcomingEvents, places, camps, activities, initialTaxonomy] = await Promise.all([
    getPublishedEvents(200),
    getPublishedPlaces(200),
    getPublishedCamps(40),
    getPublishedActivities(8),
    loadAdminTaxonomy().then(withPublicSubmissionTaxonomyFallback),
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

      <HomeFilteredView
        events={upcomingEvents}
        places={places}
        camps={camps}
        activities={activities}
        initialTaxonomy={initialTaxonomy}
      />

      <section>
        <div className="container-page pb-14">
          <div className="rounded-[28px] border border-[#d0e8f8] px-4 py-10 shadow-[0_8px_32px_rgba(0,0,0,0.08)] sm:px-6 lg:px-8" style={{background: 'radial-gradient(1200px 500px at -10% -20%, rgba(100,160,220,0.07), transparent 55%), radial-gradient(900px 420px at 110% 10%, rgba(130,180,230,0.08), transparent 60%), linear-gradient(180deg, #f4f9fe 0%, #edf4fb 100%)'}}>
          <div className="text-center mb-10">
            <h2 className="font-heading font-black leading-tight text-foreground" style={{ fontSize: "clamp(26px, 4vw, 36px)" }}>
              Przewodniki po Krakowie
            </h2>
            <p className="text-[14px] mt-2 text-muted-foreground">
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
                className="group flex flex-col rounded-2xl border border-border bg-white/95 p-5 shadow-[0_6px_18px_rgba(0,0,0,0.06)] transition-all duration-200 hover:-translate-y-1 hover:shadow-[0_10px_24px_rgba(0,0,0,0.10)]"
              >
                <div
                  className="w-12 h-12 rounded-xl flex items-center justify-center text-[22px] mb-4 shrink-0"
                  style={{ background: guide.color + "28" }}
                >
                  {guide.icon}
                </div>
                <h3 className="font-heading font-bold text-[15px] text-foreground leading-snug mb-1.5">
                  {guide.label}
                </h3>
                <p className="text-[12px] leading-relaxed text-muted-foreground flex-1">
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
        </div>
      </section>
    </div>
  );
}
