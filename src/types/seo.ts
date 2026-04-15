import type { ContentType, EventCategory, CampMainCategory } from "./database";

export interface FaqItem {
  question: string;
  answer: string;
}

export interface InternalLink {
  href: string;
  label: string;
  description?: string;
}

export interface QuickFilter {
  label: string;
  href: string;
}

export interface SeoListingConfig {
  /** Which content type to show */
  contentType: ContentType | "mixed";
  /** Optional: filter by specific category/type */
  filterCategory?: EventCategory;
  filterCampType?: CampMainCategory;
  filterPlaceType?: string;
  /** Only show free items */
  filterFree?: boolean;
  /** Only show indoor items (places) */
  filterIndoor?: boolean;
  /** Section heading above the listing */
  heading: string;
  /** Max items to show */
  limit?: number;
  /** Link to the full listing page */
  viewAllHref: string;
  viewAllLabel: string;
}

export interface SeoPageConfig {
  /** URL slug — becomes /[slug] */
  slug: string;

  /** SEO metadata */
  metaTitle: string;
  metaDescription: string;

  /** Hero section */
  h1: string;
  lead: string;
  ctaLabel: string;
  ctaHref: string;
  secondaryCtaLabel?: string;
  secondaryCtaHref?: string;

  /** Intro paragraphs (editorial SEO copy) */
  intro: string[];

  /** Quick filter pills shown below intro */
  quickFilters?: QuickFilter[];

  /** Content listings — can have multiple sections */
  listings: SeoListingConfig[];

  /** FAQ section */
  faq: FaqItem[];

  /** Internal links to other pages */
  relatedLinks: InternalLink[];
}
