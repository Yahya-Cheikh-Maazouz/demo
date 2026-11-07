import Link from "next/link";
import { CarFront } from "lucide-react";
import { cn } from "@/lib/cn";

type PlatformBrandProps = {
  /** Small line under the name, e.g. "Back-office". */
  subtitle?: string;
  href?: string;
  size?: "md" | "lg";
  /** "dark": white text, for the dark sidebar. */
  tone?: "light" | "dark";
  className?: string;
};

/** Mark of the platform itself (back-office host): never an auto-école's brand. */
export function PlatformBrand({ subtitle, href, size = "md", tone = "light", className }: PlatformBrandProps) {
  const content = (
    <>
      <span
        aria-hidden
        className={cn(
          "flex shrink-0 items-center justify-center rounded-xl bg-brand text-on-brand shadow-sm",
          size === "lg" ? "size-12" : "size-9",
        )}
      >
        <CarFront className={size === "lg" ? "size-6" : "size-5"} strokeWidth={2.2} />
      </span>
      <span className="min-w-0 text-left">
        <span
          className={cn(
            "block truncate font-bold",
            tone === "dark" ? "text-white" : "text-ink",
            size === "lg" ? "text-lg" : "text-sm",
          )}
        >
          Plateforme auto-école
        </span>
        {subtitle && (
          <span className={cn("block truncate text-xs font-medium", tone === "dark" ? "text-white/60" : "text-ink-subtle")}>
            {subtitle}
          </span>
        )}
      </span>
    </>
  );

  const classes = cn("flex min-w-0 items-center gap-3", className);
  return href ? (
    <Link href={href} className={cn(classes, "rounded-lg", tone === "dark" && "focus-visible:outline-brand-bright")}>
      {content}
    </Link>
  ) : (
    <div className={classes}>{content}</div>
  );
}
