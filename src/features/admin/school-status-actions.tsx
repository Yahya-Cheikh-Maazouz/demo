"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { Ban, CircleCheck, CreditCard, Lock, type LucideIcon } from "lucide-react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { SubmitButton } from "@/components/ui/submit-button";
import type { SchoolStatusAction, SubscriptionStatus } from "@/lib/types";
import { INITIAL_SCHOOL_ACTION_STATE } from "./action-state";
import { setSchoolStatusAction } from "./actions";

type ActionCopy = {
  label: string;
  icon: LucideIcon;
  variant: "primary" | "secondary" | "danger-ghost";
  title: string;
  description: string;
  confirm: string;
  pending: string;
  confirmVariant: "primary" | "danger";
};

function copyFor(action: SchoolStatusAction, status: SubscriptionStatus, name: string, graceDays: number): ActionCopy {
  switch (action) {
    case "echec_paiement":
      return {
        label: "Simuler un échec de paiement",
        icon: CreditCard,
        variant: "secondary",
        title: "Simuler un échec de paiement ?",
        description: `L'abonnement de ${name} passe en « Impayé » et le gérant est prévenu par e-mail. L'espace reste utilisable pendant ${graceDays} jours, puis passe en lecture seule.`,
        confirm: "Enregistrer l'échec",
        pending: "Enregistrement…",
        confirmVariant: "primary",
      };
    case "fin_delai_grace":
      return {
        label: "Fin du délai de grâce",
        icon: Lock,
        variant: "secondary",
        title: "Terminer le délai de grâce ?",
        description: `L'espace de ${name} passe en lecture seule : l'équipe, les élèves et les parents consultent leurs informations, mais ne peuvent plus rien modifier jusqu'au paiement.`,
        confirm: "Passer en lecture seule",
        pending: "Passage en lecture seule…",
        confirmVariant: "danger",
      };
    case "suspendre":
      return {
        label: "Suspendre",
        icon: Ban,
        variant: "danger-ghost",
        title: `Suspendre ${name} ?`,
        description:
          "Seul le gérant pourra encore se connecter, pour régulariser l'abonnement. L'équipe, les élèves et les parents sont refusés. Rien n'est supprimé.",
        confirm: "Suspendre l'auto-école",
        pending: "Suspension…",
        confirmVariant: "danger",
      };
    case "reactiver":
      return status === "suspendu"
        ? {
            label: "Réactiver",
            icon: CircleCheck,
            variant: "primary",
            title: `Réactiver ${name} ?`,
            description: "L'abonnement redevient actif : tout le monde peut de nouveau se connecter et faire des modifications.",
            confirm: "Réactiver l'auto-école",
            pending: "Réactivation…",
            confirmVariant: "primary",
          }
        : {
            label: "Paiement reçu",
            icon: CircleCheck,
            variant: "primary",
            title: "Enregistrer le paiement ?",
            description: `Le paiement de ${name} est reçu : l'abonnement redevient actif et la prochaine échéance est dans 30 jours.`,
            confirm: "Paiement reçu",
            pending: "Enregistrement…",
            confirmVariant: "primary",
          };
  }
}

/**
 * Status actions of a school, each confirmed in a dialog and written to the platform journal.
 * The real platform runs the payment events itself (Stripe Billing); here they are simulated.
 */
export function SchoolStatusActions({
  slug,
  name,
  status,
  actions,
  graceDays,
}: {
  slug: string;
  name: string;
  status: SubscriptionStatus;
  actions: SchoolStatusAction[];
  graceDays: number;
}) {
  const [state, formAction] = useActionState(setSchoolStatusAction, INITIAL_SCHOOL_ACTION_STATE);
  // The dialog stays open until a success newer than its opening.
  const [opened, setOpened] = useState<{ action: SchoolStatusAction; since: number } | null>(null);
  const resolved = opened !== null && state.status === "success" && (state.attempt ?? 0) > opened.since;
  const current = opened && !resolved ? opened.action : null;
  const messageRef = useRef<HTMLDivElement>(null);

  // The button that opened the dialog may be gone after the change: put the focus on the result.
  useEffect(() => {
    if (state.status === "success") messageRef.current?.focus();
  }, [state]);

  const copy = current ? copyFor(current, status, name, graceDays) : null;

  return (
    <div className="space-y-4">
      {state.status === "success" && state.message && (
        <div ref={messageRef} tabIndex={-1} className="rounded-2xl outline-none">
          <Alert tone="success" key={state.attempt}>
            {state.message}
          </Alert>
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        {actions.map((action) => {
          const { label, icon: Icon, variant } = copyFor(action, status, name, graceDays);
          return (
            <Button
              key={action}
              variant={variant}
              icon={<Icon className="size-4" aria-hidden />}
              aria-haspopup="dialog"
              onClick={() => setOpened({ action, since: state.attempt ?? 0 })}
            >
              {label}
            </Button>
          );
        })}
      </div>

      <Dialog open={copy !== null} onClose={() => setOpened(null)} title={copy?.title ?? ""} description={copy?.description}>
        {current && copy && (
          <form action={formAction} className="space-y-4">
            <input type="hidden" name="slug" value={slug} />
            <input type="hidden" name="action" value={current} />
            {state.status === "error" && state.message && (state.attempt ?? 0) > (opened?.since ?? 0) && (
              <Alert tone="danger" role="alert" key={state.attempt}>
                {state.message}
              </Alert>
            )}
            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <Button variant="secondary" onClick={() => setOpened(null)}>
                Annuler
              </Button>
              <SubmitButton variant={copy.confirmVariant} pendingLabel={copy.pending}>
                {copy.confirm}
              </SubmitButton>
            </div>
          </form>
        )}
      </Dialog>
    </div>
  );
}
