import { notFound } from "next/navigation";
import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, MapPin, ExternalLink, Home, Globe, Users, FileText } from "lucide-react";
import { formatAgeRange } from "@/lib/utils";
import { AiLearnMoreLink } from "@/components/ui/ai-learn-more-link";
import { getPlaceBySlug } from "@/lib/data";

const FacebookIcon = ({ size = 15, className = "" }: { size?: number; className?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" />
  </svg>
);

export const revalidate = 60;

interface PageProps { params: Promise<{ slug: string }>; }

function getPlaceCategoryLabel(value: string | null | undefined) {
  return value || "Miejsce";
}


const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://www.niesiedzwdomu.pl";

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const place = await getPlaceBySlug(slug);

  if (!place) {
    return {
      title: "Miejsce nie znalezione | NieSiedzWDomu",
      robots: { index: false, follow: false },
    };
  }

  const description = place.description_short || `Sprawdz miejsce ${place.title} w Krakowie.`;
  const url = `${SITE_URL}/miejsca/${place.slug}`;

  return {
    title: `${place.title} | Miejsca dla dzieci Krakow`,
    description,
    alternates: {
      canonical: `/miejsca/${place.slug}`,
    },
    openGraph: {
      title: place.title,
      description,
      url,
      type: "website",
      locale: "pl_PL",
      images: place.image_url
        ? [{ url: place.image_url, alt: place.title }]
        : [{ url: "/og-image.svg", alt: "NieSiedzWDomu" }],
    },
    twitter: {
      card: "summary_large_image",
      title: place.title,
      description,
      images: place.image_url ? [place.image_url] : ["/og-image.svg"],
    },
  };
}

export default async function PlaceDetailPage({ params }: PageProps) {
  const { slug } = await params;
  const place = await getPlaceBySlug(slug);
  if (!place) notFound();
  const placeCategory = place.category_lvl_1;

  const placeUrl = `${SITE_URL}/miejsca/${place.slug}`;
  const sameAsLinks = [place.source_url, place.facebook_url].filter(
    (url): url is string => Boolean(url)
  );

  const breadcrumbSchema = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Strona glowna", item: SITE_URL },
      { "@type": "ListItem", position: 2, name: "Miejsca", item: `${SITE_URL}/miejsca` },
      { "@type": "ListItem", position: 3, name: place.title, item: placeUrl },
    ],
  };

  const placeSchema = {
    "@context": "https://schema.org",
    "@type": "Place",
    name: place.title,
    description: place.description_short,
    url: placeUrl,
    image: place.image_url ? [place.image_url] : [`${SITE_URL}/og-image.svg`],
    address: {
      "@type": "PostalAddress",
      streetAddress: place.street || undefined,
      postalCode: place.postcode || undefined,
      addressLocality: place.city || "Krakow",
      addressRegion: place.district || undefined,
      addressCountry: "PL",
    },
    geo: place.lat !== null && place.lng !== null
      ? { "@type": "GeoCoordinates", latitude: place.lat, longitude: place.lng }
      : undefined,
    sameAs: sameAsLinks.length > 0 ? sameAsLinks : undefined,
    audience: place.age_min !== null || place.age_max !== null
      ? { "@type": "PeopleAudience", suggestedMinAge: place.age_min ?? undefined, suggestedMaxAge: place.age_max ?? undefined }
      : undefined,
    inLanguage: "pl-PL",
    areaServed: { "@type": "City", name: "Krakow" },
  };

  const placeAddress = [place.street, place.city].filter(Boolean).join(", ");
  const mapsUrl = placeAddress
    ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(placeAddress)}`
    : null;

  return (
    <div className="container-page py-5 lg:py-8">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(placeSchema) }} />

      {/* Tytuł + short desc — nad gridem */}
      <div className="mb-5">
        <div className="flex items-center gap-1.5 mb-2 text-[11px] uppercase tracking-wider font-medium">
          <Link href="/miejsca" className="inline-flex items-center gap-1 text-muted hover:text-primary transition-colors duration-200">
            <ArrowLeft size={11} /> Miejsca
          </Link>
          <span className="text-muted-foreground/30">·</span>
          <span className="text-muted-foreground">{getPlaceCategoryLabel(placeCategory)}</span>
          <span className="text-muted-foreground/40">|</span>
          <span className="text-muted-foreground">{place.is_indoor ? "Wewnątrz" : "Na zewnątrz"}</span>
          <span className="text-muted-foreground/40">|</span>
          <span className="text-muted-foreground">{place.district}</span>
        </div>
        <h1 className="text-xl lg:text-2xl font-bold text-foreground leading-tight tracking-[-0.02em] mb-2">
          {place.title}
        </h1>
        {place.description_short && (
          <p className="text-[14px] text-muted leading-relaxed max-w-2xl">{place.description_short}</p>
        )}
      </div>

      {/* Unified wrapper: image + description + info box */}
      <div className="rounded-[28px] bg-white px-4 py-5 sm:px-6 sm:py-6 lg:px-8 lg:py-8 mb-8">
        <div className="grid lg:grid-cols-[476px_1fr_360px] gap-6 lg:gap-8 items-start">
          {place.image_url && (
            <div className="relative rounded-xl overflow-hidden bg-accent w-full" style={{ minHeight: "448px" }}>
              <img src={place.image_url} alt={place.title} className="absolute inset-0 w-full h-full object-cover" />
            </div>
          )}

          <div className="space-y-3">
            <div className="rounded-xl border border-border/70 bg-white/80 p-4 shadow-sm">
              <p className="text-[13px] text-foreground leading-relaxed font-bold">Miejsce:</p>
              <p className="mt-1 text-[13px] text-foreground/80 leading-relaxed">
                {place.title}
                {place.description_short ? ` - ${place.description_short}` : ""}
              </p>
              {place.description_long && place.description_long !== place.description_short && (
                <div className="mt-3">
                  <p className="text-[13px] text-foreground/90 leading-relaxed font-bold">Opis:</p>
                  <div className="mt-1 space-y-2">
                    {place.description_long.split("\n").filter(p => p.trim()).map((p, i) => (
                      <p key={i} className="text-[13px] text-foreground/80 leading-relaxed">{p}</p>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <AiLearnMoreLink
              queryParts={[
                place.title,
                "Kraków",
                `${getPlaceCategoryLabel(placeCategory)} miejsce dla dzieci`,
                "najważniejsze informacje",
                "dla kogo",
                "cennik",
                "praktyczne wskazówki",
              ]}
            />
          </div>

          {/* Info card */}
          <div className="lg:sticky lg:top-20 self-start">
          <div className="rounded-xl border border-border bg-card shadow-[var(--shadow-card)] overflow-hidden">
            <div className="px-4 py-4 space-y-3">

              {placeAddress && mapsUrl && (
                <a href={mapsUrl} target="_blank" rel="noopener" className="flex items-start gap-2.5 group cursor-pointer">
                  <MapPin size={14} className="text-secondary/60 group-hover:text-primary shrink-0 mt-0.5 transition-colors" />
                  <div>
                    <p className="text-[10px] text-muted uppercase tracking-wider leading-none mb-0.5">Adres</p>
                    <p className="text-[13px] font-medium text-foreground group-hover:text-primary transition-colors">{placeAddress}</p>
                  </div>
                </a>
              )}

              <div className="flex items-center gap-2.5">
                <Home size={14} className="text-secondary/60 shrink-0" />
                <div>
                  <p className="text-[10px] text-muted uppercase tracking-wider leading-none mb-0.5">Lokalizacja</p>
                  <p className="text-[13px] font-medium text-foreground">{place.is_indoor ? "Wewnątrz" : "Na zewnątrz"}</p>
                </div>
              </div>

              {place.note && (
                <div className="flex items-center gap-2.5">
                  <FileText size={14} className="text-secondary/60 shrink-0" />
                  <div>
                    <p className="text-[10px] text-muted uppercase tracking-wider leading-none mb-0.5">Notatka</p>
                    <p className="text-[13px] font-medium text-foreground">{place.note}</p>
                  </div>
                </div>
              )}

              {(place.age_min !== null || place.age_max !== null) && (
                <div className="flex items-center gap-2.5">
                  <Users size={14} className="text-secondary/60 shrink-0" />
                  <div>
                    <p className="text-[10px] text-muted uppercase tracking-wider leading-none mb-0.5">Wiek</p>
                    <p className="text-[13px] font-medium text-foreground">{formatAgeRange(place.age_min, place.age_max)}</p>
                  </div>
                </div>
              )}
            </div>

            {(place.source_url || place.facebook_url) && (
              <div className="px-4 py-3 border-t border-border space-y-2">
                {place.source_url && (
                  <a href={place.source_url} target="_blank" rel="noopener"
                    className="flex items-center gap-2 text-[13px] text-foreground hover:text-primary transition-colors group">
                    <Globe size={13} className="text-secondary/60 group-hover:text-primary shrink-0" />
                    <span className="font-medium">Strona internetowa</span>
                    <ExternalLink size={11} className="text-muted shrink-0 ml-auto" />
                  </a>
                )}
                {place.facebook_url && (
                  <a href={place.facebook_url} target="_blank" rel="noopener"
                    className="flex items-center gap-2 text-[13px] text-foreground hover:text-primary transition-colors group">
                    <FacebookIcon size={13} className="text-secondary/60 group-hover:text-primary shrink-0" />
                    <span className="font-medium">Facebook</span>
                    <ExternalLink size={11} className="text-muted shrink-0 ml-auto" />
                  </a>
                )}
              </div>
            )}

          </div>
        </div>
        </div>
      </div>
    </div>
  );
}
