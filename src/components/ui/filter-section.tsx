"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

interface FilterSectionProps {
  title: ReactNode;
  children: ReactNode;
  defaultCollapsed?: boolean;
  className?: string;
  triggerClassName?: string;
  contentClassName?: string;
}

export function FilterSection({
  title,
  children,
  defaultCollapsed = true,
  className,
  triggerClassName,
  contentClassName,
}: FilterSectionProps) {
  const [collapsed, setCollapsed] = useState(defaultCollapsed);
  const contentRef = useRef<HTMLDivElement | null>(null);
  const [contentHeight, setContentHeight] = useState(0);

  useEffect(() => {
    const element = contentRef.current;
    if (!element) return;

    const updateHeight = () => {
      setContentHeight(element.scrollHeight);
    };

    updateHeight();

    const observer = new ResizeObserver(updateHeight);
    observer.observe(element);

    return () => observer.disconnect();
  }, [children]);

  return (
    <div className={cn("rounded-lg border border-border/70 bg-white", className)}>
      <button
        type="button"
        onClick={() => setCollapsed((current) => !current)}
        className={cn(
          "flex w-full items-center justify-between gap-2 px-2.5 py-2 text-left transition-colors hover:bg-accent/50",
          triggerClassName
        )}
        aria-expanded={!collapsed}
      >
        <span className="min-w-0">{title}</span>
        <ChevronDown
          size={14}
          className={cn("shrink-0 text-muted-foreground transition-transform duration-200", !collapsed && "rotate-180")}
        />
      </button>

      <div
        className="overflow-hidden transition-[max-height,opacity] duration-300 ease-out"
        style={{
          maxHeight: collapsed ? 0 : contentHeight,
          opacity: collapsed ? 0 : 1,
        }}
        aria-hidden={collapsed}
      >
        <div ref={contentRef} className={cn("px-2.5 pt-1 pb-2.5", contentClassName)}>
          {children}
        </div>
      </div>
    </div>
  );
}