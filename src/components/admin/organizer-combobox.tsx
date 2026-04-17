"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Check, ChevronDown, Search, X } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Organizer } from "@/types/database";

interface OrganizerComboboxProps {
  organizers: Organizer[];
  value: string | null | undefined;
  onChange: (value: string | null) => void;
  inputClassName?: string;
  placeholder?: string;
  emptyLabel?: string;
}

export function OrganizerCombobox({
  organizers,
  value,
  onChange,
  inputClassName,
  placeholder = "Wyszukaj organizatora",
  emptyLabel = "— brak —",
}: OrganizerComboboxProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const searchInputRef = useRef<HTMLInputElement | null>(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

  const selectedOrganizer = useMemo(
    () => organizers.find((organizer) => organizer.id === value) ?? null,
    [organizers, value]
  );

  const filteredOrganizers = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    if (!normalizedQuery) return organizers;

    return organizers.filter((organizer) => {
      const haystack = [organizer.name, organizer.business_name, organizer.city]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return haystack.includes(normalizedQuery);
    });
  }, [organizers, query]);

  useEffect(() => {
    if (!open) return;

    const handlePointerDown = (event: MouseEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
      }
    };

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    setQuery(selectedOrganizer?.name ?? "");
    queueMicrotask(() => searchInputRef.current?.focus());
  }, [open, selectedOrganizer]);

  return (
    <div className="relative" ref={containerRef}>
      <button
        type="button"
        className={cn(inputClassName, "flex items-center justify-between gap-2 text-left")}
        onClick={() => setOpen((current) => !current)}
      >
        <span className={cn(!selectedOrganizer && "text-muted-foreground")}>
          {selectedOrganizer?.name ?? emptyLabel}
        </span>
        <ChevronDown size={14} className="shrink-0 text-muted-foreground" />
      </button>

      {open && (
        <div className="absolute z-30 mt-1 w-full rounded-md border border-border bg-white shadow-lg">
          <div className="border-b border-border p-2">
            <div className="relative">
              <Search size={13} className="pointer-events-none absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                ref={searchInputRef}
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder={placeholder}
                className="w-full rounded-md border border-border bg-white py-1.5 pl-7 pr-8 text-[12px] text-foreground outline-none focus:ring-1 focus:ring-primary/30"
              />
              {query && (
                <button
                  type="button"
                  onClick={() => setQuery("")}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  <X size={12} />
                </button>
              )}
            </div>
          </div>

          <div className="max-h-60 overflow-y-auto p-1">
            <button
              type="button"
              onClick={() => {
                onChange(null);
                setOpen(false);
              }}
              className={cn(
                "flex w-full items-center justify-between rounded px-2 py-1.5 text-left text-[12px] hover:bg-accent",
                !value && "bg-accent/60"
              )}
            >
              <span>{emptyLabel}</span>
              {!value && <Check size={12} className="text-primary" />}
            </button>

            {filteredOrganizers.length === 0 ? (
              <div className="px-2 py-3 text-[12px] text-muted-foreground">Brak wyników</div>
            ) : (
              filteredOrganizers.map((organizer) => {
                const isSelected = organizer.id === value;
                return (
                  <button
                    key={organizer.id}
                    type="button"
                    onClick={() => {
                      onChange(organizer.id);
                      setOpen(false);
                    }}
                    className={cn(
                      "flex w-full items-center justify-between rounded px-2 py-1.5 text-left text-[12px] hover:bg-accent",
                      isSelected && "bg-accent/60"
                    )}
                  >
                    <span className="min-w-0 truncate">{organizer.name}</span>
                    {isSelected && <Check size={12} className="shrink-0 text-primary" />}
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
