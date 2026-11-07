"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { ArrowRightLeft } from "lucide-react";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { SubmitButton } from "@/components/ui/submit-button";
import { RadioCard } from "@/features/paiements/radio-card";
import { formatCurrency } from "@/lib/format";
import type { PlatformPlan } from "@/lib/types";
import { INITIAL_SCHOOL_ACTION_STATE } from "./action-state";
import { changeSchoolPlanAction } from "./actions";

const plural = (count: number, one: string, many: string) => `${count} ${count > 1 ? many : one}`;

/** "Changer de formule": the plans in a dialog, confirmed, then written to the platform journal. */
export function SchoolPlanForm({ slug, name, currentPlanId, plans }: { slug: string; name: string; currentPlanId: string; plans: PlatformPlan[] }) {
  const [state, formAction] = useActionState(changeSchoolPlanAction, INITIAL_SCHOOL_ACTION_STATE);
  const [since, setSince] = useState<number | null>(null);
  const resolved = since !== null && state.status === "success" && (state.attempt ?? 0) > since;
  const open = since !== null && !resolved;
  const messageRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (state.status === "success") messageRef.current?.focus();
  }, [state]);

  return (
    <div className="space-y-3">
      {state.status === "success" && state.message && (
        <div ref={messageRef} tabIndex={-1} className="rounded-2xl outline-none">
          <Alert tone="success" key={state.attempt}>
            {state.message}
          </Alert>
        </div>
      )}
      <Button
        variant="secondary"
        fullWidth
        icon={<ArrowRightLeft className="size-4" aria-hidden />}
        aria-haspopup="dialog"
        onClick={() => setSince(state.attempt ?? 0)}
      >
        Changer de formule
      </Button>

      <Dialog
        open={open}
        onClose={() => setSince(null)}
        title="Changer de formule"
        description={`La nouvelle formule de ${name} s'applique tout de suite. Une formule plus petite est refusée si l'usage actuel dépasse ses limites.`}
      >
        {open && (
          <form action={formAction} className="space-y-4">
            <input type="hidden" name="slug" value={slug} />
            <fieldset>
              <legend className="sr-only">Formule</legend>
              <div className="space-y-2">
                {plans.map((plan) => (
                  <RadioCard key={plan.id} name="planId" value={plan.id} defaultChecked={plan.id === currentPlanId} aria-labelledby={`formule-${plan.id}`}>
                    <span className="min-w-0 flex-1">
                      <span id={`formule-${plan.id}`} className="flex flex-wrap items-center gap-2 font-bold text-ink">
                        {plan.name} · {formatCurrency(plan.monthlyPrice, { round: true })} / mois
                        {plan.id === currentPlanId && <Badge tone="brand">Formule actuelle</Badge>}
                      </span>
                      <span className="mt-0.5 block text-sm text-ink-muted">
                        {plural(plan.limits.students, "élève actif", "élèves actifs")} · {plural(plan.limits.instructors, "moniteur", "moniteurs")} ·{" "}
                        {plural(plan.limits.offices, "site", "sites")}
                      </span>
                    </span>
                  </RadioCard>
                ))}
              </div>
            </fieldset>
            {state.status === "error" && state.message && (state.attempt ?? 0) > (since ?? 0) && (
              <Alert tone="danger" role="alert" key={state.attempt}>
                {state.message}
              </Alert>
            )}
            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <Button variant="secondary" onClick={() => setSince(null)}>
                Annuler
              </Button>
              <SubmitButton pendingLabel="Changement…">Changer de formule</SubmitButton>
            </div>
          </form>
        )}
      </Dialog>
    </div>
  );
}
