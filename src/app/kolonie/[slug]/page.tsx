import { notFound } from "next/navigation";
import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, Calendar, ExternalLink, MapPin, Users, ThumbsUp } from "lucide-react";
import { CAMP_TYPE_LABELS } from "@/lib/mock-data";
import { formatAgeRange, formatDate, formatPrice } from "@/lib/utils";
import { AiLearnMoreLink } from "@/components/ui/ai-learn-more-link";
import { getCampBySlug } from "@/lib/data";

export const revalidate = 60;

interface PageProps { params: Promise<{ slug: string }>; }

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
  };
}

export default async function CampDetailPage({ params }: PageProps) {
  const { slug } = await params;
  const camp = await getCampBySlug(slug);
  if (!camp) notFound();

  return (
    <div className="container-page py-8">
      <Link href="/kolonie" className="inline-flex items-center gap-1.5 text-[13px] text-muted hover:text-primary transition-colors duration-200 mb-8">
        <ArrowLeft size={13} /> Kolonie
      </Link>

      <div className="grid lg:grid-cols-3 gap-10">
        <div className="lg:col-span-2">
          {camp.image_url && (
            <div className="relative rounded-xl overflow-hidden mb-4 aspect-[15/8] bg-accent">
              <img src={camp.image_url} alt={camp.title} className="w-full h-full object-cover" />
              <span className="absolute bottom-3 right-3 inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1.5 text-[11px] font-semibold text-foreground shadow-[var(--shadow-soft)] border border-border/70">
                <ThumbsUp size={13} className="text-primary" />
                {camp.likes}
              </span>
            </div>
          )}

          <div className="mb-8">
            <AiLearnMoreLink
              title={camp.title}
              topicHint={`${CAMP_TYPE_LABELS[camp.camp_type]} dla dzieci`}
            />
          </div>

          <div className="flex items-center gap-1.5 mb-3 text-[11px] uppercase tracking-wider font-medium">
            <span className="text-primary">Kolonia</span>
            <span className="text-muted-foreground/30">-</span>
            <span className="text-muted-foreground">{CAMP_TYPE_LABELS[camp.camp_type]}</span>
            <span className="text-muted-foreground/30">-</span>
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
            <div className="rounded-xl border border-border bg-card p-5 space-y-4 shadow-[var(--shadow-card)]">
              <div className="space-y-3 text-[13px]">
                <div className="flex items-start gap-2.5">
                  <Calendar size={15} className="text-secondary/60 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium text-foreground">{formatDate(camp.date_start)} - {formatDate(camp.date_end)}</p>
                    <p className="text-muted">{camp.duration_days} dni</p>
                  </div>
                </div>
                <div className="flex items-start gap-2.5">
                  <MapPin size={15} className="text-secondary/60 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium text-foreground">{camp.venue_name}</p>
                    <p className="text-muted">{camp.venue_address}</p>
                  </div>
                </div>
                <div className="flex items-start gap-2.5">
                  <Users size={15} className="text-secondary/60 shrink-0 mt-0.5" />
                  <p className="font-medium text-foreground">{formatAgeRange(camp.age_min, camp.age_max)}</p>
                </div>
                <p className="text-[14px] font-semibold text-foreground">Cena: {formatPrice(camp.price)}</p>
              </div>

              {camp.source_url && (
                <a
                  href={camp.source_url}
                  target="_blank"
                  rel="noopener"
                  className="flex items-center justify-center gap-2 w-full px-4 py-2.5 bg-primary text-primary-foreground rounded-xl text-[13px] font-medium hover:bg-primary-hover transition-colors duration-200"
                >
                  <ExternalLink size={13} /> Strona organizatora
                </a>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
