import { Check } from "lucide-react";
import type { ComponentProps, ReactNode } from "react";
import { cn } from "@/lib/cn";

type RadioCardProps = Omit<ComponentProps<"input">, "type" | "className" | "children"> & {
  /** Card content. Give the title an id and pass it as `aria-labelledby` to keep the name short. */
  children: ReactNode;
  /** Red border only: link the group's error with `aria-describedby` (radios do not support aria-invalid). */
  invalid?: boolean;
  className?: string;
};

/**
 * A real radio input styled as a selectable card. The input stays in the accessibility tree
 * (arrow keys move between options of the same `name`); the card shows its focus and checked state.
 */
export function RadioCard({ children, invalid, className, ...inputProps }: RadioCardProps) {
  return (
    <label
      className={cn(
        "group relative flex cursor-pointer items-start gap-3 rounded-2xl border bg-surface p-4",
        "transition-[border-color,background-color,box-shadow] duration-150",
        invalid ? "border-danger" : "border-line hover:border-line-strong",
        "has-checked:border-brand has-checked:bg-brand-soft/70 has-checked:shadow-[inset_0_0_0_1px_var(--brand)]",
        "has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-brand",
        className,
      )}
    >
      <input type="radio" className="sr-only" {...inputProps} />
      <span
        aria-hidden
        className={cn(
          "mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full border-2 bg-surface transition-colors",
          invalid ? "border-danger" : "border-line-strong",
          "group-has-checked:border-brand group-has-checked:bg-brand",
        )}
      >
        <Check className="size-3 text-on-brand opacity-0 group-has-checked:opacity-100" strokeWidth={3.5} />
      </span>
      {children}
    </label>
  );
}
