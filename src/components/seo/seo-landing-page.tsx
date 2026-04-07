import Link from "next/link";
import { ArrowRight, ChevronRight } from "lucide-react";
import type { SeoPageConfig, QuickFilter, FaqItem, InternalLink } from "@/types/seo";
import type { SeoListingConfig } from "@/types/seo";
import { resolveListingItems } from "@/lib/seo-listings";
import { buildStructuredData } from "@/lib/seo-metadata";
import { buildRelatedLinks, buildBreadcrumbs } from "@/lib/seo-links";
import { ContentCard } from "@/components/ui/content-card";
import { FeaturedCard } from "@/components/ui/featured-card";

function SectionLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link href={href} className="group inline-flex items-center gap-1 text-[13px] font-medium text-primary hover:text-primary-hover transition-colors duration-200">
      {children}
      <ArrowRight size={13} className="group-hover:translate-x-0.5 transition-transform duration-200" />
    </Link>
  );
}

function Breadcrumbs({ items }: { items: { label: string; href: string }[] }) {
  return (
    <nav aria-label="Breadcrumb" className="container-page pt-6">
      <ol className="flex items-center gap-1 text-[12px]">
        {items.map((item, i) => (
          <li key={item.href} className="flex items-center gap-1">
            {i > 0 && <ChevronRight size={11} className="text-muted-foreground/30" />}
            {i < items.length - 1 ? (
              <Link href={item.href} className="text-muted hover:text-primary transition-colors duration-200">{item.label}</Link>
            ) : (
              <span className="text-muted-foreground">{item.label}</span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}

function ListingSection({ config, isFirst }: { config: SeoListingConfig; isFirst: boolean }) {
  const items = resolveListingItems(config);
  if (items.length === 0) return null;
  const featured = isFirst ? items[0] : null;
  const grid = isFirst ? items.slice(1) : items;

  return (
    <section className="container-page mt-14">
      <div className="flex items-center justify-between mb-5">
        <h2 className="text-[15px] font-semibold text-foreground">{config.heading}</h2>
        <SectionLink href={config.viewAllHref}>{config.viewAllLabel}</SectionLink>
      </div>
      {featured && <div className="mb-5"><FeaturedCard item={featured} /></div>}
      {grid.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {grid.map((item) => <ContentCard key={item.id} item={item} />)}
        </div>
      )}
    </section>
  );
}

function QuickFilterPills({ filters }: { filters: QuickFilter[] }) {
  if (filters.length === 0) return null;
  return (
    <div className="flex flex-wrap gap-1.5">
      {filters.map((f) => (
        <Link key={f.href} href={f.href} className="px-3 py-1.5 rounded-lg text-[13px] font-medium border border-border text-muted hover:text-foreground hover:border-primary/30 transition-all duration-200">
          {f.label}
        </Link>
      ))}
    </div>
  );
}

function FaqSection({ items }: { items: FaqItem[] }) {
  if (items.length === 0) return null;
  return (
    <section className="container-page mt-14">
      <h2 className="text-[15px] font-semibold text-foreground mb-5">Często zadawane pytania</h2>
      <div className="rounded-xl border border-border bg-card divide-y divide-border shadow-[var(--shadow-card)]">
        {items.map((item, i) => (
          <details key={i} className="group">
            <summary className="flex items-center justify-between cursor-pointer list-none px-5 py-4 text-[14px] font-medium text-foreground leading-snug">
              {item.question}
              <span className="text-primary/40 ml-4 shrink-0 text-[16px] leading-none group-open:rotate-45 transition-transform duration-200">+</span>
            </summary>
            <div className="px-5 pb-4 -mt-1">
              <p className="text-[14px] text-muted leading-relaxed max-w-2xl">{item.answer}</p>
            </div>
          </details>
        ))}
      </div>
    </section>
  );
}

function RelatedLinks({ links }: { links: InternalLink[] }) {
  if (links.length === 0) return null;
  return (
    <section className="container-page mt-14">
      <h2 className="text-[15px] font-semibold text-foreground mb-5">Sprawdź też</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {links.map((link) => (
          <Link key={link.href} href={link.href} className="group flex items-center justify-between rounded-xl border border-border bg-card px-4 py-3 hover:border-primary/25 hover:shadow-[var(--shadow-soft)] transition-all duration-200">
            <div className="min-w-0">
              <span className="text-[13px] font-medium text-foreground">{link.label}</span>
              {link.description && <p className="text-[12px] text-muted mt-0.5 truncate">{link.description}</p>}
            </div>
            <ArrowRight size={13} className="text-muted-foreground/30 shrink-0 ml-3 group-hover:text-primary group-hover:translate-x-0.5 transition-all duration-200" />
          </Link>
        ))}
      </div>
    </section>
  );
}

function StructuredData({ schemas }: { schemas: object[] }) {
  return (
    <>
      {schemas.map((schema, i) => (
        <script key={i} type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }} />
      ))}
    </>
  );
}

export function SeoLandingPage({ config }: { config: SeoPageConfig }) {
  const breadcrumbs = buildBreadcrumbs(config);
  const structuredData = buildStructuredData(config, breadcrumbs);
  const relatedLinks = buildRelatedLinks(config);

  return (
    <div>
      <StructuredData schemas={structuredData} />
      <Breadcrumbs items={breadcrumbs} />

      <section className="container-page pt-8 pb-12 md:pt-12 md:pb-16">
        <h1 className="text-3xl md:text-[44px] font-bold text-foreground tracking-[-0.03em] leading-[1.15] mb-4">{config.h1}</h1>
        <p className="text-[16px] text-muted leading-relaxed mb-8 max-w-md">{config.lead}</p>
        <div className="flex flex-wrap gap-2">
          <Link href={config.ctaHref} className="group inline-flex items-center gap-2 px-5 py-2.5 bg-primary text-primary-foreground rounded-xl text-[13px] font-medium hover:bg-primary-hover transition-colors duration-200 shadow-[var(--shadow-soft)]">
            {config.ctaLabel}
            <ArrowRight size={13} className="group-hover:translate-x-0.5 transition-transform duration-200" />
          </Link>
          {config.secondaryCtaLabel && config.secondaryCtaHref && (
            <Link href={config.secondaryCtaHref} className="inline-flex items-center gap-2 px-5 py-2.5 bg-card text-foreground rounded-xl text-[13px] font-medium border border-border hover:border-primary/30 transition-all duration-200">
              {config.secondaryCtaLabel}
            </Link>
          )}
        </div>
      </section>

      <div className="border-t border-border" />

      <section className="container-page pt-10">
        <div className="max-w-2xl space-y-3 mb-6">
          {config.intro.map((text, i) => (
            <p key={i} className="text-[14px] text-muted leading-relaxed">{text}</p>
          ))}
        </div>
        {config.quickFilters && config.quickFilters.length > 0 && <QuickFilterPills filters={config.quickFilters} />}
      </section>

      {config.listings.map((listing, i) => <ListingSection key={i} config={listing} isFirst={i === 0} />)}
      <FaqSection items={config.faq} />
      <RelatedLinks links={relatedLinks} />
      <div className="h-8" />
    </div>
  );
}
