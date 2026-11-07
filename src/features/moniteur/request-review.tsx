"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { CalendarCheck, CalendarX } from "lucide-react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { refreshOfflineCopy } from "@/components/moniteur/service-worker";
import { useOnline } from "@/components/moniteur/use-online";
import { cn } from "@/lib/cn";
import { INITIAL_INSTRUCTOR_STATE, type InstructorActionState } from "./action-state";
import { reviewRequestAction } from "./actions";
import { useInstructorFeedback } from "./feedback";
import { OnlineSubmitButton } from "./online-submit-button";

type RequestReviewProps = {
  lessonId: string;
  /** "Jules Durand" */
  studentName: string;
  /** "Leçon de conduite, jeudi 12 novembre, 08:00 – 10:00" */
  summary: string;
  className?: string;
};

/** Wraps the action: announces the result above the content, since this block leaves with the request. */
function useReview() {
  const { announce } = useInstructorFeedback();
  return useActionState(async (prev: InstructorActionState, formData: FormData) => {
    const next = await reviewRequestAction(prev, formData);
    if (next.status === "success") {
      announce(next.message ?? "Demande traitée.", next.code === "attente_paiement" ? "warning" : "success");
      refreshOfflineCopy();
    }
    return next;
  }, INITIAL_INSTRUCTOR_STATE);
}

/** "Confirmer" (the student then sees « Planifié ») or "Refuser" (after a confirmation) a request. */
export function RequestReview({ lessonId, studentName, summary, className }: RequestReviewProps) {
  const [state, formAction] = useReview();
  const [refusing, setRefusing] = useState(false);
  const [refuseKey, setRefuseKey] = useState(0);
  const online = useOnline();
  const errorRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (state.status === "error") errorRef.current?.focus();
  }, [state]);

  return (
    <div className={cn("space-y-3", className)}>
      <form action={formAction} className="grid grid-cols-2 gap-2">
        <input type="hidden" name="lessonId" value={lessonId} />
        <input type="hidden" name="decision" value="accepte" />
        <OnlineSubmitButton size="lg" className="h-14 rounded-2xl text-base" icon={<CalendarCheck className="size-5" aria-hidden />} pendingLabel="Confirmation…">
          Confirmer
          <span className="sr-only"> la demande de {studentName}</span>
        </OnlineSubmitButton>
        <Button
          variant="secondary"
          size="lg"
          className="h-14 rounded-2xl text-base"
          icon={<CalendarX className="size-5" aria-hidden />}
          aria-haspopup="dialog"
          disabled={!online}
          onClick={() => {
            setRefuseKey((k) => k + 1);
            setRefusing(true);
          }}
        >
          Refuser
          <span className="sr-only"> la demande de {studentName}</span>
        </Button>
      </form>

      {state.status === "error" && (
        <div ref={errorRef} tabIndex={-1} className="rounded-2xl outline-none">
          <Alert key={state.attempt} tone="danger" role="alert" title="La demande n'a pas été traitée">
            {state.message}
          </Alert>
        </div>
      )}

      <Dialog open={refusing} onClose={() => setRefusing(false)} title="Refuser cette demande ?" description={`${studentName} · ${summary}`}>
        <RefuseForm key={refuseKey} lessonId={lessonId} onCancel={() => setRefusing(false)} onDone={() => setRefusing(false)} />
      </Dialog>
    </div>
  );
}

function RefuseForm({ lessonId, onCancel, onDone }: { lessonId: string; onCancel: () => void; onDone: () => void }) {
  const { announce } = useInstructorFeedback();
  const errorRef = useRef<HTMLDivElement>(null);
  const [state, formAction] = useActionState(async (prev: InstructorActionState, formData: FormData) => {
    const next = await reviewRequestAction(prev, formData);
    if (next.status === "success") {
      onDone();
      announce(next.message ?? "Demande refusée.");
      refreshOfflineCopy();
    }
    return next;
  }, INITIAL_INSTRUCTOR_STATE);
  useEffect(() => {
    if (state.status === "error") errorRef.current?.focus();
  }, [state]);

  return (
    <form action={formAction}>
      <input type="hidden" name="lessonId" value={lessonId} />
      <input type="hidden" name="decision" value="refuse" />
      <p className="text-sm text-ink-muted">
        La demande disparaît du planning de l&apos;élève et le créneau redevient libre. Rien n&apos;est décompté.
      </p>
      {state.status === "error" && (
        <div ref={errorRef} tabIndex={-1} className="mt-3 rounded-2xl outline-none">
          <Alert key={state.attempt} tone="danger" role="alert" title="La demande n'a pas été refusée">
            {state.message}
          </Alert>
        </div>
      )}
      <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <Button variant="secondary" size="lg" onClick={onCancel}>
          Garder la demande
        </Button>
        <OnlineSubmitButton variant="danger" size="lg" icon={<CalendarX className="size-5" aria-hidden />} pendingLabel="Refus…">
          Refuser la demande
        </OnlineSubmitButton>
      </div>
    </form>
  );
}
