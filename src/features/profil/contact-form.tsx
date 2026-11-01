"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { Save } from "lucide-react";
import { Alert } from "@/components/ui/alert";
import { Field, TextField, inputStyles } from "@/components/ui/field";
import { SubmitButton } from "@/components/ui/submit-button";
import { useFocusAfterError } from "@/components/ui/use-focus-after-error";
import { cn } from "@/lib/cn";
import { INITIAL_CONTACT_STATE, type ContactField } from "./action-state";
import { updateContactDetailsAction } from "./actions";

export type ContactValues = Record<ContactField, string>;

const optional = <span className="font-normal text-ink-subtle"> (facultatif)</span>;

/**
 * The student's own contact details. Validated by the Server Action; after a failed submit the
 * typed values are put back and focus moves to the first invalid field.
 */
export function ContactForm({ saved }: { saved: ContactValues }) {
  const [state, formAction] = useActionState(updateContactDetailsAction, INITIAL_CONTACT_STATE);
  const formRef = useRef<HTMLFormElement>(null);
  const errorRef = useRef<HTMLDivElement>(null);
  const successRef = useRef<HTMLDivElement>(null);
  // The submit button is disabled while pending, which drops the focus to <body>. After an error,
  // focus goes to the first invalid field, or to the alert when the error is not tied to a field.
  useFocusAfterError(formRef, state, undefined, errorRef);
  // After a save, to the confirmation (read out, and Tab then reaches "Enregistrer").
  useEffect(() => {
    if (state.status === "success") successRef.current?.focus();
  }, [state]);
  // The success message disappears as soon as the student edits the form again.
  const [editedAfterAttempt, setEditedAfterAttempt] = useState<number | undefined>(undefined);

  // After an error, keep what was typed. Otherwise show the saved values (refreshed after a save).
  const value = (field: ContactField) =>
    state.status === "error" ? (state.values?.[field] ?? saved[field]) : saved[field];
  const error = (field: ContactField) => (state.status === "error" ? state.fieldErrors?.[field] : undefined);
  const showSuccess = state.status === "success" && editedAfterAttempt !== state.attempt;

  return (
    <form
      ref={formRef}
      action={formAction}
      noValidate
      onInput={() => {
        if (state.status === "success") setEditedAfterAttempt(state.attempt);
      }}
      className="max-w-xl space-y-5"
    >
      <TextField
        label="E-mail"
        name="email"
        type="email"
        inputMode="email"
        autoComplete="email"
        autoCapitalize="none"
        autoCorrect="off"
        spellCheck={false}
        aria-required
        defaultValue={value("email")}
        error={error("email")}
        hint="Pour vos convocations, vos factures et les rappels de leçon."
      />

      <div className="grid gap-5 sm:grid-cols-2">
        <TextField
          label="Téléphone"
          name="phone"
          type="tel"
          inputMode="tel"
          autoComplete="tel"
          aria-required
          defaultValue={value("phone")}
          error={error("phone")}
          hint="10 chiffres, par exemple 06 12 34 56 78."
        />
        <TextField
          label={<>Téléphone secondaire{optional}</>}
          name="phoneSecondary"
          type="tel"
          inputMode="tel"
          autoComplete="off"
          defaultValue={value("phoneSecondary")}
          error={error("phoneSecondary")}
        />
      </div>

      <TextField
        label="Adresse"
        name="line1"
        autoComplete="address-line1"
        aria-required
        defaultValue={value("line1")}
        error={error("line1")}
        hint="Numéro et nom de la rue."
      />

      <div className="grid gap-5 sm:grid-cols-[minmax(0,11rem)_minmax(0,1fr)]">
        <Field label="Code postal" error={error("postalCode")}>
          {({ id, describedBy, invalid }) => (
            <input
              id={id}
              name="postalCode"
              inputMode="numeric"
              autoComplete="postal-code"
              aria-required
              aria-describedby={describedBy}
              aria-invalid={invalid || undefined}
              defaultValue={value("postalCode")}
              // Narrow on mobile (5 digits), while its error message keeps the full width.
              className={cn(inputStyles, "max-w-44 sm:max-w-none")}
            />
          )}
        </Field>
        <TextField
          label="Ville"
          name="city"
          autoComplete="address-level2"
          aria-required
          defaultValue={value("city")}
          error={error("city")}
        />
      </div>

      {state.status === "error" && state.message && (
        <div ref={errorRef} tabIndex={-1} className="rounded-2xl outline-none">
          <Alert key={state.attempt} tone="danger" role="alert" title="L'enregistrement n'a pas abouti">
            {state.message}
          </Alert>
        </div>
      )}
      {showSuccess && (
        <div ref={successRef} tabIndex={-1} className="rounded-2xl outline-none">
          <Alert key={state.attempt} tone="success" title={state.message ?? "Vos coordonnées ont été enregistrées."} />
        </div>
      )}

      <SubmitButton
        size="lg"
        icon={<Save className="size-5" aria-hidden />}
        pendingLabel="Enregistrement…"
        className="w-full sm:w-auto"
      >
        Enregistrer
      </SubmitButton>
    </form>
  );
}
