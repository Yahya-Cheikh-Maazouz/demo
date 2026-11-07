"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { CalendarClock, CarFront, CircleCheck, CircleX, MapPin, Pencil, Phone, UserRound, UserX } from "lucide-react";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button, ButtonLink, buttonStyles } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { SubmitButton } from "@/components/ui/submit-button";
import { NephValue } from "@/features/profil/neph-value";
import { BALANCE_STATE_META } from "@/features/solde/balance-meta";
import { formatDateLong, formatHours, formatTimeRange, maskPhone } from "@/lib/format";
import type { PlanningLesson } from "@/lib/types";
import { LESSON_STATUS_META, LESSON_TYPE_META } from "../lesson-meta";
import { lessonStatusAction } from "./actions";
import { INITIAL_AGENDA_STATE } from "./agenda-state";

type LessonPanelProps = {
  lesson: PlanningLesson | null;
  open: boolean;
  onClose: () => void;
  now: string;
  canManage: boolean;
  /** Link to the student's file (needs "eleves.voir"). */
  canSeeStudents: boolean;
  onEdit: (lessonId: string) => void;
  /** Called with the confirmation message once an action succeeded. */
  onDone: (message: string) => void;
};

/** Lesson details in a side panel, so the planning stays in view. */
export function LessonPanel({ lesson, open, onClose, now, canManage, canSeeStudents, onEdit, onDone }: LessonPanelProps) {
  const [state, formAction] = useActionState(lessonStatusAction, INITIAL_AGENDA_STATE);
  const [confirmCancel, setConfirmCancel] = useState(false);
  const onDoneRef = useRef(onDone);
  useEffect(() => {
    onDoneRef.current = onDone;
  });
  useEffect(() => {
    if (state.status === "success" && state.message) onDoneRef.current(state.message);
  }, [state]);

  if (!lesson) return null;

  const status = LESSON_STATUS_META[lesson.status];
  const type = LESSON_TYPE_META[lesson.type];
  const active = lesson.status === "confirme" || lesson.status === "attente_paiement";
  const started = lesson.start <= now;
  const student = lesson.student;
  const balance = BALANCE_STATE_META[student.balanceState];
  const noPaidHours = ["exhausted", "uncovered", "overdrawn"].includes(student.balanceState);

  return (
    <Dialog
      open={open}
      onClose={onClose}
      variant="drawer"
      title={type.label}
      description={`${formatDateLong(lesson.start)} · ${formatTimeRange(lesson.start, lesson.end)}`}
    >
      <div className="space-y-5">
        <Badge tone={status.tone} icon={status.icon}>
          {status.label}
        </Badge>

        <section aria-labelledby="panel-eleve" className="space-y-3 rounded-2xl border border-line p-4">
          <h3 id="panel-eleve" className="text-xs font-semibold tracking-wide text-ink-subtle uppercase">
            Élève
          </h3>
          <p className="text-lg font-bold text-ink">
            {student.firstName} {student.lastName}
          </p>
          <div>
            <p className="text-xs font-medium text-ink-subtle">NEPH</p>
            <NephValue neph={student.neph} />
          </div>
          <div className="flex flex-wrap gap-2">
            <a href={`tel:${student.phone.replace(/\s/g, "")}`} className={buttonStyles({ variant: "secondary" })}>
              <Phone className="size-4" aria-hidden />
              Appeler
              <span className="font-medium text-ink-muted tabular-nums">{maskPhone(student.phone)}</span>
            </a>
            {canSeeStudents && (
              <ButtonLink href={`/gestion/eleves/${student.id}`} variant="ghost" icon={<UserRound className="size-4" aria-hidden />}>
                Fiche élève
              </ButtonLink>
            )}
          </div>
          {student.balanceState !== "ok" && (
            <Alert tone={noPaidHours ? "danger" : "warning"} title={noPaidHours ? "Plus d'heures payées" : balance.label}>
              {balance.label} : {formatHours(student.afterReservationsHours)} après ses leçons réservées.
            </Alert>
          )}
        </section>

        <ul className="space-y-2.5 text-sm text-ink-muted">
          <li className="flex items-center gap-2.5">
            <CalendarClock className="size-4 shrink-0 text-ink-subtle" aria-hidden />
            <span>
              {lesson.instructor.firstName} {lesson.instructor.lastName} · {formatHours(lesson.durationHours)}
            </span>
          </li>
          {lesson.vehicle && (
            <li className="flex items-center gap-2.5">
              <CarFront className="size-4 shrink-0 text-ink-subtle" aria-hidden />
              <span>
                {lesson.vehicle.label} · {lesson.vehicle.plate} ·{" "}
                {lesson.vehicle.gearbox === "manuelle" ? "boîte manuelle" : "boîte automatique"}
              </span>
            </li>
          )}
          <li className="flex items-start gap-2.5">
            <MapPin className="mt-0.5 size-4 shrink-0 text-ink-subtle" aria-hidden />
            <span>{lesson.meetingPoint}</span>
          </li>
        </ul>

        {lesson.status === "annule" && (
          <p className="text-sm text-ink-muted">
            {lesson.noShow
              ? `Élève absent : ${formatHours(lesson.chargedHours ?? 0)} décomptées de son solde.`
              : lesson.chargedHours
                ? `Annulation tardive : ${formatHours(lesson.chargedHours)} décomptées du solde.`
                : "RDV annulé sans frais."}
          </p>
        )}

        {lesson.studentReadyAt && (lesson.status === "confirme" || lesson.status === "attente_paiement") && (
          <p className="flex items-center gap-2 text-sm font-semibold text-success">
            <CircleCheck className="size-4" aria-hidden />
            L&apos;élève a confirmé sa présence.
          </p>
        )}

        {state.status === "error" && state.message && (
          <Alert tone="danger" role="alert">
            {state.message}
          </Alert>
        )}

        {canManage && lesson.status === "a_confirmer" && (
          <form action={formAction} className="border-t border-line pt-5">
            <input type="hidden" name="lessonId" value={lesson.id} />
            <Alert
              tone="info"
              title="Demande de l'élève à confirmer"
              action={
                <>
                  <SubmitButton name="status" value="accepte" icon={<CircleCheck className="size-4" aria-hidden />} pendingLabel="Confirmation…">
                    Confirmer la demande
                  </SubmitButton>
                  <SubmitButton name="status" value="refuse" variant="secondary" icon={<CircleX className="size-4" aria-hidden />} pendingLabel="Refus…">
                    Refuser
                  </SubmitButton>
                </>
              }
            >
              L&apos;élève a demandé ce créneau en ligne. Il reste réservé jusqu&apos;à votre réponse.
            </Alert>
          </form>
        )}

        {canManage && active && (
          <form action={formAction} className="space-y-3 border-t border-line pt-5">
            <input type="hidden" name="lessonId" value={lesson.id} />
            {confirmCancel ? (
              <Alert
                tone="danger"
                title="Annuler ce RDV ?"
                action={
                  <>
                    <SubmitButton name="status" value="annule" variant="danger" pendingLabel="Annulation…">
                      Confirmer l&apos;annulation
                    </SubmitButton>
                    <Button variant="secondary" onClick={() => setConfirmCancel(false)}>
                      Garder le RDV
                    </Button>
                  </>
                }
              >
                {lesson.start > now && now > lesson.freeCancellationUntil
                  ? "Annulation tardive : les heures de la leçon seront décomptées du solde de l'élève."
                  : "Le créneau sera libéré et l'élève prévenu."}
              </Alert>
            ) : (
              <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
                {started ? (
                  <>
                    <SubmitButton name="status" value="effectue" icon={<CircleCheck className="size-4" aria-hidden />}>
                      Marquer effectuée
                    </SubmitButton>
                    <SubmitButton
                      name="status"
                      value="absent"
                      variant="secondary"
                      icon={<UserX className="size-4" aria-hidden />}
                    >
                      Élève absent
                    </SubmitButton>
                  </>
                ) : (
                  <Button
                    variant="secondary"
                    icon={<Pencil className="size-4" aria-hidden />}
                    onClick={() => onEdit(lesson.id)}
                  >
                    Modifier ou déplacer
                  </Button>
                )}
                <Button
                  variant="danger-ghost"
                  icon={<CircleX className="size-4" aria-hidden />}
                  onClick={() => setConfirmCancel(true)}
                >
                  Annuler le RDV
                </Button>
              </div>
            )}
          </form>
        )}
      </div>
    </Dialog>
  );
}
