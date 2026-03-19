import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getSeoPageBySlug, getAllSeoSlugs } from "@/content/seo-pages";
import { buildSeoMetadata } from "@/lib/seo-metadata";
import { SeoLandingPage } from "@/components/seo/seo-landing-page";

interface PageProps {
  params: Promise<{ slug: string }>;
}

export function generateStaticParams() {
  return getAllSeoSlugs().map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const page = getSeoPageBySlug(slug);
  if (!page) return {};
  return buildSeoMetadata(page);
}

export default async function SeoPage({ params }: PageProps) {
  const { slug } = await params;
  const page = getSeoPageBySlug(slug);
  if (!page) notFound();
  return <SeoLandingPage config={page} />;
}
