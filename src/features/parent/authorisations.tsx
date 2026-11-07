import { ListChecks, ShieldCheck } from "lucide-react";
import { Card, CardHeader } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { LoadingLabel, Skeleton } from "@/components/ui/skeleton";
import { ChildNotFound, NOT_FOUND_TITLE } from "./child-not-found";
import { ConsentRow } from "./consent-row";
import { getPageAuthorisations } from "./data";
import { ValidationItem } from "./validation-item";

/** "Les autorisations de Léa". Render inside <Suspense>. */
export async function AuthorisationsTitle({ child }: { child: string | null }) {
  const data = await getPageAuthorisations(child);
  return <>{data ? `Les autorisations de ${data.child.firstName}` : NOT_FOUND_TITLE}</>;
}

/** Proposals to validate, then the authorisations given by the parent. Render inside <Suspense>. */
export async function AuthorisationsContent({ child }: { child: string | null }) {
  const data = await getPageAuthorisations(child);
  if (!data) return <ChildNotFound />;
  const { child: kid, consents, validations } = data;
  const pending = validations.filter((v) => v.status === "en_attente");
  const decided = validations.filter((v) => v.status !== "en_attente");

  return (
    <div className="space-y-6">
      <Card id="a-valider" className="scroll-mt-24">
        <CardHeader
          title="À valider"
          description="Les propositions de l'auto-école qui demandent votre accord."
          icon={<ListChecks className="size-5" aria-hidden />}
        />
        {pending.length === 0 && (
          <EmptyState
            icon={ListChecks}
            title="Rien à valider"
            description="L'auto-école vous préviendra par e-mail si elle a besoin de votre accord."
            className={decided.length > 0 ? "pt-8 pb-6" : "py-8"}
          />
        )}
        {/* One list, pending first: an item keeps its confirmation message once it is decided. */}
        {validations.length > 0 && (
          <ul className="mt-3 divide-y divide-line border-t border-line" aria-label="Propositions de l'auto-école">
            {validations.map((v) => (
              <ValidationItem key={v.id} childId={kid.id} validation={v} />
            ))}
          </ul>
        )}
      </Card>

      <Card id="autorisations" className="scroll-mt-24">
        <CardHeader
          title="Autorisations"
          description={`${kid.firstName} est mineur·e : c'est vous qui les donnez. Vous pouvez changer d'avis à tout moment.`}
          icon={<ShieldCheck className="size-5" aria-hidden />}
        />
        <ul className="mt-3 divide-y divide-line border-t border-line">
          {consents.map((consent) => (
            <ConsentRow key={consent.key} childId={kid.id} firstName={kid.firstName} consent={consent} />
          ))}
        </ul>
      </Card>
    </div>
  );
}

export function AuthorisationsContentSkeleton() {
  return (
    <div className="space-y-6">
      <LoadingLabel>Chargement des autorisations…</LoadingLabel>
      <Card className="p-5 sm:p-6">
        <Skeleton className="h-6 w-32" />
        <Skeleton className="mt-2 h-4 w-80 max-w-full" />
        <Skeleton className="mt-6 h-36 w-full rounded-2xl" />
      </Card>
      <Card className="p-5 sm:p-6">
        <Skeleton className="h-6 w-40" />
        <Skeleton className="mt-2 h-4 w-96 max-w-full" />
        <div className="mt-6 space-y-6">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="space-y-2">
              <div className="flex justify-between gap-3">
                <Skeleton className="h-5 w-64 max-w-full" />
                <Skeleton className="h-7 w-12 rounded-full" />
              </div>
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-6 w-48 rounded-full" />
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
