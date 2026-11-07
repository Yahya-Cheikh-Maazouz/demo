import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

const STROKE = 9;
const RADIUS = 50 - STROKE / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

type ProgressRingProps = {
  /** 0 to 100. */
  value: number;
  /** Size of the ring (e.g. "size-28"). */
  className?: string;
  /** Text colors of the track and of the indicator (the strokes use currentColor). */
  trackClassName?: string;
  indicatorClassName?: string;
  /** Centered content, e.g. the percentage. */
  children?: ReactNode;
};

/**
 * Circular meter. The ring itself is decorative: the value must also be written as text, in
 * `children` or next to it.
 */
export function ProgressRing({
  value,
  className,
  trackClassName = "text-subtle",
  indicatorClassName = "text-brand",
  children,
}: ProgressRingProps) {
  const clamped = Math.min(100, Math.max(0, value));
  return (
    <div className={cn("relative shrink-0", className)}>
      <svg viewBox="0 0 100 100" className="size-full -rotate-90" aria-hidden>
        <circle cx="50" cy="50" r={RADIUS} fill="none" stroke="currentColor" strokeWidth={STROKE} className={trackClassName} />
        {clamped > 0 && (
          <circle
            cx="50"
            cy="50"
            r={RADIUS}
            fill="none"
            stroke="currentColor"
            strokeWidth={STROKE}
            strokeLinecap="round"
            strokeDasharray={CIRCUMFERENCE}
            strokeDashoffset={CIRCUMFERENCE * (1 - clamped / 100)}
            className={indicatorClassName}
          />
        )}
      </svg>
      {children && <div className="absolute inset-0 flex flex-col items-center justify-center text-center">{children}</div>}
    </div>
  );
}
