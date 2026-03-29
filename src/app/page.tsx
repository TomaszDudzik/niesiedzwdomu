import Link from "next/link";
import { ArrowRight, Tent, Users } from "lucide-react";
import { getPublishedEvents, getPublishedPlaces } from "@/lib/data";
import { ContentCard } from "@/components/ui/content-card";

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
  const [upcomingEvents, places] = await Promise.all([
    getPublishedEvents(8),
    getPublishedPlaces(8),
  ]);

  return (
    <div>
      {upcomingEvents.length > 0 && (
        <section className="container-page pt-5">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-[15px] font-semibold text-foreground">Nadchodzące wydarzenia</h2>
            <SectionLink href="/wydarzenia">Wszystkie</SectionLink>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {upcomingEvents.slice(0, 8).map((event) => (
              <ContentCard key={event.id} item={event} />
            ))}
          </div>
        </section>
      )}

      {places.length > 0 && (
        <section className="container-page mt-14">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-[15px] font-semibold text-foreground">Ciekawe miejsca</h2>
            <SectionLink href="/miejsca">Wszystkie</SectionLink>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {places.slice(0, 8).map((place) => (
              <ContentCard key={place.id} item={place} />
            ))}
          </div>
        </section>
      )}

      <section className="container-page mt-14">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-[15px] font-semibold text-foreground">Kolonie dla dzieci</h2>
          <SectionLink href="/kolonie">Wszystkie</SectionLink>
        </div>
        <div className="rounded-xl border border-border bg-card p-8 text-center text-muted">
          <Tent size={32} className="mx-auto text-muted-foreground/30 mb-3" />
          <p className="text-[14px]">Wkrótce dodamy oferty kolonii i półkolonii</p>
        </div>
      </section>

      <section className="container-page mt-14">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-[15px] font-semibold text-foreground">Zajęcia pozaszkolne</h2>
          <SectionLink href="/zajecia">Wszystkie</SectionLink>
        </div>
        <div className="rounded-xl border border-border bg-card p-8 text-center text-muted">
          <Users size={32} className="mx-auto text-muted-foreground/30 mb-3" />
          <p className="text-[14px]">Wkrótce dodamy zajęcia pozaszkolne dla dzieci</p>
        </div>
      </section>

      <section className="container-page mt-14 mb-8">
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
    </div>
  );
}
