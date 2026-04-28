"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X } from "lucide-react";
import { cn } from "@/lib/utils";

const NAV_LINKS = [
  { href: "/miejsca",    label: "Miejsca",    emoji: "📍", bg: "#3A8C3F", textColor: "white",   countBg: "rgba(255,255,255,0.25)", countKey: "places" },
  { href: "/wydarzenia", label: "Wydarzenia", emoji: "🎉", bg: "#F5C200", textColor: "#1a1a1a", countBg: "rgba(0,0,0,0.15)",         countKey: "events" },
  { href: "/kolonie",    label: "Kolonie",    emoji: "⛺", bg: "#e60100", textColor: "white",   countBg: "rgba(255,255,255,0.25)", countKey: "camps" },
  { href: "/zajecia",    label: "Zajęcia",    emoji: "🎨", bg: "#8B5CF6", textColor: "white",   countBg: "rgba(255,255,255,0.25)", countKey: "activities" },
] as const;

interface NavCounts {
  places?: number;
  events?: number;
  camps?: number;
  activities?: number;
}

export function Header({ counts }: { counts?: NavCounts }) {
  const pathname = usePathname();
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const sectionBadge = pathname.startsWith("/miejsca")
    ? { label: "Miejsce", bg: "#3A8C3F", text: "#ffffff" }
    : pathname.startsWith("/wydarzenia")
      ? { label: "Wydarzenia", bg: "#F5C200", text: "#1a1a1a" }
      : pathname.startsWith("/kolonie")
        ? { label: "Kolonie", bg: "#e60100", text: "#ffffff" }
        : pathname.startsWith("/zajecia")
          ? { label: "Zajęcia", bg: "#8B5CF6", text: "#ffffff" }
          : null;

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  if (pathname.startsWith("/admin")) return null;

  return (
    <header
      className={cn(
        "sticky top-0 z-50 bg-[#111111] transition-shadow duration-200",
        scrolled ? "shadow-[0_2px_16px_rgba(0,0,0,0.4)]" : "border-b border-white/10"
      )}
    >
      {/* ── Main bar ── */}
      <div className="container-page">
        <div className="relative flex h-[68px] items-center gap-4 lg:gap-6">

          {/* Logo */}
          <Link
            href="/"
            className="shrink-0 inline-flex items-center whitespace-nowrap"
            aria-label="NieSiedzWDomu"
          >
            <span style={{ fontFamily: "var(--font-pacifico)", fontSize: "30px", color: "#ffffff", letterSpacing: "-0.01em" }}>
              <span style={{ color: "#3A8C3F" }}>Nie</span><span style={{ color: "#F5C200" }}>Siedź</span><span style={{ color: "#e60100" }}>W</span><span style={{ color: "#8B5CF6" }}>Domu</span>
            </span>
          </Link>

          {sectionBadge && (
            <span
              className="lg:hidden ml-2 inline-flex h-7 items-center rounded-full px-3 text-[13px] font-bold"
              style={{ backgroundColor: sectionBadge.bg, color: sectionBadge.text }}
            >
              {sectionBadge.label}
            </span>
          )}

          {sectionBadge && (
            <span
              className="hidden lg:inline-flex absolute left-1/2 -translate-x-1/2 h-8 items-center rounded-full px-3.5 text-[14px] font-bold"
              style={{ backgroundColor: sectionBadge.bg, color: sectionBadge.text }}
            >
              {sectionBadge.label}
            </span>
          )}

          {/* Desktop nav — right side */}
          <nav className="ml-auto hidden lg:flex items-center gap-2">
            {NAV_LINKS.map((link) => {
              const count = counts?.[link.countKey];
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  style={{ backgroundColor: link.bg, color: link.textColor }}
                  className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[13px] font-semibold transition-opacity duration-150 hover:opacity-85"
                >
                  <span>{link.emoji}</span>
                  <span>{link.label}</span>
                  {count !== undefined && (
                    <span
                      style={{ backgroundColor: link.countBg, color: link.textColor }}
                      className="inline-flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-[11px] font-bold"
                    >
                      {count}+
                    </span>
                  )}
                </Link>
              );
            })}
          </nav>

          {/* Right side — mobile only */}
          <div className="lg:hidden ml-auto flex items-center gap-2 sm:gap-3">

            {/* Mobile menu toggle */}
            <button
              type="button"
              className="lg:hidden flex h-9 w-9 items-center justify-center rounded-xl border border-white/20 bg-white/10 text-white hover:bg-white/20 transition-colors"
              onClick={() => setMobileOpen((v) => !v)}
              aria-label="Menu"
            >
              {mobileOpen ? <X size={18} /> : <Menu size={18} />}
            </button>
          </div>
        </div>
      </div>

      {/* ── Mobile nav drawer ── */}
      {mobileOpen && (
                <div className="lg:hidden border-t border-white/10 bg-[#111111] px-5 py-4">
          <nav className="flex flex-col gap-1">
            {NAV_LINKS.map((link) => {
              const count = counts?.[link.countKey];
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setMobileOpen(false)}
                  style={{ backgroundColor: link.bg, color: link.textColor }}
                  className="inline-flex items-center gap-3 rounded-full px-4 py-3 text-[15px] font-semibold transition-opacity duration-150 hover:opacity-85"
                >
                  <span className="text-[18px]">{link.emoji}</span>
                  <span className="flex-1">{link.label}</span>
                  {count !== undefined && (
                    <span
                      style={{ backgroundColor: link.countBg, color: link.textColor }}
                      className="inline-flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-[11px] font-bold"
                    >
                      {count}+
                    </span>
                  )}
                </Link>
              );
            })}
          </nav>
        </div>
      )}
    </header>
  );
}
