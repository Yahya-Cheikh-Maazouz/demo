"use client";

import { Lock, ShieldCheck } from "lucide-react";
import type { ReactNode } from "react";
import { useFormStatus } from "react-dom";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { SubmitButton } from "@/components/ui/submit-button";
import { formatCurrency } from "@/lib/format";

type CheckoutDialogProps = {
  open: boolean;
  onClose: () => void;
  title: string;
  /** Rows of the order summary, above the total. */
  summary: Array<{ label: string; value: ReactNode }>;
  total: number;
  action: (formData: FormData) => void;
  /** Ids sent with the form. Never amounts: the server re-reads them from the API. */
  hiddenFields: Record<string, string>;
  /** Error of the last attempt, announced with role="alert". */
  error?: string;
  /** Extra fields, e.g. the payment method when it was not chosen before. */
  children?: ReactNode;
};

/**
 * Last step before paying. The real version sends the student to Stripe Checkout (card or Klarna):
 * no card number is ever typed into our pages.
 */
export function CheckoutDialog({
  open,
  onClose,
  title,
  summary,
  total,
  action,
  hiddenFields,
  error,
  children,
}: CheckoutDialogProps) {
  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={title}
      description="Le paiement s'ouvre sur la page sécurisée de Stripe, notre prestataire de paiement."
    >
      <form action={action} className="space-y-5">
        {Object.entries(hiddenFields).map(([name, value]) => (
          <input key={name} type="hidden" name={name} value={value} />
        ))}

        <dl className="divide-y divide-line rounded-2xl border border-line">
          {summary.map((row) => (
            <div key={row.label} className="flex items-baseline justify-between gap-4 px-4 py-3 text-sm">
              <dt className="shrink-0 text-ink-muted">{row.label}</dt>
              <dd className="text-right font-semibold text-ink">{row.value}</dd>
            </div>
          ))}
          <div className="flex items-baseline justify-between gap-4 rounded-b-2xl bg-subtle px-4 py-3">
            <dt className="font-semibold text-ink">Total à payer</dt>
            <dd className="text-xl font-bold text-ink tabular-nums">{formatCurrency(total, { round: true })}</dd>
          </div>
        </dl>

        {children}

        {error && (
          <Alert tone="danger" role="alert" title="Le paiement n'a pas pu être lancé">
            {error}
          </Alert>
        )}

        <p className="flex items-start gap-2 text-sm text-ink-muted">
          <ShieldCheck className="mt-0.5 size-4 shrink-0 text-success" aria-hidden />
          Vos coordonnées bancaires sont saisies chez Stripe : ni l&apos;auto-école ni la plateforme n&apos;y ont
          accès. L&apos;argent est versé directement à votre auto-école.
        </p>

        <div className="flex flex-col-reverse gap-2 pt-1 sm:flex-row sm:justify-end">
          <CancelButton onClose={onClose} />
          <SubmitButton icon={<Lock className="size-4" aria-hidden />} pendingLabel="Ouverture du paiement…">
            Continuer vers le paiement
          </SubmitButton>
        </div>
      </form>
    </Dialog>
  );
}

function CancelButton({ onClose }: { onClose: () => void }) {
  const { pending } = useFormStatus();
  return (
    <Button variant="secondary" onClick={onClose} disabled={pending}>
      Annuler
    </Button>
  );
}
