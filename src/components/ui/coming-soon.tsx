"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowRight, Bell, Check } from "lucide-react";

interface ComingSoonPageProps {
  title: string;
  description: string;
  /** Additional context line */
  detail?: string;
  icon?: React.ReactNode;
}

export function ComingSoonPage({ title, description, detail, icon }: ComingSoonPageProps) {
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (email.trim()) {
      // TODO: connect to actual email collection (Supabase, etc.)
      setSubmitted(true);
    }
  };

  return (
    <div className="container-page py-16 md:py-24">
      <div className="max-w-lg">
        {/* Status badge */}
        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border border-border bg-accent/50 text-[12px] font-medium text-muted mb-5">
          <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
          W przygotowaniu
        </div>

        {/* Icon */}
        {icon && (
          <div className="text-muted-foreground/20 mb-4">
            {icon}
          </div>
        )}

        {/* Headline */}
        <h1 className="text-2xl md:text-3xl font-bold text-foreground tracking-[-0.02em] leading-tight mb-3">
          {title}
        </h1>

        {/* Description */}
        <p className="text-[15px] text-muted leading-relaxed mb-2">
          {description}
        </p>

        {detail && (
          <p className="text-[13px] text-muted-foreground leading-relaxed mb-8">
            {detail}
          </p>
        )}

        {!detail && <div className="mb-8" />}

        {/* Notify form */}
        {!submitted ? (
          <form onSubmit={handleSubmit} className="flex gap-2 mb-8">
            <div className="relative flex-1 max-w-[280px]">
              <Bell size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground/40" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Twój e-mail"
                className="w-full pl-9 pr-3 py-2 rounded-md border border-border bg-white text-[13px] text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-foreground/20 transition-shadow"
              />
            </div>
            <button
              type="submit"
              className="px-3.5 py-2 rounded-md bg-foreground text-white text-[13px] font-medium hover:bg-[#333] transition-colors shrink-0"
            >
              Powiadom mnie
            </button>
          </form>
        ) : (
          <div className="flex items-center gap-2 text-[13px] text-muted mb-8">
            <Check size={14} className="text-success" />
            Damy Ci znać, gdy sekcja będzie gotowa.
          </div>
        )}

        {/* Alternative actions */}
        <div className="flex flex-col sm:flex-row gap-2">
          <Link
            href="/wydarzenia"
            className="group inline-flex items-center gap-2 px-4 py-2 rounded-md border border-border text-[13px] font-medium text-foreground hover:border-[#CCC] transition-colors"
          >
            Zobacz wydarzenia
            <ArrowRight size={13} className="text-muted group-hover:translate-x-0.5 transition-transform duration-150" />
          </Link>
          <Link
            href="/"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-md text-[13px] font-medium text-muted hover:text-foreground transition-colors"
          >
            Strona główna
          </Link>
        </div>
      </div>
    </div>
  );
}

/** Small inline badge for nav links and section headers */
export function ComingSoonBadge() {
  return (
    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium text-amber-600 bg-amber-50 border border-amber-100 leading-none">
      Wkrótce
    </span>
  );
}
