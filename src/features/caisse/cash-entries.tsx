"use client";

import { useActionState } from "react";
import { Check, CircleCheck, CircleX, Clock, Inbox, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { SubmitButton } from "@/components/ui/submit-button";
import type { Tone } from "@/components/ui/tone";
import { PAYMENT_METHOD_META } from "@/features/paiements/payment-meta";
import { formatCurrency, formatHours, formatTime } from "@/lib/format";
import type { CashEntry, CashEntryStatus } from "@/lib/types";
import { INITIAL_CASH_STATE } from "./action-state";
import { reviewCashAction } from "./actions";

const STATUS_META: Record<CashEntryStatus, { label: string; tone: Tone; icon: typeof Check }> = {
  valide: { label: "Validé", tone: "success", icon: CircleCheck },
  a_valider: { label: "À valider", tone: "warning", icon: Clock },
  refuse: { label: "Refusé", tone: "danger", icon: CircleX },
};

function ReviewButtons({ entry }: { entry: CashEntry }) {
  const [state, formAction] = useActionState(reviewCashAction, INITIAL_CASH_STATE);
  return (
    <form action={formAction} className="flex flex-wrap items-center gap-2">
      <input type="hidden" name="entryId" value={entry.id} />
      <SubmitButton name="decision" value="valide" size="sm" icon={<Check className="size-4" aria-hidden />}>
        Valider
        <span className="sr-only"> l&apos;encaissement de {entry.studentName}</span>
      </SubmitButton>
      <SubmitButton name="decision" value="refuse" variant="secondary" size="sm" icon={<X className="size-4" aria-hidden />}>
        Refuser
        <span className="sr-only"> l&apos;encaissement de {entry.studentName}</span>
      </SubmitButton>
      {state.status === "error" && state.message && (
        <p role="alert" className="w-full text-sm font-medium text-danger">
          {state.message}
        </p>
      )}
    </form>
  );
}

/** Today's entries, latest first. Entries waiting for validation get buttons for those allowed to validate. */
export function CashEntries({ entries, canValidate }: { entries: CashEntry[]; canValidate: boolean }) {
  if (entries.length === 0) {
    return <EmptyState icon={Inbox} title="Aucun encaissement aujourd'hui" description="Les paiements reçus à l'agence apparaîtront ici." />;
  }
  return (
    <ul className="divide-y divide-line">
      {entries.map((entry) => {
        const method = PAYMENT_METHOD_META[entry.method];
        const status = STATUS_META[entry.status];
        return (
          <li key={entry.id} className="flex flex-col gap-3 py-4 first:pt-0 last:pb-0 sm:flex-row sm:items-start">
            <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-subtle text-ink-muted">
              <method.icon className="size-5" aria-hidden />
            </span>
            <div className="min-w-0 flex-1 space-y-1">
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                <span className="text-lg font-bold text-ink tabular-nums">{formatCurrency(entry.amount)}</span>
                <Badge tone={status.tone} icon={status.icon}>
                  {status.label}
                </Badge>
              </div>
              <p className="font-semibold text-ink">{entry.studentName}</p>
              <p className="text-sm text-ink-muted">
                <span className="tabular-nums">{formatTime(entry.createdAt)}</span> · {method.label}
                {entry.hours > 0 && <> · {formatHours(entry.hours)}</>} · par {entry.createdBy}
                {entry.reviewedBy && <> · {entry.status === "valide" ? "validé" : "refusé"} par {entry.reviewedBy}</>}
              </p>
              {entry.note && <p className="text-sm text-ink-subtle">« {entry.note} »</p>}
              {entry.invoiceNumber && <p className="text-xs text-ink-subtle">Facture {entry.invoiceNumber}</p>}
            </div>
            {entry.status === "a_valider" && canValidate && <ReviewButtons entry={entry} />}
            {entry.status === "a_valider" && !canValidate && (
              <p className="text-sm text-ink-subtle sm:max-w-48">En attente de la validation du gérant.</p>
            )}
          </li>
        );
      })}
    </ul>
  );
}
