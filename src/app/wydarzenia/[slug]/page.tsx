import { notFound } from "next/navigation";
import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, Calendar, Clock, MapPin, Users, ExternalLink, Globe } from "lucide-react";
import { CATEGORY_LABELS } from "@/lib/mock-data";
import { formatDate, formatAgeRange, formatPriceRange } from "@/lib/utils";
import { FeedbackButtons } from "@/components/ui/feedback-buttons";
import { ContentCard } from "@/components/ui/content-card";
import { AiLearnMoreLink } from "@/components/ui/ai-learn-more-link";
import { getEventBySlug, getRelatedEvents } from "@/lib/data";

export const revalidate = 60;

interface PageProps { params: Promise<{ slug: string }>; }

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://www.niesiedzwdomu.pl";

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const event = await getEventBySlug(slug);

  if (!event) {
    return {
      title: "Wydarzenie nie znalezione | NieSiedzWDomu",
      robots: { index: false, follow: false },
    };
  }

  const description = event.description_short || `Sprawdz szczegoly wydarzenia ${event.title} w Krakowie.`;
  const url = `${SITE_URL}/wydarzenia/${event.slug}`;

  return {
    title: `${event.title} | Wydarzenia dla dzieci Krakow`,
    description,
    alternates: {
      canonical: `/wydarzenia/${event.slug}`,
    },
    openGraph: {
      title: event.title,
      description,
      url,
      type: "article",
      locale: "pl_PL",
      images: event.image_url
        ? [{ url: event.image_url, alt: event.title }]
        : [{ url: "/og-image.svg", alt: "NieSiedzWDomu" }],
    },
    twitter: {
      card: "summary_large_image",
      title: event.title,
      description,
      images: event.image_url ? [event.image_url] : ["/og-image.svg"],
    },
  };
}

export default async function EventDetailPage({ params }: PageProps) {
  const { slug } = await params;
  const event = await getEventBySlug(slug);
  if (!event) notFound();

  const related = await getRelatedEvents(event, 3);
  const eventUrl = `${SITE_URL}/wydarzenia/${event.slug}`;
  const eventCategory = event.category_lvl_2 ?? event.category;
  const eventCategoryLabel = CATEGORY_LABELS[eventCategory as keyof typeof CATEGORY_LABELS] ?? eventCategory;
  const hasOfferPrice = event.is_free || event.price_from !== null || event.price_to !== null;
  const eventStart = event.time_start ? `${event.date_start}T${event.time_start}` : event.date_start;
  const eventEnd = event.date_end
    ? event.time_end
      ? `${event.date_end}T${event.time_end}`
      : event.date_end
    : undefined;
  const addressLabel = [event.street, event.city].filter(Boolean).join(", ");

  const breadcrumbSchema = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Strona glowna", item: SITE_URL },
      { "@type": "ListItem", position: 2, name: "Wydarzenia", item: `${SITE_URL}/wydarzenia` },
      { "@type": "ListItem", position: 3, name: event.title, item: eventUrl },
    ],
  };

  const eventSchema = {
    "@context": "https://schema.org",
    "@type": "Event",
    name: event.title,
    description: event.description_short,
    url: eventUrl,
    image: event.image_url ? [event.image_url] : [`${SITE_URL}/og-image.svg`],
    startDate: eventStart,
    endDate: eventEnd,
    eventStatus: "https://schema.org/EventScheduled",
    eventAttendanceMode: "https://schema.org/OfflineEventAttendanceMode",
    location: {
      "@type": "Place",
      name: addressLabel || event.city || "Krakow",
      address: {
        "@type": "PostalAddress",
        streetAddress: event.street || undefined,
        addressLocality: event.city || "Krakow",
        addressCountry: "PL",
      },
      geo: event.lat !== null && event.lng !== null
        ? { "@type": "GeoCoordinates", latitude: event.lat, longitude: event.lng }
        : undefined,
    },
    organizer: event.organizer
      ? { "@type": "Organization", name: event.organizer }
      : { "@type": "Organization", name: "NieSiedzWDomu", url: SITE_URL },
    offers: hasOfferPrice
      ? {
          "@type": "Offer",
          url: event.source_url || eventUrl,
          priceCurrency: "PLN",
          availability: "https://schema.org/InStock",
          price: event.is_free ? 0 : event.price_from ?? event.price_to,
          validFrom: event.created_at,
        }
      : undefined,
    keywords: [eventCategoryLabel, event.district, "wydarzenia dla dzieci", "Krakow"].join(", "),
    audience: event.age_min !== null || event.age_max !== null
      ? { "@type": "PeopleAudience", suggestedMinAge: event.age_min ?? undefined, suggestedMaxAge: event.age_max ?? undefined }
      : undefined,
    isAccessibleForFree: event.is_free,
    inLanguage: "pl-PL",
    areaServed: { "@type": "City", name: "Krakow" },
  };

  return (
    <div className="container-page py-5 lg:py-8">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(eventSchema) }} />

      {/* Tytuł + short desc — nad gridem */}
      <div className="mb-5">
        <div className="flex items-center gap-1.5 mb-2 text-[11px] uppercase tracking-wider font-medium">
          <Link href="/wydarzenia" className="inline-flex items-center gap-1 text-muted hover:text-primary transition-colors duration-200">
            <ArrowLeft size={11} /> Wydarzenia
          </Link>
          <span className="text-muted-foreground/30">·</span>
          <span className="text-primary">Wydarzenie</span>
          <span className="text-muted-foreground/30">·</span>
          <span className="text-muted-foreground">{eventCategoryLabel}</span>
          <span className="text-muted-foreground/30">·</span>
          <span className="text-muted-foreground">{event.district}</span>
        </div>
        <h1 className="text-xl lg:text-2xl font-bold text-foreground leading-tight tracking-[-0.02em] mb-2">
          {event.title}
        </h1>
        {event.description_short && (
          <p className="text-[14px] text-muted leading-relaxed max-w-2xl">{event.description_short}</p>
        )}
      </div>

      {/* Outer grid: content | panel */}
      <div className="grid lg:grid-cols-[1fr_360px] gap-5 lg:gap-6 items-start">

        {/* Lewa strona: image (lewo) + AI link i long desc (środek) */}
        <div className="grid lg:grid-cols-[288px_1fr] gap-5 items-start">
          {event.image_url && (
            <div className="relative rounded-xl overflow-hidden bg-accent min-h-[337px]">
              <img src={event.image_url} alt={event.title} className="absolute inset-0 w-full h-full object-cover" />
              <FeedbackButtons
                contentType="event"
                itemId={event.id}
                initialLikes={event.likes}
                initialDislikes={event.dislikes}
                showLabel={false}
                className="absolute bottom-3 right-3 z-10"
              />
            </div>
          )}
          <div className="space-y-3">
            <AiLearnMoreLink
              queryParts={[
                event.title,
                "Kraków",
                `${eventCategoryLabel} wydarzenie dla dzieci`,
                "najważniejsze informacje",
                "dla kogo",
                "cennik",
                "praktyczne wskazówki",
              ]}
            />
            {event.description_long && event.description_long.split("\n").filter(p => p.trim()).map((p, i) => (
              <p key={i} className="text-[13px] text-foreground/80 leading-relaxed mb-2 last:mb-0">{p}</p>
            ))}
          </div>
        </div>

        {/* Prawa kolumna: info card — sticky na desktop */}
        <div className="lg:sticky lg:top-20 self-start">
          <div className="rounded-xl border border-border bg-card shadow-[var(--shadow-card)] overflow-hidden">
            <div className="px-4 py-4 space-y-3">

              <div className="flex items-center gap-2.5">
                <Calendar size={14} className="text-secondary/60 shrink-0" />
                <div>
                  <p className="text-[10px] text-muted uppercase tracking-wider leading-none mb-0.5">Termin</p>
                  <p className="text-[13px] font-medium text-foreground">
                    {formatDate(event.date_start)}
                    {event.date_end && event.date_end !== event.date_start && ` – ${formatDate(event.date_end)}`}
                  </p>
                </div>
              </div>

              {event.time_start && (
                <div className="flex items-center gap-2.5">
                  <Clock size={14} className="text-secondary/60 shrink-0" />
                  <div>
                    <p className="text-[10px] text-muted uppercase tracking-wider leading-none mb-0.5">Godzina</p>
                    <p className="text-[13px] font-medium text-foreground">
                      {event.time_start}{event.time_end && ` – ${event.time_end}`}
                    </p>
                  </div>
                </div>
              )}

              {addressLabel && (
                <a
                  href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(addressLabel)}`}
                  target="_blank"
                  rel="noopener"
                  className="flex items-start gap-2.5 group"
                >
                  <MapPin size={14} className="text-secondary/60 group-hover:text-primary shrink-0 mt-0.5 transition-colors" />
                  <div>
                    <p className="text-[10px] text-muted uppercase tracking-wider leading-none mb-0.5">Adres</p>
                    <p className="text-[13px] font-medium text-foreground group-hover:text-primary transition-colors">{addressLabel}</p>
                  </div>
                </a>
              )}

              <div className="flex items-center gap-2.5">
                <Users size={14} className="text-secondary/60 shrink-0" />
                <div>
                  <p className="text-[10px] text-muted uppercase tracking-wider leading-none mb-0.5">Wiek</p>
                  <p className="text-[13px] font-medium text-foreground">{formatAgeRange(event.age_min, event.age_max)}</p>
                </div>
              </div>

              {event.organizer && (
                <div className="flex items-center gap-2.5">
                  <Globe size={14} className="text-secondary/60 shrink-0" />
                  <div>
                    <p className="text-[10px] text-muted uppercase tracking-wider leading-none mb-0.5">Organizator</p>
                    <p className="text-[13px] font-medium text-foreground">{event.organizer}</p>
                  </div>
                </div>
              )}

              {(event.is_free || event.price_from !== null || event.price_to !== null) && (
                <div className="flex items-center gap-2.5">
                  <Globe size={14} className="text-secondary/60 shrink-0" />
                  <div>
                    <p className="text-[10px] text-muted uppercase tracking-wider leading-none mb-0.5">Cena</p>
                    <p className="text-[13px] font-medium text-foreground">{formatPriceRange(event.price_from, event.price_to, event.is_free)}</p>
                  </div>
                </div>
              )}
            </div>

            {event.source_url && (
              <div className="px-4 py-3 border-t border-border">
                <a
                  href={event.source_url}
                  target="_blank"
                  rel="noopener"
                  className="flex items-center gap-2 text-[13px] text-foreground hover:text-primary transition-colors group"
                >
                  <Globe size={13} className="text-secondary/60 group-hover:text-primary shrink-0" />
                  <span className="font-medium">Strona organizatora</span>
                  <ExternalLink size={11} className="text-muted shrink-0 ml-auto" />
                </a>
              </div>
            )}

          </div>
        </div>
      </div>

      {related.length > 0 && (
        <section className="mt-12 pt-8 border-t border-border">
          <h2 className="text-[15px] font-semibold text-foreground mb-4">Podobne wydarzenia</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {related.map((e) => <ContentCard key={e.id} item={e} />)}
          </div>
        </section>
      )}
    </div>
  );
}
