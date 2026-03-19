import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { mockEvents, mockCamps, mockPlaces, getDiscoveryFeed } from "@/lib/mock-data";
import { FeaturedCard } from "@/components/ui/featured-card";
import { ContentCard } from "@/components/ui/content-card";

const feed = getDiscoveryFeed();
const featuredItem = feed.find((i) => i.is_featured) || feed[0];
const upcomingEvents = mockEvents
  .filter((e) => e.status === "published")
  .sort((a, b) => a.date_start.localeCompare(b.date_start))
  .slice(0, 6);
const featuredPlaces = mockPlaces.filter((p) => p.status === "published").slice(0, 3);
const featuredCamps = mockCamps.filter((c) => c.status === "published" && c.is_featured).slice(0, 2);
const freeItems = feed.filter((i) => i.is_free).slice(0, 3);

function SectionLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link href={href} className="group inline-flex items-center gap-1 text-[13px] font-medium text-muted hover:text-foreground transition-colors">
      {children}
      <ArrowRight size={13} className="group-hover:translate-x-0.5 transition-transform duration-150" />
    </Link>
  );
}

export default function HomePage() {
  return (
    <div>
      {/* Hero */}
      <section className="container-page pt-16 pb-12 md:pt-24 md:pb-16">
        <h1 className="text-3xl md:text-[44px] font-bold text-foreground tracking-[-0.03em] leading-[1.15] mb-4">
          Odkryj Kraków<br />z dzieckiem
        </h1>
        <p className="text-[16px] text-muted leading-relaxed mb-8 max-w-md">
          Wydarzenia, kolonie i miejsca dla rodzin. Wszystko w jednym miejscu.
        </p>
        <div className="flex flex-wrap gap-2">
          <Link
            href="/wydarzenia"
            className="group inline-flex items-center gap-2 px-4 py-2 bg-foreground text-white rounded-md text-[13px] font-medium hover:bg-[#333] transition-colors"
          >
            Przeglądaj wydarzenia
            <ArrowRight size={13} className="group-hover:translate-x-0.5 transition-transform duration-150" />
          </Link>
          <Link
            href="/miejsca"
            className="inline-flex items-center gap-2 px-4 py-2 bg-white text-foreground rounded-md text-[13px] font-medium border border-border hover:border-[#CCC] transition-colors"
          >
            Miejsca
          </Link>
          <Link
            href="/kolonie"
            className="inline-flex items-center gap-2 px-4 py-2 bg-white text-foreground rounded-md text-[13px] font-medium border border-border hover:border-[#CCC] transition-colors"
          >
            Kolonie
          </Link>
        </div>
      </section>

      <div className="border-t border-border" />

      {/* Featured */}
      {featuredItem && (
        <section className="container-page pt-12">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-[15px] font-semibold text-foreground">Polecane</h2>
          </div>
          <FeaturedCard item={featuredItem} />
        </section>
      )}

      {/* Upcoming events */}
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

      {/* Places */}
      {featuredPlaces.length > 0 && (
        <section className="container-page mt-14">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h2 className="text-[15px] font-semibold text-foreground">Miejsca</h2>
              <p className="text-[13px] text-muted mt-0.5">Place zabaw, sale zabaw, kawiarnie rodzinne</p>
            </div>
            <SectionLink href="/miejsca">Wszystkie</SectionLink>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {featuredPlaces.map((place) => (
              <ContentCard key={place.id} item={place} />
            ))}
          </div>
        </section>
      )}

      {/* Camps */}
      {featuredCamps.length > 0 && (
        <section className="container-page mt-14">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h2 className="text-[15px] font-semibold text-foreground">Kolonie i półkolonie</h2>
              <p className="text-[13px] text-muted mt-0.5">Znajdź obóz dla swojego dziecka</p>
            </div>
            <SectionLink href="/kolonie">Więcej</SectionLink>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            {featuredCamps.map((camp) => (
              <ContentCard key={camp.id} item={camp} />
            ))}
          </div>
        </section>
      )}

      {/* Free */}
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

      {/* Guides */}
      <section className="container-page mt-14">
        <h2 className="text-[15px] font-semibold text-foreground mb-5">Przewodniki</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {[
            { href: "/co-robic-z-dzieckiem-w-krakowie", label: "Co robić z dzieckiem", description: "Wydarzenia, miejsca i pomysły" },
            { href: "/wydarzenia-dla-dzieci-krakow", label: "Wydarzenia dla dzieci", description: "Warsztaty, spektakle, atrakcje" },
            { href: "/polkolonie-krakow", label: "Półkolonie", description: "Oferty na wakacje i ferie" },
            { href: "/place-zabaw-krakow", label: "Place zabaw", description: "Najlepsze place zabaw w mieście" },
          ].map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="group flex items-center justify-between rounded-lg border border-border px-4 py-3 hover:border-[#CCC] transition-colors"
            >
              <div className="min-w-0">
                <span className="text-[13px] font-medium text-foreground">{link.label}</span>
                <p className="text-[12px] text-muted mt-0.5">{link.description}</p>
              </div>
              <ArrowRight size={13} className="text-muted-foreground/30 shrink-0 ml-3 group-hover:translate-x-0.5 transition-transform duration-150" />
            </Link>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="container-page mt-14 mb-8">
        <div className="border border-border rounded-lg p-8 md:p-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-[17px] font-semibold text-foreground mb-1">Kalendarz wydarzeń</h2>
            <p className="text-[13px] text-muted">
              Sprawdź co się dzieje w Krakowie każdego dnia.
            </p>
          </div>
          <Link
            href="/kalendarz"
            className="group inline-flex items-center gap-2 px-4 py-2 bg-foreground text-white rounded-md text-[13px] font-medium hover:bg-[#333] transition-colors shrink-0"
          >
            Otwórz kalendarz
            <ArrowRight size={13} className="group-hover:translate-x-0.5 transition-transform duration-150" />
          </Link>
        </div>
      </section>
    </div>
  );
}
