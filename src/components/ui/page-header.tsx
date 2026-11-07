import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

/** The page's only <h1>, with an optional eyebrow label above it. Actions wrap under the title on mobile. */
export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
  className,
}: {
  eyebrow?: ReactNode;
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("mb-6 flex flex-col gap-4 sm:mb-8 sm:flex-row sm:items-end sm:justify-between", className)}>
      <div className="min-w-0">
        {eyebrow && <p className="eyebrow mb-2">{eyebrow}</p>}
        <h1 className="text-[1.75rem] leading-tight font-extrabold tracking-[-0.03em] text-ink sm:text-4xl">{title}</h1>
        {description && <p className="mt-2 text-base text-ink-muted">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}
