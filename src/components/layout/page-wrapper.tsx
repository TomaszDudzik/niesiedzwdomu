"use client";

import { usePathname } from "next/navigation";
import { NavSection } from "./nav-section";

export function PageWrapper({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isAdmin = pathname.startsWith("/admin");

  if (isAdmin) return <>{children}</>;

  return (
    <>
      <div className="sticky top-10 z-40 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/85">
        <NavSection />
      </div>
      {children}
    </>
  );
}
