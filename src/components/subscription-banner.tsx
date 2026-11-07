import type { ReactNode } from "react";
import { Lock, TriangleAlert } from "lucide-react";
import { Alert } from "@/components/ui/alert";
import { getSubscriptionStatus } from "@/lib/api/subscription-status";

/**
 * Banner shown at the top of every space when the school's subscription is unpaid, read-only or
 * suspended. Render inside <Suspense fallback={null}>. `action`: e.g. a link to the subscription
 * page, for the people who can settle it.
 */
export async function SubscriptionBanner({ action }: { action?: ReactNode } = {}) {
  const status = await getSubscriptionStatus();
  if (status === "impaye") {
    return (
      <Alert tone="warning" icon={TriangleAlert} title="Paiement de l'abonnement en attente" className="mb-6" action={action}>
        Le dernier prélèvement de l&apos;abonnement a échoué. Le gérant a été prévenu par e-mail ; l&apos;espace reste
        utilisable pendant le délai de grâce.
      </Alert>
    );
  }
  if (status === "lecture_seule") {
    return (
      <Alert tone="danger" icon={Lock} title="Espace en lecture seule" className="mb-6" action={action}>
        L&apos;abonnement de l&apos;auto-école est impayé : vous pouvez consulter vos informations, mais aucune
        modification n&apos;est possible pour le moment.
      </Alert>
    );
  }
  if (status === "suspendu") {
    return (
      <Alert tone="danger" icon={Lock} title="Espace suspendu" className="mb-6" action={action}>
        L&apos;abonnement de l&apos;auto-école est suspendu. Régularisez-le pour rouvrir l&apos;espace à votre équipe et à
        vos élèves.
      </Alert>
    );
  }
  return null;
}
