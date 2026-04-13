import { ExternalLink, Sparkles } from "lucide-react";

interface AiLearnMoreLinkProps {
  title: string;
  topicHint?: string;
}

export function AiLearnMoreLink({ title, topicHint }: AiLearnMoreLinkProps) {
  const query = [
    title,
    "Kraków",
    topicHint || "",
    "najważniejsze informacje",
    "dla kogo",
    "cennik",
    "praktyczne wskazówki",
  ]
    .filter(Boolean)
    .join(" ");

  const href = `https://www.google.com/search?q=${encodeURIComponent(query)}&udm=50`;

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener"
      className="group relative flex items-center gap-2.5 overflow-hidden rounded-xl border border-[#0a5a63]/22 bg-[#d8eeeb] px-3 py-2 text-foreground shadow-[var(--shadow-card)] transition-all duration-200 hover:-translate-y-0.5 hover:border-[#0a5a63]/38 hover:shadow-[var(--shadow-card-hover)]"
    >
      <span className="pointer-events-none absolute inset-y-0 left-0 w-1 bg-[#0a5a63]" />
      <span className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-[#0a5a63]/12 text-[#0a5a63] ring-1 ring-[#0a5a63]/16">
        <Sparkles size={13} />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-[14px] font-bold leading-tight tracking-[-0.01em]">Sprawdź praktyczne informacje</p>
      </div>
      <ExternalLink size={12} className="shrink-0 text-[#0a5a63] transition-transform duration-200 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
    </a>
  );
}
