"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { Trash2 } from "lucide-react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { refreshOfflineCopy } from "@/components/moniteur/service-worker";
import { useOnline } from "@/components/moniteur/use-online";
import { INITIAL_INSTRUCTOR_STATE, type InstructorActionState } from "./action-state";
import { deleteLeaveAction } from "./actions";
import { useInstructorFeedback } from "./feedback";
import { guardNetwork } from "./network-guard";
import { OnlineSubmitButton } from "./online-submit-button";

/** Deletes a leave the instructor declared, after a confirmation. */
export function DeleteLeaveButton({ leaveId, summary }: { leaveId: string; summary: string }) {
  const [open, setOpen] = useState(false);
  const [attemptKey, setAttemptKey] = useState(0);
  const online = useOnline();
  return (
    <>
      <Button
        variant="danger-ghost"
        size="lg"
        className="h-12 rounded-2xl"
        icon={<Trash2 className="size-5" aria-hidden />}
        aria-haspopup="dialog"
        disabled={!online}
        onClick={() => {
          setAttemptKey((k) => k + 1);
          setOpen(true);
        }}
      >
        Supprimer
        <span className="sr-only"> l&apos;indisponibilité : {summary}</span>
      </Button>
      <Dialog open={open} onClose={() => setOpen(false)} title="Supprimer cette indisponibilité ?" description={summary}>
        <DeleteLeaveForm key={attemptKey} leaveId={leaveId} onCancel={() => setOpen(false)} onDone={() => setOpen(false)} />
      </Dialog>
    </>
  );
}

function DeleteLeaveForm({ leaveId, onCancel, onDone }: { leaveId: string; onCancel: () => void; onDone: () => void }) {
  const { announce } = useInstructorFeedback();
  const errorRef = useRef<HTMLDivElement>(null);
  const [state, formAction] = useActionState(
    guardNetwork(async (prev: InstructorActionState, formData: FormData) => {
      const next = await deleteLeaveAction(prev, formData);
      if (next.status === "success") {
        onDone();
        announce(next.message ?? "Indisponibilité supprimée.");
        refreshOfflineCopy();
      }
      return next;
    }),
    INITIAL_INSTRUCTOR_STATE,
  );
  useEffect(() => {
    if (state.status === "error") errorRef.current?.focus();
  }, [state]);

  return (
    <form action={formAction}>
      <input type="hidden" name="leaveId" value={leaveId} />
      <p className="text-sm text-ink-muted">Ces créneaux redeviennent libres : les élèves pourront de nouveau les demander.</p>
      {state.status === "error" && (
        <div ref={errorRef} tabIndex={-1} className="mt-3 rounded-2xl outline-none">
          <Alert key={state.attempt} tone="danger" role="alert" title="L'indisponibilité n'a pas été supprimée">
            {state.message}
          </Alert>
        </div>
      )}
      <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <Button variant="secondary" size="lg" onClick={onCancel}>
          Garder
        </Button>
        <OnlineSubmitButton variant="danger" size="lg" icon={<Trash2 className="size-5" aria-hidden />} pendingLabel="Suppression…">
          Supprimer l&apos;indisponibilité
        </OnlineSubmitButton>
      </div>
    </form>
  );
}
