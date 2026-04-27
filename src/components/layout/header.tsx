"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Logo } from "@/components/brand/logo";
import { Menu, X } from "lucide-react";
import { cn } from "@/lib/utils";

const NAV_LINKS = [
  { href: "/miejsca",    label: "Miejsca",    emoji: "📍", bg: "#3A8C3F", bgHover: "#2d6b31", textColor: "white" },
  { href: "/wydarzenia", label: "Wydarzenia", emoji: "🎉", bg: "#FDE047", bgHover: "#FACC15", textColor: "#1a1a1a" },
  { href: "/kolonie",    label: "Kolonie",    emoji: "⛺", bg: "#e60100", bgHover: "#c40000", textColor: "white" },
  { href: "/zajecia",    label: "Zajęcia",    emoji: "🎨", bg: "#8B5CF6", bgHover: "#7C3AED", textColor: "white" },
];

export function Header() {
  const pathname = usePathname();
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

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
        "sticky top-0 z-50 bg-white transition-shadow duration-200",
        scrolled ? "shadow-[0_2px_16px_rgba(0,0,0,0.08)]" : "border-b border-border"
      )}
    >
      {/* ── Main bar ── */}
      <div className="container-page">
        <div className="flex h-[68px] items-center gap-4 lg:gap-6">

          {/* Logo — background crop to remove whitespace */}
          <Link
            href="/"
            className="shrink-0"
            aria-label="Nie Siedź W Domu"
            style={{
              display: "block",
              height: 52,
              width: 170,
              backgroundImage: "url('/logo-new.jpg')",
              backgroundSize: "auto 170px",
              backgroundRepeat: "no-repeat",
              backgroundPosition: "center 45%",
            }}
          />

          {/* Desktop nav — right side */}
          <nav className="ml-auto hidden lg:flex items-center gap-2">
            {NAV_LINKS.map((link) => {
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  style={{ backgroundColor: link.bg, color: link.textColor }}
                  className="flex items-center gap-1.5 rounded-full px-4 py-2 text-[14px] font-semibold transition-opacity duration-150 hover:opacity-85"
                >
                  <span className="text-[15px]">{link.emoji}</span>
                  {link.label}
                </Link>
              );
            })}
          </nav>

          {/* Right side — mobile only */}
          <div className="lg:hidden ml-auto flex items-center gap-2 sm:gap-3">

            {/* Mobile menu toggle */}
            <button
              type="button"
              className="lg:hidden flex h-9 w-9 items-center justify-center rounded-xl border border-border bg-accent text-foreground/70 hover:bg-accent/80 transition-colors"
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
        <div className="lg:hidden border-t border-border bg-white px-5 py-4">
          <nav className="flex flex-col gap-1">
            {NAV_LINKS.map((link) => {
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setMobileOpen(false)}
                  style={{ backgroundColor: link.bg, color: link.textColor }}
                  className="flex items-center gap-3 rounded-full px-4 py-3 text-[15px] font-semibold transition-opacity duration-150 hover:opacity-85"
                >
                  <span className="text-[18px]">{link.emoji}</span>
                  {link.label}
                </Link>
              );
            })}
          </nav>
        </div>
      )}
    </header>
  );
}
