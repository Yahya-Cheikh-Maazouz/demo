"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { CalendarX, Download, MailCheck, ReceiptText, Trash2, UsersRound, type LucideIcon } from "lucide-react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { SubmitButton } from "@/components/ui/submit-button";
import { formatDate } from "@/lib/format";
import { INITIAL_PARENT_PRIVACY_STATE, type ParentPrivacyState } from "./action-state";
import { requestParentDeletionAction, requestParentExportAction } from "./actions";

const BUTTON = "w-full sm:w-auto";

/** RGPD export of the parent's own data. The backend prepares the archive and e-mails it. */
export function ParentDataExport() {
  const [state, formAction] = useActionState(requestParentExportAction, INITIAL_PARENT_PRIVACY_STATE);
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
        className={BUTTON}
        icon={<Download className="size-4" aria-hidden />}
        pendingLabel="Envoi de la demande…"
      >
        Exporter mes données
      </SubmitButton>
    </form>
  );
}

const CONSEQUENCES: { icon: LucideIcon; text: string }[] = [
  {
    icon: MailCheck,
    text: "L'auto-école reçoit la demande et la traite. Vous recevrez un e-mail une fois le compte supprimé.",
  },
  {
    icon: UsersRound,
    text: "Votre enfant garde son espace élève. Tant qu'il est mineur, l'auto-école vous demandera de désigner un autre représentant légal.",
  },
  {
    icon: ReceiptText,
    text: "Les factures sont conservées pendant la durée légale de 10 ans, même après la suppression.",
  },
  {
    icon: CalendarX,
    text: "Vous n'aurez plus accès à l'espace parent : suivi, paiements et autorisations.",
  },
];

/** "Demander l'effacement de mon compte" with a confirmation, or the date of the pending request. */
export function ParentAccountDeletion({ requestedAt }: { requestedAt: string | null }) {
  const [open, setOpen] = useState(false);
  const [openCount, setOpenCount] = useState(0);
  // Date returned by the action: shown at once, even before the refreshed page arrives.
  const [sentAt, setSentAt] = useState<string | null>(null);
  const noticeRef = useRef<HTMLDivElement>(null);
  const date = requestedAt ?? sentAt;

  useEffect(() => {
    if (sentAt) noticeRef.current?.focus();
  }, [sentAt]);

  return (
    <div>
      {date ? (
        <div ref={noticeRef} tabIndex={-1} className="rounded-2xl outline-none">
          <Alert tone="info" icon={MailCheck} title={`Demande d'effacement envoyée le ${formatDate(date)}`}>
            En attente de traitement par l&apos;auto-école. Elle vous préviendra par e-mail.
          </Alert>
        </div>
      ) : (
        <Button
          variant="danger-ghost"
          className={BUTTON}
          icon={<Trash2 className="size-4" aria-hidden />}
          aria-haspopup="dialog"
          onClick={() => {
            setOpenCount((count) => count + 1);
            setOpen(true);
          }}
        >
          Demander l&apos;effacement de mon compte
        </Button>
      )}

      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        title="Effacer votre compte parent ?"
        description="Votre demande sera envoyée à l'auto-école."
      >
        <DeletionForm
          key={openCount}
          onSent={(at) => {
            setOpen(false);
            setSentAt(at);
          }}
          onKeep={() => setOpen(false)}
        />
      </Dialog>
    </div>
  );
}

function DeletionForm({ onSent, onKeep }: { onSent: (requestedAt: string | null) => void; onKeep: () => void }) {
  const errorRef = useRef<HTMLDivElement>(null);
  const [state, formAction] = useActionState(async (prev: ParentPrivacyState) => {
    const next = await requestParentDeletionAction(prev);
    if (next.status === "success") onSent(next.requestedAt ?? null);
    return next;
  }, INITIAL_PARENT_PRIVACY_STATE);

  useEffect(() => {
    if (state.status === "error") errorRef.current?.focus();
  }, [state]);

  return (
    <form action={formAction}>
      <ul className="space-y-3">
        {CONSEQUENCES.map(({ icon: Icon, text }) => (
          <li key={text} className="flex items-start gap-3 text-sm text-ink-muted">
            <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-subtle text-ink-subtle">
              <Icon className="size-4" aria-hidden />
            </span>
            <span className="pt-1.5">{text}</span>
          </li>
        ))}
      </ul>

      {state.status === "error" && (
        <div ref={errorRef} tabIndex={-1} className="mt-4 rounded-2xl outline-none">
          <Alert key={state.attempt} tone="danger" role="alert" title="La demande n'a pas abouti">
            {state.message}
          </Alert>
        </div>
      )}

      <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <Button variant="secondary" onClick={onKeep}>
          Garder mon compte
        </Button>
        <SubmitButton variant="danger" icon={<Trash2 className="size-4" aria-hidden />} pendingLabel="Envoi…">
          Demander l&apos;effacement
        </SubmitButton>
      </div>
    </form>
  );
}
