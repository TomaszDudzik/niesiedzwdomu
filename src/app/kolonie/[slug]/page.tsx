import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Calendar, MapPin, Users, ExternalLink, Utensils, Bus } from "lucide-react";
import { mockCamps, CAMP_TYPE_LABELS, CAMP_SEASON_LABELS } from "@/lib/mock-data";
import { formatPrice, formatAgeRange, formatDateShort } from "@/lib/utils";
import { FeedbackButtons } from "@/components/ui/feedback-buttons";
import { ContentCard } from "@/components/ui/content-card";

interface PageProps { params: Promise<{ slug: string }>; }
export function generateStaticParams() { return mockCamps.map((c) => ({ slug: c.slug })); }

export default async function CampDetailPage({ params }: PageProps) {
  const { slug } = await params;
  const camp = mockCamps.find((c) => c.slug === slug);
  if (!camp) notFound();
  const related = mockCamps.filter((c) => c.id !== camp.id && c.status === "published").slice(0, 3);

  return (
    <div className="container-page py-8">
      <Link href="/kolonie" className="inline-flex items-center gap-1.5 text-[13px] text-muted hover:text-foreground transition-colors mb-8">
        <ArrowLeft size={13} /> Kolonie
      </Link>
      <div className="grid lg:grid-cols-3 gap-10">
        <div className="lg:col-span-2">
          {camp.image_url && (<div className="rounded-lg overflow-hidden mb-8 aspect-[16/9] bg-[#FAFAFA]"><img src={camp.image_url} alt={camp.title} className="w-full h-full object-cover" /></div>)}
          <div className="flex items-center gap-1.5 mb-3 text-[11px] text-muted-foreground uppercase tracking-wider font-medium">
            <span>{CAMP_TYPE_LABELS[camp.camp_type]}</span><span className="opacity-40">·</span><span>{CAMP_SEASON_LABELS[camp.season]}</span><span className="opacity-40">·</span><span>{camp.duration_days} dni</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-bold text-foreground leading-tight tracking-[-0.02em] mb-3">{camp.title}</h1>
          <p className="text-[15px] text-muted leading-relaxed mb-8">{camp.description_short}</p>
          <div className="space-y-4">{camp.description_long.split("\n").map((p, i) => (<p key={i} className="text-[15px] text-foreground/80 leading-relaxed">{p}</p>))}</div>
          <div className="mt-10 pt-8 border-t border-border"><FeedbackButtons eventId={camp.id} initialLikes={camp.likes} initialDislikes={camp.dislikes} /></div>
        </div>
        <div className="lg:col-span-1">
          <div className="sticky top-20 space-y-5">
            <div className="rounded-lg border border-border p-5 space-y-4">
              <span className="text-xl font-semibold text-foreground">{formatPrice(camp.price)}</span>
              <div className="space-y-3 text-[13px]">
                <div className="flex items-start gap-2.5"><Calendar size={15} className="text-muted-foreground/50 shrink-0 mt-0.5" /><div><p className="font-medium text-foreground">{formatDateShort(camp.date_start)} – {formatDateShort(camp.date_end)}</p><p className="text-muted">{camp.duration_days} dni</p></div></div>
                <div className="flex items-start gap-2.5"><MapPin size={15} className="text-muted-foreground/50 shrink-0 mt-0.5" /><div><p className="font-medium text-foreground">{camp.venue_name}</p><p className="text-muted">{camp.venue_address}</p></div></div>
                <div className="flex items-start gap-2.5"><Users size={15} className="text-muted-foreground/50 shrink-0 mt-0.5" /><p className="font-medium text-foreground">{formatAgeRange(camp.age_min, camp.age_max)}</p></div>
                {camp.meals_included && (<div className="flex items-start gap-2.5"><Utensils size={15} className="text-muted-foreground/50 shrink-0 mt-0.5" /><p className="font-medium text-foreground">Wyżywienie w cenie</p></div>)}
                {camp.transport_included && (<div className="flex items-start gap-2.5"><Bus size={15} className="text-muted-foreground/50 shrink-0 mt-0.5" /><p className="font-medium text-foreground">Transport w cenie</p></div>)}
              </div>
              {camp.source_url && (<a href={camp.source_url} target="_blank" rel="noopener noreferrer" className="flex items-center justify-center gap-2 w-full px-4 py-2 bg-foreground text-white rounded-md text-[13px] font-medium hover:bg-[#333] transition-colors"><ExternalLink size={13} /> Strona organizatora</a>)}
              <p className="text-[12px] text-muted text-center">{camp.organizer}</p>
            </div>
          </div>
        </div>
      </div>
      {related.length > 0 && (<section className="mt-16 pt-10 border-t border-border"><h2 className="text-[15px] font-semibold text-foreground mb-5">Inne kolonie</h2><div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">{related.map((c) => <ContentCard key={c.id} item={c} />)}</div></section>)}
    </div>
  );
}
