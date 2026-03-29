"use client";

import { usePathname } from "next/navigation";
import { NavSection } from "./nav-section";

export function PageWrapper({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isAdmin = pathname.startsWith("/admin");

  if (isAdmin) return <>{children}</>;

  return (
    <>
      <NavSection />
      <div className="border-t border-border" />
      {children}
    </>
  );
}
