import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, MapPin, ExternalLink, Home } from "lucide-react";
import { PLACE_TYPE_LABELS, PLACE_TYPE_ICONS } from "@/lib/mock-data";
import { FeedbackButtons } from "@/components/ui/feedback-buttons";
import { getPlaceBySlug } from "@/lib/data";

export const revalidate = 60;

interface PageProps { params: Promise<{ slug: string }>; }

export default async function PlaceDetailPage({ params }: PageProps) {
  const { slug } = await params;
  const place = await getPlaceBySlug(slug);
  if (!place) notFound();

  return (
    <div className="container-page py-8">
      <Link href="/miejsca" className="inline-flex items-center gap-1.5 text-[13px] text-muted hover:text-primary transition-colors duration-200 mb-8">
        <ArrowLeft size={13} /> Miejsca
      </Link>

      <div className="grid lg:grid-cols-3 gap-10">
        <div className="lg:col-span-2">
          {place.image_url && (
            <div className="rounded-xl overflow-hidden mb-8 aspect-[3/2] bg-accent">
              <img src={place.image_url} alt={place.title} className="w-full h-full object-cover" />
            </div>
          )}

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

          <div className="mt-10 pt-8 border-t border-border">
            <FeedbackButtons eventId={place.id} initialLikes={place.likes} initialDislikes={place.dislikes} />
          </div>
        </div>

        <div className="lg:col-span-1">
          <div className="sticky top-20 space-y-5">
            <div className="rounded-xl border border-border bg-card p-5 space-y-4 shadow-[var(--shadow-card)]">
              <div className="space-y-3 text-[13px]">
                {place.address && (
                  <div className="flex items-start gap-2.5">
                    <MapPin size={15} className="text-secondary/60 shrink-0 mt-0.5" />
                    <p className="font-medium text-foreground">{place.address}</p>
                  </div>
                )}
                <div className="flex items-start gap-2.5">
                  <Home size={15} className="text-secondary/60 shrink-0 mt-0.5" />
                  <p className="font-medium text-foreground">{place.is_indoor ? "Wewnątrz" : "Na zewnątrz"}</p>
                </div>
              </div>
              {place.source_url && (
                <a href={place.source_url} target="_blank" rel="noopener"
                  className="flex items-center justify-center gap-2 w-full px-4 py-2.5 bg-primary text-primary-foreground rounded-xl text-[13px] font-medium hover:bg-primary-hover transition-colors duration-200 shadow-[var(--shadow-soft)]">
                  <ExternalLink size={13} /> Odwiedź stronę
                </a>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
