import type { Metadata } from "next";
import type { SeoPageConfig } from "@/types/seo";

const SITE_NAME = "wyjdź na pole";
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://wyjdznapole.pl";

/**
 * Generates full Next.js Metadata for an SEO landing page.
 * Includes title template, OG, Twitter, canonical, robots.
 */
export function buildSeoMetadata(page: SeoPageConfig): Metadata {
  const url = `${SITE_URL}/${page.slug}`;

  return {
    title: page.metaTitle,
    description: page.metaDescription,
    alternates: {
      canonical: url,
    },
    robots: {
      index: true,
      follow: true,
      "max-snippet": -1,
      "max-image-preview": "large" as const,
      "max-video-preview": -1,
    },
    openGraph: {
      title: page.metaTitle,
      description: page.metaDescription,
      url,
      siteName: SITE_NAME,
      locale: "pl_PL",
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title: page.metaTitle,
      description: page.metaDescription,
    },
  };
}

/**
 * Builds JSON-LD structured data for an SEO landing page.
 * Returns an array of schema objects to render as <script> tags.
 */
export function buildStructuredData(page: SeoPageConfig): object[] {
  const url = `${SITE_URL}/${page.slug}`;
  const schemas: object[] = [];

  // WebPage schema
  schemas.push({
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: page.metaTitle,
    description: page.metaDescription,
    url,
    isPartOf: {
      "@type": "WebSite",
      name: SITE_NAME,
      url: SITE_URL,
    },
    about: {
      "@type": "Thing",
      name: "Atrakcje dla dzieci w Krakowie",
    },
    audience: {
      "@type": "PeopleAudience",
      audienceType: "Rodzice z dziećmi",
      geographicArea: {
        "@type": "City",
        name: "Kraków",
      },
    },
  });

  // BreadcrumbList schema
  schemas.push({
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      {
        "@type": "ListItem",
        position: 1,
        name: "Strona główna",
        item: SITE_URL,
      },
      {
        "@type": "ListItem",
        position: 2,
        name: page.h1,
        item: url,
      },
    ],
  });

  // FAQPage schema (only if there are FAQ items)
  if (page.faq.length > 0) {
    schemas.push({
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: page.faq.map((item) => ({
        "@type": "Question",
        name: item.question,
        acceptedAnswer: {
          "@type": "Answer",
          text: item.answer,
        },
      })),
    });
  }

  return schemas;
}
