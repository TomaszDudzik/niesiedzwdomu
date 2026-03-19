import { cn } from "@/lib/utils";

interface BadgeProps {
  children: React.ReactNode;
  variant?: "default" | "outline" | "success";
  className?: string;
}

export function Badge({ children, variant = "default", className }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium",
        {
          "bg-[#F5F5F5] text-[#555]": variant === "default",
          "border border-border text-muted": variant === "outline",
          "bg-emerald-50 text-emerald-600": variant === "success",
        },
        className
      )}
    >
      {children}
    </span>
  );
}
