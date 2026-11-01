import { Phone } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { getTenant } from "@/lib/tenant";

/** "Need help?" line with the auto-école's phone number. Render inside <Suspense>. */
export async function AuthHelp() {
  const tenant = await getTenant();
  if (!tenant) return null;
  return (
    <p className="flex flex-wrap items-center justify-center gap-x-1 text-sm text-ink-muted lg:justify-start">
      <span>Un souci pour vous connecter&nbsp;?</span>
      <a
        href={`tel:${tenant.phone.replace(/\s/g, "")}`}
        aria-label={`Appeler ${tenant.name} au ${tenant.phone}`}
        className="inline-flex min-h-11 items-center gap-1.5 rounded-lg px-2 font-semibold text-brand tabular-nums hover:bg-brand-soft"
      >
        <Phone className="size-4" aria-hidden />
        {tenant.phone}
      </a>
    </p>
  );
}

/** Same height as the help line, so the footer does not pop in. */
export function AuthHelpSkeleton() {
  return (
    <div className="flex min-h-11 items-center justify-center lg:justify-start">
      <Skeleton className="h-5 w-72 max-w-full" />
    </div>
  );
}
