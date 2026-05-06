import { notFound } from "next/navigation";
import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, Clock, MapPin, Users, ExternalLink, Globe, Facebook } from "lucide-react";
import { formatAgeRange, formatHourMinuteRange, formatPriceRange } from "@/lib/utils";
import { ContentCard } from "@/components/ui/content-card";
import { AiLearnMoreLink } from "@/components/ui/ai-learn-more-link";
import { getActivityBySlug, getRelatedActivities } from "@/lib/data";

export const revalidate = 60;

interface PageProps { params: Promise<{ slug: string }>; }

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://www.niesiedzwdomu.pl";

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const activity = await getActivityBySlug(slug);

  if (!activity) {
    return {
      title: "Zajęcia nie znalezione | NieSiedzWDomu",
      robots: { index: false, follow: false },
    };
  }

  const description = activity.description_short || `Sprawdź szczegóły zajęć ${activity.title} w Krakowie.`;
  const url = `${SITE_URL}/zajecia/${activity.slug}`;

  return {
    title: `${activity.title} | Zajęcia dla dzieci Kraków`,
    description,
    alternates: {
      canonical: `/zajecia/${activity.slug}`,
    },
    openGraph: {
      title: activity.title,
      description,
      url,
      type: "article",
      locale: "pl_PL",
      images: activity.image_url
        ? [{ url: activity.image_url, alt: activity.title }]
        : [{ url: "/og-image.svg", alt: "NieSiedzWDomu" }],
    },
    twitter: {
      card: "summary_large_image",
      title: activity.title,
      description,
      images: activity.image_url ? [activity.image_url] : ["/og-image.svg"],
    },
  };
}

export default async function ActivityDetailPage({ params }: PageProps) {
  const { slug } = await params;
  const activity = await getActivityBySlug(slug);
  if (!activity) notFound();

  const related = await getRelatedActivities(activity, 3);
  const activityUrl = `${SITE_URL}/zajecia/${activity.slug}`;
  const addressLabel = [activity.street, activity.city].filter(Boolean).join(", ");
  const hasOfferPrice = activity.is_free || activity.price_from !== null || activity.price_to !== null;

  const listOfActivities = activity.list_of_activities
    ? activity.list_of_activities.split(";").map((s) => s.trim()).filter(Boolean)
    : [];

  const breadcrumbSchema = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Strona główna", item: SITE_URL },
      { "@type": "ListItem", position: 2, name: "Zajęcia", item: `${SITE_URL}/zajecia` },
      { "@type": "ListItem", position: 3, name: activity.title, item: activityUrl },
    ],
  };

  const serviceSchema = {
    "@context": "https://schema.org",
    "@type": "Service",
    name: activity.title,
    description: activity.description_short,
    url: activityUrl,
    image: activity.image_url ? [activity.image_url] : [`${SITE_URL}/og-image.svg`],
    provider: activity.organizer
      ? { "@type": "Organization", name: activity.organizer }
      : { "@type": "Organization", name: "NieSiedzWDomu", url: SITE_URL },
    areaServed: { "@type": "City", name: "Kraków" },
    audience: activity.age_min !== null || activity.age_max !== null
      ? { "@type": "PeopleAudience", suggestedMinAge: activity.age_min ?? undefined, suggestedMaxAge: activity.age_max ?? undefined }
      : undefined,
    offers: hasOfferPrice
      ? {
          "@type": "Offer",
          url: activity.source_url || activityUrl,
          priceCurrency: "PLN",
          availability: "https://schema.org/InStock",
          price: activity.is_free ? 0 : activity.price_from ?? activity.price_to,
        }
      : undefined,
    inLanguage: "pl-PL",
  };

  return (
    <div className="container-page py-5 lg:py-8">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(serviceSchema) }} />

      {/* Breadcrumb + title */}
      <div className="mb-5">
        <div className="flex items-center gap-1.5 mb-2 text-[11px] uppercase tracking-wider font-medium">
          <Link href="/zajecia" className="inline-flex items-center gap-1 text-muted hover:text-primary transition-colors duration-200">
            <ArrowLeft size={11} /> Zajęcia
          </Link>
          {activity.category_lvl_1 && (
            <>
              <span className="text-muted-foreground/30">·</span>
              <span className="text-muted-foreground">{activity.category_lvl_1}</span>
            </>
          )}
          {activity.district && (
            <>
              <span className="text-muted-foreground/40">|</span>
              <span className="text-muted-foreground">{activity.district}</span>
            </>
          )}
        </div>
        <h1 className="text-xl lg:text-2xl font-bold text-foreground leading-tight tracking-[-0.02em] mb-2">
          {activity.title}
        </h1>
        {activity.description_short && (
          <p className="text-[14px] text-muted leading-relaxed">{activity.description_short}</p>
        )}
        {listOfActivities.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-3">
            {listOfActivities.map((item, i) => {
              const colors = [
                "bg-red-50 text-red-700 border-red-200",
                "bg-orange-50 text-orange-700 border-orange-200",
                "bg-amber-50 text-amber-700 border-amber-200",
                "bg-emerald-50 text-emerald-700 border-emerald-200",
                "bg-sky-50 text-sky-700 border-sky-200",
                "bg-violet-50 text-violet-700 border-violet-200",
                "bg-pink-50 text-pink-700 border-pink-200",
              ];
              return (
                <span key={item} className={`inline-flex items-center rounded-md border px-2 py-0.5 text-[11px] font-medium ${colors[i % colors.length]}`}>
                  {item}
                </span>
              );
            })}
          </div>
        )}
      </div>

      {/* Main content card */}
      <div className="rounded-[28px] bg-white px-4 py-5 sm:px-6 sm:py-6 lg:px-8 lg:py-8 mb-8">
        <div className="grid lg:grid-cols-[476px_1fr_360px] gap-6 lg:gap-8 items-start">
          {activity.image_url && (
            <div className="relative rounded-xl overflow-hidden bg-accent w-full" style={{ minHeight: "448px" }}>
              <img src={activity.image_url} alt={activity.title} className="absolute inset-0 w-full h-full object-cover" />
            </div>
          )}

          <div className="space-y-3">
            <div className="rounded-xl border border-border/70 bg-white/80 p-4 shadow-sm">
              <p className="text-[13px] text-foreground leading-relaxed font-bold">{activity.organizer || "Zajęcia"}:</p>
              <p className="mt-1 text-[13px] text-foreground/80 leading-relaxed">
                {activity.title}
                {activity.description_short ? ` – ${activity.description_short}` : ""}
              </p>
              {activity.description_long && (
                <div className="mt-3">
                  <p className="text-[13px] text-foreground/90 leading-relaxed font-bold">Opis:</p>
                  <div className="mt-1 space-y-2">
                    {activity.description_long.split("\n").filter((p) => p.trim()).map((p, i) => (
                      <p key={i} className="text-[13px] text-foreground/80 leading-relaxed">{p}</p>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <AiLearnMoreLink
              queryParts={[
                activity.title,
                "Kraków",
                "zajęcia dla dzieci",
                "najważniejsze informacje",
                "dla kogo",
                "cennik",
                "praktyczne wskazówki",
              ]}
            />
          </div>

          {/* Info sidebar */}
          <div className="lg:sticky lg:top-20 self-start">
            <div className="rounded-xl border border-border bg-card shadow-[var(--shadow-card)] overflow-hidden">
              <div className="px-4 py-4 space-y-3">

                {activity.schedule_summary && (
                  <div className="flex items-center gap-2.5">
                    <Clock size={14} className="text-secondary/60 shrink-0" />
                    <div>
                      <p className="text-[10px] text-muted uppercase tracking-wider leading-none mb-0.5">Harmonogram</p>
                      <p className="text-[13px] font-medium text-foreground">{activity.schedule_summary}</p>
                    </div>
                  </div>
                )}

                {formatHourMinuteRange(activity.time_start, activity.time_end) && (
                  <div className="flex items-center gap-2.5">
                    <Clock size={14} className="text-secondary/60 shrink-0" />
                    <div>
                      <p className="text-[10px] text-muted uppercase tracking-wider leading-none mb-0.5">Godzina</p>
                      <p className="text-[13px] font-medium text-foreground">
                        {formatHourMinuteRange(activity.time_start, activity.time_end)}
                      </p>
                    </div>
                  </div>
                )}

                {addressLabel && (
                  <a
                    href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(addressLabel)}`}
                    target="_blank"
                    rel="noopener noreferrer"
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
                    <p className="text-[13px] font-medium text-foreground">{formatAgeRange(activity.age_min, activity.age_max)}</p>
                  </div>
                </div>

                {activity.organizer && (
                  <div className="flex items-center gap-2.5">
                    <Globe size={14} className="text-secondary/60 shrink-0" />
                    <div>
                      <p className="text-[10px] text-muted uppercase tracking-wider leading-none mb-0.5">Organizator</p>
                      <p className="text-[13px] font-medium text-foreground">{activity.organizer}</p>
                    </div>
                  </div>
                )}

                {hasOfferPrice && (
                  <div className="flex items-center gap-2.5">
                    <Globe size={14} className="text-secondary/60 shrink-0" />
                    <div>
                      <p className="text-[10px] text-muted uppercase tracking-wider leading-none mb-0.5">Cena</p>
                      <p className="text-[13px] font-medium text-foreground">{formatPriceRange(activity.price_from, activity.price_to, activity.is_free)}</p>
                    </div>
                  </div>
                )}
              </div>

              {activity.source_url && (
                <div className="px-4 py-3 border-t border-border">
                  <a
                    href={activity.source_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 text-[13px] text-foreground hover:text-primary transition-colors group"
                  >
                    <Globe size={13} className="text-secondary/60 group-hover:text-primary shrink-0" />
                    <span className="font-medium">Strona organizatora</span>
                    <ExternalLink size={11} className="text-muted shrink-0 ml-auto" />
                  </a>
                </div>
              )}
              {activity.facebook_url && (
                <div className="px-4 py-3 border-t border-border">
                  <a
                    href={activity.facebook_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 text-[13px] text-foreground hover:text-[#1877F2] transition-colors group"
                  >
                    <Facebook size={13} className="text-secondary/60 group-hover:text-[#1877F2] shrink-0" />
                    <span className="font-medium">Facebook</span>
                    <ExternalLink size={11} className="text-muted shrink-0 ml-auto" />
                  </a>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {related.length > 0 && (
        <section className="mt-12 pt-8 border-t border-border">
          <h2 className="text-[15px] font-semibold text-foreground mb-4">Podobne zajęcia</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {related.map((a) => <ContentCard key={a.id} item={a} />)}
          </div>
        </section>
      )}
    </div>
  );
}
