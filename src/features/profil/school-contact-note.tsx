import { Info } from "lucide-react";
import { Suspense, type ReactNode } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { getTenant } from "@/lib/tenant";

async function SchoolPhone() {
  const tenant = await getTenant();
  if (!tenant) return null;
  return (
    <>
      {" "}
      au{" "}
      <a
        href={`tel:${tenant.phone.replace(/[^\d+]/g, "")}`}
        className="font-semibold whitespace-nowrap text-brand underline decoration-brand/30 underline-offset-2 tabular-nums hover:decoration-brand"
      >
        {tenant.phone}
      </a>
    </>
  );
}

/**
 * Card footer for read-only information: "<lead> contactez votre auto-école au 01 23 45 67 89."
 * The phone number is a tel: link, streamed in its own Suspense boundary.
 */
export function SchoolContactNote({ lead }: { lead: ReactNode }) {
  return (
    <div className="flex items-start gap-3 border-t border-line px-5 py-4 text-sm text-ink-muted sm:px-6">
      <Info className="mt-0.5 size-4 shrink-0 text-ink-subtle" aria-hidden />
      <p>
        {lead} contactez votre auto-école
        <Suspense fallback={<Skeleton inline className="ml-1 h-4 w-28" />}>
          <SchoolPhone />
        </Suspense>
        .
      </p>
    </div>
  );
}
