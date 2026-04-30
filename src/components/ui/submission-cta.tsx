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
          "relative mb-6 block overflow-hidden rounded-2xl border border-sky-300/70 bg-[linear-gradient(180deg,rgba(214,238,252,0.98),rgba(200,230,250,0.98))] px-3 py-2.5 shadow-[0_14px_34px_-30px_rgba(14,116,144,0.35)] lg:hidden",
          className
        )}
      >
        <div className="absolute inset-y-2 left-0 w-1 rounded-r-full bg-cyan-700" />
        <div className="flex items-start gap-2.5">
          <div className="min-w-0 flex-1 pl-2 pr-2">
            <p className="text-[12px] font-semibold leading-4 text-slate-900">{title}</p>
            <p className="mt-0.5 text-[10px] leading-4 text-slate-600">{description}</p>
          </div>
          <span className="mt-0.5 inline-flex shrink-0 items-center gap-1 whitespace-nowrap rounded-full bg-white/80 px-2 py-1 text-[10px] font-semibold text-cyan-800 shadow-[0_10px_22px_-18px_rgba(8,145,178,0.7)]">
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
        "group relative overflow-hidden rounded-2xl border border-sky-300/70 bg-[linear-gradient(180deg,rgba(214,238,252,0.98),rgba(200,230,250,0.98))] px-3 py-2 shadow-[0_14px_34px_-30px_rgba(14,116,144,0.35)] transition-colors duration-200 hover:border-sky-400/70",
        "mb-4 hidden lg:flex -ml-[20%] w-[calc(100%+20%)]",
        className
      )}
    >
      <div className="absolute inset-y-2 left-0 w-1 rounded-r-full bg-cyan-700" />
      <div className="flex w-full items-center gap-2.5 lg:gap-3">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-sky-900/8 text-cyan-800">
          <Sparkles size={13} strokeWidth={2} />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[12px] font-semibold text-slate-900 sm:text-[13px]">{title}</p>
          <p className="mt-0.5 text-[10px] text-slate-600 sm:text-[11px]">{description}</p>
        </div>
        <div className="ml-auto shrink-0 pl-1 pr-0.5">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-cyan-700/20 bg-white/85 px-3 py-1.5 text-[10px] font-semibold text-cyan-800 shadow-[0_10px_22px_-18px_rgba(8,145,178,0.7)] transition-all duration-200 group-hover:border-cyan-700/35 group-hover:bg-cyan-700 group-hover:text-white sm:px-3.5 sm:text-[11px]">
            {buttonLabel}
            <ArrowRight size={13} className="transition-transform duration-200 group-hover:translate-x-0.5" />
          </span>
        </div>
      </div>
    </Link>
  );
}