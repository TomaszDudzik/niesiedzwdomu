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
      className="group relative flex items-center gap-3 overflow-hidden rounded-2xl border border-primary/35 bg-[linear-gradient(135deg,var(--color-primary)_0%,color-mix(in_oklab,var(--color-primary)_82%,black)_100%)] px-5 py-4 text-primary-foreground shadow-[var(--shadow-card)] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[var(--shadow-card-hover)]"
    >
      <span className="pointer-events-none absolute inset-y-0 right-0 w-24 bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.28),transparent_70%)] opacity-80" />
      <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-white/18 text-white ring-1 ring-white/30 backdrop-blur-sm">
        <Sparkles size={18} />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-[15px] font-extrabold leading-tight tracking-[-0.01em]">Dowiedz się więcej</p>
        <p className="text-[12px] text-primary-foreground/85 line-clamp-2">Sprawdź praktyczne informacje, dodatkowy kontekst i szybki research o tym miejscu</p>
      </div>
      <div className="shrink-0 rounded-full bg-white/16 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.14em] text-white ring-1 ring-white/25">
        Kliknij
      </div>
      <ExternalLink size={15} className="shrink-0 text-white/90 transition-transform duration-200 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
    </a>
  );
}
