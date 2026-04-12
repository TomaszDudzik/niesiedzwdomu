import { notFound } from "next/navigation";
import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, MapPin, ExternalLink, Home, Globe, Users, Sparkles } from "lucide-react";
import { PLACE_TYPE_LABELS, PLACE_TYPE_ICONS } from "@/lib/mock-data";
import { FeedbackButtons } from "@/components/ui/feedback-buttons";
import { AiLearnMoreLink } from "@/components/ui/ai-learn-more-link";
import { getPlaceBySlug } from "@/lib/data";

const FacebookIcon = ({ size = 15, className = "" }: { size?: number; className?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" />
  </svg>
);

export const revalidate = 60;

interface PageProps { params: Promise<{ slug: string }>; }

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

  const placeUrl = `${SITE_URL}/miejsca/${place.slug}`;
  const sameAsLinks = [place.source_url, place.facebook_url].filter(
    (url): url is string => Boolean(url)
  );
  const breadcrumbSchema = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      {
        "@type": "ListItem",
        position: 1,
        name: "Strona glowna",
        item: SITE_URL,
      },
      {
        "@type": "ListItem",
        position: 2,
        name: "Miejsca",
        item: `${SITE_URL}/miejsca`,
      },
      {
        "@type": "ListItem",
        position: 3,
        name: place.title,
        item: placeUrl,
      },
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
      addressLocality: place.city || "Krakow",
      addressRegion: place.district || undefined,
      addressCountry: "PL",
    },
    geo:
      place.lat !== null && place.lng !== null
        ? {
            "@type": "GeoCoordinates",
            latitude: place.lat,
            longitude: place.lng,
          }
        : undefined,
    isAccessibleForFree: place.is_free,
    openingHours: place.opening_hours || undefined,
    sameAs: sameAsLinks.length > 0 ? sameAsLinks : undefined,
    audience:
      place.age_min !== null || place.age_max !== null
        ? {
            "@type": "PeopleAudience",
            suggestedMinAge: place.age_min ?? undefined,
            suggestedMaxAge: place.age_max ?? undefined,
          }
        : undefined,
    inLanguage: "pl-PL",
    areaServed: {
      "@type": "City",
      name: "Krakow",
    },
  };

  return (
    <div className="container-page py-8">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(placeSchema) }}
      />

      <Link href="/miejsca" className="inline-flex items-center gap-1.5 text-[13px] text-muted hover:text-primary transition-colors duration-200 mb-8">
        <ArrowLeft size={13} /> Miejsca
      </Link>

      <div className="grid lg:grid-cols-3 gap-10">
        <div className="lg:col-span-2">
          {place.image_url && (
            <div className="relative rounded-xl overflow-hidden mb-4 aspect-[15/8] bg-accent">
              <img src={place.image_url} alt={place.title} className="w-full h-full object-cover" />
              <FeedbackButtons
                contentType="place"
                itemId={place.id}
                initialLikes={place.likes}
                initialDislikes={place.dislikes}
                showLabel={false}
                className="absolute bottom-3 right-3 z-10"
              />
            </div>
          )}

          <div className="mb-8">
            <AiLearnMoreLink
              title={place.title}
              topicHint={`${PLACE_TYPE_LABELS[place.place_type] || place.place_type} miejsce dla dzieci`}
            />
          </div>

          <div className="flex items-center gap-1.5 mb-3 text-[11px] uppercase tracking-wider font-medium">
            <span className="text-lg mr-0.5">{PLACE_TYPE_ICONS[place.place_type] || "📍"}</span>
            <span className="text-primary">{PLACE_TYPE_LABELS[place.place_type] || place.place_type}</span>
            <span className="text-muted-foreground/30">·</span>
            <span className="text-muted-foreground">{place.is_indoor ? "Wewnątrz" : "Na zewnątrz"}</span>
          </div>

          <h1 className="text-2xl md:text-3xl font-bold text-foreground leading-tight tracking-[-0.02em] mb-3">{place.title}</h1>
          <p className="text-[15px] text-muted leading-relaxed mb-8">{place.description_short}</p>

          {place.description_long && place.description_long !== place.description_short && (
            <div className="space-y-4">
              {place.description_long.split("\n").map((p, i) => (
                <p key={i} className="text-[15px] text-foreground/80 leading-relaxed">{p}</p>
              ))}
            </div>
          )}

        </div>

        <div className="lg:col-span-1">
          <div className="sticky top-20 space-y-5">
            <div className="rounded-xl border border-border bg-card shadow-[var(--shadow-card)] overflow-hidden">
              {/* Place name header */}
              <div className="px-5 pt-5 pb-4 border-b border-border">
                <h2 className="text-[15px] font-bold text-foreground leading-snug">{place.title}</h2>
                <p className="text-[11px] text-muted mt-1 uppercase tracking-wider font-medium">
                  {PLACE_TYPE_ICONS[place.place_type] || "📍"} {PLACE_TYPE_LABELS[place.place_type] || place.place_type}
                </p>
              </div>

              {/* Info rows */}
              <div className="px-5 py-4 space-y-3.5 text-[13px]">
                {/* Address */}
                {(place.street || place.city) ? (
                  <a
                    href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent([place.street, place.city].filter(Boolean).join(", "))}`}
                    target="_blank"
                    rel="noopener"
                    className="flex items-start gap-2.5 group cursor-pointer"
                  >
                    <MapPin size={15} className="text-secondary/60 group-hover:text-primary shrink-0 mt-0.5 transition-colors duration-200" />
                    <div>
                      <p className="text-[11px] text-muted uppercase tracking-wider mb-0.5">Adres</p>
                      <p className="font-medium text-foreground group-hover:text-primary transition-colors duration-200">
                        {[place.street, place.city].filter(Boolean).join(", ")}
                      </p>
                    </div>
                  </a>
                ) : (
                  <div className="flex items-start gap-2.5">
                    <MapPin size={15} className="text-secondary/60 shrink-0 mt-0.5" />
                    <div>
                      <p className="text-[11px] text-muted uppercase tracking-wider mb-0.5">Adres</p>
                      <p className="font-medium text-foreground">Brak informacji</p>
                    </div>
                  </div>
                )}

                {/* Indoor/outdoor */}
                <div className="flex items-start gap-2.5">
                  <Home size={15} className="text-secondary/60 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-[11px] text-muted uppercase tracking-wider mb-0.5">Lokalizacja</p>
                    <p className="font-medium text-foreground">{place.is_indoor ? "Wewnątrz" : "Na zewnątrz"}</p>
                  </div>
                </div>

                {/* Age range */}
                {(place.age_min !== null || place.age_max !== null) && (
                  <div className="flex items-start gap-2.5">
                    <Users size={15} className="text-secondary/60 shrink-0 mt-0.5" />
                    <div>
                      <p className="text-[11px] text-muted uppercase tracking-wider mb-0.5">Wiek</p>
                      <p className="font-medium text-foreground">
                        {place.age_min !== null && place.age_max !== null
                          ? `${place.age_min}–${place.age_max} lat`
                          : place.age_min !== null
                            ? `od ${place.age_min} lat`
                            : `do ${place.age_max} lat`}
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* Links section */}
              <div className="px-5 py-4 border-t border-border space-y-2.5">
                {place.source_url && (
                  <a href={place.source_url} target="_blank" rel="noopener"
                    className="flex items-center gap-2.5 text-[13px] text-foreground hover:text-primary transition-colors duration-200 group">
                    <Globe size={15} className="text-secondary/60 group-hover:text-primary shrink-0" />
                    <span className="font-medium truncate">Strona internetowa</span>
                    <ExternalLink size={11} className="text-muted shrink-0 ml-auto" />
                  </a>
                )}

                {place.facebook_url && (
                  <a href={place.facebook_url} target="_blank" rel="noopener"
                    className="flex items-center gap-2.5 text-[13px] text-foreground hover:text-primary transition-colors duration-200 group">
                    <FacebookIcon size={15} className="text-secondary/60 group-hover:text-primary shrink-0" />
                    <span className="font-medium truncate">Facebook</span>
                    <ExternalLink size={11} className="text-muted shrink-0 ml-auto" />
                  </a>
                )}

              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
