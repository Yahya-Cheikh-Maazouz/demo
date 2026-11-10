"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { UserX } from "lucide-react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { refreshOfflineCopy } from "@/components/moniteur/service-worker";
import { useOnline } from "@/components/moniteur/use-online";
import { INITIAL_INSTRUCTOR_STATE, type InstructorActionState } from "./action-state";
import { markAbsentAction } from "./actions";
import { useInstructorFeedback } from "./feedback";
import { deName } from "./french";
import { bigButton } from "./lesson-card";
import { guardNetwork } from "./network-guard";
import { OnlineSubmitButton } from "./online-submit-button";

/** "Élève absent", after a confirmation: the lesson is cancelled and counted as a no-show. */
export function AbsentButton({ lessonId, studentName, summary }: { lessonId: string; studentName: string; summary: string }) {
  const [open, setOpen] = useState(false);
  const [attemptKey, setAttemptKey] = useState(0);
  const online = useOnline();
  return (
    <>
      <Button
        variant="secondary"
        size="lg"
        fullWidth
        className={bigButton}
        icon={<UserX className="size-5" aria-hidden />}
        aria-haspopup="dialog"
        disabled={!online}
        onClick={() => {
          setAttemptKey((k) => k + 1);
          setOpen(true);
        }}
      >
        Élève absent
      </Button>
      <Dialog open={open} onClose={() => setOpen(false)} title={`Absence ${deName(studentName)} ?`} description={summary}>
        <AbsentForm key={attemptKey} lessonId={lessonId} onCancel={() => setOpen(false)} onDone={() => setOpen(false)} />
      </Dialog>
    </>
  );
}

function AbsentForm({ lessonId, onCancel, onDone }: { lessonId: string; onCancel: () => void; onDone: () => void }) {
  const { announce } = useInstructorFeedback();
  const errorRef = useRef<HTMLDivElement>(null);
  const [state, formAction] = useActionState(
    guardNetwork(async (prev: InstructorActionState, formData: FormData) => {
      const next = await markAbsentAction(prev, formData);
      if (next.status === "success") {
        onDone();
        announce(next.message ?? "Absence enregistrée.", "warning");
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
      <input type="hidden" name="lessonId" value={lessonId} />
      <Alert tone="warning" title="L'absence sera enregistrée comme à l'accueil">
        La leçon est annulée et comptée selon les règles de l&apos;auto-école. L&apos;accueil voit l&apos;absence dans le
        planning.
      </Alert>
      {state.status === "error" && (
        <div ref={errorRef} tabIndex={-1} className="mt-3 rounded-2xl outline-none">
          <Alert key={state.attempt} tone="danger" role="alert" title="L'absence n'a pas été enregistrée">
            {state.message}
          </Alert>
        </div>
      )}
      <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <Button variant="secondary" size="lg" onClick={onCancel}>
          L&apos;élève est là
        </Button>
        <OnlineSubmitButton variant="danger" size="lg" icon={<UserX className="size-5" aria-hidden />} pendingLabel="Enregistrement…">
          Confirmer l&apos;absence
        </OnlineSubmitButton>
      </div>
    </form>
  );
}
