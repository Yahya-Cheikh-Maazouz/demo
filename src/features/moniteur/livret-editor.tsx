"use client";

import { useActionState, useEffect, useId, useRef, useState } from "react";
import { Minus, Plus, Save } from "lucide-react";
import { Alert } from "@/components/ui/alert";
import { Field, inputStyles } from "@/components/ui/field";
import { refreshOfflineCopy } from "@/components/moniteur/service-worker";
import { useFocusAfterError } from "@/components/ui/use-focus-after-error";
import { cn } from "@/lib/cn";
import { formatPercent } from "@/lib/format";
import type { Competence } from "@/lib/types";
import { INITIAL_INSTRUCTOR_STATE, LIVRET_NOTE_MAX, LIVRET_STEP, type InstructorActionState } from "./action-state";
import { updateLivretAction } from "./actions";
import { OnlineSubmitButton } from "./online-submit-button";

type LivretEditorProps = {
  lessonId: string;
  competences: Array<Pick<Competence, "code" | "label" | "progress">>;
  studentFirstName: string;
};

/** Next multiple of the step, up or down ("78 %" + → 80 %, − → 75 %). */
function stepped(value: number, direction: 1 | -1): number {
  const next = direction > 0 ? Math.floor(value / LIVRET_STEP) * LIVRET_STEP + LIVRET_STEP : Math.ceil(value / LIVRET_STEP) * LIVRET_STEP - LIVRET_STEP;
  return Math.min(100, Math.max(0, next));
}

/**
 * The 4 REMC competences with big −/+ buttons (steps of 5 %) and the comment after the lesson.
 * Values live here, outside the keyed form, so they survive an error; the comment is cleared once saved.
 */
export function LivretEditor({ lessonId, competences, studentFirstName }: LivretEditorProps) {
  const [values, setValues] = useState(() => competences.map((c) => c.progress));
  const [note, setNote] = useState("");
  const formRef = useRef<HTMLFormElement>(null);
  const errorRef = useRef<HTMLDivElement>(null);
  const successRef = useRef<HTMLDivElement>(null);

  const [state, formAction] = useActionState(async (prev: InstructorActionState, formData: FormData) => {
    const next = await updateLivretAction(prev, formData);
    if (next.status === "success") {
      setNote("");
      refreshOfflineCopy();
    }
    return next;
  }, INITIAL_INSTRUCTOR_STATE);

  useFocusAfterError(formRef, state, undefined, errorRef);
  useEffect(() => {
    if (state.status === "success") successRef.current?.focus();
  }, [state]);

  const saved = competences.map((c) => c.progress);
  const changed = values.some((v, i) => v !== saved[i]) || note.trim() !== "";

  return (
    // Remounted on every result: React resets a form's DOM after an action, even controlled fields.
    <form key={state.attempt ?? 0} ref={formRef} action={formAction} className="space-y-5">
      <input type="hidden" name="lessonId" value={lessonId} />
      <fieldset>
        <legend className="text-sm font-semibold text-ink">Niveau de {studentFirstName} par compétence</legend>
        <ul className="mt-3 space-y-3">
          {competences.map((competence, index) => (
            <CompetenceStepper
              key={competence.code}
              code={competence.code}
              label={competence.label}
              value={values[index]}
              saved={saved[index]}
              onChange={(value) => setValues((current) => current.map((v, i) => (i === index ? value : v)))}
            />
          ))}
        </ul>
      </fieldset>

      <Field label="Retour après la leçon (facultatif)" hint={`Signé à votre nom, l'élève et ses parents le lisent dans leur suivi. ${LIVRET_NOTE_MAX} caractères au plus.`}>
        {({ id, describedBy, invalid }) => (
          <textarea
            id={id}
            name="note"
            rows={3}
            maxLength={LIVRET_NOTE_MAX}
            aria-describedby={describedBy}
            aria-invalid={invalid || undefined}
            placeholder="Par exemple : bonne gestion des intersections, à revoir : les insertions."
            className={cn(inputStyles, "min-h-28 resize-y py-3 leading-relaxed")}
            value={note}
            onChange={(event) => setNote(event.target.value)}
          />
        )}
      </Field>

      {state.status === "error" && (
        <div ref={errorRef} tabIndex={-1} className="rounded-2xl outline-none">
          <Alert key={state.attempt} tone="danger" role="alert" title="Le livret n'a pas été enregistré">
            {state.message}
          </Alert>
        </div>
      )}
      {state.status === "success" && !changed && (
        <div ref={successRef} tabIndex={-1} className="rounded-2xl outline-none">
          <Alert key={state.attempt} tone="success" title={state.message} />
        </div>
      )}

      <OnlineSubmitButton size="lg" fullWidth className="h-14 rounded-2xl text-base" icon={<Save className="size-5" aria-hidden />} pendingLabel="Enregistrement…">
        Enregistrer le livret
      </OnlineSubmitButton>
    </form>
  );
}

function CompetenceStepper({
  code,
  label,
  value,
  saved,
  onChange,
}: {
  code: string;
  label: string;
  value: number;
  saved: number;
  onChange: (value: number) => void;
}) {
  const labelId = useId();
  const stepButton =
    "flex size-12 shrink-0 items-center justify-center rounded-2xl border border-line-strong bg-surface text-ink transition-colors hover:bg-subtle active:scale-95 disabled:opacity-40";
  return (
    <li className="rounded-2xl border border-line p-3">
      <div className="flex items-center gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-xs font-bold tracking-[0.08em] text-brand">{code}</p>
          <p id={labelId} className="text-sm leading-snug font-semibold text-ink">
            {label}
          </p>
        </div>
        <div role="group" aria-labelledby={labelId} className="flex shrink-0 items-center gap-1.5">
          <button
            type="button"
            className={stepButton}
            onClick={() => onChange(stepped(value, -1))}
            disabled={value <= 0}
            aria-label={`Baisser ${code} de ${LIVRET_STEP} %`}
          >
            <Minus className="size-5" aria-hidden />
          </button>
          <output aria-live="polite" className="w-14 text-center text-lg font-extrabold text-ink tabular-nums">
            <span className="sr-only">{code} : </span>
            {formatPercent(value)}
          </output>
          <button
            type="button"
            className={stepButton}
            onClick={() => onChange(stepped(value, 1))}
            disabled={value >= 100}
            aria-label={`Monter ${code} de ${LIVRET_STEP} %`}
          >
            <Plus className="size-5" aria-hidden />
          </button>
        </div>
      </div>
      <div aria-hidden className="mt-3 h-2 overflow-hidden rounded-full bg-subtle">
        <div className="h-full rounded-full bg-brand transition-[width] duration-200" style={{ width: `${value}%` }} />
      </div>
      {value !== saved && (
        <p className="mt-1.5 text-xs font-medium text-ink-muted">
          Avant : <span className="tabular-nums">{formatPercent(saved)}</span> · non enregistré
        </p>
      )}
      <input type="hidden" name={code} value={value} />
    </li>
  );
}
