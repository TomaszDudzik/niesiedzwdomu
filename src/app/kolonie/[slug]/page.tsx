import { notFound } from "next/navigation";
import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, Calendar, ExternalLink, Globe, MapPin, Users } from "lucide-react";
import { CAMP_SEASON_LABELS, CAMP_TYPE_ICONS, CAMP_TYPE_LABELS } from "@/lib/mock-data";
import { formatAgeRange, formatDate, formatPrice } from "@/lib/utils";
import { AiLearnMoreLink } from "@/components/ui/ai-learn-more-link";
import { FeedbackButtons } from "@/components/ui/feedback-buttons";
import { getCampBySlug } from "@/lib/data";

export const revalidate = 60;

interface PageProps { params: Promise<{ slug: string }>; }

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://www.niesiedzwdomu.pl";

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const camp = await getCampBySlug(slug);

  if (!camp) {
    return {
      title: "Kolonia nie znaleziona | NieSiedzWDomu",
      robots: { index: false, follow: false },
    };
  }

  return {
    title: `${camp.title} | Kolonie i Polkolonie Krakow`,
    description: camp.description_short,
    alternates: {
      canonical: `/kolonie/${camp.slug}`,
    },
    openGraph: {
      title: camp.title,
      description: camp.description_short,
      url: `${SITE_URL}/kolonie/${camp.slug}`,
      type: "article",
      locale: "pl_PL",
      images: camp.image_url
        ? [{ url: camp.image_url, alt: camp.title }]
        : [{ url: "/og-image.svg", alt: "NieSiedzWDomu" }],
    },
    twitter: {
      card: "summary_large_image",
      title: camp.title,
      description: camp.description_short,
      images: camp.image_url ? [camp.image_url] : ["/og-image.svg"],
    },
  };
}

export default async function CampDetailPage({ params }: PageProps) {
  const { slug } = await params;
  const camp = await getCampBySlug(slug);
  if (!camp) notFound();

  const campUrl = `${SITE_URL}/kolonie/${camp.slug}`;
  const breadcrumbSchema = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Strona glowna", item: SITE_URL },
      { "@type": "ListItem", position: 2, name: "Kolonie", item: `${SITE_URL}/kolonie` },
      { "@type": "ListItem", position: 3, name: camp.title, item: campUrl },
    ],
  };
  const campSchema = {
    "@context": "https://schema.org",
    "@type": "Event",
    name: camp.title,
    description: camp.description_short,
    url: campUrl,
    image: camp.image_url ? [camp.image_url] : [`${SITE_URL}/og-image.svg`],
    startDate: camp.date_start,
    endDate: camp.date_end,
    eventStatus: "https://schema.org/EventScheduled",
    eventAttendanceMode: "https://schema.org/OfflineEventAttendanceMode",
    location: {
      "@type": "Place",
      name: camp.venue_name || "Krakow",
      address: {
        "@type": "PostalAddress",
        streetAddress: camp.venue_address || undefined,
        addressLocality: "Krakow",
        addressCountry: "PL",
      },
    },
    organizer: camp.organizer
      ? { "@type": "Organization", name: camp.organizer }
      : { "@type": "Organization", name: "NieSiedzWDomu", url: SITE_URL },
    offers: camp.is_free || camp.price !== null
      ? {
          "@type": "Offer",
          url: camp.source_url || campUrl,
          priceCurrency: "PLN",
          availability: "https://schema.org/InStock",
          price: camp.is_free ? 0 : camp.price,
          validFrom: camp.created_at,
        }
      : undefined,
    keywords: [CAMP_TYPE_LABELS[camp.camp_type], camp.district, CAMP_SEASON_LABELS[camp.season], "kolonie dla dzieci", "Krakow"].join(", "),
    audience:
      camp.age_min !== null || camp.age_max !== null
        ? {
            "@type": "PeopleAudience",
            suggestedMinAge: camp.age_min ?? undefined,
            suggestedMaxAge: camp.age_max ?? undefined,
          }
        : undefined,
    isAccessibleForFree: camp.is_free,
    inLanguage: "pl-PL",
    areaServed: { "@type": "City", name: "Krakow" },
  };

  return (
    <div className="container-page py-8">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(campSchema) }} />

      <Link href="/kolonie" className="inline-flex items-center gap-1.5 text-[13px] text-muted hover:text-primary transition-colors duration-200 mb-8">
        <ArrowLeft size={13} /> Kolonie
      </Link>

      <div className="grid lg:grid-cols-3 gap-10">
        <div className="lg:col-span-2">
          {camp.image_url && (
            <div className="relative rounded-xl overflow-hidden mb-4 aspect-[15/8] bg-accent">
              <img src={camp.image_url} alt={camp.title} className="w-full h-full object-cover" />
              <FeedbackButtons
                contentType="camp"
                itemId={camp.id}
                initialLikes={camp.likes}
                initialDislikes={camp.dislikes}
                showLabel={false}
                className="absolute bottom-3 right-3 z-10"
              />
            </div>
          )}

          <div className="mb-8">
            <AiLearnMoreLink
              title={camp.title}
              topicHint={`${CAMP_TYPE_LABELS[camp.camp_type]} dla dzieci`}
            />
          </div>

          <div className="flex items-center gap-1.5 mb-3 text-[11px] uppercase tracking-wider font-medium">
            <span className="text-lg mr-0.5">{CAMP_TYPE_ICONS[camp.camp_type] || "🏕️"}</span>
            <span className="text-primary">{CAMP_TYPE_LABELS[camp.camp_type]}</span>
            <span className="text-muted-foreground/30">·</span>
            <span className="text-muted-foreground">{CAMP_SEASON_LABELS[camp.season]}</span>
            <span className="text-muted-foreground/30">·</span>
            <span className="text-muted-foreground">{CAMP_TYPE_LABELS[camp.camp_type]}</span>
            <span className="text-muted-foreground/30">·</span>
            <span className="text-muted-foreground">{camp.district}</span>
          </div>

          <h1 className="text-2xl md:text-3xl font-bold text-foreground leading-tight tracking-[-0.02em] mb-3">{camp.title}</h1>
          <p className="text-[15px] text-muted leading-relaxed mb-8">{camp.description_short}</p>

          {camp.description_long && (
            <div className="space-y-4">
              {camp.description_long.split("\n").map((p, i) => (
                <p key={i} className="text-[15px] text-foreground/80 leading-relaxed">{p}</p>
              ))}
            </div>
          )}
        </div>

        <div className="lg:col-span-1">
          <div className="sticky top-20 space-y-5">
            <div className="rounded-xl border border-border bg-card shadow-[var(--shadow-card)] overflow-hidden">
              <div className="px-5 pt-5 pb-4 border-b border-border">
                <h2 className="text-[15px] font-bold text-foreground leading-snug">{camp.title}</h2>
                <p className="text-[11px] text-muted mt-1 uppercase tracking-wider font-medium">
                  {CAMP_TYPE_LABELS[camp.camp_type]} · {camp.district}
                </p>
              </div>

              <div className="px-5 py-4 space-y-3.5 text-[13px]">
                <div className="flex items-start gap-2.5">
                  <Calendar size={15} className="text-secondary/60 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-[11px] text-muted uppercase tracking-wider mb-0.5">Termin</p>
                    <p className="font-medium text-foreground">{formatDate(camp.date_start)}{camp.date_end ? ` - ${formatDate(camp.date_end)}` : ""}</p>
                    <p className="text-muted">{camp.duration_days} dni · {CAMP_SEASON_LABELS[camp.season]}</p>
                  </div>
                </div>
                <div className="flex items-start gap-2.5">
                  <MapPin size={15} className="text-secondary/60 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-[11px] text-muted uppercase tracking-wider mb-0.5">Miejsce</p>
                    <p className="font-medium text-foreground">{camp.venue_name}</p>
                    <p className="text-muted">{camp.venue_address}</p>
                  </div>
                </div>
                <div className="flex items-start gap-2.5">
                  <Users size={15} className="text-secondary/60 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-[11px] text-muted uppercase tracking-wider mb-0.5">Wiek</p>
                    <p className="font-medium text-foreground">{formatAgeRange(camp.age_min, camp.age_max)}</p>
                  </div>
                </div>
                <div className="flex items-start gap-2.5">
                  <Calendar size={15} className="text-secondary/60 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-[11px] text-muted uppercase tracking-wider mb-0.5">Cena</p>
                    <p className="font-medium text-foreground">{formatPrice(camp.price)}</p>
                    <p className="text-muted">
                      {camp.meals_included ? "Wyżywienie w cenie" : "Bez wyżywienia"}
                      {camp.transport_included ? " · transport w cenie" : " · bez transportu"}
                    </p>
                  </div>
                </div>
              </div>

              {(camp.source_url || camp.organizer || camp.facebook_url) && (
                <div className="px-5 py-4 border-t border-border space-y-2.5">
                  {camp.source_url && (
                    <a
                      href={camp.source_url}
                      target="_blank"
                      rel="noopener"
                      className="flex items-center gap-2.5 text-[13px] text-foreground hover:text-primary transition-colors duration-200 group"
                    >
                      <Globe size={15} className="text-secondary/60 group-hover:text-primary shrink-0" />
                      <span className="font-medium truncate">Strona organizatora</span>
                      <ExternalLink size={11} className="text-muted shrink-0 ml-auto" />
                    </a>
                  )}
                  {camp.facebook_url && (
                    <a
                      href={camp.facebook_url}
                      target="_blank"
                      rel="noopener"
                      className="flex items-center gap-2.5 text-[13px] text-foreground hover:text-primary transition-colors duration-200 group"
                    >
                      <Globe size={15} className="text-secondary/60 group-hover:text-primary shrink-0" />
                      <span className="font-medium truncate">Facebook</span>
                      <ExternalLink size={11} className="text-muted shrink-0 ml-auto" />
                    </a>
                  )}
                  {camp.organizer && (
                    <p className="text-[12px] text-muted">Organizator: {camp.organizer}</p>
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
