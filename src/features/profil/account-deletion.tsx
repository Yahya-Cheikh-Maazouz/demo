"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { CalendarX, Hourglass, MailCheck, ReceiptText, Trash2, type LucideIcon } from "lucide-react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { SubmitButton } from "@/components/ui/submit-button";
import { cn } from "@/lib/cn";
import { formatDate } from "@/lib/format";
import { INITIAL_PRIVACY_STATE, type PrivacyActionState } from "./action-state";
import { requestAccountDeletionAction } from "./actions";
import { SIDE_BUTTON } from "./layout";

const CONSEQUENCES: { icon: LucideIcon; text: string }[] = [
  {
    icon: MailCheck,
    text: "Votre auto-école reçoit la demande et la traite. Vous recevrez un e-mail une fois le compte supprimé.",
  },
  {
    icon: ReceiptText,
    text: "Vos factures sont conservées pendant la durée légale de 10\u00a0ans, même après la suppression.",
  },
  {
    icon: CalendarX,
    text: "Vous n'aurez plus accès à votre espace élève : planning, paiements et documents.",
  },
  {
    icon: Hourglass,
    text: "Faites le point avec votre auto-école sur vos leçons à venir et vos heures non utilisées.",
  },
];

/**
 * "Supprimer mon compte" with a confirmation dialog, or the date of the pending request.
 * `requestedAt` comes from the API (getDeletionRequest).
 */
export function AccountDeletion({ requestedAt }: { requestedAt: string | null }) {
  const [open, setOpen] = useState(false);
  // A new key per opening resets the form state (no stale error from a previous attempt).
  const [openCount, setOpenCount] = useState(0);
  // Date returned by the action: shown at once, even before the refreshed page arrives.
  const [sentAt, setSentAt] = useState<string | null>(null);
  const noticeRef = useRef<HTMLDivElement>(null);

  const date = requestedAt ?? sentAt;

  // The button is replaced by the notice once the request is sent: move focus there.
  useEffect(() => {
    if (sentAt) noticeRef.current?.focus();
  }, [sentAt]);

  return (
    <div>
      {date ? (
        <div ref={noticeRef} tabIndex={-1} className="rounded-2xl outline-none">
          <Alert tone="info" icon={MailCheck} title={`Demande de suppression envoyée le ${formatDate(date)}`}>
            Votre auto-école va la traiter et vous préviendra par e-mail.
          </Alert>
        </div>
      ) : (
        <Button
          variant="danger-ghost"
          // Borderless: from `sm` its text lines up with the paragraph above (the hover background
          // spills into the card padding instead).
          className={cn(SIDE_BUTTON, "sm:-ml-4 xl:ml-0")}
          icon={<Trash2 className="size-4" aria-hidden />}
          aria-haspopup="dialog"
          onClick={() => {
            setOpenCount((count) => count + 1);
            setOpen(true);
          }}
        >
          Supprimer mon compte
        </Button>
      )}

      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        title="Supprimer votre compte ?"
        description="Votre demande sera envoyée à votre auto-école."
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
  const [state, formAction] = useActionState(async (prev: PrivacyActionState) => {
    const next = await requestAccountDeletionAction(prev);
    if (next.status === "success") onSent(next.requestedAt ?? null);
    return next;
  }, INITIAL_PRIVACY_STATE);

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
          Demander la suppression
        </SubmitButton>
      </div>
    </form>
  );
}
