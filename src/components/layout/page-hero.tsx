"use client";

import { ArrowRight } from "lucide-react";

interface PageHeroProps {
  title: string;
  subtitle: string;
  search?: string;
  onSearch?: (value: string) => void;
  addHref?: string;
  addTitle?: string;
  addDescription?: string;
  addLabel?: string;
}

export function PageHero({ title, subtitle, addHref, addTitle, addDescription, addLabel }: PageHeroProps) {
  return (
    <section className="relative overflow-hidden">
      <div className="container-page relative pt-4 pb-2 md:pt-5 md:pb-3">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start">
          <div className="flex-1 min-w-0">
            <h1
              className="font-heading font-black leading-[1.05] tracking-[-0.03em] text-black lg:whitespace-nowrap"
              style={{ fontSize: "clamp(26px, 4vw, 48px)" }}
            >
              {title}
            </h1>
            <p className="mt-2 text-[15px] text-muted-foreground">{subtitle}</p>
          </div>

          {addHref && (
            <a
              href={addHref}
              className="group relative hidden lg:flex shrink-0 self-center overflow-hidden rounded-2xl border border-sky-300/70 bg-[linear-gradient(180deg,rgba(214,238,252,0.98),rgba(200,230,250,0.98))] px-4 py-3 shadow-[0_14px_34px_-30px_rgba(14,116,144,0.35)] transition-colors duration-200 hover:border-sky-400/70 items-center gap-3 w-[408px] mr-8"
            >
              <div className="absolute inset-y-2 left-0 w-1 rounded-r-full bg-cyan-700" />
              <div className="min-w-0 flex-1 pl-2">
                <p className="text-[13px] font-semibold text-slate-900">{addTitle ?? "Chcesz tu być?"}</p>
                <p className="mt-0.5 text-[11px] text-slate-600">{addDescription ?? "Dodaj swój wpis i dotrzyj do rodziców w Krakowie."}</p>
              </div>
              <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-cyan-700/20 bg-white/85 px-3 py-1.5 text-[11px] font-semibold text-cyan-800 transition-all duration-200 group-hover:bg-cyan-700 group-hover:text-white">
                {addLabel ?? "Dodaj"}
                <ArrowRight size={13} className="transition-transform duration-200 group-hover:translate-x-0.5" />
              </span>
            </a>
          )}
        </div>
      </div>
    </section>
  );
}
