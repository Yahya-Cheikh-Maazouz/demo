"use client";

import { useActionState, useRef, type ClipboardEvent, type FormEvent } from "react";
import { Field } from "@/components/ui/field";
import { SubmitButton } from "@/components/ui/submit-button";
import { cn } from "@/lib/cn";
import { verifyTwoFactor } from "./actions";
import { INITIAL_FORM_STATE, type VerificationState } from "./form-state";
import { useFocusAfterError } from "@/components/ui/use-focus-after-error";

const INITIAL: VerificationState = INITIAL_FORM_STATE;
const CODE_LENGTH = 6;

// Same states as inputStyles, with large, spaced, centered digits. The indent balances the
// letter-spacing added after the last digit so the code stays optically centered.
const codeInputStyles = cn(
  "block h-16 w-full rounded-xl border border-line-strong bg-surface px-3.5 text-ink",
  "text-center indent-[0.5em] text-3xl font-bold tracking-[0.5em] tabular-nums",
  "placeholder:text-line-strong transition-[border-color,box-shadow] duration-150",
  "focus:border-brand focus:outline-none focus:ring-4 focus:ring-brand/15",
  "aria-invalid:border-danger aria-invalid:focus:ring-danger/15",
);

function keepDigits(value: string) {
  return value.replace(/\D/g, "").slice(0, CODE_LENGTH);
}

export function VerificationForm({ suite }: { suite?: string }) {
  const [state, formAction] = useActionState(verifyTwoFactor, INITIAL);
  const formRef = useRef<HTMLFormElement>(null);
  useFocusAfterError(formRef, state);

  // A pasted "123 456" would be cut by maxLength: keep the digits only.
  function onPaste(event: ClipboardEvent<HTMLInputElement>) {
    const digits = keepDigits(event.clipboardData.getData("text"));
    if (!digits) return;
    event.preventDefault();
    event.currentTarget.value = digits;
  }

  function onInput(event: FormEvent<HTMLInputElement>) {
    const input = event.currentTarget;
    const digits = keepDigits(input.value);
    if (digits !== input.value) input.value = digits;
  }

  return (
    <form ref={formRef} action={formAction} noValidate className="space-y-5">
      {suite && <input type="hidden" name="suite" value={suite} />}
      <Field
        label="Code à 6 chiffres"
        error={state.fieldErrors?.code}
        hint={"Par exemple Google Authenticator ou Microsoft Authenticator. Le code change toutes les 30\u00a0secondes."}
      >
        {({ id, describedBy, invalid }) => (
          <input
            id={id}
            name="code"
            inputMode="numeric"
            autoComplete="one-time-code"
            pattern="[0-9]{6}"
            maxLength={CODE_LENGTH}
            aria-required
            // Single-purpose step reached right after the password: start typing at once.
            autoFocus
            placeholder="••••••"
            aria-describedby={describedBy}
            aria-invalid={invalid || undefined}
            onPaste={onPaste}
            onInput={onInput}
            className={codeInputStyles}
          />
        )}
      </Field>
      <SubmitButton size="lg" fullWidth pendingLabel="Vérification…">
        Vérifier
      </SubmitButton>
    </form>
  );
}
