import { ExternalLink, Sparkles } from "lucide-react";

interface AiLearnMoreLinkProps {
  queryParts: (string | null | undefined)[];
}

export function AiLearnMoreLink({ queryParts }: AiLearnMoreLinkProps) {
  const query = queryParts.filter(Boolean).join(" ");
  const href = `https://www.google.com/search?q=${encodeURIComponent(query)}&udm=50`;

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener"
      className="group relative flex items-center gap-2.5 overflow-hidden rounded-xl border border-[#e60100]/35 bg-[#ffe7a6] px-3 py-2 text-[#2a2200] shadow-[var(--shadow-card)] transition-all duration-200 hover:-translate-y-0.5 hover:border-[#e60100]/55 hover:bg-[#ffdf8a] hover:shadow-[var(--shadow-card-hover)]"
    >
      <span className="pointer-events-none absolute inset-y-0 left-0 w-1.5 bg-[#e60100]" />
      <span className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-[#e60100]/12 text-[#b40404] ring-1 ring-[#e60100]/22">
        <Sparkles size={13} />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-[14px] font-bold leading-tight tracking-[-0.01em]">Sprawdź praktyczne informacje</p>
      </div>
      <ExternalLink size={12} className="shrink-0 text-[#b40404] transition-transform duration-200 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
    </a>
  );
}
