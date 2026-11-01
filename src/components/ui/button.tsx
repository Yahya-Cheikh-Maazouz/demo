import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/cn";

type Variant = "primary" | "secondary" | "ghost" | "danger" | "danger-ghost";
type Size = "sm" | "md" | "lg";

type StyleOptions = { variant?: Variant; size?: Size; fullWidth?: boolean; className?: string };

const VARIANTS: Record<Variant, string> = {
  primary: "bg-brand text-on-brand shadow-sm hover:bg-brand-strong active:bg-brand-strong",
  secondary: "bg-surface text-ink border border-line-strong hover:bg-subtle active:bg-line",
  ghost: "text-ink-muted hover:bg-subtle hover:text-ink active:bg-line",
  danger: "bg-danger text-white shadow-sm hover:bg-danger/90 active:bg-danger/80",
  "danger-ghost": "text-danger hover:bg-danger-soft active:bg-danger-soft",
};

// sm stays at 40px: use it only next to other controls on desktop, never as a lone mobile target.
const SIZES: Record<Size, string> = {
  sm: "h-10 px-3 text-sm gap-1.5 rounded-lg",
  md: "h-11 px-4 text-sm gap-2 rounded-xl",
  lg: "h-12 px-5 text-base gap-2 rounded-xl",
};

export function buttonStyles({ variant = "primary", size = "md", fullWidth, className }: StyleOptions = {}) {
  return cn(
    "inline-flex select-none items-center justify-center font-semibold whitespace-nowrap",
    "transition-[background-color,color,box-shadow,transform] duration-150 ease-out active:scale-[0.98]",
    "disabled:pointer-events-none disabled:opacity-50 aria-disabled:pointer-events-none aria-disabled:opacity-50",
    VARIANTS[variant],
    SIZES[size],
    fullWidth && "w-full",
    className,
  );
}

type ButtonProps = ComponentProps<"button"> &
  StyleOptions & {
    /** Shows a spinner, disables the button and sets aria-busy. */
    loading?: boolean;
    icon?: ReactNode;
  };

export function Button({
  variant,
  size,
  fullWidth,
  className,
  loading,
  icon,
  disabled,
  children,
  type = "button",
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      className={buttonStyles({ variant, size, fullWidth, className })}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...props}
    >
      {loading ? <Loader2 className="size-4 animate-spin" aria-hidden /> : icon}
      {children}
    </button>
  );
}

type ButtonLinkProps = ComponentProps<typeof Link> & StyleOptions & { icon?: ReactNode };

export function ButtonLink({ variant, size, fullWidth, className, icon, children, ...props }: ButtonLinkProps) {
  return (
    <Link className={buttonStyles({ variant, size, fullWidth, className })} {...props}>
      {icon}
      {children}
    </Link>
  );
}
