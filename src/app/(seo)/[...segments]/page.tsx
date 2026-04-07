import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getAllSeoSlugs, getSeoPageBySlug } from "@/content/seo-pages";
import { getAllNestedSeoPaths, getCitySeoPage, getNestedSeoPage } from "@/content/nested-seo-pages";
import { buildSeoMetadata } from "@/lib/seo-metadata";
import { SeoLandingPage } from "@/components/seo/seo-landing-page";

interface PageProps {
  params: Promise<{ segments: string[] }>;
}

function resolveSeoPage(segments: string[]) {
  if (segments.length === 1) {
    return getSeoPageBySlug(segments[0]) || getCitySeoPage(segments[0]);
  }

  if (segments.length === 2) {
    return getNestedSeoPage(segments[0], segments[1]);
  }

  return undefined;
}

export function generateStaticParams() {
  return [
    ...getAllSeoSlugs().map((slug) => ({ segments: [slug] })),
    ...getAllNestedSeoPaths().map((path) => ({ segments: path.split("/") })),
  ];
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { segments } = await params;
  const page = resolveSeoPage(segments);
  if (!page) return {};
  return buildSeoMetadata(page);
}

export default async function SeoPage({ params }: PageProps) {
  const { segments } = await params;
  const page = resolveSeoPage(segments);

  if (!page) {
    notFound();
  }

  return <SeoLandingPage config={page} />;
}