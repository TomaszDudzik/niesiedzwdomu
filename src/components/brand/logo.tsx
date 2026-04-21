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

/* Simple running-person silhouette, drawn in white */
function RunnerIcon({ size }: { size: number }) {
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
      {/* head */}
      <circle cx="14.5" cy="3.5" r="2" fill="white" stroke="none" />
      {/* torso — leaning forward */}
      <path d="M13 5.5 L10 11" />
      {/* back arm */}
      <path d="M13 7.5 L16.5 6" />
      {/* front arm */}
      <path d="M11 8.5 L8 11.5" />
      {/* back leg */}
      <path d="M10 11 L13.5 15 L11 19.5" />
      {/* front leg */}
      <path d="M10 11 L7 15.5 L9.5 19.5" />
    </svg>
  );
}

export function Logo({ variant = "default", size = "md", className }: LogoProps) {
  const c = config[size];
  const badgeBg = variant === "light" ? "bg-white/20" : "bg-primary";

  /* Text colours per word segment */
  const nieColor   = variant === "light" ? "text-white"    : "text-primary";
  const siedzColor = variant === "light" ? "text-white/80" : "text-foreground";
  const wColor     = variant === "light" ? "text-white"    : "text-primary";
  const domuColor  = variant === "light" ? "text-white/80" : "text-foreground";

  return (
    <span className={cn("inline-flex select-none items-center", c.gap, className)}>
      {/* Badge */}
      <span
        className={cn("flex shrink-0 items-center justify-center", c.rounded, badgeBg)}
        style={{ width: c.badge, height: c.badge }}
      >
        <RunnerIcon size={c.iconSize} />
      </span>

      {/* Word-mark */}
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
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <rect width="32" height="32" rx="8" fill={bg} />
      <g stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="19" cy="8" r="2.5" fill="white" stroke="none" />
        <path d="M17 10.5 L14 16" />
        <path d="M17 12 L21 11" />
        <path d="M15 13 L12 16" />
        <path d="M14 16 L17.5 20 L15 24" />
        <path d="M14 16 L11 20 L13.5 24" />
      </g>
    </svg>
  );
}
