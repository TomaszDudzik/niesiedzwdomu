"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Calendar, MapPin, Tent, Users } from "lucide-react";
import { cn } from "@/lib/utils";
import { ComingSoonBadge } from "@/components/ui/coming-soon";

const NAV_LINKS = [
  { href: "/wydarzenia", label: "Wydarzenia", icon: Calendar, color: "bg-primary/10 text-primary" },
  { href: "/miejsca", label: "Miejsca", icon: MapPin, color: "bg-secondary/10 text-secondary" },
  { href: "/kolonie", label: "Kolonie", icon: Tent, color: "bg-amber-500/10 text-amber-600", disabled: true },
  { href: "/zajecia", label: "Zajęcia", icon: Users, color: "bg-secondary/10 text-secondary", disabled: true },
];

export function NavSection() {
  const pathname = usePathname();
  const isActive = (href: string) => pathname === href || pathname.startsWith(href + "/");

  return (
    <section className="container-page pt-4 pb-4 md:pt-5 md:pb-5">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div>
          <h1 className="text-lg md:text-xl font-bold text-foreground tracking-[-0.02em] leading-tight">
            Odkryj Kraków z dzieckiem
          </h1>
          <p className="text-[12px] text-muted mt-0.5 max-w-md">
            Wydarzenia, zajęcia, kolonie i miejsca dla rodzin
          </p>
        </div>
        <div className="flex gap-1.5">
          {NAV_LINKS.map((link) => {
            const disabled = "disabled" in link && link.disabled;
            return disabled ? (
              <span
                key={link.href}
                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[12px] font-medium border border-border bg-card text-muted-foreground/40 cursor-default"
              >
                <link.icon size={13} />
                {link.label}
              </span>
            ) : (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  "inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[12px] font-medium border transition-all duration-200",
                  isActive(link.href)
                    ? "border-primary/30 bg-primary/5 text-primary"
                    : "border-border bg-card text-muted hover:text-foreground hover:border-primary/30"
                )}
              >
                <link.icon size={13} />
                {link.label}
              </Link>
            );
          })}
        </div>
      </div>
    </section>
  );
}
