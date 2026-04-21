import { cn } from "@/lib/utils";

interface LogoProps {
  variant?: "default" | "light";
  size?: "sm" | "md" | "lg";
  className?: string;
}

const config = {
  sm: { badge: 30, rounded: "rounded-lg", iconSize: 17, textSize: "text-[15px]", gap: "gap-2" },
  md: { badge: 38, rounded: "rounded-xl", iconSize: 22, textSize: "text-[19px]", gap: "gap-2.5" },
  lg: { badge: 50, rounded: "rounded-2xl", iconSize: 29, textSize: "text-[25px]", gap: "gap-3" },
};

function ActiveChildIcon({ size }: { size: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="white"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="12.5" cy="4.5" r="2.25" fill="white" stroke="none" />
      <path d="M11.75 7.5 9.75 11.25 13.25 13.25 16.75 10.25" />
      <path d="M9.75 11.25 6.5 9.5" />
      <path d="M13.25 13.25 15.5 18.5" />
      <path d="M11 13 7.25 18.75" />
      <path d="M13 8.25 17.75 6.75" />
    </svg>
  );
}

export function Logo({ variant = "default", size = "md", className }: LogoProps) {
  const c = config[size];
  const badgeBg = variant === "light" ? "bg-white/20" : "bg-primary";
  const nieColor = variant === "light" ? "text-white" : "text-primary";
  const siedzColor = variant === "light" ? "text-white" : "text-foreground";
  const wColor = variant === "light" ? "text-white" : "text-primary";
  const domuColor = variant === "light" ? "text-white/80" : "text-secondary";

  return (
    <span className={cn("inline-flex select-none items-center", c.gap, className)}>
      <span
        className={cn("flex shrink-0 items-center justify-center", c.rounded, badgeBg)}
        style={{ width: c.badge, height: c.badge }}
      >
        <ActiveChildIcon size={c.iconSize} />
      </span>

      <span className={cn("font-bold leading-none tracking-[-0.03em]", c.textSize)}>
        <span className={nieColor}>Nie</span>
        <span className={siedzColor}>Siedź</span>
        <span className={wColor}>W</span>
        <span className={domuColor}>Domu</span>
      </span>
    </span>
  );
}

export function LogoIcon({
  variant = "default",
  size = 32,
  className,
}: {
  variant?: "default" | "light";
  size?: number;
  className?: string;
}) {
  const bg = variant === "light" ? "rgba(255,255,255,0.2)" : "#D4623C";

  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
      <rect width="32" height="32" rx="8" fill={bg} />
      <g stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="19.5" cy="8.5" r="2.5" fill="white" stroke="none" />
        <path d="M18.5 12 15.5 17l5 3 5-4" />
        <path d="M15.5 17 11.5 14.5" />
        <path d="M20.5 20 23.5 26" />
        <path d="M17.5 19.5 13 26" />
        <path d="M20 13 26 11" />
      </g>
    </svg>
  );
}
