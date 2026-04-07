import type { MetadataRoute } from "next";
import { getAllSeoSlugs } from "@/content/seo-pages";
import { getAllNestedSeoPaths } from "@/content/nested-seo-pages";
import { getPublishedEvents, getPublishedPlaces } from "@/lib/data";

export const revalidate = 3600;

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://www.niesiedzwdomu.pl";

const STATIC_ROUTES = [
  { path: "", priority: 1, changeFrequency: "daily" as const },
  { path: "/wydarzenia", priority: 0.9, changeFrequency: "daily" as const },
  { path: "/kalendarz", priority: 0.8, changeFrequency: "daily" as const },
  { path: "/miejsca", priority: 0.8, changeFrequency: "weekly" as const },
  { path: "/kolonie", priority: 0.7, changeFrequency: "weekly" as const },
  { path: "/zajecia", priority: 0.6, changeFrequency: "weekly" as const },
];

function toAbsoluteUrl(path: string): string {
  return new URL(path || "/", SITE_URL).toString();
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [events, places] = await Promise.all([
    getPublishedEvents(1000),
    getPublishedPlaces(1000),
  ]);

  const staticEntries: MetadataRoute.Sitemap = STATIC_ROUTES.map((route) => ({
    url: toAbsoluteUrl(route.path),
    lastModified: new Date(),
    changeFrequency: route.changeFrequency,
    priority: route.priority,
  }));

  const seoEntries: MetadataRoute.Sitemap = getAllSeoSlugs().map((slug) => ({
    url: toAbsoluteUrl(`/${slug}`),
    lastModified: new Date(),
    changeFrequency: "weekly",
    priority: 0.8,
  }));

  const nestedSeoEntries: MetadataRoute.Sitemap = getAllNestedSeoPaths().map((path) => ({
    url: toAbsoluteUrl(`/${path}`),
    lastModified: new Date(),
    changeFrequency: "weekly",
    priority: 0.75,
  }));

  const eventEntries: MetadataRoute.Sitemap = events.map((event) => ({
    url: toAbsoluteUrl(`/wydarzenia/${event.slug}`),
    lastModified: event.updated_at || event.created_at || new Date(),
    changeFrequency: "weekly",
    priority: 0.7,
  }));

  const placeEntries: MetadataRoute.Sitemap = places.map((place) => ({
    url: toAbsoluteUrl(`/miejsca/${place.slug}`),
    lastModified: place.updated_at || place.created_at || new Date(),
    changeFrequency: "weekly",
    priority: 0.7,
  }));

  return [...staticEntries, ...seoEntries, ...nestedSeoEntries, ...eventEntries, ...placeEntries];
}