import { Suspense, type ReactNode } from "react";
import { headers } from "next/headers";
import { Link2, Mail, Phone, SearchX } from "lucide-react";
import { getTenant, isPlatformRequest } from "@/lib/tenant";
import { FormSkeleton } from "./auth-skeletons";

/**
 * Renders an auth page's content only on a known auto-école subdomain (or on the platform
 * back-office host), otherwise an "Auto-école introuvable" state. Used inside each page (not the layout) so the page segment
 * itself always renders.
 */
export function RequireTenant({ children, fallback }: { children: ReactNode; fallback?: ReactNode }) {
  return (
    <Suspense fallback={fallback ?? <FormSkeleton heading />}>
      <TenantGate>{children}</TenantGate>
    </Suspense>
  );
}

async function TenantGate({ children }: { children: ReactNode }) {
  const [tenant, platform] = await Promise.all([getTenant(), isPlatformRequest()]);
  if (tenant || platform) return children;
  const host = (await headers()).get("host")?.split(":")[0] ?? "";
  return <TenantNotFound host={host} />;
}

/** Keeps "auto-école" on one line: browsers may otherwise break after the hyphen. */
function AutoEcole() {
  return <span className="whitespace-nowrap">auto-école</span>;
}

const TIPS = [
  {
    icon: Link2,
    text: <>Vérifiez l&apos;adresse dans la barre du navigateur&nbsp;: une faute de frappe est vite arrivée.</>,
  },
  { icon: Mail, text: <>Utilisez le lien reçu par e-mail ou par SMS de la part de votre <AutoEcole />.</> },
  { icon: Phone, text: <>Si le problème continue, contactez directement votre <AutoEcole />.</> },
];

function TenantNotFound({ host }: { host: string }) {
  return (
    <div>
      <span className="flex size-14 items-center justify-center rounded-2xl bg-warning-soft text-warning">
        <SearchX className="size-7" aria-hidden />
      </span>
      <h1 className="mt-6 text-2xl font-bold tracking-tight text-ink sm:text-3xl">Auto-école introuvable</h1>
      <p className="mt-2 text-base text-ink-muted">
        {host ? (
          <>
            L&apos;adresse <strong className="font-semibold break-all text-ink">{host}</strong> ne correspond à
            aucune <AutoEcole />.
          </>
        ) : (
          <>
            Cette adresse ne correspond à aucune <AutoEcole />.
          </>
        )}
      </p>
      <ul className="mt-8 space-y-4">
        {TIPS.map(({ icon: Icon, text }, index) => (
          <li key={index} className="flex gap-3 text-sm text-ink-muted">
            <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-subtle text-ink-subtle">
              <Icon className="size-4.5" aria-hidden />
            </span>
            <span className="pt-2">{text}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
