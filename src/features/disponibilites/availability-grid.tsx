"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { CalendarCheck, Check, Clock3, Info, PencilLine } from "lucide-react";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { SubmitButton } from "@/components/ui/submit-button";
import { useFocusAfterError } from "@/components/ui/use-focus-after-error";
import { cn } from "@/lib/cn";
import { INITIAL_AVAILABILITY_STATE } from "./action-state";
import { saveAvailabilitiesAction } from "./actions";
import { DAYS, PERIODS, cellKey, dayKind, slotCount, type CellKey } from "./periods";

const sameCells = (a: Set<CellKey>, b: CellKey[]) => a.size === b.length && b.every((key) => a.has(key));

/**
 * "Planning hebdomadaire": one checkbox per day and period, in a real table (row and column
 * headers are read with each checkbox). The checked cells are controlled, so they survive a
 * failed save; the form is remounted on every result because React resets a form after an action.
 */
export function AvailabilityGrid({ saved }: { saved: CellKey[] }) {
  const [state, formAction] = useActionState(saveAvailabilitiesAction, INITIAL_AVAILABILITY_STATE);
  const [selected, setSelected] = useState(() => new Set(saved));
  const formRef = useRef<HTMLFormElement>(null);
  const errorRef = useRef<HTMLDivElement>(null);
  const successRef = useRef<HTMLDivElement>(null);
  // The success message disappears as soon as the student changes the grid again.
  const [editedAfterAttempt, setEditedAfterAttempt] = useState<number | undefined>(undefined);

  // After a save, show the cells as the API recorded them. Adjusting state while rendering when
  // the action result changes avoids an effect.
  const [handledState, setHandledState] = useState(state);
  if (state !== handledState) {
    setHandledState(state);
    if (state.status === "success" && state.cells) setSelected(new Set(state.cells));
  }

  // The submit button was disabled while pending: give the focus to the result.
  useFocusAfterError(formRef, state, undefined, errorRef);
  useEffect(() => {
    if (state.status === "success") successRef.current?.focus();
  }, [state]);

  const toggle = (key: CellKey, checked: boolean) => {
    setSelected((current) => {
      const next = new Set(current);
      if (checked) next.add(key);
      else next.delete(key);
      return next;
    });
    if (state.status === "success") setEditedAfterAttempt(state.attempt);
  };

  const count = selected.size;
  const dirty = !sameCells(selected, state.status === "success" && state.cells ? state.cells : saved);
  const showSuccess = state.status === "success" && editedAfterAttempt !== state.attempt;

  return (
    <form key={state.attempt ?? 0} ref={formRef} action={formAction} noValidate>
      <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-3 px-5 pt-5 sm:px-6 sm:pt-6">
        <div className="flex min-w-0 items-start gap-3">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-brand-soft text-brand">
            <Clock3 className="size-5" aria-hidden />
          </span>
          <div className="min-w-0">
            <p className="eyebrow">Planning hebdomadaire</p>
            <h2 id="grille-titre" className="mt-1 text-lg font-bold tracking-[-0.01em] text-ink">
              Choisissez vos créneaux préférés
            </h2>
          </div>
        </div>
        <Badge tone={count > 0 ? "brand" : "neutral"} icon={CalendarCheck} className="sm:mt-1">
          {slotCount(count)} {count > 1 ? "sélectionnés" : "sélectionné"}
        </Badge>
      </div>

      <div className="mt-4 px-2 pb-2 sm:px-4">
        <table aria-labelledby="grille-titre" className="w-full table-fixed border-collapse">
          <colgroup>
            <col className="w-[28%] sm:w-[34%]" />
            <col />
            <col />
            <col />
          </colgroup>
          <thead>
            <tr className="border-b border-line">
              <th scope="col" className="px-2 py-3 text-left align-bottom text-sm font-semibold text-ink-muted sm:px-3">
                Jour
              </th>
              {PERIODS.map((period) => (
                <th key={period.id} scope="col" className="px-1 py-3 text-center align-bottom">
                  <span className="block text-sm font-bold text-ink">{period.label}</span>
                  <span className="mt-0.5 block text-xs font-medium text-ink-subtle">{period.hint}</span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {DAYS.map((day) => (
              <tr key={day} className="border-b border-line last:border-b-0">
                <th scope="row" className="px-2 py-1.5 text-left font-normal sm:px-3">
                  <span className="block font-bold text-ink">{day}</span>
                  <span className="block text-xs text-ink-subtle">{dayKind(day)}</span>
                </th>
                {PERIODS.map((period) => {
                  const key = cellKey(day, period.id);
                  const checked = selected.has(key);
                  return (
                    <td key={period.id} className="p-0.5 text-center sm:p-1">
                      <label className="group flex h-14 cursor-pointer items-center justify-center rounded-2xl transition-colors hover:bg-subtle">
                        <span className="relative flex">
                          <input
                            type="checkbox"
                            name="creneau"
                            value={key}
                            checked={checked}
                            onChange={(event) => toggle(key, event.target.checked)}
                            className={cn(
                              "peer size-8 appearance-none rounded-[10px] border-2 bg-surface transition-[background-color,border-color,box-shadow] duration-150",
                              "border-line-strong group-hover:border-ink-subtle",
                              "checked:border-brand checked:bg-brand checked:shadow-[0_4px_12px_-4px] checked:shadow-brand/60 group-hover:checked:border-brand-strong",
                            )}
                          />
                          <Check
                            className="pointer-events-none absolute inset-0 m-auto size-4.5 text-on-brand opacity-0 transition-opacity peer-checked:opacity-100"
                            strokeWidth={3}
                            aria-hidden
                          />
                        </span>
                        <span className="sr-only">
                          {day} {period.label.toLowerCase()}
                        </span>
                      </label>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {(state.status === "error" && state.message) || showSuccess ? (
        <div className="px-5 pb-4 sm:px-6">
          {state.status === "error" && state.message && (
            <div ref={errorRef} tabIndex={-1} className="rounded-2xl outline-none">
              <Alert key={state.attempt} tone="danger" role="alert" title="L'enregistrement n'a pas abouti">
                {state.message}
              </Alert>
            </div>
          )}
          {showSuccess && (
            <div ref={successRef} tabIndex={-1} className="rounded-2xl outline-none">
              <Alert key={state.attempt} tone="success" title="Disponibilités enregistrées">
                {state.message}
              </Alert>
            </div>
          )}
        </div>
      ) : null}

      <div className="flex flex-col gap-4 border-t border-line px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <div className="flex items-start gap-3 text-sm">
          <Info className="mt-0.5 size-4 shrink-0 text-ink-subtle" aria-hidden />
          <p className="text-ink-muted">
            <span className="block font-semibold text-ink">Ces créneaux restent indicatifs.</span>
            L&apos;auto-école vous proposera des leçons selon le planning disponible.
          </p>
        </div>
        <div className="flex flex-col items-stretch gap-2 sm:items-end">
          {dirty && (
            <p className="flex items-center gap-1.5 text-sm font-medium text-warning sm:justify-end">
              <PencilLine className="size-4 shrink-0" aria-hidden />
              Modifications non enregistrées
            </p>
          )}
          <SubmitButton
            size="lg"
            icon={<Check className="size-5" aria-hidden />}
            pendingLabel="Enregistrement…"
            className="w-full sm:w-auto"
          >
            Enregistrer mes disponibilités
          </SubmitButton>
        </div>
      </div>
    </form>
  );
}
