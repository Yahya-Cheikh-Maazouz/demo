"use client";

import { useActionState, useEffect, useRef } from "react";
import { ArrowLeft, MailCheck } from "lucide-react";
import { Alert } from "@/components/ui/alert";
import { ButtonLink } from "@/components/ui/button";
import { TextField } from "@/components/ui/field";
import { SubmitButton } from "@/components/ui/submit-button";
import { forgotPassword } from "./actions";
import { INITIAL_FORM_STATE, type ForgotPasswordState } from "./form-state";
import { useFocusAfterError } from "@/components/ui/use-focus-after-error";

const INITIAL: ForgotPasswordState = INITIAL_FORM_STATE;

export function ForgotPasswordForm() {
  const [state, formAction] = useActionState(forgotPassword, INITIAL);
  const formRef = useRef<HTMLFormElement>(null);
  const confirmationRef = useRef<HTMLDivElement>(null);
  useFocusAfterError(formRef, state);

  // The form is replaced by the confirmation: move focus there so it is read out.
  useEffect(() => {
    if (state.status === "success") confirmationRef.current?.focus();
  }, [state]);

  if (state.status === "success") {
    return (
      <div ref={confirmationRef} tabIndex={-1} className="space-y-6 rounded-2xl outline-none">
        <Alert tone="success" icon={MailCheck} title="Vérifiez votre boîte de réception">
          Si un compte existe pour cette adresse, vous allez recevoir un e-mail avec un lien pour choisir un
          nouveau mot de passe. Pensez à vérifier vos courriers indésirables.
        </Alert>
        <ButtonLink
          href="/connexion"
          variant="secondary"
          size="lg"
          fullWidth
          icon={<ArrowLeft className="size-5" aria-hidden />}
        >
          Revenir à la connexion
        </ButtonLink>
      </div>
    );
  }

  return (
    <form ref={formRef} action={formAction} noValidate className="space-y-5">
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
        defaultValue={state.values?.email}
        error={state.fieldErrors?.email}
        hint="L'adresse que vous utilisez pour vous connecter."
      />
      <div className="space-y-3 pt-2">
        <SubmitButton size="lg" fullWidth pendingLabel="Envoi…">
          Recevoir le lien
        </SubmitButton>
        <ButtonLink
          href="/connexion"
          variant="ghost"
          size="lg"
          fullWidth
          icon={<ArrowLeft className="size-5" aria-hidden />}
        >
          Revenir à la connexion
        </ButtonLink>
      </div>
    </form>
  );
}
