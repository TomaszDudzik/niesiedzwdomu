"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Menu, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Logo } from "@/components/brand/logo";
import { ComingSoonBadge } from "@/components/ui/coming-soon";

const NAV_LINKS = [
  { href: "/wydarzenia", label: "Wydarzenia" },
  { href: "/miejsca", label: "Miejsca", comingSoon: true },
  { href: "/kolonie", label: "Kolonie", comingSoon: true },
  { href: "/zajecia", label: "Zajęcia", comingSoon: true },
];

export function Header() {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  const isActive = (href: string) => pathname === href || pathname.startsWith(href + "/");

  return (
    <header className="sticky top-0 z-50 bg-white/90 backdrop-blur-md border-b border-border">
      <div className="container-page flex items-center justify-between h-14">
        <Link href="/">
          <Logo size="sm" />
        </Link>

        <nav className="hidden md:flex items-center gap-0.5">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={cn(
                "px-3 py-1.5 rounded-md text-[13px] font-medium transition-colors inline-flex items-center gap-1.5",
                isActive(link.href)
                  ? "bg-accent text-foreground"
                  : "text-muted hover:text-foreground"
              )}
            >
              {link.label}
              {"comingSoon" in link && link.comingSoon && <ComingSoonBadge />}
            </Link>
          ))}
        </nav>

        <button
          onClick={() => setMobileOpen(!mobileOpen)}
          className="md:hidden p-1.5 -mr-1.5 rounded-md hover:bg-accent transition-colors"
          aria-label="Menu"
        >
          {mobileOpen ? <X size={18} /> : <Menu size={18} />}
        </button>
      </div>

      {mobileOpen && (
        <nav className="md:hidden border-t border-border bg-white">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              onClick={() => setMobileOpen(false)}
              className={cn(
                "flex items-center gap-2 px-5 py-2.5 text-[13px] font-medium transition-colors",
                isActive(link.href) ? "text-foreground" : "text-muted"
              )}
            >
              {link.label}
              {"comingSoon" in link && link.comingSoon && <ComingSoonBadge />}
            </Link>
          ))}
        </nav>
      )}
    </header>
  );
}
