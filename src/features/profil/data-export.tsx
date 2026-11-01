"use client";

import { useActionState, useEffect, useRef } from "react";
import { Download, MailCheck } from "lucide-react";
import { Alert } from "@/components/ui/alert";
import { SubmitButton } from "@/components/ui/submit-button";
import { INITIAL_PRIVACY_STATE } from "./action-state";
import { requestDataExportAction } from "./actions";
import { SIDE_BUTTON } from "./layout";

/** RGPD export request. The backend prepares the archive and e-mails it. */
export function DataExport() {
  const [state, formAction] = useActionState(requestDataExportAction, INITIAL_PRIVACY_STATE);
  const confirmationRef = useRef<HTMLDivElement>(null);

  // The button is replaced by the confirmation: move focus there so it is not lost.
  useEffect(() => {
    if (state.status === "success") confirmationRef.current?.focus();
  }, [state]);

  if (state.status === "success") {
    return (
      <div ref={confirmationRef} tabIndex={-1} className="rounded-2xl outline-none">
        <Alert tone="success" icon={MailCheck} title="Demande envoyée">
          {state.message}
        </Alert>
      </div>
    );
  }

  return (
    <form action={formAction} className="space-y-3">
      {state.status === "error" && (
        <Alert key={state.attempt} tone="danger" role="alert" title="La demande n'a pas abouti">
          {state.message}
        </Alert>
      )}
      <SubmitButton
        variant="secondary"
        className={SIDE_BUTTON}
        icon={<Download className="size-4" aria-hidden />}
        pendingLabel="Envoi de la demande…"
      >
        Télécharger mes données
      </SubmitButton>
    </form>
  );
}
