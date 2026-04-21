"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Logo } from "@/components/brand/logo";
import { cn } from "@/lib/utils";

const NAV_LINKS = [
  { href: "/miejsca",    label: "Miejsca" },
  { href: "/wydarzenia", label: "Wydarzenia" },
  { href: "/kolonie",    label: "Kolonie" },
  { href: "/zajecia",    label: "Zajęcia" },
];

export function Header() {
  const pathname = usePathname();
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  if (pathname.startsWith("/admin")) return null;

  return (
    <header
      className={cn(
        "sticky top-0 z-50 px-3 pt-3 transition-all duration-300 sm:px-4 lg:px-5",
        scrolled ? "backdrop-blur-xl" : ""
      )}
    >
      <div className="container-page relative">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-4 top-1 h-full rounded-[34px] bg-[radial-gradient(circle_at_left,rgba(225,132,80,0.18),transparent_33%),radial-gradient(circle_at_right,rgba(109,193,185,0.16),transparent_31%)] blur-2xl"
        />

        <div
          className={cn(
            "relative overflow-hidden rounded-[28px] border border-white/75 bg-white/88 px-3 shadow-[0_14px_40px_rgba(160,116,84,0.10)] ring-1 ring-[rgba(221,212,203,0.34)] backdrop-blur-xl sm:px-4 lg:px-6",
            scrolled && "bg-white/93 shadow-[0_20px_46px_rgba(160,116,84,0.13)]"
          )}
        >
          <div className="relative z-10 flex min-h-[74px] items-center gap-3 lg:min-h-[78px]">
            <Link href="/" className="shrink-0">
              <Logo size="sm" />
            </Link>

            <nav className="pointer-events-none absolute inset-x-0 hidden items-center justify-center gap-8 lg:flex xl:gap-10">
              {NAV_LINKS.map((link) => {
                const isActive = pathname === link.href || pathname.startsWith(link.href + "/");

                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    className={cn(
                      "pointer-events-auto text-[15px] font-semibold tracking-[-0.01em] transition-colors duration-150",
                      isActive
                        ? "text-foreground"
                        : "text-foreground/56 hover:text-foreground/82"
                    )}
                  >
                    {link.label}
                  </Link>
                );
              })}
            </nav>

            <div className="ml-auto flex items-center gap-2 sm:gap-3">
              <Link
                href="/dodaj"
                className="inline-flex min-h-10 items-center rounded-full border border-foreground/12 bg-white px-3.5 text-[13px] font-bold text-foreground shadow-[0_4px_12px_rgba(44,32,24,0.05)] transition-all duration-150 hover:border-foreground/20 hover:bg-stone-50 sm:min-h-11 sm:px-5 sm:text-[14px]"
              >
                <span className="sm:hidden">Dodaj</span>
                <span className="hidden sm:inline">Dodaj miejsce</span>
              </Link>
              <Link
                href="/logowanie"
                className="inline-flex min-h-10 items-center rounded-full bg-primary px-4 text-[13px] font-bold text-white shadow-[0_10px_22px_rgba(212,98,60,0.26)] transition-all duration-150 hover:bg-primary-hover hover:shadow-[0_14px_28px_rgba(212,98,60,0.32)] sm:min-h-11 sm:px-7 sm:text-[14px]"
              >
                Zaloguj się
              </Link>
            </div>
          </div>

          <div className="relative z-10 border-t border-border/60 py-2.5 lg:hidden">
            <nav className="scrollbar-none flex items-center gap-1.5 overflow-x-auto pb-0.5">
              {NAV_LINKS.map((link) => {
                const isActive = pathname === link.href || pathname.startsWith(link.href + "/");

                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    className={cn(
                      "shrink-0 rounded-full px-3.5 py-2 text-[13px] font-semibold tracking-[-0.01em] transition-all duration-150",
                      isActive
                        ? "bg-primary text-white shadow-[0_8px_18px_rgba(212,98,60,0.22)]"
                        : "bg-stone-50 text-foreground/70 hover:bg-stone-100 hover:text-foreground"
                    )}
                  >
                    {link.label}
                  </Link>
                );
              })}
            </nav>
          </div>

          <div className="absolute inset-x-4 -bottom-px h-px bg-gradient-to-r from-transparent via-border/70 to-transparent" />
        </div>
      </div>
    </header>
  );
}
