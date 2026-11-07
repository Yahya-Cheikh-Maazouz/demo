"use client";

import { CircleCheck, CreditCard, ReceiptText } from "lucide-react";
import { useActionState, useEffect, useRef, useState } from "react";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CardBody } from "@/components/ui/card";
import { TONE_SOFT } from "@/components/ui/tone";
import { CheckoutDialog } from "@/features/paiements/checkout-dialog";
import { PaymentMethodFieldset } from "@/features/paiements/payment-method-fieldset";
import { INSTALLMENT_STATUS_META, addedHoursWord } from "@/features/paiements/payment-meta";
import { cn } from "@/lib/cn";
import { formatCurrency, formatDate, formatHours } from "@/lib/format";
import type { Installment } from "@/lib/types";
import { INITIAL_PARENT_PAYMENT_STATE, type ParentPaymentState } from "./action-state";
import { payInstallmentAction } from "./actions";

/**
 * The child's payment plan as a timeline. Only the next unpaid instalment can be paid, through the
 * same (simulated) Stripe checkout as the student space. Kept at the same place in the tree
 * whatever the data, so the confirmation survives refresh().
 */
export function InstallmentPlan({
  childId,
  firstName,
  installments,
}: {
  childId: string;
  firstName: string;
  installments: Installment[];
}) {
  const next = installments.find((i) => i.status !== "payee");
  const paidCount = installments.filter((i) => i.status === "payee").length;

  const [open, setOpen] = useState(false);
  const [openedAtAttempt, setOpenedAtAttempt] = useState(0);
  const [state, formAction, isPending] = useActionState(async (prev: ParentPaymentState, formData: FormData) => {
    const result = await payInstallmentAction(prev, formData);
    if (result.status === "success") setOpen(false);
    return result;
  }, INITIAL_PARENT_PAYMENT_STATE);

  const ownError = state.status === "error" && (state.attempt ?? 0) > openedAtAttempt;

  function openCheckout() {
    setOpenedAtAttempt(state.attempt ?? 0);
    setOpen(true);
  }

  return (
    <CardBody className="flex flex-1 flex-col gap-5">
      {state.status === "success" && state.receipt && (
        <PaymentConfirmation key={state.receipt.invoiceNumber} receipt={state.receipt} firstName={firstName} />
      )}

      <p className="text-sm text-ink-muted">
        <span className="font-semibold text-ink tabular-nums">{paidCount}</span>{" "}
        {paidCount > 1 ? "versements réglés" : "versement réglé"} sur{" "}
        <span className="font-semibold text-ink tabular-nums">{installments.length}</span>
      </p>

      <ol>
        {installments.map((installment, index) => {
          const meta = INSTALLMENT_STATUS_META[installment.status];
          const Icon = meta.icon;
          const isNext = installment.id === next?.id;
          const isLast = index === installments.length - 1;
          return (
            <li key={installment.id} className="relative flex gap-3 pb-5 last:pb-0">
              {!isLast && <span aria-hidden className="absolute top-9 bottom-1 left-4.25 w-px bg-line" />}
              <span aria-hidden className={cn("flex size-9 shrink-0 items-center justify-center rounded-full", TONE_SOFT[meta.tone])}>
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
                <p className={cn("mt-1.5 text-sm", installment.status === "en_retard" ? "font-semibold text-danger" : "text-ink-muted")}>
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
                    Régler {formatCurrency(installment.amount, { round: true })}
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
          Toutes les échéances sont réglées.
        </p>
      )}

      {next && (
        <CheckoutDialog
          open={open}
          // Stays open while the payment is pending, so its outcome (error included) is not missed.
          onClose={() => !isPending && setOpen(false)}
          title={`Régler le ${next.label}`}
          summary={[
            { label: "Élève", value: firstName },
            { label: "Échéance", value: <time dateTime={next.dueAt}>{formatDate(next.dueAt)}</time> },
            ...(next.hours > 0
              ? [{ label: "Heures de conduite", value: <span className="tabular-nums">{formatHours(next.hours)}</span> }]
              : []),
          ]}
          total={next.amount}
          action={formAction}
          hiddenFields={{ childId, installmentId: next.id }}
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

/** Confirmation after a payment; takes the focus, since the dialog that had it is closed. */
function PaymentConfirmation({
  receipt,
  firstName,
}: {
  receipt: NonNullable<ParentPaymentState["receipt"]>;
  firstName: string;
}) {
  const ref = useRef<HTMLDivElement>(null);

  // Next frame: the dialog is still modal (the page inert) while sibling effects run.
  useEffect(() => {
    const frame = requestAnimationFrame(() => ref.current?.focus());
    return () => cancelAnimationFrame(frame);
  }, []);

  return (
    <div
      ref={ref}
      tabIndex={-1}
      className="scroll-mt-24 rounded-2xl outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
    >
      <Alert
        tone="success"
        title="Paiement validé, merci !"
        action={
          <a
            href="#factures"
            className="inline-flex h-11 items-center gap-2 rounded-xl border border-line-strong bg-surface px-4 text-sm font-semibold text-ink hover:bg-subtle"
          >
            <ReceiptText className="size-4" aria-hidden />
            Voir les factures
          </a>
        }
      >
        <p>
          {receipt.hours > 0 && (
            <>
              <span className="font-semibold text-ink tabular-nums">{formatHours(receipt.hours)}</span>{" "}
              {addedHoursWord(receipt.hours)} au solde de {firstName}.{" "}
            </>
          )}
          Facture <span className="font-semibold text-ink tabular-nums">{receipt.invoiceNumber}</span> de{" "}
          <span className="tabular-nums">{formatCurrency(receipt.amount)}</span>, aussi envoyée par e-mail.
        </p>
      </Alert>
    </div>
  );
}
