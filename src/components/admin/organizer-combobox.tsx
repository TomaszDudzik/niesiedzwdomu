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
  placeholder = "Wyszukaj lub wpisz organizatora",
  emptyLabel = "— brak —",
}: OrganizerComboboxProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
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
      const haystack = [organizer.organizer_name, organizer.company_name, organizer.city]
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
    if (!open) {
      setQuery(selectedOrganizer?.organizer_name ?? "");
    } else {
      queueMicrotask(() => inputRef.current?.focus());
    }
  }, [open, selectedOrganizer]);

  const displayValue = selectedOrganizer?.organizer_name || query;

  return (
    <div className="relative" ref={containerRef}>
      <div className="flex items-center gap-1">
        <input
          ref={inputRef}
          type="text"
          value={query || displayValue}
          onChange={(e) => {
            setQuery(e.target.value);
            if (!open) setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          placeholder={placeholder}
          className={cn(inputClassName, "flex-1")}
        />
        <button
          type="button"
          onClick={() => setOpen((current) => !current)}
          className="px-2 py-1.5 text-muted-foreground hover:text-foreground transition-colors"
        >
          <ChevronDown size={14} />
        </button>
      </div>

      {open && (
        <div className="absolute z-30 mt-1 w-full rounded-md border border-border bg-white shadow-lg">
          <div className="max-h-60 overflow-y-auto p-1">
            <button
              type="button"
              onClick={() => {
                onChange(null);
                setQuery("");
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

            {filteredOrganizers.length === 0 && query ? (
              <div className="px-2 py-3 text-[12px] text-muted-foreground">
                <div className="mb-2">Brak wyników w bazie</div>
                <button
                  type="button"
                  onClick={() => {
                    onChange(query);
                    setOpen(false);
                  }}
                  className="w-full rounded bg-blue-50 px-2 py-1.5 text-left text-[11px] font-medium text-blue-700 hover:bg-blue-100 transition-colors"
                >
                  Użyj: "{query}"
                </button>
              </div>
            ) : (
              filteredOrganizers.map((organizer) => {
                const isSelected = organizer.id === value;
                return (
                  <button
                    key={organizer.id}
                    type="button"
                    onClick={() => {
                      onChange(organizer.id);
                      setQuery("");
                      setOpen(false);
                    }}
                    className={cn(
                      "flex w-full items-center justify-between rounded px-2 py-1.5 text-left text-[12px] hover:bg-accent",
                      isSelected && "bg-accent/60"
                    )}
                  >
                    <div className="min-w-0 flex-1">
                      <span className="truncate block">{organizer.organizer_name}</span>
                      {organizer.company_name && (
                        <span className="text-[10px] text-muted truncate block">{organizer.company_name}</span>
                      )}
                    </div>
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
