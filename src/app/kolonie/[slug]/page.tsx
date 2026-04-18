import { notFound } from "next/navigation";
import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, Banknote, Calendar, ExternalLink, Globe, MapPin, Users } from "lucide-react";
import { CAMP_CATEGORY_LABELS, CAMP_SEASON_LABELS, CAMP_MAIN_CATEGORY_ICONS, CAMP_MAIN_CATEGORY_LABELS } from "@/lib/mock-data";
import { formatAgeRange, formatDate, formatPriceRange } from "@/lib/utils";
import { AiLearnMoreLink } from "@/components/ui/ai-learn-more-link";
import { getCampBySlug, getCampSessionsByOrganizer } from "@/lib/data";

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

  const sessions = camp.organizer_id
    ? await getCampSessionsByOrganizer(camp.organizer_id, camp.organizer, camp.id)
    : [];
  const campType = camp.category_lvl_1 ?? camp.main_category;
  const campTypeLabel = CAMP_MAIN_CATEGORY_LABELS[campType as keyof typeof CAMP_MAIN_CATEGORY_LABELS] ?? campType;
  const campCategoryLabel = camp.category
    ? CAMP_CATEGORY_LABELS[camp.category as keyof typeof CAMP_CATEGORY_LABELS] ?? camp.category
    : null;

  const campUrl = `${SITE_URL}/kolonie/${camp.slug}`;
  const campAddress = [camp.street, camp.postcode, camp.city].filter(Boolean).join(", ");
  const hasOfferPrice = camp.price_from !== null || camp.price_to !== null;
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
      name: camp.title,
      address: {
        "@type": "PostalAddress",
        streetAddress: camp.street || undefined,
        postalCode: camp.postcode || undefined,
        addressLocality: camp.city || "Krakow",
        addressCountry: "PL",
      },
    },
    organizer: camp.organizer
      ? { "@type": "Organization", name: camp.organizer }
      : { "@type": "Organization", name: "NieSiedzWDomu", url: SITE_URL },
    offers: camp.is_free || hasOfferPrice
      ? {
          "@type": "Offer",
          url: camp.source_url || campUrl,
          priceCurrency: "PLN",
          availability: "https://schema.org/InStock",
          price: camp.is_free ? 0 : (camp.price_from ?? camp.price_to),
          validFrom: camp.created_at,
        }
      : undefined,
    keywords: [campTypeLabel, camp.district, CAMP_SEASON_LABELS[camp.season], "kolonie dla dzieci", "Krakow"].join(", "),
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
    <div className="container-page py-5 lg:py-8">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(campSchema) }} />

      {/* Tytuł + short desc — nad gridem */}
      <div className="mb-5">
        <div className="flex items-center gap-1.5 mb-2 text-[11px] uppercase tracking-wider font-medium">
          <Link href="/kolonie" className="inline-flex items-center gap-1 text-muted hover:text-primary transition-colors duration-200">
            <ArrowLeft size={11} /> Kolonie
          </Link>
          <span className="text-muted-foreground/30">·</span>
          <span className="text-lg mr-0.5">{CAMP_MAIN_CATEGORY_ICONS[campType] || "🏕️"}</span>
          <span className="text-primary">{campTypeLabel}</span>
          <span className="text-muted-foreground/30">·</span>
          <span className="text-muted-foreground">{CAMP_SEASON_LABELS[camp.season]}</span>
          <span className="text-muted-foreground/30">·</span>
          <span className="text-muted-foreground">{camp.district}</span>
        </div>
        <h1 className="text-xl lg:text-2xl font-bold text-foreground leading-tight tracking-[-0.02em] mb-2">
          {camp.title}
        </h1>
        {camp.description_short && (
          <p className="text-[14px] text-muted leading-relaxed max-w-2xl">{camp.description_short}</p>
        )}
      </div>

      {/* Outer grid: content | panel */}
      <div className="grid lg:grid-cols-[1fr_360px] gap-5 lg:gap-6 items-start">

        {/* Lewa strona: image (lewo) + AI link i long desc (środek) */}
        <div className="grid lg:grid-cols-[288px_1fr] gap-5 items-start">
          {camp.image_url && (
            <div className="relative rounded-xl overflow-hidden bg-accent min-h-[337px]">
              <img src={camp.image_url} alt={camp.title} className="absolute inset-0 w-full h-full object-cover" />
            </div>
          )}
          <div className="space-y-3">
            <AiLearnMoreLink
              queryParts={[
                camp.organizer,
                campTypeLabel,
                campCategoryLabel,
                camp.title,
                "Kraków",
                hasOfferPrice ? `cena ${formatPriceRange(camp.price_from, camp.price_to, camp.is_free)}` : null,
                "praktyczne informacje",
                "dla kogo",
              ]}
            />
            {camp.description_long && camp.description_long.split("\n").filter(p => p.trim()).map((p, i) => (
              <p key={i} className="text-[13px] text-foreground/80 leading-relaxed mb-2 last:mb-0">{p}</p>
            ))}
          </div>
        </div>

        {/* Prawa kolumna: info card — sticky na desktop */}
        <div className="lg:sticky lg:top-20 self-start">
          <div className="rounded-xl border border-border bg-card shadow-[var(--shadow-card)] overflow-hidden">
            <div className="px-4 py-4 space-y-3">

              <div className="flex items-start gap-2.5">
                <Calendar size={14} className="text-secondary/60 shrink-0 mt-0.5" />
                <div>
                  <p className="text-[10px] text-muted uppercase tracking-wider leading-none mb-0.5">Termin</p>
                  <p className="text-[13px] font-medium text-foreground">
                    {formatDate(camp.date_start)}{camp.date_end ? ` – ${formatDate(camp.date_end)}` : ""}
                  </p>
                </div>
              </div>

              {campAddress && (
                <a
                  href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(campAddress)}`}
                  target="_blank"
                  rel="noopener"
                  className="flex items-start gap-2.5 group"
                >
                  <MapPin size={14} className="text-secondary/60 group-hover:text-primary shrink-0 mt-0.5 transition-colors" />
                  <div>
                    <p className="text-[10px] text-muted uppercase tracking-wider leading-none mb-0.5">Adres</p>
                    <p className="text-[13px] font-medium text-foreground group-hover:text-primary transition-colors">
                      {campAddress}
                    </p>
                  </div>
                </a>
              )}

              <div className="flex items-center gap-2.5">
                <Users size={14} className="text-secondary/60 shrink-0" />
                <div>
                  <p className="text-[10px] text-muted uppercase tracking-wider leading-none mb-0.5">Wiek</p>
                  <p className="text-[13px] font-medium text-foreground">{formatAgeRange(camp.age_min, camp.age_max)}</p>
                </div>
              </div>

              <div className="flex items-start gap-2.5">
                <Banknote size={14} className="text-secondary/60 shrink-0 mt-0.5" />
                <div>
                  <p className="text-[10px] text-muted uppercase tracking-wider leading-none mb-0.5">Cena</p>
                  <p className="text-[13px] font-medium text-foreground">{formatPriceRange(camp.price_from, camp.price_to, camp.is_free)}</p>
                  <p className="text-[11px] text-muted">
                    {camp.meals_included ? "Wyżywienie w cenie" : "Bez wyżywienia"}
                    {camp.transport_included ? " · transport w cenie" : " · bez transportu"}
                  </p>
                </div>
              </div>

              {camp.organizer && (
                <div className="flex items-center gap-2.5">
                  <Globe size={14} className="text-secondary/60 shrink-0" />
                  <div>
                    <p className="text-[10px] text-muted uppercase tracking-wider leading-none mb-0.5">Organizator</p>
                    <p className="text-[13px] font-medium text-foreground">{camp.organizer}</p>
                  </div>
                </div>
              )}
            </div>

            {(camp.source_url || camp.facebook_url) && (
              <div className="px-4 py-3 border-t border-border space-y-2">
                {camp.source_url && (
                  <a href={camp.source_url} target="_blank" rel="noopener"
                    className="flex items-center gap-2 text-[13px] text-foreground hover:text-primary transition-colors group">
                    <Globe size={13} className="text-secondary/60 group-hover:text-primary shrink-0" />
                    <span className="font-medium">Strona organizatora</span>
                    <ExternalLink size={11} className="text-muted shrink-0 ml-auto" />
                  </a>
                )}
                {camp.facebook_url && (
                  <a href={camp.facebook_url} target="_blank" rel="noopener"
                    className="flex items-center gap-2 text-[13px] text-foreground hover:text-primary transition-colors group">
                    <Globe size={13} className="text-secondary/60 group-hover:text-primary shrink-0" />
                    <span className="font-medium">Facebook</span>
                    <ExternalLink size={11} className="text-muted shrink-0 ml-auto" />
                  </a>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {sessions.length > 0 && (
        <section className="mt-10 pt-8 border-t border-border">
          <h2 className="text-[15px] font-semibold text-foreground mb-4">
            Inne turnusy tego organizatora
          </h2>

          {/* Mobile: karty */}
          <div className="flex flex-col gap-2 md:hidden">
            {sessions.map((s) => (
              <div key={s.id} className="rounded-xl border border-border bg-card px-4 py-3 flex flex-col gap-1.5">
                <p className="text-[13px] font-medium text-foreground">
                  {formatDate(s.date_start)}{s.date_end && s.date_end !== s.date_start ? ` – ${formatDate(s.date_end)}` : ""}
                  {s.duration_days ? <span className="text-muted font-normal"> · {s.duration_days} dni</span> : null}
                </p>
                <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-[12px] text-muted">
                    <span>{[s.street, s.postcode, s.city].filter(Boolean).join(", ") || "—"}</span>
                    <span>{formatPriceRange(s.price_from, s.price_to, s.is_free)}</span>
                </div>
                <Link href={`/kolonie/${s.slug}`} className="text-[12px] text-primary hover:underline self-start">
                  Szczegóły →
                </Link>
              </div>
            ))}
          </div>

          {/* Desktop: tabela */}
          <div className="hidden md:block overflow-x-auto rounded-xl border border-border bg-card">
            <table className="w-full text-[13px]">
              <thead>
                <tr className="border-b border-border bg-accent/40">
                  <th className="text-left px-4 py-2.5 text-[10px] font-semibold text-muted uppercase tracking-wider">Termin</th>
                  <th className="text-left px-4 py-2.5 text-[10px] font-semibold text-muted uppercase tracking-wider">Czas trwania</th>
                  <th className="text-left px-4 py-2.5 text-[10px] font-semibold text-muted uppercase tracking-wider">Miejsce</th>
                  <th className="text-left px-4 py-2.5 text-[10px] font-semibold text-muted uppercase tracking-wider">Wiek</th>
                  <th className="text-left px-4 py-2.5 text-[10px] font-semibold text-muted uppercase tracking-wider">Cena</th>
                  <th className="px-4 py-2.5" />
                </tr>
              </thead>
              <tbody>
                {sessions.map((s) => (
                  <tr key={s.id} className="border-b border-border/60 last:border-0 hover:bg-accent/30 transition-colors">
                    <td className="px-4 py-3 font-medium text-foreground whitespace-nowrap">
                      {formatDate(s.date_start)}{s.date_end && s.date_end !== s.date_start ? ` – ${formatDate(s.date_end)}` : ""}
                    </td>
                    <td className="px-4 py-3 text-muted whitespace-nowrap">
                      {s.duration_days ? `${s.duration_days} dni` : "—"}
                    </td>
                    <td className="px-4 py-3 text-muted">
                      {[s.street, s.postcode, s.city].filter(Boolean).join(", ") || "—"}
                    </td>
                    <td className="px-4 py-3 text-muted whitespace-nowrap">
                      {formatAgeRange(s.age_min, s.age_max)}
                    </td>
                    <td className="px-4 py-3 text-muted whitespace-nowrap">
                      {formatPriceRange(s.price_from, s.price_to, s.is_free)}
                    </td>
                    <td className="px-4 py-3">
                      <Link
                        href={`/kolonie/${s.slug}`}
                        className="text-[12px] text-primary hover:underline whitespace-nowrap"
                      >
                        Szczegóły →
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  );
}
