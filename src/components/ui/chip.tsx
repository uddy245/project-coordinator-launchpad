import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

type Tone = "teal" | "amber" | "rose" | "neutral" | "dark";

const TONE_CLASSES: Record<Tone, string> = {
  teal: "bg-[hsl(var(--secondary))] text-[hsl(var(--accent))]",
  amber: "bg-[hsl(var(--status-progress)/0.14)] text-[hsl(24_70%_32%)]",
  rose: "bg-[hsl(var(--destructive)/0.12)] text-[hsl(var(--destructive))]",
  neutral: "bg-[hsl(var(--muted))] text-[hsl(var(--muted-foreground))]",
  dark: "bg-white/15 text-white",
};

/** Small pill badge — the Campus "chip" language, used for status and meta. */
export function Chip({
  tone = "neutral",
  children,
  className,
}: {
  tone?: Tone;
  children: ReactNode;
  className?: string;
}) {
  return <span className={cn("chip", TONE_CLASSES[tone], className)}>{children}</span>;
}
