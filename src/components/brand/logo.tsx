import { cn } from "@/lib/utils";

interface LogoProps {
  variant?: "default" | "light";
  size?: "sm" | "md" | "lg";
  className?: string;
}

const config = {
  sm: { fontSize: "text-[14px]", arrowW: 10, arrowH: 8, gap: "ml-[5px]", strokeWidth: 1.2 },
  md: { fontSize: "text-[16px]", arrowW: 12, arrowH: 10, gap: "ml-[6px]", strokeWidth: 1.3 },
  lg: { fontSize: "text-[22px]", arrowW: 16, arrowH: 12, gap: "ml-[8px]", strokeWidth: 1.5 },
};

function Arrow({ w, h, stroke, strokeWidth }: { w: number; h: number; stroke: string; strokeWidth: number }) {
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} fill="none" className="shrink-0">
      <path
        d={`M0 ${h / 2}H${w - 2}M${w - h / 2 - 1} 1L${w - 1} ${h / 2}L${w - h / 2 - 1} ${h - 1}`}
        stroke={stroke}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function Logo({ variant = "default", size = "md", className }: LogoProps) {
  const c = config[size];
  const color = variant === "light" ? "#FFFFFF" : "#2D2926";
  const arrowColor = variant === "light" ? "rgba(255,255,255,0.3)" : "#D4623C";

  return (
    <span className={cn("inline-flex items-center", className)}>
      <span className={cn("font-medium tracking-[-0.02em] leading-none", c.fontSize)} style={{ color }}>
        niesiedzwdomu
      </span>
      <span className={c.gap}>
        <Arrow w={c.arrowW} h={c.arrowH} stroke={arrowColor} strokeWidth={c.strokeWidth} />
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
  const fg = variant === "light" ? "#FFFFFF" : "#D4623C";
  const bg = variant === "light" ? "#2D2926" : "#FFFFFF";
  const hasBorder = variant !== "light";

  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
      <rect
        x={hasBorder ? 0.5 : 0} y={hasBorder ? 0.5 : 0}
        width={hasBorder ? 31 : 32} height={hasBorder ? 31 : 32}
        rx={hasBorder ? 7.5 : 8} fill={bg} stroke={hasBorder ? "#E8E4DF" : "none"}
      />
      <path d="M11 16H21M18 12.5L21.5 16L18 19.5" stroke={fg} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
