import { CircleAlert, CircleCheck, Info, TriangleAlert, type LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/cn";
import { TONE_BORDER, TONE_SOFT, type Tone } from "./tone";

const DEFAULT_ICON: Record<Tone, LucideIcon> = {
  neutral: Info,
  brand: Info,
  info: Info,
  success: CircleCheck,
  warning: TriangleAlert,
  danger: CircleAlert,
};

type AlertProps = {
  tone?: Tone;
  title?: ReactNode;
  children?: ReactNode;
  icon?: LucideIcon;
  /** Buttons or links shown under the text. */
  action?: ReactNode;
  /** "alert" interrupts screen readers: use it for errors that just happened. */
  role?: "status" | "alert";
  className?: string;
};

export function Alert({ tone = "info", title, children, icon, action, role = "status", className }: AlertProps) {
  const Icon = icon ?? DEFAULT_ICON[tone];
  return (
    <div role={role} className={cn("flex gap-3 rounded-2xl border p-4", TONE_SOFT[tone], TONE_BORDER[tone], className)}>
      <Icon className="mt-0.5 size-5 shrink-0" aria-hidden />
      <div className="min-w-0 flex-1 space-y-1">
        {title && <p className="font-semibold">{title}</p>}
        {children && <div className="text-sm text-ink-muted">{children}</div>}
        {action && <div className="flex flex-wrap gap-2 pt-2">{action}</div>}
      </div>
    </div>
  );
}
