"use client";

import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Logo } from "@/components/brand/logo";
import { Search, Menu, X, Plus } from "lucide-react";
import { cn } from "@/lib/utils";

const NAV_LINKS = [
  { href: "/miejsca",    label: "Miejsca",    emoji: "📍" },
  { href: "/wydarzenia", label: "Wydarzenia", emoji: "🎉" },
  { href: "/kolonie",    label: "Kolonie",    emoji: "⛺" },
  { href: "/zajecia",    label: "Zajęcia",    emoji: "🎨" },
];

export function Header() {
  const pathname = usePathname();
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    if (searchOpen) searchRef.current?.focus();
  }, [searchOpen]);

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

          {/* Logo */}
          <Link href="/" className="shrink-0">
            <Logo size="md" className="scale-110 origin-left" />
          </Link>

          {/* Desktop nav — absolutely centred */}
          <nav className="pointer-events-none absolute inset-x-0 hidden lg:flex items-center justify-center gap-1">
            {NAV_LINKS.map((link) => {
              const isActive = pathname === link.href || pathname.startsWith(link.href + "/");
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={cn(
                    "pointer-events-auto flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-[14px] font-semibold transition-all duration-150",
                    isActive
                      ? "bg-primary/10 text-primary"
                      : "text-foreground/65 hover:bg-accent hover:text-foreground"
                  )}
                >
                  <span className="text-[15px]">{link.emoji}</span>
                  {link.label}
                </Link>
              );
            })}
          </nav>

          {/* Right side */}
          <div className="ml-auto flex items-center gap-2 sm:gap-3">

            {/* Search — desktop */}
            <div className="relative hidden sm:flex items-center">
              <Search
                size={14}
                className="pointer-events-none absolute left-3 text-muted-foreground/50"
              />
              <input
                ref={searchRef}
                type="text"
                placeholder="Szukaj..."
                className="h-9 w-36 lg:w-52 rounded-xl border border-border bg-accent pl-9 pr-3 text-[13px] text-foreground placeholder:text-muted-foreground/60 transition-all duration-200 focus:border-primary/40 focus:outline-none focus:ring-2 focus:ring-primary/15 focus:w-44 lg:focus:w-64"
              />
            </div>

            {/* Search toggle — mobile */}
            <button
              type="button"
              className="sm:hidden flex h-9 w-9 items-center justify-center rounded-xl border border-border bg-accent text-foreground/70 hover:bg-primary/8 hover:text-primary transition-colors"
              onClick={() => setSearchOpen((v) => !v)}
              aria-label="Szukaj"
            >
              <Search size={16} />
            </button>

            {/* Add event CTA */}
            <Link
              href="/dodaj"
              className="inline-flex h-9 items-center gap-1.5 rounded-xl bg-primary px-3.5 text-[13px] font-bold text-white shadow-[0_4px_14px_rgba(232,83,13,0.30)] transition-all duration-150 hover:bg-primary-hover hover:shadow-[0_6px_18px_rgba(232,83,13,0.38)] sm:px-4 sm:text-[14px]"
            >
              <Plus size={14} strokeWidth={2.5} />
              <span className="hidden sm:inline">Dodaj event</span>
              <span className="sm:hidden">Dodaj</span>
            </Link>

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

        {/* Mobile search bar */}
        {searchOpen && (
          <div className="sm:hidden pb-3 pt-1">
            <div className="relative">
              <Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground/50" />
              <input
                type="text"
                placeholder="Szukaj miejsc, wydarzeń..."
                autoFocus
                className="w-full h-10 rounded-xl border border-border bg-accent pl-9 pr-3 text-[14px] text-foreground placeholder:text-muted-foreground/60 focus:border-primary/40 focus:outline-none focus:ring-2 focus:ring-primary/15"
              />
            </div>
          </div>
        )}
      </div>

      {/* ── Mobile nav drawer ── */}
      {mobileOpen && (
        <div className="lg:hidden border-t border-border bg-white px-5 py-4">
          <nav className="flex flex-col gap-1">
            {NAV_LINKS.map((link) => {
              const isActive = pathname === link.href || pathname.startsWith(link.href + "/");
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setMobileOpen(false)}
                  className={cn(
                    "flex items-center gap-3 rounded-xl px-4 py-3 text-[15px] font-semibold transition-all duration-150",
                    isActive
                      ? "bg-primary/10 text-primary"
                      : "text-foreground/75 hover:bg-accent hover:text-foreground"
                  )}
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
