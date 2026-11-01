"use client";

import { ReceiptText } from "lucide-react";
import { useEffect, useRef } from "react";
import { Alert } from "@/components/ui/alert";
import { ButtonLink } from "@/components/ui/button";
import { cn } from "@/lib/cn";
import { formatCurrency, formatHours } from "@/lib/format";
import { addedHoursWord, invoiceHref } from "./payment-meta";
import type { PaymentState } from "./payment-state";

/**
 * Confirmation shown after a payment, with the generated invoice. Mount it with
 * `key={receipt.invoiceNumber}`: each new payment takes the focus again.
 */
export function PaymentSuccess({ receipt, className }: { receipt: NonNullable<PaymentState["receipt"]>; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);

  // The confirmation dialog closes (or unmounts) on success, and the button that opened it may be
  // gone after refresh(): keyboard and screen reader users land here instead of on <body>.
  // Next frame, because the dialog is still modal (the page inert) while sibling effects run.
  useEffect(() => {
    const frame = requestAnimationFrame(() => ref.current?.focus());
    return () => cancelAnimationFrame(frame);
  }, []);

  return (
    <div
      ref={ref}
      tabIndex={-1}
      className={cn(
        "scroll-mt-24 rounded-2xl outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand",
        className,
      )}
    >
      <Alert
        tone="success"
        title="Paiement validé, merci !"
        action={
          <ButtonLink
            href={invoiceHref(receipt.invoiceNumber)}
            variant="secondary"
            icon={<ReceiptText className="size-4" aria-hidden />}
          >
            Voir la facture
          </ButtonLink>
        }
      >
        <p>
          {receipt.hours > 0 && (
            <>
              <span className="font-semibold text-ink tabular-nums">{formatHours(receipt.hours)}</span>{" "}
              {addedHoursWord(receipt.hours)} à votre solde.{" "}
            </>
          )}
          Facture <span className="font-semibold text-ink tabular-nums">{receipt.invoiceNumber}</span> de{" "}
          <span className="tabular-nums">{formatCurrency(receipt.amount)}</span>, aussi envoyée par e-mail.
        </p>
      </Alert>
    </div>
  );
}
