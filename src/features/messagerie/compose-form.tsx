"use client";

import { useEffect, useRef } from "react";
import { Send } from "lucide-react";
import { Alert } from "@/components/ui/alert";
import { Field, TextField, inputStyles } from "@/components/ui/field";
import { SubmitButton } from "@/components/ui/submit-button";
import { useFocusAfterError } from "@/components/ui/use-focus-after-error";
import { cn } from "@/lib/cn";
import type { Mailbox, MessageParty } from "@/lib/types";
import { BODY_MAX, SUBJECT_MAX, type SendMessageState } from "./action-state";
import { COMPOSE_ID, LIST_ID } from "./layout";
import { recipientLabel } from "./wording";

export type Draft = { to: MessageParty | ""; subject: string; body: string };

type ComposeFormProps = {
  recipients: Mailbox["recipients"];
  draft: Draft;
  onEdit: (patch: Partial<Draft>) => void;
  state: SendMessageState;
  action: (formData: FormData) => void;
  showSuccess: boolean;
  /** Incremented by "Répondre": brings the form into view and focuses the message field. */
  focusRequest: number;
};

/**
 * New message to the instructor or the auto-école. Fields are controlled by the parent (so
 * "Répondre" can prefill them) and survive a validation error; they are cleared after a send.
 */
export function ComposeForm({ recipients, draft, onEdit, state, action, showSuccess, focusRequest }: ComposeFormProps) {
  const formRef = useRef<HTMLFormElement>(null);
  const errorRef = useRef<HTMLDivElement>(null);
  const successRef = useRef<HTMLDivElement>(null);
  const bodyRef = useRef<HTMLTextAreaElement>(null);
  // The submit button is disabled while pending, which drops the focus to <body>: after an error,
  // focus goes to the first invalid field (or to the alert); after a send, to the confirmation.
  useFocusAfterError(formRef, state, undefined, errorRef);
  useEffect(() => {
    if (state.status === "success") successRef.current?.focus();
  }, [state]);
  useEffect(() => {
    if (focusRequest === 0) return;
    document.getElementById(COMPOSE_ID)?.scrollIntoView({ block: "nearest" });
    bodyRef.current?.focus({ preventScroll: true });
  }, [focusRequest]);

  const errors = state.status === "error" ? state.fieldErrors : undefined;

  return (
    // Remounted on every result: React resets a form's DOM after an action, even controlled fields.
    <form key={state.attempt ?? 0} ref={formRef} action={action} noValidate className="space-y-5">
      {showSuccess && state.message && (
        <div ref={successRef} tabIndex={-1} className="rounded-2xl outline-none">
          <Alert
            tone="success"
            title={state.message}
            action={
              <a href={`#${LIST_ID}`} className="text-sm font-semibold text-brand underline underline-offset-2">
                Voir mes messages envoyés
              </a>
            }
          />
        </div>
      )}

      <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-1">
        <Field label="Destinataire" error={errors?.to} hint="Votre moniteur est absent ? Écrivez à l'auto-école.">
          {({ id, describedBy, invalid }) => (
            <select
              id={id}
              name="to"
              aria-required
              aria-describedby={describedBy}
              aria-invalid={invalid || undefined}
              className={inputStyles}
              value={draft.to}
              onChange={(event) => onEdit({ to: event.target.value as MessageParty })}
            >
              {draft.to === "" && (
                <option value="" disabled>
                  Choisir un destinataire
                </option>
              )}
              {recipients.map((recipient) => (
                <option key={recipient.kind} value={recipient.kind}>
                  {recipientLabel(recipient)}
                </option>
              ))}
            </select>
          )}
        </Field>

        <TextField
          label="Objet"
          name="subject"
          autoComplete="off"
          aria-required
          maxLength={SUBJECT_MAX}
          placeholder="Par exemple : question sur ma leçon"
          value={draft.subject}
          onChange={(event) => onEdit({ subject: event.target.value })}
          error={errors?.subject}
        />
      </div>

      <Field label="Votre message" error={errors?.body}>
        {({ id, describedBy, invalid }) => (
          <textarea
            ref={bodyRef}
            id={id}
            name="body"
            rows={6}
            aria-required
            maxLength={BODY_MAX}
            aria-describedby={describedBy}
            aria-invalid={invalid || undefined}
            placeholder="Écrivez votre message…"
            // min-h wins over the 48px height of inputStyles whatever the class order.
            className={cn(inputStyles, "min-h-40 resize-y py-3 leading-relaxed")}
            value={draft.body}
            onChange={(event) => onEdit({ body: event.target.value })}
          />
        )}
      </Field>

      {state.status === "error" && state.message && (
        <div ref={errorRef} tabIndex={-1} className="rounded-2xl outline-none">
          <Alert key={state.attempt} tone="danger" role="alert" title="Le message n'a pas été envoyé">
            {state.message}
          </Alert>
        </div>
      )}

      <SubmitButton size="lg" fullWidth icon={<Send className="size-5" aria-hidden />} pendingLabel="Envoi…">
        Envoyer le message
      </SubmitButton>
    </form>
  );
}
