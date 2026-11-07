import type { Metadata } from "next";
import { Suspense } from "react";
import { Gauge, Landmark } from "lucide-react";
import { AccessDenied } from "@/components/gestion/access-denied";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { LoadingLabel, Skeleton } from "@/components/ui/skeleton";
import { TONE_BORDER } from "@/components/ui/tone";
import { QuotaMeters } from "@/features/abonnement/quota-meters";
import { RegularizeButton } from "@/features/abonnement/regularize-button";
import { SUBSCRIPTION_STATUS_META } from "@/features/abonnement/status-meta";
import { SubscriptionStatusBadge } from "@/features/abonnement/subscription-status-badge";
import { getStaffUser, getSubscriptionOverview } from "@/lib/api/gestion";
import { cn } from "@/lib/cn";
import { formatCurrency, formatDate } from "@/lib/format";
import { can } from "@/lib/permissions";
import type { SubscriptionOverview } from "@/lib/types";

export const metadata: Metadata = { title: "Abonnement" };

const plural = (count: number, one: string, many: string) => `${count} ${count > 1 ? many : one}`;

/** What the status means for the gérant, with its dates. */
function explanation(sub: SubscriptionOverview): { title: string; text: string } {
  switch (sub.status) {
    case "essai":
      return {
        title: "Période d'essai",
        text: sub.trialEndsAt
          ? `Votre essai gratuit se termine le ${formatDate(sub.trialEndsAt)} : le premier paiement aura lieu à cette date.`
          : "Votre essai gratuit est en cours.",
      };
    case "actif":
      return { title: "Abonnement à jour", text: `Tout fonctionne normalement. Prochain prélèvement le ${formatDate(sub.renewsAt)}.` };
    case "impaye":
      return {
        title: "Paiement refusé",
        text: `Le dernier prélèvement${sub.unpaidSince ? ` du ${formatDate(sub.unpaidSince)}` : ""} a été refusé. Mettez à jour votre moyen de paiement${
          sub.graceEndsAt ? ` avant le ${formatDate(sub.graceEndsAt)}` : ""
        } : passé ce délai, l'espace passera en lecture seule pour toute l'équipe, vos élèves et les parents.`,
      };
    case "lecture_seule":
      return {
        title: "Espace en lecture seule",
        text: "Le délai de grâce est dépassé : chacun peut consulter ses informations, mais plus aucune modification n'est possible (réservations, encaissements, messages…). Régularisez pour tout retrouver.",
      };
    case "suspendu":
      return {
        title: "Espace suspendu",
        text: "Votre équipe, vos élèves et les parents ne peuvent plus se connecter : vous seul y avez accès, pour régulariser. Rien n'a été supprimé.",
      };
  }
}

async function SubscriptionContent() {
  const user = await getStaffUser();
  if (!can(user, "abonnement.gerer")) return <AccessDenied what="à l'abonnement de l'auto-école" />;
  const sub = await getSubscriptionOverview();
  const meta = SUBSCRIPTION_STATUS_META[sub.status];
  const { title, text } = explanation(sub);
  const needed = sub.status === "impaye" || sub.status === "lecture_seule" || sub.status === "suspendu";

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      <Card className={cn("border-2 lg:col-span-2", TONE_BORDER[meta.tone])}>
        <CardBody className="space-y-5">
          <div>
            <div className="flex flex-wrap items-center gap-3">
              <h2 className="text-2xl font-extrabold tracking-[-0.02em] text-ink">{title}</h2>
              <SubscriptionStatusBadge status={sub.status} className="px-3 py-1.5 text-sm" />
            </div>
            <p className="mt-2 text-ink-muted">{text}</p>
          </div>
          <RegularizeButton needed={needed} amount={sub.plan.monthlyPrice} planName={sub.plan.name} />
        </CardBody>
      </Card>

      <Card>
        <CardHeader title="Formule" icon={<Landmark className="size-5" aria-hidden />} />
        <CardBody>
          <p className="text-2xl font-extrabold tracking-[-0.02em] text-ink">{sub.plan.name}</p>
          <p className="text-ink-muted tabular-nums">{formatCurrency(sub.plan.monthlyPrice, { round: true })} par mois</p>
          <p className="mt-2 text-sm text-ink-muted">
            {plural(sub.plan.limits.students, "élève actif", "élèves actifs")} · {plural(sub.plan.limits.instructors, "moniteur", "moniteurs")} ·{" "}
            {plural(sub.plan.limits.offices, "site", "sites")}
          </p>
        </CardBody>
      </Card>

      <Card className="lg:col-span-3">
        <CardHeader
          title="Utilisation de la formule"
          description="Avertissement à 80 % d'une limite ; à 100 %, la création est bloquée, mais rien de l'existant."
          icon={<Gauge className="size-5" aria-hidden />}
        />
        <CardBody>
          <QuotaMeters quotas={sub.quotas} className="grid gap-x-8 gap-y-5 sm:grid-cols-3" />
        </CardBody>
      </Card>
    </div>
  );
}

function SubscriptionSkeleton() {
  return (
    <div className="grid gap-6 lg:grid-cols-3">
      <LoadingLabel>Chargement de l&apos;abonnement…</LoadingLabel>
      <Skeleton className="h-60 rounded-3xl lg:col-span-2" />
      <Skeleton className="h-60 rounded-3xl" />
      <Skeleton className="h-44 rounded-3xl lg:col-span-3" />
    </div>
  );
}

export default function SubscriptionPage() {
  return (
    <>
      <PageHeader eyebrow="Mon auto-école" title="Abonnement" description="Votre formule et l'état de votre abonnement à la plateforme." />
      <Suspense fallback={<SubscriptionSkeleton />}>
        <SubscriptionContent />
      </Suspense>
    </>
  );
}
