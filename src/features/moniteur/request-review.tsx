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
import { deName } from "./french";
import { guardNetwork } from "./network-guard";
import { OnlineSubmitButton } from "./online-submit-button";

type RequestReviewProps = {
  lessonId: string;
  /** "Jules Durand" */
  studentName: string;
  /** "Leçon de conduite, jeudi 12 novembre, 08:00 – 10:00" */
  summary: string;
  className?: string;
};

/** Codes after which the request leaves the screen (refreshed list or sheet) together with this block. */
const GONE_CODES = ["deja_traitee", "introuvable", "expiree"];

/** Why a request the instructor answered is no longer there. */
function goneMessage(code: string | undefined, studentName: string): string {
  return code === "expiree"
    ? `L'heure de la demande ${deName(studentName)} est passée sans réponse : voyez avec l'accueil.`
    : `La demande ${deName(studentName)} n'est plus à traiter : l'élève l'a annulée ou l'accueil y a déjà répondu.`;
}

/**
 * Wraps the action: announces the result above the content, since this block leaves with the
 * request. A request handled elsewhere meanwhile leaves too: that is announced as well, otherwise
 * it would vanish exactly like a confirmed one.
 */
function useReview(studentName: string, onGone?: () => void) {
  const { announce } = useInstructorFeedback();
  return useActionState(
    guardNetwork(async (prev: InstructorActionState, formData: FormData) => {
      const next = await reviewRequestAction(prev, formData);
      if (next.status === "success") {
        onGone?.();
        announce(next.message ?? "Demande traitée.", next.code === "attente_paiement" ? "warning" : "success");
        refreshOfflineCopy();
      } else if (next.status === "error" && GONE_CODES.includes(next.code ?? "")) {
        onGone?.();
        announce(goneMessage(next.code, studentName), "warning");
        refreshOfflineCopy();
      }
      return next;
    }),
    INITIAL_INSTRUCTOR_STATE,
  );
}

/** "Confirmer" (the student then sees « Planifié ») or "Refuser" (after a confirmation) a request. */
export function RequestReview({ lessonId, studentName, summary, className }: RequestReviewProps) {
  const [state, formAction] = useReview(studentName);
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
          <span className="sr-only"> la demande {deName(studentName)}</span>
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
          <span className="sr-only"> la demande {deName(studentName)}</span>
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
        <RefuseForm
          key={refuseKey}
          lessonId={lessonId}
          studentName={studentName}
          onCancel={() => setRefusing(false)}
          onDone={() => setRefusing(false)}
        />
      </Dialog>
    </div>
  );
}

function RefuseForm({
  lessonId,
  studentName,
  onCancel,
  onDone,
}: {
  lessonId: string;
  studentName: string;
  onCancel: () => void;
  onDone: () => void;
}) {
  const errorRef = useRef<HTMLDivElement>(null);
  const [state, formAction] = useReview(studentName, onDone);
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
