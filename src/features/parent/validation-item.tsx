"use client";

import { Check, CircleCheck, X } from "lucide-react";
import { useActionState, useEffect, useRef, useState } from "react";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { SubmitButton } from "@/components/ui/submit-button";
import { formatDate } from "@/lib/format";
import type { GuardianValidation } from "@/lib/types";
import { INITIAL_VALIDATION_STATE, type ValidationFormState } from "./action-state";
import { decideValidationAction } from "./actions";
import { VALIDATION_STATUS_META } from "./consent-meta";

type Decision = "accepte" | "refuse";

const DIALOG: Record<Decision, { title: string; confirm: string; consequence: string }> = {
  accepte: {
    title: "Accepter cette proposition ?",
    confirm: "Confirmer mon accord",
    consequence: "Votre accord est transmis à l'auto-école et appliqué au dossier. Il ne peut pas être annulé ici.",
  },
  refuse: {
    title: "Refuser cette proposition ?",
    confirm: "Confirmer mon refus",
    consequence: "L'auto-école est prévenue de votre refus ; rien ne change dans le dossier.",
  },
};

/**
 * A proposal of the school (e.g. a change of formula): accept or refuse after a confirmation, or
 * who decided and when once it is done. Keyed by id, so the confirmation survives refresh().
 */
export function ValidationItem({ childId, validation }: { childId: string; validation: GuardianValidation }) {
  const [decision, setDecision] = useState<Decision | null>(null);
  // A new key per opening resets the form state (no stale error from a previous attempt).
  const [openCount, setOpenCount] = useState(0);
  const [sent, setSent] = useState<string | null>(null);
  const sentRef = useRef<HTMLParagraphElement>(null);
  const status = VALIDATION_STATUS_META[validation.status];
  const pending = validation.status === "en_attente";

  // The buttons disappear once the decision is recorded: move focus to the confirmation.
  useEffect(() => {
    if (!sent) return;
    const frame = requestAnimationFrame(() => sentRef.current?.focus());
    return () => cancelAnimationFrame(frame);
  }, [sent]);

  function open(next: Decision) {
    setOpenCount((count) => count + 1);
    setDecision(next);
  }

  return (
    <li className="px-5 py-5 sm:px-6" data-validation={validation.id}>
      <div className="flex flex-wrap items-start justify-between gap-x-3 gap-y-1.5">
        <h3 className="min-w-0 font-semibold text-ink">{validation.title}</h3>
        <Badge tone={status.tone} icon={status.icon}>
          {status.label}
        </Badge>
      </div>
      <p className="mt-1.5 text-sm text-ink-muted">{validation.description}</p>
      <p className="mt-1.5 text-xs text-ink-subtle">
        Proposé le <time dateTime={validation.proposedAt}>{formatDate(validation.proposedAt)}</time> par{" "}
        {validation.proposedBy}
      </p>

      {pending ? (
        <div className="mt-4 flex flex-col gap-2 sm:flex-row">
          <Button icon={<Check className="size-4" aria-hidden />} aria-haspopup="dialog" onClick={() => open("accepte")}>
            Accepter
          </Button>
          <Button variant="secondary" icon={<X className="size-4" aria-hidden />} aria-haspopup="dialog" onClick={() => open("refuse")}>
            Refuser
          </Button>
        </div>
      ) : (
        <p className="mt-3 text-sm text-ink-muted">
          {validation.status === "acceptee" ? "Acceptée" : "Refusée"} le{" "}
          <time dateTime={validation.decidedAt ?? undefined}>{validation.decidedAt && formatDate(validation.decidedAt)}</time>{" "}
          par <span className="font-semibold text-ink">{validation.decidedBy}</span>
        </p>
      )}

      {sent && (
        <p
          ref={sentRef}
          tabIndex={-1}
          role="status"
          className="mt-3 flex items-start gap-2 rounded-xl bg-success-soft p-3 text-sm font-semibold text-success outline-none focus-visible:outline-2 focus-visible:outline-brand"
        >
          <CircleCheck className="mt-0.5 size-4 shrink-0" aria-hidden />
          {sent}
        </p>
      )}

      <Dialog
        open={decision !== null}
        onClose={() => setDecision(null)}
        title={decision ? DIALOG[decision].title : ""}
        description={validation.title}
      >
        {decision && (
          <DecisionForm
            key={openCount}
            childId={childId}
            validationId={validation.id}
            decision={decision}
            onDone={(message) => {
              setDecision(null);
              setSent(message);
            }}
            onCancel={() => setDecision(null)}
          />
        )}
      </Dialog>
    </li>
  );
}

function DecisionForm({
  childId,
  validationId,
  decision,
  onDone,
  onCancel,
}: {
  childId: string;
  validationId: string;
  decision: Decision;
  onDone: (message: string) => void;
  onCancel: () => void;
}) {
  const errorRef = useRef<HTMLDivElement>(null);
  const [state, formAction] = useActionState(async (prev: ValidationFormState, formData: FormData) => {
    const next = await decideValidationAction(prev, formData);
    if (next.status === "success") onDone(next.message ?? "");
    return next;
  }, INITIAL_VALIDATION_STATE);

  useEffect(() => {
    if (state.status === "error") errorRef.current?.focus();
  }, [state]);

  const wording = DIALOG[decision];
  return (
    <form action={formAction}>
      <input type="hidden" name="childId" value={childId} />
      <input type="hidden" name="validationId" value={validationId} />
      <input type="hidden" name="decision" value={decision} />
      <p className="text-sm text-ink-muted">{wording.consequence}</p>

      {state.status === "error" && (
        <div ref={errorRef} tabIndex={-1} className="mt-4 rounded-2xl outline-none">
          <Alert key={state.attempt} tone="danger" role="alert" title="La décision n'a pas été envoyée">
            {state.message}
          </Alert>
        </div>
      )}

      <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <Button variant="secondary" onClick={onCancel}>
          Annuler
        </Button>
        <SubmitButton
          variant={decision === "accepte" ? "primary" : "danger"}
          icon={decision === "accepte" ? <Check className="size-4" aria-hidden /> : <X className="size-4" aria-hidden />}
          pendingLabel="Envoi…"
        >
          {wording.confirm}
        </SubmitButton>
      </div>
    </form>
  );
}
