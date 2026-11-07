"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { CreditCard, LockKeyhole } from "lucide-react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { SubmitButton } from "@/components/ui/submit-button";
import { formatCurrency } from "@/lib/format";
import { INITIAL_REGULARIZE_STATE } from "./action-state";
import { regularizeAction } from "./actions";

/**
 * "Mettre à jour le moyen de paiement" for an unpaid, read-only or suspended school (`needed`).
 * The real flow opens Stripe's secure form; the mock accepts the payment at once. Render it
 * whatever the status, so the confirmation stays on screen once the page shows "Actif".
 */
export function RegularizeButton({ needed, amount, planName }: { needed: boolean; amount: number; planName: string }) {
  const [state, formAction] = useActionState(regularizeAction, INITIAL_REGULARIZE_STATE);
  const [since, setSince] = useState<number | null>(null);
  const resolved = since !== null && state.status === "success" && (state.attempt ?? 0) > since;
  const open = since !== null && !resolved;
  const messageRef = useRef<HTMLDivElement>(null);

  // The page re-renders without this button once the subscription is active: focus the result.
  useEffect(() => {
    if (state.status === "success") messageRef.current?.focus();
  }, [state]);

  if (state.status === "success" && state.message && !needed) {
    return (
      <div ref={messageRef} tabIndex={-1} className="rounded-2xl outline-none">
        <Alert tone="success" title="Abonnement réactivé">
          {state.message}
        </Alert>
      </div>
    );
  }

  if (!needed) return null;

  return (
    <>
      <Button size="lg" icon={<CreditCard className="size-5" aria-hidden />} aria-haspopup="dialog" onClick={() => setSince(state.attempt ?? 0)}>
        Mettre à jour le moyen de paiement
      </Button>
      <Dialog
        open={open}
        onClose={() => setSince(null)}
        title="Mettre à jour le moyen de paiement"
        description={`Le montant dû, ${formatCurrency(amount)} (formule ${planName}), est prélevé sur la nouvelle carte. L'abonnement redevient actif dès le paiement accepté.`}
      >
        {open && (
          <form action={formAction} className="space-y-4">
            <p className="flex gap-3 rounded-2xl bg-subtle p-4 text-sm text-ink-muted">
              <LockKeyhole className="size-5 shrink-0 text-brand" aria-hidden />
              La carte est saisie sur le formulaire sécurisé de notre prestataire de paiement : elle n&apos;est jamais
              enregistrée par l&apos;auto-école. En démonstration, le paiement est accepté immédiatement.
            </p>
            {state.status === "error" && state.message && (state.attempt ?? 0) > (since ?? 0) && (
              <Alert tone="danger" role="alert" key={state.attempt}>
                {state.message}
              </Alert>
            )}
            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <Button variant="secondary" onClick={() => setSince(null)}>
                Annuler
              </Button>
              <SubmitButton pendingLabel="Paiement en cours…">Payer {formatCurrency(amount)}</SubmitButton>
            </div>
          </form>
        )}
      </Dialog>
    </>
  );
}
