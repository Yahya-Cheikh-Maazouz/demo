"use client";

import { useActionState, useEffect, useId, useRef, useState } from "react";
import { CalendarPlus, Phone } from "lucide-react";
import { Alert } from "@/components/ui/alert";
import { Field, inputStyles } from "@/components/ui/field";
import { useFocusAfterError } from "@/components/ui/use-focus-after-error";
import { refreshOfflineCopy } from "@/components/moniteur/service-worker";
import { LESSON_TYPE_META } from "@/features/planning/lesson-meta";
import { cn } from "@/lib/cn";
import { formatDateLong, formatTimeRange } from "@/lib/format";
import type { LeaveReason } from "@/lib/types";
import { INITIAL_LEAVE_STATE, type LeaveActionState } from "./action-state";
import { declareLeaveAction } from "./actions";
import { guardNetwork } from "./network-guard";
import { OnlineSubmitButton } from "./online-submit-button";

const REASONS: LeaveReason[] = ["Congés", "Maladie", "Formation", "Autre"];

type Draft = { startDate: string; startTime: string; endDate: string; endTime: string; reason: LeaveReason | "" };

const emptyDraft = (day: string): Draft => ({ startDate: day, startTime: "08:00", endDate: day, endTime: "20:00", reason: "" });

/**
 * Declares a leave: start and end (date + time, Paris), and the reason. Refused when lessons are
 * planned on the period: they are listed, the agency moves them first.
 */
export function LeaveForm({ today, defaultDay, agencyPhone }: { today: string; defaultDay: string; agencyPhone: string | null }) {
  const [draft, setDraft] = useState<Draft>(() => emptyDraft(defaultDay));
  const formRef = useRef<HTMLFormElement>(null);
  const alertRef = useRef<HTMLDivElement>(null);
  const successRef = useRef<HTMLDivElement>(null);
  const reasonLegendId = useId();
  const reasonErrorId = useId();

  // A network failure keeps the fields as typed (the draft lives outside the keyed form).
  const [state, formAction] = useActionState(
    guardNetwork(async (prev: LeaveActionState, formData: FormData) => {
      // The previous state travels to the server with the form: only its counter is needed there,
      // not the list of conflicting lessons of the last attempt.
      const next = await declareLeaveAction({ status: prev.status, attempt: prev.attempt }, formData);
      if (next.status === "success") {
        setDraft(emptyDraft(defaultDay));
        refreshOfflineCopy();
      }
      return next;
    }),
    INITIAL_LEAVE_STATE,
  );

  useFocusAfterError(formRef, state, undefined, alertRef);
  // Missing motif: aria-invalid sits on the radio group (ARIA does not allow it on a radio), which
  // the hook above finds but cannot focus. Give the focus to the first motif, which carries the
  // error as its description.
  useEffect(() => {
    const form = formRef.current;
    if (state.status !== "error" || !state.fieldErrors?.reason || !form || form.contains(document.activeElement)) return;
    form.querySelector<HTMLInputElement>('input[name="reason"]')?.focus();
  }, [state]);
  useEffect(() => {
    if (state.status === "success") successRef.current?.focus();
  }, [state]);

  const errors = state.status === "error" ? state.fieldErrors : undefined;
  const edit = (patch: Partial<Draft>) => setDraft((current) => ({ ...current, ...patch }));

  return (
    // Remounted on every result: React resets a form's DOM after an action, even controlled fields.
    <form key={state.attempt ?? 0} ref={formRef} action={formAction} noValidate className="space-y-5">
      {state.status === "success" && state.message && (
        <div ref={successRef} tabIndex={-1} className="rounded-2xl outline-none">
          <Alert tone="success" title="Indisponibilité enregistrée">
            {state.message}
          </Alert>
        </div>
      )}

      <fieldset>
        <legend className="text-base font-bold text-ink">Début</legend>
        <div className="mt-2 grid grid-cols-[1fr_8rem] gap-3">
          <Field label="Jour" error={errors?.startDate}>
            {({ id, describedBy, invalid }) => (
              <input
                id={id}
                name="startDate"
                type="date"
                min={today}
                aria-describedby={describedBy}
                aria-invalid={invalid || undefined}
                className={inputStyles}
                value={draft.startDate}
                onChange={(event) => {
                  const startDate = event.target.value;
                  edit(draft.endDate < startDate ? { startDate, endDate: startDate } : { startDate });
                }}
              />
            )}
          </Field>
          <Field label="Heure" error={errors?.startTime}>
            {({ id, describedBy, invalid }) => (
              <input
                id={id}
                name="startTime"
                type="time"
                step={900}
                aria-describedby={describedBy}
                aria-invalid={invalid || undefined}
                className={inputStyles}
                value={draft.startTime}
                onChange={(event) => edit({ startTime: event.target.value })}
              />
            )}
          </Field>
        </div>
      </fieldset>

      <fieldset>
        <legend className="text-base font-bold text-ink">Fin</legend>
        <div className="mt-2 grid grid-cols-[1fr_8rem] gap-3">
          <Field label="Jour" error={errors?.endDate}>
            {({ id, describedBy, invalid }) => (
              <input
                id={id}
                name="endDate"
                type="date"
                min={draft.startDate || today}
                aria-describedby={describedBy}
                aria-invalid={invalid || undefined}
                className={inputStyles}
                value={draft.endDate}
                onChange={(event) => edit({ endDate: event.target.value })}
              />
            )}
          </Field>
          <Field label="Heure" error={errors?.endTime}>
            {({ id, describedBy, invalid }) => (
              <input
                id={id}
                name="endTime"
                type="time"
                step={900}
                aria-describedby={describedBy}
                aria-invalid={invalid || undefined}
                className={inputStyles}
                value={draft.endTime}
                onChange={(event) => edit({ endTime: event.target.value })}
              />
            )}
          </Field>
        </div>
      </fieldset>

      <fieldset
        role="radiogroup"
        aria-invalid={errors?.reason ? true : undefined}
        aria-describedby={errors?.reason ? reasonErrorId : undefined}
      >
        <legend id={reasonLegendId} className="text-base font-bold text-ink">
          Motif
        </legend>
        <div className="mt-2 grid grid-cols-2 gap-2">
          {REASONS.map((reason) => {
            const checked = draft.reason === reason;
            return (
              <label
                key={reason}
                className={cn(
                  "flex h-14 cursor-pointer items-center gap-3 rounded-2xl border px-4 font-semibold transition-colors has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-brand",
                  checked ? "border-brand bg-brand-soft text-brand" : "border-line-strong bg-surface text-ink hover:bg-subtle",
                )}
              >
                <input
                  type="radio"
                  name="reason"
                  value={reason}
                  checked={checked}
                  onChange={() => edit({ reason })}
                  aria-describedby={errors?.reason ? reasonErrorId : undefined}
                  className="size-5 accent-brand"
                />
                {reason}
              </label>
            );
          })}
        </div>
        {errors?.reason && (
          <p id={reasonErrorId} className="mt-1.5 text-sm font-medium text-danger">
            {errors.reason}
          </p>
        )}
      </fieldset>

      {state.status === "error" && !state.fieldErrors && (
        <div ref={alertRef} tabIndex={-1} className="rounded-2xl outline-none">
          {state.code === "conflit" && state.conflicts?.length ? (
            <Alert
              key={state.attempt}
              tone="danger"
              role="alert"
              title={state.message}
              action={
                agencyPhone ? (
                  <a
                    href={`tel:${agencyPhone.replace(/\s/g, "")}`}
                    className="inline-flex h-11 items-center gap-2 rounded-xl border border-line-strong bg-surface px-4 text-sm font-semibold text-ink hover:bg-subtle"
                  >
                    <Phone className="size-4 text-brand" aria-hidden />
                    Appeler l&apos;accueil
                  </a>
                ) : undefined
              }
            >
              <ul className="mt-1 space-y-1">
                {state.conflicts.map((c) => (
                  <li key={c.lessonId} className="font-medium text-ink">
                    {formatDateLong(c.start)}, <span className="tabular-nums">{formatTimeRange(c.start, c.end)}</span> ·{" "}
                    {LESSON_TYPE_META[c.type].label} · {c.studentName}
                  </li>
                ))}
              </ul>
              <p className="mt-2">Prévenez l&apos;accueil pour déplacer ces leçons, puis déclarez à nouveau votre indisponibilité.</p>
            </Alert>
          ) : (
            <Alert key={state.attempt} tone="danger" role="alert" title="L'indisponibilité n'a pas été enregistrée">
              {state.message}
            </Alert>
          )}
        </div>
      )}

      <OnlineSubmitButton size="lg" fullWidth className="h-14 rounded-2xl text-base" icon={<CalendarPlus className="size-5" aria-hidden />} pendingLabel="Enregistrement…">
        Déclarer l&apos;indisponibilité
      </OnlineSubmitButton>
    </form>
  );
}
