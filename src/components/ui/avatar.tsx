import { cn } from "@/lib/cn";

const SIZES = { sm: "size-8 text-xs", md: "size-10 text-sm", lg: "size-16 text-xl" };

/** Initials avatar. Decorative: the person's name must be written next to it. */
export function Avatar({
  initials,
  size = "md",
  className,
}: {
  initials: string;
  size?: keyof typeof SIZES;
  className?: string;
}) {
  return (
    <span
      aria-hidden
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded-full bg-brand-soft font-bold text-brand",
        SIZES[size],
        className,
      )}
    >
      {initials}
    </span>
  );
}
