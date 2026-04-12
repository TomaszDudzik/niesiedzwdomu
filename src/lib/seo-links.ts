import type { InternalLink, SeoPageConfig } from "@/types/seo";
import { seoPages } from "@/content/seo-pages";
import { getCitySeoPage, nestedSeoPages } from "@/content/nested-seo-pages";

/**
 * Static product pages that SEO pages should link to.
 */
const PRODUCT_PAGES: InternalLink[] = [
  { href: "/wydarzenia", label: "Wszystkie wydarzenia", description: "Przeglądaj z filtrami" },
  { href: "/kolonie", label: "Kolonie i półkolonie", description: "Porównaj oferty" },
  { href: "/miejsca", label: "Miejsca", description: "Place zabaw, sale zabaw" },
];

/**
 * Tags for each SEO page used for relevance matching.
 * Pages sharing more tags are considered more related.
 */
const PAGE_TAGS: Record<string, string[]> = {
  "krakow": ["ogólne", "miasto", "wydarzenia", "miejsca", "sport", "rodzina"],
  "krakow/dla-rodzicow": ["rodzina", "wydarzenia", "miejsca", "kolonie", "bezpłatne"],
  "krakow/dla-sportowcow": ["sport", "ruch", "miejsca", "wydarzenia", "na-zewnątrz"],
  "co-robic-z-dzieckiem-w-krakowie": ["ogólne", "wydarzenia", "miejsca", "kolonie", "bezpłatne"],
  "wydarzenia-dla-dzieci-krakow": ["wydarzenia", "warsztaty", "spektakle", "kultura"],
  "polkolonie-krakow": ["kolonie", "półkolonie", "wakacje", "ferie"],
  "place-zabaw-krakow": ["miejsca", "place-zabaw", "na-zewnątrz", "bezpłatne"],
};

const ALL_SEO_PAGES = [...seoPages, ...nestedSeoPages];

/**
 * Computes a relevance score between two pages based on shared tags.
 */
function relevanceScore(slugA: string, slugB: string): number {
  const tagsA = PAGE_TAGS[slugA] || [];
  const tagsB = PAGE_TAGS[slugB] || [];
  return tagsA.filter((t) => tagsB.includes(t)).length;
}

/**
 * Returns the related SEO pages for a given page, ranked by relevance.
 * Excludes the page itself. Returns up to `limit` results.
 */
export function getRelatedSeoPages(currentSlug: string, limit = 4): InternalLink[] {
  return ALL_SEO_PAGES
    .filter((p) => p.slug !== currentSlug)
    .map((p) => ({ page: p, score: relevanceScore(currentSlug, p.slug) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map(({ page }) => ({
      href: `/${page.slug}`,
      label: page.h1,
      description: page.lead,
    }));
}

/**
 * Returns relevant product pages for a given SEO page.
 * Based on which content types the page's listings reference.
 */
export function getRelatedProductPages(page: SeoPageConfig): InternalLink[] {
  const types = new Set(page.listings.map((l) => l.contentType));
  const links: InternalLink[] = [];

  if (types.has("event") || types.has("mixed")) {
    links.push(PRODUCT_PAGES.find((p) => p.href === "/wydarzenia")!);
  }
  if (types.has("camp")) {
    links.push(PRODUCT_PAGES.find((p) => p.href === "/kolonie")!);
  }
  if (types.has("place") || types.has("mixed")) {
    links.push(PRODUCT_PAGES.find((p) => p.href === "/miejsca")!);
  }
  // Always include events calendar view
  links.push({ href: "/wydarzenia", label: "Kalendarz wydarzeń", description: "Widok miesiąca" });

  return links;
}

/**
 * Builds the full related links section for a page.
 * Merges auto-generated related SEO pages + relevant product pages.
 * Deduplicates by href.
 */
export function buildRelatedLinks(page: SeoPageConfig): InternalLink[] {
  const manual = page.relatedLinks;
  const autoSeo = getRelatedSeoPages(page.slug, 3);
  const autoProduct = getRelatedProductPages(page);

  // Merge: manual first, then auto (dedup by href)
  const seen = new Set<string>();
  const result: InternalLink[] = [];

  for (const link of [...manual, ...autoSeo, ...autoProduct]) {
    if (!seen.has(link.href)) {
      seen.add(link.href);
      result.push(link);
    }
  }

  return result.slice(0, 8);
}

/**
 * Builds a breadcrumb trail for an SEO page.
 */
export function buildBreadcrumbs(page: SeoPageConfig): { label: string; href: string }[] {
  const segments = page.slug.split("/");

  if (segments.length === 2) {
    const cityPage = getCitySeoPage(segments[0]);

    return [
      { label: "Strona główna", href: "/" },
      { label: cityPage?.h1 || segments[0], href: `/${segments[0]}` },
      { label: page.h1, href: `/${page.slug}` },
    ];
  }

  return [
    { label: "Strona główna", href: "/" },
    { label: page.h1, href: `/${page.slug}` },
  ];
}
