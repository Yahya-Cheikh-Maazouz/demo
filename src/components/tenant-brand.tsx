import Link from "next/link";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/cn";
import { getTenant } from "@/lib/tenant";

type TenantBrandProps = {
  /** Small line under the school name, e.g. "Espace élève". */
  subtitle?: string;
  href?: string;
  size?: "md" | "lg";
  className?: string;
};

/** Logo square + name of the current auto-école. Render inside <Suspense>. */
export async function TenantBrand({ subtitle, href, size = "md", className }: TenantBrandProps) {
  const tenant = await getTenant();
  if (!tenant) return null;

  const content = (
    <>
      <span
        aria-hidden
        className={cn(
          "flex shrink-0 items-center justify-center rounded-xl bg-brand font-bold text-on-brand shadow-sm",
          size === "lg" ? "size-12 text-base" : "size-9 text-sm",
        )}
      >
        {tenant.logoInitials}
      </span>
      <span className="min-w-0 text-left">
        <span className={cn("block truncate font-bold text-ink", size === "lg" ? "text-lg" : "text-sm")}>
          {tenant.name}
        </span>
        {subtitle && <span className="block truncate text-xs font-medium text-ink-subtle">{subtitle}</span>}
      </span>
    </>
  );

  const classes = cn("flex min-w-0 items-center gap-3", className);
  return href ? (
    <Link href={href} className={cn(classes, "rounded-lg")}>
      {content}
    </Link>
  ) : (
    <div className={classes}>{content}</div>
  );
}

export function TenantBrandSkeleton({ size = "md" }: { size?: "md" | "lg" }) {
  return (
    <div className="flex items-center gap-3">
      <Skeleton className={cn("rounded-xl", size === "lg" ? "size-12" : "size-9")} />
      <Skeleton className="h-4 w-32" />
    </div>
  );
}
