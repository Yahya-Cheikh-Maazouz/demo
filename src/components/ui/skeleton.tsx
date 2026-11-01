import { cn } from "@/lib/cn";

/**
 * Loading placeholder. Give it the size of the content it stands for, to avoid layout shift.
 * The default radius only applies when `className` sets none (cn does not merge Tailwind classes).
 */
export function Skeleton({ className, inline }: { className?: string; inline?: boolean }) {
  const Tag = inline ? "span" : "div";
  return (
    <Tag
      aria-hidden
      className={cn(
        "animate-pulse bg-line/70",
        inline && "inline-block align-middle",
        !className?.includes("rounded") && "rounded-lg",
        className,
      )}
    />
  );
}

/** Screen-reader announcement for a loading region; pair with visual skeletons. */
export function LoadingLabel({ children = "Chargement…" }: { children?: string }) {
  return (
    <p role="status" className="sr-only">
      {children}
    </p>
  );
}
