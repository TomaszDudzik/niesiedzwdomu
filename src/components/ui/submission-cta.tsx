import Link from "next/link";
import { ArrowRight, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

interface SubmissionCtaProps {
  title: string;
  description: string;
  buttonLabel: string;
  href?: string;
  mobile?: boolean;
}

export function SubmissionCta({
  title,
  description,
  buttonLabel,
  href = "/kontakt",
  mobile = false,
}: SubmissionCtaProps) {
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-2xl border border-sky-200/80 bg-[linear-gradient(180deg,rgba(240,249,255,0.98),rgba(236,253,255,0.98))] px-3 py-3 shadow-[0_14px_34px_-30px_rgba(14,116,144,0.35)]",
        mobile ? "mb-4 lg:hidden" : "mb-4 hidden lg:flex"
      )}
    >
      <div className="absolute inset-y-2 left-0 w-1 rounded-r-full bg-cyan-700" />
      <div className="flex w-full items-center gap-3 lg:gap-4">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-sky-900/8 text-cyan-800">
          <Sparkles size={14} strokeWidth={2} />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[13px] font-semibold text-slate-900 sm:text-[14px]">{title}</p>
          <p className="mt-0.5 text-[11px] text-slate-600 sm:text-[12px]">{description}</p>
        </div>
        <div className="ml-auto shrink-0 pl-1 pr-0.5">
          <Link
            href={href}
            className="group inline-flex items-center gap-1.5 rounded-full border border-cyan-700/20 bg-white/85 px-3 py-1.5 text-[11px] font-semibold text-cyan-800 shadow-[0_10px_22px_-18px_rgba(8,145,178,0.7)] transition-all duration-200 hover:border-cyan-700/35 hover:bg-cyan-700 hover:text-white sm:px-4 sm:text-[12px]"
          >
            {buttonLabel}
            <ArrowRight size={14} className="transition-transform duration-200 group-hover:translate-x-0.5" />
          </Link>
        </div>
      </div>
    </div>
  );
}