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
      className="group flex items-center gap-2.5 rounded-xl border border-primary/20 bg-gradient-to-r from-primary/10 via-primary/5 to-transparent px-4 py-3 text-[13px] text-foreground transition-all duration-200 hover:border-primary/35 hover:from-primary/15 hover:via-primary/10"
    >
      <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-primary/15 text-primary">
        <Sparkles size={14} />
      </span>
      <div className="min-w-0 flex-1">
        <p className="font-semibold leading-tight">Dowiedz się więcej</p>
        <p className="text-[11px] text-muted truncate">Szybki research: praktyczne informacje i kontekst</p>
      </div>
      <ExternalLink size={13} className="text-muted group-hover:text-primary transition-colors duration-200" />
    </a>
  );
}
