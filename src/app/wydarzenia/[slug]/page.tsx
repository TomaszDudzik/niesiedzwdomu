import { notFound } from "next/navigation";
import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, Calendar, Clock, MapPin, Users, ExternalLink } from "lucide-react";
import { CATEGORY_LABELS } from "@/lib/mock-data";
import { formatDate, formatPrice, formatAgeRange } from "@/lib/utils";
import { FeedbackButtons } from "@/components/ui/feedback-buttons";
import { ContentCard } from "@/components/ui/content-card";
import { getEventBySlug, getRelatedEvents } from "@/lib/data";

export const revalidate = 60;

interface PageProps { params: Promise<{ slug: string }>; }

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://niesiedzwdomu.pl";

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
  const hasOfferPrice = event.is_free || event.price !== null;
  const eventStart = event.time_start ? `${event.date_start}T${event.time_start}` : event.date_start;
  const eventEnd = event.date_end
    ? event.time_end
      ? `${event.date_end}T${event.time_end}`
      : event.date_end
    : undefined;
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
        name: "Wydarzenia",
        item: `${SITE_URL}/wydarzenia`,
      },
      {
        "@type": "ListItem",
        position: 3,
        name: event.title,
        item: eventUrl,
      },
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
      name: event.venue_name || "Krakow",
      address: {
        "@type": "PostalAddress",
        streetAddress: event.venue_address || undefined,
        addressLocality: "Krakow",
        addressCountry: "PL",
      },
      geo:
        event.lat !== null && event.lng !== null
          ? {
              "@type": "GeoCoordinates",
              latitude: event.lat,
              longitude: event.lng,
            }
          : undefined,
    },
    organizer: event.organizer
      ? {
          "@type": "Organization",
          name: event.organizer,
        }
      : {
          "@type": "Organization",
          name: "NieSiedzWDomu",
          url: SITE_URL,
        },
    offers: hasOfferPrice
      ? {
          "@type": "Offer",
          url: event.source_url || eventUrl,
          priceCurrency: "PLN",
          availability: "https://schema.org/InStock",
          price: event.is_free ? 0 : event.price,
          validFrom: event.created_at,
        }
      : undefined,
    keywords: [CATEGORY_LABELS[event.category], event.district, "wydarzenia dla dzieci", "Krakow"].join(", "),
    audience:
      event.age_min !== null || event.age_max !== null
        ? {
            "@type": "PeopleAudience",
            suggestedMinAge: event.age_min ?? undefined,
            suggestedMaxAge: event.age_max ?? undefined,
          }
        : undefined,
    isAccessibleForFree: event.is_free,
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
        dangerouslySetInnerHTML={{ __html: JSON.stringify(eventSchema) }}
      />

      <Link href="/wydarzenia" className="inline-flex items-center gap-1.5 text-[13px] text-muted hover:text-primary transition-colors duration-200 mb-8">
        <ArrowLeft size={13} /> Wydarzenia
      </Link>

      <div className="grid lg:grid-cols-3 gap-10">
        <div className="lg:col-span-2">
          {event.image_url && (
            <div className="rounded-xl overflow-hidden mb-8 aspect-[15/8] bg-accent">
              <img src={event.image_url} alt={event.title} className="w-full h-full object-cover" />
            </div>
          )}

          <div className="flex items-center gap-1.5 mb-3 text-[11px] uppercase tracking-wider font-medium">
            <span className="text-primary">Wydarzenie</span>
            <span className="text-muted-foreground/30">·</span>
            <span className="text-muted-foreground">{CATEGORY_LABELS[event.category]}</span>
            <span className="text-muted-foreground/30">·</span>
            <span className="text-muted-foreground">{event.district}</span>
          </div>

          <h1 className="text-2xl md:text-3xl font-bold text-foreground leading-tight tracking-[-0.02em] mb-3">{event.title}</h1>
          <p className="text-[15px] text-muted leading-relaxed mb-8">{event.description_short}</p>

          {event.description_long && (
            <div className="space-y-4">
              {event.description_long.split("\n").map((p, i) => (
                <p key={i} className="text-[15px] text-foreground/80 leading-relaxed">{p}</p>
              ))}
            </div>
          )}

          <div className="mt-10 pt-8 border-t border-border">
            <FeedbackButtons contentType="event" itemId={event.id} initialLikes={event.likes} initialDislikes={event.dislikes} />
          </div>
        </div>

        <div className="lg:col-span-1">
          <div className="sticky top-20 space-y-5">
            <div className="rounded-xl border border-border bg-card p-5 space-y-4 shadow-[var(--shadow-card)]">
              <div className="space-y-3 text-[13px]">
                <div className="flex items-start gap-2.5">
                  <Calendar size={15} className="text-secondary/60 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium text-foreground">{formatDate(event.date_start)}</p>
                    {event.date_end && event.date_end !== event.date_start && <p className="text-muted">do {formatDate(event.date_end)}</p>}
                  </div>
                </div>
                {event.time_start && (
                  <div className="flex items-start gap-2.5">
                    <Clock size={15} className="text-secondary/60 shrink-0 mt-0.5" />
                    <p className="font-medium text-foreground">{event.time_start}{event.time_end && ` – ${event.time_end}`}</p>
                  </div>
                )}
                {event.venue_name && (
                  <div className="flex items-start gap-2.5">
                    <MapPin size={15} className="text-secondary/60 shrink-0 mt-0.5" />
                    <div><p className="font-medium text-foreground">{event.venue_name}</p><p className="text-muted">{event.venue_address}</p></div>
                  </div>
                )}
                <div className="flex items-start gap-2.5">
                  <Users size={15} className="text-secondary/60 shrink-0 mt-0.5" />
                  <p className="font-medium text-foreground">{formatAgeRange(event.age_min, event.age_max)}</p>
                </div>
              </div>
              {event.source_url && (
                <a href={event.source_url} target="_blank" rel="noopener"
                  className="flex items-center justify-center gap-2 w-full px-4 py-2.5 bg-primary text-primary-foreground rounded-xl text-[13px] font-medium hover:bg-primary-hover transition-colors duration-200 shadow-[var(--shadow-soft)]">
                  <ExternalLink size={13} /> Strona organizatora
                </a>
              )}
              {event.organizer && <p className="text-[12px] text-muted text-center">{event.organizer}</p>}
            </div>
          </div>
        </div>
      </div>

      {related.length > 0 && (
        <section className="mt-16 pt-10 border-t border-border">
          <h2 className="text-[15px] font-semibold text-foreground mb-5">Podobne wydarzenia</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {related.map((e) => <ContentCard key={e.id} item={e} />)}
          </div>
        </section>
      )}
    </div>
  );
}
