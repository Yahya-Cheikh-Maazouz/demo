"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { TriangleAlert } from "lucide-react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Field, inputStyles } from "@/components/ui/field";
import { SubmitButton } from "@/components/ui/submit-button";
import { dayKey, formatTime } from "@/lib/format";
import { parisMinutes } from "@/lib/paris-time";
import type { Instructor, LessonType, PlanningLesson, Vehicle } from "@/lib/types";
import { LESSON_TYPE_META } from "../lesson-meta";
import { saveLessonAction } from "./actions";
import { INITIAL_AGENDA_STATE } from "./agenda-state";
import { GRID_END_HOUR, GRID_START_HOUR } from "./time-grid";

export type LessonFormMode =
  | { kind: "create"; dayKey: string; minutes: number; instructorId?: string }
  | { kind: "edit"; lesson: PlanningLesson };

export type StudentChoice = { id: string; name: string; gearbox: Vehicle["gearbox"] };

type LessonFormDialogProps = {
  open: boolean;
  onClose: () => void;
  mode: LessonFormMode;
  students: StudentChoice[];
  instructors: Instructor[];
  vehicles: Vehicle[];
  canForce: boolean;
  onSaved: (message: string) => void;
};

const TIMES = Array.from({ length: (GRID_END_HOUR - GRID_START_HOUR) * 2 - 1 }, (_, i) => {
  const minutes = GRID_START_HOUR * 60 + i * 30;
  return `${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`;
});
const DURATIONS = [
  { value: "1", label: "1 h" },
  { value: "1.5", label: "1 h 30" },
  { value: "2", label: "2 h" },
];
const TYPES = Object.entries(LESSON_TYPE_META) as Array<[LessonType, { label: string }]>;

const toTime = (minutes: number) =>
  `${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`;

/**
 * Creates a lesson, or moves one (date, time, instructor). Fields are controlled: React resets
 * uncontrolled forms after an action, which would wipe the choices when a conflict comes back.
 */
export function LessonFormDialog({ open, onClose, mode, students, instructors, vehicles, canForce, onSaved }: LessonFormDialogProps) {
  const [state, formAction] = useActionState(saveLessonAction, INITIAL_AGENDA_STATE);
  const editing = mode.kind === "edit" ? mode.lesson : null;

  const [studentId, setStudentId] = useState("");
  const [type, setType] = useState<LessonType>("conduite");
  const [instructorId, setInstructorId] = useState(
    editing?.instructor.id ?? (mode.kind === "create" ? mode.instructorId : undefined) ?? instructors[0]?.id ?? "",
  );
  const [vehicleId, setVehicleId] = useState("auto");
  const [date, setDate] = useState(editing ? dayKey(editing.start) : mode.kind === "create" ? mode.dayKey : "");
  const [time, setTime] = useState(
    editing ? toTime(parisMinutes(editing.start)) : mode.kind === "create" ? toTime(mode.minutes) : "08:00",
  );
  const [duration, setDuration] = useState("2");

  const onSavedRef = useRef(onSaved);
  useEffect(() => {
    onSavedRef.current = onSaved;
  });
  useEffect(() => {
    if (state.status === "success" && state.message) onSavedRef.current(state.message);
  }, [state]);

  const student = students.find((s) => s.id === studentId);
  const isCode = type === "code";

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={editing ? "Modifier ou déplacer le RDV" : "Nouveau RDV"}
      description={
        editing
          ? `${LESSON_TYPE_META[editing.type].label} de ${editing.student.firstName} ${editing.student.lastName}, actuellement à ${formatTime(editing.start)}.`
          : "Les conflits de moniteur, de véhicule et les congés sont vérifiés à l'enregistrement."
      }
    >
      {/* React resets a form's DOM after each action, even controlled fields: remounting it on
          every result puts the controlled values back (otherwise "Forcer" would send the defaults). */}
      <form key={state.attempt ?? 0} action={formAction} className="space-y-4">
        {editing && <input type="hidden" name="lessonId" value={editing.id} />}

        {!editing && (
          <>
            <Field label="Élève" required>
              {({ id, describedBy }) => (
                <select
                  id={id}
                  name="studentId"
                  required
                  aria-describedby={describedBy}
                  className={inputStyles}
                  value={studentId}
                  onChange={(event) => setStudentId(event.target.value)}
                >
                  <option value="" disabled>
                    Choisir un élève
                  </option>
                  {students.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              )}
            </Field>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Type de RDV">
                {({ id }) => (
                  <select
                    id={id}
                    name="type"
                    className={inputStyles}
                    value={type}
                    onChange={(event) => {
                      const next = event.target.value as LessonType;
                      setType(next);
                      if (next === "code") setVehicleId("aucun");
                      else if (vehicleId === "aucun") setVehicleId("auto");
                    }}
                  >
                    {TYPES.map(([value, meta]) => (
                      <option key={value} value={value}>
                        {meta.label}
                      </option>
                    ))}
                  </select>
                )}
              </Field>
              <Field label="Durée">
                {({ id }) => (
                  <select id={id} name="duration" className={inputStyles} value={duration} onChange={(event) => setDuration(event.target.value)}>
                    {DURATIONS.map((d) => (
                      <option key={d.value} value={d.value}>
                        {d.label}
                      </option>
                    ))}
                  </select>
                )}
              </Field>
            </div>
          </>
        )}

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Date" required>
            {({ id }) => (
              <input
                id={id}
                type="date"
                name="date"
                required
                className={inputStyles}
                value={date}
                onChange={(event) => setDate(event.target.value)}
              />
            )}
          </Field>
          <Field label="Heure de début" required>
            {({ id }) => (
              <select id={id} name="time" required className={inputStyles} value={time} onChange={(event) => setTime(event.target.value)}>
                {TIMES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            )}
          </Field>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Moniteur" required>
            {({ id }) => (
              <select
                id={id}
                name="instructorId"
                required
                className={inputStyles}
                value={instructorId}
                onChange={(event) => setInstructorId(event.target.value)}
              >
                {instructors.map((i) => (
                  <option key={i.id} value={i.id}>
                    {i.firstName} {i.lastName}
                  </option>
                ))}
              </select>
            )}
          </Field>
          {!editing && (
            <Field
              label="Véhicule"
              hint={!isCode && vehicleId === "auto" && student ? `Boîte ${student.gearbox} de l'élève.` : undefined}
            >
              {({ id, describedBy }) => (
                <select
                  id={id}
                  name="vehicleId"
                  aria-describedby={describedBy}
                  className={inputStyles}
                  value={vehicleId}
                  disabled={isCode}
                  onChange={(event) => setVehicleId(event.target.value)}
                >
                  <option value="auto">Premier véhicule libre</option>
                  {vehicles.map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.label} ({v.gearbox === "manuelle" ? "manuelle" : "automatique"})
                    </option>
                  ))}
                  <option value="aucun">Aucun (leçon de code)</option>
                </select>
              )}
            </Field>
          )}
          {/* A disabled select is not submitted: keep the value for code lessons. */}
          {!editing && isCode && <input type="hidden" name="vehicleId" value="aucun" />}
        </div>

        {state.status === "error" && state.code === "conflit" && (
          <Alert
            tone="danger"
            role="alert"
            icon={TriangleAlert}
            title="Conflit sur ce créneau"
          >
            <ul className="list-disc space-y-1 pl-4">
              {state.conflicts?.map((conflict) => <li key={conflict}>{conflict}</li>)}
            </ul>
            {!canForce && <p className="mt-2">Choisissez un autre créneau. Seul le gérant peut forcer un RDV en conflit.</p>}
          </Alert>
        )}
        {state.status === "error" && state.code !== "conflit" && state.message && (
          <Alert tone="danger" role="alert">
            {state.message}
          </Alert>
        )}

        <div className="flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:justify-end">
          <Button variant="secondary" onClick={onClose}>
            Annuler
          </Button>
          {state.code === "conflit" && canForce && (
            <SubmitButton name="force" value="1" variant="danger" pendingLabel="Enregistrement…">
              Forcer quand même
            </SubmitButton>
          )}
          <SubmitButton name="force" value="0" pendingLabel="Enregistrement…">
            {editing ? "Enregistrer le déplacement" : "Enregistrer le RDV"}
          </SubmitButton>
        </div>
      </form>
    </Dialog>
  );
}
