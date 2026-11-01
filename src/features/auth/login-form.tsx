"use client";

import Link from "next/link";
import { useActionState, useRef } from "react";
import { KeyRound } from "lucide-react";
import { Alert } from "@/components/ui/alert";
import { ButtonLink } from "@/components/ui/button";
import { TextField } from "@/components/ui/field";
import { SubmitButton } from "@/components/ui/submit-button";
import type { DemoAccount } from "@/lib/api/auth";
import { login } from "./actions";
import { DemoAccounts } from "./demo-accounts";
import { INITIAL_FORM_STATE, type LoginState } from "./form-state";
import { PasswordField } from "./password-field";
import { useFocusAfterError } from "@/components/ui/use-focus-after-error";

const INITIAL: LoginState = INITIAL_FORM_STATE;

/** Text link with a hit area grown to 44px without changing the layout. */
const inlineLinkStyles =
  "relative shrink-0 rounded-md text-sm font-semibold text-brand underline-offset-4 hover:underline after:absolute after:-inset-x-2 after:-inset-y-3 after:content-['']";

/** Message shown before any attempt, e.g. after an expired or cancelled 2FA step. */
export type LoginNotice = { tone: "info" | "warning"; title?: string; text: string };

export function LoginForm({
  suite,
  notice,
  demoAccounts,
}: {
  suite?: string;
  notice?: LoginNotice;
  demoAccounts: DemoAccount[];
}) {
  const [state, formAction] = useActionState(login, INITIAL);
  const formRef = useRef<HTMLFormElement>(null);
  const alertRef = useRef<HTMLDivElement>(null);
  // Bad credentials: the e-mail is kept, so the person most likely needs to retype the password.
  // Lockout: focus goes to "Réinitialiser mon mot de passe" in the alert.
  useFocusAfterError(formRef, state, state.code === "identifiants_invalides" ? "password" : undefined, alertRef);

  const locked = state.code === "compte_bloque";

  return (
    <div className="space-y-6">
      {state.status === "error" && state.message ? (
        <div key={state.attempt} ref={alertRef} tabIndex={-1} className="rounded-2xl outline-none">
          <Alert
            tone="danger"
            role="alert"
            title={locked ? "Connexion temporairement bloquée" : state.message}
            action={
              locked ? (
                <ButtonLink
                  href="/mot-de-passe-oublie"
                  variant="secondary"
                  icon={<KeyRound className="size-4" aria-hidden />}
                >
                  Réinitialiser mon mot de passe
                </ButtonLink>
              ) : undefined
            }
          >
            {locked ? state.message : "Vérifiez votre saisie puis réessayez."}
          </Alert>
        </div>
      ) : (
        notice && (
          <Alert tone={notice.tone} title={notice.title}>
            {notice.text}
          </Alert>
        )
      )}

      <form ref={formRef} action={formAction} noValidate className="space-y-5">
        {suite && <input type="hidden" name="suite" value={suite} />}
        <TextField
          label="E-mail"
          name="email"
          type="email"
          inputMode="email"
          autoComplete="username"
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          aria-required
          defaultValue={state.values?.email}
          error={state.fieldErrors?.email}
        />
        <PasswordField
          name="password"
          autoComplete="current-password"
          aria-required
          error={state.fieldErrors?.password}
          labelAside={
            <Link href="/mot-de-passe-oublie" className={inlineLinkStyles}>
              Mot de passe oublié&nbsp;?
            </Link>
          }
        />
        <SubmitButton size="lg" fullWidth pendingLabel="Connexion…" className="mt-2">
          Se connecter
        </SubmitButton>
      </form>

      {demoAccounts.length > 0 && <DemoAccounts accounts={demoAccounts} formRef={formRef} />}
    </div>
  );
}
