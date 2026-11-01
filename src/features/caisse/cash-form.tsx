"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { Info } from "lucide-react";
import { Alert } from "@/components/ui/alert";
import { Field, inputStyles } from "@/components/ui/field";
import { SubmitButton } from "@/components/ui/submit-button";
import { PAYMENT_METHOD_META } from "@/features/paiements/payment-meta";
import { cn } from "@/lib/cn";
import { formatCurrency } from "@/lib/format";
import type { CashMethod } from "@/lib/types";
import { INITIAL_CASH_STATE } from "./action-state";
import { recordCashAction } from "./actions";

const METHODS: CashMethod[] = ["especes", "cheque", "carte", "virement"];

type CashFormProps = {
  students: Array<{ id: string; name: string }>;
  /** Student opened from their file (?eleve=…). */
  defaultStudentId?: string;
  hourlyRate: number;
  threshold: number;
  /** Without "caisse.valider", entries above the threshold wait for the gérant. */
  needsValidationAbove: boolean;
};

/** Hours bought with `amount` at the package rate, rounded down to the half hour. */
const hoursFor = (amount: number, rate: number) => Math.floor((amount / rate) * 2) / 2;

/** New payment taken at the agency. Fields are controlled so they survive a validation error. */
export function CashForm({ students, defaultStudentId, hourlyRate, threshold, needsValidationAbove }: CashFormProps) {
  const [state, formAction] = useActionState(recordCashAction, INITIAL_CASH_STATE);
  const [studentId, setStudentId] = useState(defaultStudentId ?? "");
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState<CashMethod>("especes");
  const [hours, setHours] = useState("");
  const [hoursTouched, setHoursTouched] = useState(false);
  const [note, setNote] = useState("");
  const amountRef = useRef<HTMLInputElement>(null);

  // After a recorded entry, start from a clean form (the student stays selected for a second
  // payment). Adjusting state while rendering, when the action result changes, avoids an effect.
  const [handledState, setHandledState] = useState(state);
  if (state !== handledState) {
    setHandledState(state);
    if (state.status === "success") {
      setAmount("");
      setHours("");
      setHoursTouched(false);
      setNote("");
    }
  }
  useEffect(() => {
    if (state.status === "success") amountRef.current?.focus();
  }, [state]);

  const numericAmount = Number(amount.replace(/[\s €]/g, "").replace(",", "."));
  const overThreshold = needsValidationAbove && Number.isFinite(numericAmount) && numericAmount > threshold;
  const errors = state.status === "error" ? state.fieldErrors : undefined;

  return (
    // Remounted on every result: React resets a form's DOM after an action, even controlled fields.
    <form key={state.attempt ?? 0} action={formAction} className="space-y-4" noValidate>
      {state.status === "success" && state.message && (
        <Alert tone={state.code === "a_valider" ? "warning" : "success"}>{state.message}</Alert>
      )}
      {state.status === "error" && state.message && state.code !== "champs" && (
        <Alert tone="danger" role="alert">
          {state.message}
        </Alert>
      )}

      <Field label="Élève" required error={errors?.studentId}>
        {({ id, describedBy, invalid }) => (
          <select
            id={id}
            name="studentId"
            required
            aria-describedby={describedBy}
            aria-invalid={invalid || undefined}
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
        <Field label="Montant (€)" required error={errors?.amount}>
          {({ id, describedBy, invalid }) => (
            <input
              ref={amountRef}
              id={id}
              name="amount"
              inputMode="decimal"
              autoComplete="off"
              required
              aria-describedby={describedBy}
              aria-invalid={invalid || undefined}
              placeholder="300"
              className={inputStyles}
              value={amount}
              onChange={(event) => {
                setAmount(event.target.value);
                const value = Number(event.target.value.replace(/[\s €]/g, "").replace(",", "."));
                if (!hoursTouched) setHours(Number.isFinite(value) && value > 0 ? String(hoursFor(value, hourlyRate)).replace(".", ",") : "");
              }}
            />
          )}
        </Field>
        <Field
          label="Heures créditées"
          error={errors?.hours}
          hint={`Proposé à ${formatCurrency(hourlyRate, { round: true })} / h. Mettez 0 pour des frais.`}
        >
          {({ id, describedBy, invalid }) => (
            <input
              id={id}
              name="hours"
              inputMode="decimal"
              autoComplete="off"
              aria-describedby={describedBy}
              aria-invalid={invalid || undefined}
              placeholder="5"
              className={inputStyles}
              value={hours}
              onChange={(event) => {
                setHours(event.target.value);
                setHoursTouched(true);
              }}
            />
          )}
        </Field>
      </div>

      <fieldset aria-describedby={errors?.method ? "erreur-moyen" : undefined}>
        <legend className="mb-1.5 text-sm font-semibold text-ink">
          Moyen de paiement <span className="text-danger" aria-hidden>*</span>
        </legend>
        <div className="grid grid-cols-2 gap-2">
          {METHODS.map((value) => {
            const meta = PAYMENT_METHOD_META[value];
            const checked = method === value;
            return (
              <label
                key={value}
                className={cn(
                  "flex h-12 cursor-pointer items-center gap-2 rounded-xl border px-3 text-sm font-semibold transition-colors has-focus-visible:ring-4 has-focus-visible:ring-brand/20",
                  checked ? "border-brand bg-brand-soft text-brand" : "border-line-strong bg-surface text-ink hover:bg-subtle",
                )}
              >
                <input
                  type="radio"
                  name="method"
                  value={value}
                  checked={checked}
                  onChange={() => setMethod(value)}
                  className="sr-only"
                />
                <meta.icon className="size-4 shrink-0" aria-hidden />
                {meta.label}
              </label>
            );
          })}
        </div>
        {errors?.method && (
          <p id="erreur-moyen" className="mt-1.5 text-sm font-medium text-danger">
            {errors.method}
          </p>
        )}
      </fieldset>

      <Field label="Remarque" hint="Facultatif. Par exemple : n° de chèque, encaissement différé.">
        {({ id, describedBy }) => (
          <input
            id={id}
            name="note"
            maxLength={200}
            aria-describedby={describedBy}
            className={inputStyles}
            value={note}
            onChange={(event) => setNote(event.target.value)}
          />
        )}
      </Field>

      {overThreshold && (
        <Alert tone="info" icon={Info}>
          Au-delà de {formatCurrency(threshold, { round: true })}, l&apos;encaissement doit être validé par le gérant. Les heures seront
          créditées après sa validation.
        </Alert>
      )}

      <SubmitButton size="lg" fullWidth pendingLabel="Enregistrement…">
        Enregistrer l&apos;encaissement
      </SubmitButton>
    </form>
  );
}
