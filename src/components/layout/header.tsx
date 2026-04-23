"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Logo } from "@/components/brand/logo";

export function Header() {
  const pathname = usePathname();
  if (pathname.startsWith("/admin")) return null;

  return (
    <header className="sticky top-0 z-50 bg-[#EFF9F8] border-b border-border shadow-[0_1px_8px_rgba(10,191,163,0.12)]">
      <div className="container-page flex items-center h-10">
        <Link href="/">
          <Logo size="sm" />
        </Link>
      </div>
    </header>
  );
}
