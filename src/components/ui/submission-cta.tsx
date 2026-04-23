import Link from "next/link";
import { ArrowRight, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

interface SubmissionCtaProps {
  title: string;
  description: string;
  buttonLabel: string;
  href?: string;
  mobile?: boolean;
  mobileLabel?: string;
  className?: string;
}

export function SubmissionCta({
  title,
  description,
  buttonLabel,
  href = "/dodaj",
  mobile = false,
  mobileLabel = "Dodaj",
  className,
}: SubmissionCtaProps) {
  if (mobile) {
    return (
      <Link
        href={href}
        className={cn(
          "relative mb-4 block overflow-hidden rounded-2xl border border-[#C5BAE8] bg-[#EDE8F7] px-3 py-2.5 shadow-[0_10px_24px_-20px_rgba(74,50,114,0.14)] lg:hidden",
          className
        )}
      >
        <div className="absolute inset-y-2 left-0 w-1 rounded-r-full bg-primary" />
        <div className="flex items-start gap-2.5">
          <div className="min-w-0 flex-1 pl-2 pr-2">
            <p className="text-[12px] font-semibold leading-4 text-slate-900">{title}</p>
            <p className="mt-0.5 text-[10px] leading-4 text-slate-600">{description}</p>
          </div>
          <span className="mt-0.5 inline-flex shrink-0 items-center gap-1 whitespace-nowrap rounded-full bg-white px-2 py-1 text-[10px] font-semibold text-primary shadow-[0_4px_12px_-4px_rgba(240,75,26,0.25)]">
            {mobileLabel}
            <ArrowRight size={12} />
          </span>
        </div>
      </Link>
    );
  }

  return (
    <Link
      href={href}
      className={cn(
        "group relative overflow-hidden rounded-2xl border border-[#C5BAE8] bg-[#EDE8F7] px-3 py-2 shadow-[0_10px_24px_-20px_rgba(74,50,114,0.14)] transition-colors duration-200 hover:border-[#B8AEDE] hover:bg-[#E4DCF5]",
        "mb-2 hidden lg:flex",
        className
      )}
    >
      <div className="absolute inset-y-2 left-0 w-1 rounded-r-full bg-primary" />
      <div className="flex w-full items-center gap-2.5 lg:gap-3">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <Sparkles size={13} strokeWidth={2} />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[12px] font-semibold text-slate-900 sm:text-[13px]">{title}</p>
          <p className="mt-0.5 text-[10px] text-slate-600 sm:text-[11px]">{description}</p>
        </div>
        <div className="ml-auto shrink-0 pl-1 pr-0.5">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-[#C5BAE8] bg-white px-3 py-1.5 text-[10px] font-semibold text-primary transition-all duration-200 group-hover:border-primary/40 group-hover:bg-primary group-hover:text-white sm:px-3.5 sm:text-[11px]">
            {buttonLabel}
            <ArrowRight size={13} className="transition-transform duration-200 group-hover:translate-x-0.5" />
          </span>
        </div>
      </div>
    </Link>
  );
}