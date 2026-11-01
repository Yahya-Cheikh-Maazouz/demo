import { Mail, Phone, type LucideIcon } from "lucide-react";
import { CardBody } from "@/components/ui/card";
import { LoadingLabel, Skeleton } from "@/components/ui/skeleton";
import { TenantBrand } from "@/components/tenant-brand";
import { getTenant } from "@/lib/tenant";

function ContactLink({ href, icon: Icon, label, value }: { href: string; icon: LucideIcon; label: string; value: string }) {
  return (
    <a
      href={href}
      className="flex min-h-14 items-center gap-3 rounded-xl px-2 py-1.5 transition-colors hover:bg-subtle"
    >
      <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-brand-soft text-brand">
        <Icon className="size-4.5" aria-hidden />
      </span>
      <span className="min-w-0">
        <span className="block text-xs font-medium text-ink-subtle">{label}</span>
        <span className="block text-sm font-semibold [overflow-wrap:anywhere] text-ink tabular-nums">{value}</span>
      </span>
    </a>
  );
}

/** Name and contact details of the auto-école, as tappable tel: and mailto: links. */
export async function SchoolCardBody() {
  const tenant = await getTenant();
  if (!tenant) {
    return (
      <CardBody>
        <p className="text-sm text-ink-muted">Les coordonnées de votre auto-école ne sont pas disponibles.</p>
      </CardBody>
    );
  }

  return (
    <CardBody>
      <TenantBrand subtitle={tenant.city} />
      <ul className="-mx-2 mt-3 space-y-1">
        <li>
          <ContactLink href={`tel:${tenant.phone.replace(/[^\d+]/g, "")}`} icon={Phone} label="Appeler" value={tenant.phone} />
        </li>
        <li>
          <ContactLink href={`mailto:${tenant.email}`} icon={Mail} label="Écrire un e-mail" value={tenant.email} />
        </li>
      </ul>
    </CardBody>
  );
}

export function SchoolCardSkeleton() {
  return (
    <CardBody>
      <LoadingLabel>Chargement des coordonnées de votre auto-école…</LoadingLabel>
      <div className="flex items-center gap-3">
        <Skeleton className="size-9 rounded-xl" />
        <div className="space-y-1.5">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-3 w-16" />
        </div>
      </div>
      <div className="mt-3 space-y-1">
        {[0, 1].map((i) => (
          <div key={i} className="flex min-h-14 items-center gap-3 py-1.5">
            <Skeleton className="size-10 rounded-xl" />
            <div className="space-y-1.5">
              <Skeleton className="h-3 w-14" />
              <Skeleton className="h-4 w-36" />
            </div>
          </div>
        ))}
      </div>
    </CardBody>
  );
}
