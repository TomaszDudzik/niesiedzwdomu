import Image from "next/image";
import { cn } from "@/lib/utils";

interface LogoProps {
  variant?: "default" | "light" | "dark";
  size?: "sm" | "md" | "lg";
  className?: string;
}

const heights = { sm: 28, md: 36, lg: 48 };

export function Logo({ size = "md", className }: LogoProps) {
  const h = heights[size];
  const w = Math.round(h * 4.2);

  return (
    <span className={cn("inline-flex select-none items-center", className)}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/logo3.jpg"
        alt="Nie Siedź W Domu"
        height={h}
        style={{ height: h, width: "auto" }}
      />
    </span>
  );
}

export function LogoIcon({
  variant = "default",
  size = 32,
  className,
}: {
  variant?: "default" | "light" | "dark";
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
