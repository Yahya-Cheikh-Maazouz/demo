import { KeyRound, ShieldCheck, ShieldOff } from "lucide-react";
import { Suspense } from "react";
import { Badge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/cn";
import { getSession } from "@/lib/session";
import { SIDE_BUTTON } from "./layout";

async function TwoFactorStatus() {
  const session = await getSession();
  const enabled = session?.user.twoFactorEnabled ?? false;
  return enabled ? (
    <Badge tone="success" icon={ShieldCheck}>
      Activée
    </Badge>
  ) : (
    <Badge tone="neutral" icon={ShieldOff}>
      Non activée
    </Badge>
  );
}

/** Password and two-factor authentication. Render inside a <Card>. */
export function SecuritySettings() {
  return (
    <div className="divide-y divide-line px-5 sm:px-6">
      <div className="py-5">
        <h3 className="font-semibold text-ink">Mot de passe</h3>
        <p className="mt-1 text-sm text-ink-muted">
          Vous recevrez un lien par e-mail pour en choisir un nouveau.
        </p>
        <ButtonLink
          href="/mot-de-passe-oublie"
          variant="secondary"
          icon={<KeyRound className="size-4" aria-hidden />}
          className={cn("mt-4", SIDE_BUTTON)}
        >
          Modifier mon mot de passe
        </ButtonLink>
      </div>

      <div className="py-5">
        <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1.5">
          <h3 className="font-semibold text-ink">Double authentification</h3>
          <Suspense fallback={<Skeleton className="h-6 w-24 rounded-full" />}>
            <TwoFactorStatus />
          </Suspense>
        </div>
        <p className="mt-1 text-sm text-ink-muted">
          Facultative pour les élèves. Elle ajoute un code à 6 chiffres, donné par une application sur votre
          téléphone, à chaque connexion.
        </p>
      </div>
    </div>
  );
}
