import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/cn";
import { TONE_SOFT, type Tone } from "./tone";

type BadgeProps = { tone?: Tone; icon?: LucideIcon; children: ReactNode; className?: string };

/** Status label. Always carries text (and ideally an icon): color is never the only signal. */
export function Badge({ tone = "neutral", icon: Icon, children, className }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold whitespace-nowrap",
        TONE_SOFT[tone],
        className,
      )}
    >
      {Icon && <Icon className="size-3.5 shrink-0" aria-hidden strokeWidth={2.25} />}
      {children}
    </span>
  );
}
