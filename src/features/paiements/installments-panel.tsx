"use client";

import { CircleCheck, CreditCard } from "lucide-react";
import { useActionState, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CardBody } from "@/components/ui/card";
import { TONE_SOFT } from "@/components/ui/tone";
import { cn } from "@/lib/cn";
import { formatCurrency, formatDate, formatHours } from "@/lib/format";
import type { Installment } from "@/lib/types";
import { settleInstallment } from "./actions";
import { CheckoutDialog } from "./checkout-dialog";
import { INSTALLMENT_STATUS_META } from "./payment-meta";
import { PaymentMethodFieldset } from "./payment-method-fieldset";
import { INITIAL_PAYMENT_STATE, type PaymentState } from "./payment-state";
import { PaymentSuccess } from "./payment-success";

/**
 * Payment plan as a timeline. Only the next unpaid installment can be paid from here.
 * Kept at the same place in the tree whatever the data, so the confirmation survives refresh().
 */
export function InstallmentsPanel({ installments }: { installments: Installment[] }) {
  const sorted = [...installments].sort((a, b) => a.dueAt.localeCompare(b.dueAt));
  const next = sorted.find((i) => i.status !== "payee");
  const paidCount = sorted.filter((i) => i.status === "payee").length;

  const [open, setOpen] = useState(false);
  const [openedAtAttempt, setOpenedAtAttempt] = useState(0);
  const [state, formAction, isPending] = useActionState(async (prev: PaymentState, formData: FormData) => {
    const result = await settleInstallment(prev, formData);
    if (result.status === "success") setOpen(false);
    return result;
  }, INITIAL_PAYMENT_STATE);

  const ownError = state.status === "error" && (state.attempt ?? 0) > openedAtAttempt;

  function openCheckout() {
    setOpenedAtAttempt(state.attempt ?? 0);
    setOpen(true);
  }

  return (
    <CardBody className="flex flex-1 flex-col gap-5">
      {state.status === "success" && state.receipt && (
        <PaymentSuccess key={state.receipt.invoiceNumber} receipt={state.receipt} />
      )}

      <p className="text-sm text-ink-muted">
        <span className="font-semibold text-ink tabular-nums">{paidCount}</span>{" "}
        {paidCount > 1 ? "versements réglés" : "versement réglé"} sur{" "}
        <span className="font-semibold text-ink tabular-nums">{sorted.length}</span>
      </p>

      <ol className="space-y-0">
        {sorted.map((installment, index) => {
          const meta = INSTALLMENT_STATUS_META[installment.status];
          const Icon = meta.icon;
          const isNext = installment.id === next?.id;
          const isLast = index === sorted.length - 1;
          return (
            <li key={installment.id} className="relative flex gap-3 pb-5 last:pb-0">
              {!isLast && <span aria-hidden className="absolute top-9 bottom-1 left-4.25 w-px bg-line" />}
              <span
                aria-hidden
                className={cn("flex size-9 shrink-0 items-center justify-center rounded-full", TONE_SOFT[meta.tone])}
              >
                <Icon className="size-4.5" strokeWidth={2.25} />
              </span>
              <div className="min-w-0 flex-1 pt-1">
                <div className="flex items-baseline justify-between gap-3">
                  <p className="font-semibold text-ink">{installment.label}</p>
                  <p className="font-bold text-ink tabular-nums">{formatCurrency(installment.amount, { round: true })}</p>
                </div>
                <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1.5">
                  <Badge tone={meta.tone} icon={meta.icon}>
                    {meta.label}
                  </Badge>
                  {installment.hours > 0 && (
                    <span className="text-sm text-ink-muted tabular-nums">{formatHours(installment.hours)}</span>
                  )}
                </div>
                <p
                  className={cn(
                    "mt-1.5 text-sm",
                    installment.status === "en_retard" ? "font-semibold text-danger" : "text-ink-muted",
                  )}
                >
                  {installment.status === "payee"
                    ? "Échéance du "
                    : installment.status === "en_retard"
                      ? "Était à régler le "
                      : "À régler le "}
                  <time dateTime={installment.dueAt} className="whitespace-nowrap">
                    {formatDate(installment.dueAt)}
                  </time>
                </p>
                {isNext && (
                  <Button
                    className="mt-3"
                    fullWidth
                    onClick={openCheckout}
                    icon={<CreditCard className="size-4" aria-hidden />}
                    aria-haspopup="dialog"
                  >
                    Payer {formatCurrency(installment.amount, { round: true })}
                  </Button>
                )}
              </div>
            </li>
          );
        })}
      </ol>

      {!next && (
        <p className="mt-auto flex items-start gap-2 rounded-xl bg-success-soft p-3 text-sm font-semibold text-success">
          <CircleCheck className="mt-0.5 size-4 shrink-0" aria-hidden />
          Toutes vos échéances sont réglées.
        </p>
      )}

      {next && (
        <CheckoutDialog
          open={open}
          // Stays open while the payment is pending, so its outcome (error included) is not missed.
          onClose={() => !isPending && setOpen(false)}
          title={`Régler le ${next.label}`}
          summary={[
            { label: "Échéance", value: <time dateTime={next.dueAt}>{formatDate(next.dueAt)}</time> },
            ...(next.hours > 0
              ? [{ label: "Heures de conduite", value: <span className="tabular-nums">{formatHours(next.hours)}</span> }]
              : []),
          ]}
          total={next.amount}
          action={formAction}
          hiddenFields={{ installmentId: next.id }}
          error={ownError && !state.fieldErrors?.method ? state.message : undefined}
        >
          <PaymentMethodFieldset
            legend="Moyen de paiement"
            defaultValue="carte"
            error={ownError ? state.fieldErrors?.method : undefined}
          />
        </CheckoutDialog>
      )}
    </CardBody>
  );
}
