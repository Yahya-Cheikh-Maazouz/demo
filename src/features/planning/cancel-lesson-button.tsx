"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { CalendarX, CircleCheck, TriangleAlert } from "lucide-react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { SubmitButton } from "@/components/ui/submit-button";
import { formatDateLong, formatHours, formatTime, formatTimeRange } from "@/lib/format";
import type { Lesson } from "@/lib/types";
import { INITIAL_PLANNING_STATE, type PlanningActionState } from "./action-state";
import { cancelLessonAction } from "./actions";
import { LESSON_TYPE_META } from "./lesson-meta";
import { usePlanningFeedback } from "./planning-feedback";

type CancelLessonButtonProps = {
  lesson: Lesson;
  /** Server time (ISO), to tell a free cancellation from a late one. */
  now: string;
  lateCancellationCharged: boolean;
};

/**
 * Preview of what a late cancellation costs, from the school's rules. The API has the final say:
 * the confirmation message uses the hours it actually charged.
 */
function previewChargedHours(lesson: Lesson, lateCancellationCharged: boolean): number {
  const consumesDrivingHours = lesson.type === "conduite" || lesson.type === "examen_blanc";
  return lateCancellationCharged && consumesDrivingHours && lesson.status === "confirme" ? lesson.durationHours : 0;
}

export function CancelLessonButton({ lesson, now, lateCancellationCharged }: CancelLessonButtonProps) {
  const [open, setOpen] = useState(false);
  // A new key per opening resets the form state (no stale error from a previous attempt).
  const [attemptKey, setAttemptKey] = useState(0);
  const type = LESSON_TYPE_META[lesson.type];
  // "lundi 2 novembre, 18:00 – 20:00": used in the middle of a sentence.
  const when = `${formatDateLong(lesson.start).toLowerCase()}, ${formatTimeRange(lesson.start, lesson.end)}`;

  return (
    <div className="contents">
      <Button
        variant="secondary"
        icon={<CalendarX className="size-4" aria-hidden />}
        aria-haspopup="dialog"
        onClick={() => {
          setAttemptKey((key) => key + 1);
          setOpen(true);
        }}
      >
        Annuler
        {/* "Annuler : Examen blanc, lundi 2 novembre…": no article, it differs between lesson types. */}
        <span className="sr-only">
          {" "}
          : {type.label}, {when}
        </span>
      </Button>

      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        title={lesson.status === "a_confirmer" ? "Annuler cette demande ?" : "Annuler cette leçon ?"}
        description={`${type.label}, ${when}, avec ${lesson.instructor.firstName} ${lesson.instructor.lastName}`}
      >
        <CancelLessonForm
          key={attemptKey}
          lesson={lesson}
          now={now}
          lateCancellationCharged={lateCancellationCharged}
          onCancelled={() => setOpen(false)}
          onKeep={() => setOpen(false)}
        />
      </Dialog>
    </div>
  );
}

function CancelLessonForm({
  lesson,
  now,
  lateCancellationCharged,
  onCancelled,
  onKeep,
}: CancelLessonButtonProps & { onCancelled: () => void; onKeep: () => void }) {
  const { announce } = usePlanningFeedback();
  const errorRef = useRef<HTMLDivElement>(null);

  const [state, formAction] = useActionState(
    async (prev: PlanningActionState, formData: FormData) => {
      const next = await cancelLessonAction(prev, formData);
      if (next.status === "success") {
        // The card leaves the "À venir" list with the refresh: the message is shown above the list.
        onCancelled();
        announce(next.message ?? "Leçon annulée.");
      }
      return next;
    },
    INITIAL_PLANNING_STATE,
  );

  useEffect(() => {
    if (state.status === "error") errorRef.current?.focus();
  }, [state]);

  const request = lesson.status === "a_confirmer";
  const late = !request && now > lesson.freeCancellationUntil;
  const chargedHours = previewChargedHours(lesson, lateCancellationCharged);
  // "jeudi 29 octobre à 18:00", in the middle of a sentence.
  const deadline = `${formatDateLong(lesson.freeCancellationUntil).toLowerCase()} à ${formatTime(lesson.freeCancellationUntil)}`;

  return (
    <form action={formAction}>
      <input type="hidden" name="lessonId" value={lesson.id} />

      {late ? (
        <Alert tone="warning" icon={TriangleAlert} title="Annulation tardive">
          <p>Le délai d&apos;annulation gratuite est dépassé depuis le {deadline}.</p>
          <p className="mt-1">
            {chargedHours > 0 ? (
              <>
                Selon les règles de votre auto-école,{" "}
                <strong className="font-semibold text-ink tabular-nums">{formatHours(chargedHours)}</strong>{" "}
                {chargedHours > 1 ? "seront décomptées" : "sera décomptée"} de votre solde.
              </>
            ) : (
              "Aucune heure ne sera décomptée de votre solde."
            )}
          </p>
        </Alert>
      ) : request ? (
        <Alert tone="success" icon={CircleCheck} title="Annulation gratuite">
          Votre moniteur n&apos;a pas encore confirmé cette demande : vous pouvez la retirer sans frais.
        </Alert>
      ) : (
        <Alert tone="success" icon={CircleCheck} title="Annulation gratuite">
          Vous pouvez annuler sans frais jusqu&apos;au {deadline}.
        </Alert>
      )}

      {state.status === "error" && (
        <div ref={errorRef} tabIndex={-1} className="mt-3 rounded-2xl outline-none">
          <Alert key={state.attempt} tone="danger" role="alert" title="L'annulation n'a pas abouti">
            {state.message}
          </Alert>
        </div>
      )}

      <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <Button variant="secondary" onClick={onKeep}>
          {request ? "Garder la demande" : "Garder la leçon"}
        </Button>
        <SubmitButton
          variant="danger"
          icon={<CalendarX className="size-4" aria-hidden />}
          pendingLabel="Annulation…"
        >
          {request ? "Annuler la demande" : "Annuler la leçon"}
        </SubmitButton>
      </div>
    </form>
  );
}
