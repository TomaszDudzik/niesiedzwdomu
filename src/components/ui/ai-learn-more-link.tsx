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
      className="group relative flex items-center gap-3 overflow-hidden rounded-2xl border border-[#0a5a63]/22 bg-[#d8eeeb] px-4 py-3.5 text-foreground shadow-[var(--shadow-card)] transition-all duration-200 hover:-translate-y-0.5 hover:border-[#0a5a63]/38 hover:shadow-[var(--shadow-card-hover)]"
    >
      <span className="pointer-events-none absolute inset-y-0 left-0 w-1.5 bg-[#0a5a63]" />
      <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-[#0a5a63]/12 text-[#0a5a63] ring-1 ring-[#0a5a63]/16">
        <Sparkles size={18} />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-[15px] font-extrabold leading-tight tracking-[-0.01em]">Dowiedz się więcej</p>
        <p className="text-[12px] text-muted-foreground line-clamp-2">
          Sprawdź praktyczne informacje, dodatkowy kontekst i szybki research o tym miejscu
        </p>
      </div>
      <div className="shrink-0 flex items-center gap-2 rounded-xl bg-white/88 px-3 py-2 ring-1 ring-[#0a5a63]/12">
        <span className="hidden sm:inline text-[11px] font-semibold text-[#0a5a63]">Otwórz</span>
        <ExternalLink size={15} className="shrink-0 text-[#0a5a63] transition-transform duration-200 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
      </div>
    </a>
  );
}
