import { cn } from "@/lib/utils";

interface BadgeProps {
  children: React.ReactNode;
  variant?: "default" | "outline" | "success" | "primary";
  className?: string;
}

export function Badge({ children, variant = "default", className }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium",
        {
          "bg-accent text-foreground/70": variant === "default",
          "border border-border text-muted": variant === "outline",
          "bg-success/10 text-success": variant === "success",
          "bg-primary/10 text-primary": variant === "primary",
        },
        className
      )}
    >
      {children}
    </span>
  );
}
