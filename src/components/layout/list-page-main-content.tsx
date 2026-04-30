import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface ListPageMainContentProps {
  topContent: ReactNode;
  children: ReactNode;
  className?: string;
  topClassName?: string;
  contentClassName?: string;
}

export function ListPageMainContent({
  topContent,
  children,
  className,
  topClassName,
  contentClassName,
}: ListPageMainContentProps) {
  return (
    <div className={cn("flex-1 min-w-0", className)}>
      {topContent && <div className={cn("space-y-4 mb-4", topClassName)}>{topContent}</div>}
      <div className={cn(contentClassName)}>{children}</div>
    </div>
  );
}