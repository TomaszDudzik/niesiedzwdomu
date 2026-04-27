"use client";

import { Search } from "lucide-react";

interface PageHeroProps {
  title: string;
  subtitle: string;
  search: string;
  onSearch: (value: string) => void;
}

export function PageHero({ title, subtitle, search, onSearch }: PageHeroProps) {
  return (
    <section className="relative overflow-hidden">
      <div className="container-page relative pt-4 pb-5 md:pt-5 md:pb-6">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h1
              className="font-heading font-black leading-[1.05] tracking-[-0.03em] text-black"
              style={{ fontSize: "clamp(26px, 4vw, 48px)" }}
            >
              {title}
            </h1>
            <p className="mt-2 text-[15px] text-muted-foreground">{subtitle}</p>
          </div>

          <div className="self-end w-full lg:w-[640px] shrink-0 flex items-center rounded-xl border border-border bg-white shadow-[0_4px_16px_rgba(0,0,0,0.10)] overflow-hidden">
            <input
              type="text"
              value={search}
              onChange={(e) => onSearch(e.target.value)}
              placeholder="Szukaj..."
              className="flex-1 h-10 pl-4 pr-2 text-[14px] text-foreground placeholder:text-muted-foreground/50 bg-transparent focus:outline-none"
            />
            <button
              type="button"
              className="h-10 w-11 flex items-center justify-center bg-[#e60100] text-white hover:bg-[#c40000] transition-colors shrink-0"
            >
              <Search size={15} />
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
