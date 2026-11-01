import Link from "next/link";
import { ChevronRight } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

type HomeSectionProps = {
  /** Unique on the page: labels the <section> landmark. */
  id: string;
  title: string;
  /** Optional link aligned right of the title (e.g. "Tout voir"). */
  action?: ReactNode;
  className?: string;
  children: ReactNode;
};

/**
 * A home section: an h2 above its content. The title row is always 44px high, so titles of the
 * main and side columns line up on desktop, with or without a link next to them.
 */
export function HomeSection({ id, title, action, className, children }: HomeSectionProps) {
  return (
    <section aria-labelledby={id} className={className}>
      <div className="mb-2 flex min-h-11 items-center justify-between gap-3">
        <h2 id={id} className="text-lg font-bold tracking-tight text-ink">
          {title}
        </h2>
        {action}
      </div>
      {children}
    </section>
  );
}

/** Brand-colored text link with a chevron, 44px high. `srLabel` completes vague labels such as "Tout voir". */
export function TextLink({
  href,
  children,
  srLabel,
  className,
}: {
  href: string;
  children: ReactNode;
  srLabel?: string;
  className?: string;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "inline-flex h-11 shrink-0 items-center gap-1 rounded-lg px-2 text-sm font-semibold whitespace-nowrap text-brand transition-colors hover:bg-brand-soft",
        className,
      )}
    >
      {children}
      {srLabel && <span className="sr-only"> {srLabel}</span>}
      <ChevronRight className="size-4" aria-hidden />
    </Link>
  );
}
