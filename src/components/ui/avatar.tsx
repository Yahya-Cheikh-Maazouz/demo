import { cn } from "@/lib/cn";

const SIZES = { sm: "size-8 text-xs", md: "size-10 text-sm", lg: "size-16 text-xl" };

/** Initials avatar. Decorative: the person's name must be written next to it. */
export function Avatar({
  initials,
  size = "md",
  solid = false,
  className,
}: {
  initials: string;
  size?: keyof typeof SIZES;
  /** Brand background with white initials (instead of the soft brand tint). */
  solid?: boolean;
  className?: string;
}) {
  return (
    <span
      aria-hidden
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded-full font-bold",
        solid ? "bg-brand text-on-brand" : "bg-brand-soft text-brand",
        SIZES[size],
        className,
      )}
    >
      {initials}
    </span>
  );
}
