import Link from "next/link";
import { ArrowRight, Calendar, MapPin, Sun, Tent, Users } from "lucide-react";
import { getPublishedEvents, getFeaturedEvent, getFreeEvents } from "@/lib/data";
import { FeaturedCard } from "@/components/ui/featured-card";
import { ContentCard } from "@/components/ui/content-card";

const QUICK_LINKS = [
  { href: "/wydarzenia", label: "Wydarzenia", icon: Calendar, color: "bg-primary/10 text-primary" },
  { href: "/miejsca", label: "Miejsca", icon: MapPin, color: "bg-secondary/10 text-secondary" },
  { href: "/kolonie", label: "Kolonie", icon: Tent, color: "bg-amber-500/10 text-amber-600" },
  { href: "/zajecia", label: "Zajęcia", icon: Users, color: "bg-secondary/10 text-secondary" },
];

function SectionLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link href={href} className="group inline-flex items-center gap-1 text-[13px] font-medium text-primary hover:text-primary-hover transition-colors">
      {children}
      <ArrowRight size={13} className="group-hover:translate-x-0.5 transition-transform duration-200" />
    </Link>
  );
}

export const revalidate = 60;

export default async function HomePage() {
  const [upcomingEvents, featuredItem, freeItems] = await Promise.all([
    getPublishedEvents(6),
    getFeaturedEvent(),
    getFreeEvents(3),
  ]);

  const featured = featuredItem || upcomingEvents[0] || null;

  return (
    <div>
      {/* Hero */}
      <section className="container-page pt-8 pb-8 md:pt-10 md:pb-10">
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-foreground tracking-[-0.02em] leading-tight">
              Odkryj Kraków z dzieckiem
            </h1>
            <p className="text-[14px] text-muted mt-1.5 max-w-md">
              Wydarzenia, zajęcia, kolonie i miejsca dla rodzin — wszystko w jednym miejscu.
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2.5">
          {QUICK_LINKS.map((link) => (
            <Link
              key={link.label}
              href={link.href}
              className="group inline-flex items-center gap-2.5 px-4 py-2.5 rounded-xl text-[13px] font-medium border border-border bg-card text-foreground hover:border-primary/30 hover:shadow-[var(--shadow-soft)] transition-all duration-200"
            >
              <span className={`flex items-center justify-center w-7 h-7 rounded-lg ${link.color}`}>
                <link.icon size={14} />
              </span>
              {link.label}
            </Link>
          ))}
        </div>
      </section>

      <div className="border-t border-border" />

      {featured && (
        <section className="container-page pt-12">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-[15px] font-semibold text-foreground">Polecane</h2>
          </div>
          <FeaturedCard item={featured} />
        </section>
      )}

      {upcomingEvents.length > 0 && (
        <section className="container-page mt-14">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-[15px] font-semibold text-foreground">Nadchodzące wydarzenia</h2>
            <SectionLink href="/wydarzenia">Wszystkie</SectionLink>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {upcomingEvents.slice(0, 6).map((event) => (
              <ContentCard key={event.id} item={event} />
            ))}
          </div>
        </section>
      )}

      <section className="container-page mt-14">
        <h2 className="text-[15px] font-semibold text-foreground mb-5">Już wkrótce</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {[
            { href: "/miejsca", icon: MapPin, label: "Miejsca", description: "Place zabaw, sale zabaw, kawiarnie rodzinne", accent: "text-secondary" },
            { href: "/kolonie", icon: Tent, label: "Kolonie i półkolonie", description: "Obozy, półkolonie i warsztaty wakacyjne", accent: "text-amber-600" },
            { href: "/zajecia", icon: Users, label: "Zajęcia dla dzieci", description: "Regularne zajęcia sportowe, artystyczne i edukacyjne", accent: "text-primary" },
          ].map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="group flex items-start gap-3 rounded-xl border border-border bg-card p-4 hover:border-primary/25 hover:shadow-[var(--shadow-soft)] transition-all duration-200"
            >
              <item.icon size={18} className={`${item.accent} opacity-60 mt-0.5 shrink-0`} />
              <div className="min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="text-[13px] font-medium text-foreground">{item.label}</span>
                  <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] font-medium text-amber-600 bg-amber-50 border border-amber-100 leading-none">
                    Wkrótce
                  </span>
                </div>
                <p className="text-[12px] text-muted">{item.description}</p>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {freeItems.length > 0 && (
        <section className="container-page mt-14">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-[15px] font-semibold text-foreground">Bezpłatne</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {freeItems.map((item) => (
              <ContentCard key={item.id} item={item} />
            ))}
          </div>
        </section>
      )}

      <section className="container-page mt-14">
        <h2 className="text-[15px] font-semibold text-foreground mb-5">Przewodniki</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {[
            { href: "/co-robic-z-dzieckiem-w-krakowie", label: "Odkryj Kraków z dzieckiem", description: "Wydarzenia, miejsca i pomysły" },
            { href: "/wydarzenia-dla-dzieci-krakow", label: "Wydarzenia dla dzieci", description: "Warsztaty, spektakle, atrakcje" },
            { href: "/polkolonie-krakow", label: "Półkolonie", description: "Oferty na wakacje i ferie" },
            { href: "/place-zabaw-krakow", label: "Place zabaw", description: "Najlepsze place zabaw w mieście" },
          ].map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="group flex items-center justify-between rounded-xl border border-border bg-card px-4 py-3.5 hover:border-primary/25 hover:shadow-[var(--shadow-soft)] transition-all duration-200"
            >
              <div className="min-w-0">
                <span className="text-[13px] font-medium text-foreground">{link.label}</span>
                <p className="text-[12px] text-muted mt-0.5">{link.description}</p>
              </div>
              <ArrowRight size={13} className="text-muted-foreground/30 shrink-0 ml-3 group-hover:text-primary group-hover:translate-x-0.5 transition-all duration-200" />
            </Link>
          ))}
        </div>
      </section>

      <section className="container-page mt-14 mb-8">
        <div className="rounded-xl bg-accent p-8 md:p-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-[17px] font-semibold text-foreground mb-1">Wszystkie wydarzenia</h2>
            <p className="text-[13px] text-muted">
              Sprawdź co się dzieje w Krakowie każdego dnia.
            </p>
          </div>
          <Link
            href="/wydarzenia"
            className="group inline-flex items-center gap-2 px-5 py-2.5 bg-primary text-primary-foreground rounded-xl text-[13px] font-medium hover:bg-primary-hover transition-colors duration-200 shrink-0 shadow-[var(--shadow-soft)]"
          >
            Przeglądaj wydarzenia
            <ArrowRight size={13} className="group-hover:translate-x-0.5 transition-transform duration-200" />
          </Link>
        </div>
      </section>
    </div>
  );
}
