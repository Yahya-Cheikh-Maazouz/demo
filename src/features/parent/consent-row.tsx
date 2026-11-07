"use client";

import { Check, Loader2, ShieldOff, X } from "lucide-react";
import { useActionState, useId, useOptimistic, useRef, useState } from "react";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { TONE_SOFT } from "@/components/ui/tone";
import { cn } from "@/lib/cn";
import { formatDate } from "@/lib/format";
import type { Consent } from "@/lib/types";
import { INITIAL_CONSENT_STATE, type ConsentFormState } from "./action-state";
import { setConsentAction } from "./actions";
import { CONSENT_META, consentStatusMeta } from "./consent-meta";

/**
 * One authorisation: a switch, what it allows, and the last decision (date and author). Withdrawing
 * a required one (RGPD) explains the consequence and asks for confirmation first.
 */
export function ConsentRow({ childId, firstName, consent }: { childId: string; firstName: string; consent: Consent }) {
  const meta = CONSENT_META[consent.key];
  const Icon = meta.icon;
  const status = consentStatusMeta(consent);
  const id = useId();
  const formRef = useRef<HTMLFormElement>(null);
  const switchRef = useRef<HTMLButtonElement>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const [granted, setOptimisticGranted] = useOptimistic(consent.granted);
  const [state, formAction, pending] = useActionState(async (prev: ConsentFormState, formData: FormData) => {
    setOptimisticGranted(formData.get("granted") === "true");
    return setConsentAction(prev, formData);
  }, INITIAL_CONSENT_STATE);

  const needsConfirmation = consent.required && consent.granted;
  const refusedRequired = consent.required && !consent.granted && consent.decidedAt !== null;

  return (
    <li className="px-5 py-5 sm:px-6" data-consent={consent.key}>
      <form ref={formRef} action={formAction}>
        <input type="hidden" name="childId" value={childId} />
        <input type="hidden" name="key" value={consent.key} />

        <div className="flex gap-4">
          <span
            aria-hidden
            className={cn("hidden size-11 shrink-0 items-center justify-center rounded-xl sm:flex", TONE_SOFT[status.tone])}
          >
            <Icon className="size-5" />
          </span>

          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 pt-1">
                <h3 id={`${id}-label`} className="font-semibold text-ink">
                  {meta.label}
                </h3>
                {consent.required && (
                  <p className="mt-0.5 text-xs font-semibold text-ink-subtle">Indispensable à la formation</p>
                )}
              </div>
              <button
                ref={switchRef}
                type="submit"
                name="granted"
                value={String(!consent.granted)}
                role="switch"
                aria-checked={granted}
                aria-labelledby={`${id}-label`}
                aria-describedby={`${id}-decision`}
                aria-busy={pending || undefined}
                onClick={(event) => {
                  if (pending) {
                    event.preventDefault();
                    return;
                  }
                  if (needsConfirmation) {
                    event.preventDefault();
                    setConfirmOpen(true);
                  }
                }}
                className="-my-1 -mr-1 inline-flex h-11 shrink-0 items-center rounded-full px-1"
              >
                <span
                  aria-hidden
                  className={cn(
                    "relative h-7 w-12 rounded-full transition-colors duration-150",
                    granted ? "bg-brand" : "bg-ink-subtle",
                  )}
                >
                  <span
                    className={cn(
                      "absolute top-0.5 left-0.5 flex size-6 items-center justify-center rounded-full bg-surface shadow-sm transition-transform duration-150",
                      granted && "translate-x-5",
                    )}
                  >
                    {pending ? (
                      <Loader2 className="size-3.5 animate-spin text-ink-subtle" />
                    ) : granted ? (
                      <Check className="size-3.5 text-brand" strokeWidth={3} />
                    ) : (
                      <X className="size-3.5 text-ink-subtle" strokeWidth={3} />
                    )}
                  </span>
                </span>
              </button>
            </div>

            <p className="mt-1.5 text-sm text-ink-muted">{meta.description(firstName)}</p>

            <div className="mt-3 flex flex-wrap items-center gap-x-2 gap-y-1.5">
              <Badge tone={status.tone} icon={status.icon}>
                {status.label}
              </Badge>
              <p id={`${id}-decision`} className="text-sm text-ink-muted">
                {consent.decidedAt ? (
                  <>
                    Le <time dateTime={consent.decidedAt}>{formatDate(consent.decidedAt)}</time> par {consent.decidedBy}
                  </>
                ) : (
                  "Aucune décision pour l'instant : l'autorisation n'est pas donnée."
                )}
              </p>
            </div>

            {consent.decidedAt === null && (
              <button
                type="submit"
                name="granted"
                value="false"
                className="mt-2 -ml-2 inline-flex h-11 items-center rounded-lg px-2 text-sm font-semibold text-ink-muted underline decoration-line-strong underline-offset-2 hover:bg-subtle hover:text-ink"
                onClick={(event) => pending && event.preventDefault()}
              >
                Ne pas autoriser
                <span className="sr-only"> : {meta.label}</span>
              </button>
            )}

            {refusedRequired && (
              <Alert tone="danger" icon={ShieldOff} className="mt-3" title="Formation suspendue">
                Sans ce consentement, l&apos;auto-école ne peut plus traiter les données de {firstName} : aucune nouvelle
                leçon ni inscription à l&apos;examen. Réactivez-le pour reprendre la formation.
              </Alert>
            )}

            {state.status === "success" && (
              <p key={state.attempt} role="status" className="mt-2 flex items-center gap-1.5 text-sm font-medium text-success">
                <Check className="size-4" aria-hidden />
                {state.message}
              </p>
            )}
            {state.status === "error" && (
              <Alert key={state.attempt} tone="danger" role="alert" className="mt-3" title="La décision n'a pas été enregistrée">
                {state.message}
              </Alert>
            )}
          </div>
        </div>
      </form>

      {needsConfirmation && (
        <Dialog
          open={confirmOpen}
          onClose={() => setConfirmOpen(false)}
          title="Retirer le consentement RGPD ?"
          description={`Sans votre accord, l'auto-école ne peut plus traiter les données personnelles de ${firstName}.`}
          footer={
            <>
              <Button variant="secondary" onClick={() => setConfirmOpen(false)}>
                Garder mon accord
              </Button>
              <Button
                variant="danger"
                icon={<ShieldOff className="size-4" aria-hidden />}
                onClick={() => {
                  setConfirmOpen(false);
                  formRef.current?.requestSubmit(switchRef.current);
                }}
              >
                Retirer mon consentement
              </Button>
            </>
          }
        >
          <ul className="space-y-2.5 text-sm text-ink-muted">
            <li className="flex gap-2">
              <span aria-hidden>•</span>
              <span>
                La formation de {firstName} est suspendue : plus de nouvelles leçons ni d&apos;inscription à l&apos;examen.
              </span>
            </li>
            <li className="flex gap-2">
              <span aria-hidden>•</span>
              <span>L&apos;auto-école est prévenue et vous contactera pour en parler.</span>
            </li>
            <li className="flex gap-2">
              <span aria-hidden>•</span>
              <span>Les factures restent conservées 10 ans, comme la loi l&apos;exige.</span>
            </li>
            <li className="flex gap-2">
              <span aria-hidden>•</span>
              <span>Vous pourrez redonner votre accord à tout moment depuis cette page.</span>
            </li>
          </ul>
        </Dialog>
      )}
    </li>
  );
}
