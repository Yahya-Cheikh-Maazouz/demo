"use client";

import { BadgePercent, CircleAlert, Lock, ShieldCheck } from "lucide-react";
import { useActionState, useId, useRef, useState, type FormEvent } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/cn";
import { formatCurrency, formatHours } from "@/lib/format";
import type { HourPack } from "@/lib/types";
import { buyHourPack } from "./actions";
import { CheckoutDialog } from "./checkout-dialog";
import { addedHoursWord, PAYMENT_METHOD_META, type OnlineMethod } from "./payment-meta";
import { PaymentMethodFieldset } from "./payment-method-fieldset";
import { INITIAL_PAYMENT_STATE, type PaymentState } from "./payment-state";
import { PaymentSuccess } from "./payment-success";
import { RadioCard } from "./radio-card";

const PACK_REQUIRED = "Choisissez un pack d'heures.";

/**
 * Pack + payment method, then a confirmation dialog before the (Stripe) payment.
 * No pack is preselected: paying is an explicit choice.
 */
export function PurchaseForm({ packs }: { packs: HourPack[] }) {
  const id = useId();
  const formRef = useRef<HTMLFormElement>(null);
  const [packId, setPackId] = useState<string | null>(null);
  const [method, setMethod] = useState<OnlineMethod>("carte");
  const [packError, setPackError] = useState<string>();
  const [open, setOpen] = useState(false);
  const [openedAtAttempt, setOpenedAtAttempt] = useState(0);

  const [state, formAction, isPending] = useActionState(async (prev: PaymentState, formData: FormData) => {
    const result = await buyHourPack(prev, formData);
    if (result.status === "success") {
      setOpen(false);
      setPackId(null);
    }
    return result;
  }, INITIAL_PAYMENT_STATE);

  const pack = packs.find((p) => p.id === packId);
  const ownError = state.status === "error" && (state.attempt ?? 0) > openedAtAttempt;
  const packErrorId = `${id}-pack-error`;

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!pack) {
      setPackError(PACK_REQUIRED);
      formRef.current?.querySelector<HTMLInputElement>('input[name="packId"]')?.focus();
      return;
    }
    setOpenedAtAttempt(state.attempt ?? 0);
    setOpen(true);
  }

  return (
    <div className="space-y-6">
      {state.status === "success" && state.receipt && (
        <PaymentSuccess key={state.receipt.invoiceNumber} receipt={state.receipt} />
      )}

      <form ref={formRef} onSubmit={handleSubmit} noValidate className="space-y-6">
        <fieldset>
          <legend className="text-sm font-semibold text-ink">Choisissez vos heures</legend>
          {packError && (
            <p id={packErrorId} className="mt-1.5 flex items-start gap-1.5 text-sm font-medium text-danger">
              <CircleAlert className="mt-0.5 size-4 shrink-0" aria-hidden />
              {packError}
            </p>
          )}
          <div className="mt-3 grid gap-3 sm:grid-cols-3">
            {packs.map((p) => (
              <RadioCard
                key={p.id}
                name="packId"
                value={p.id}
                checked={packId === p.id}
                onChange={() => {
                  setPackId(p.id);
                  setPackError(undefined);
                }}
                aria-labelledby={`${id}-${p.id}-label ${id}-${p.id}-price`}
                aria-describedby={cn(
                  p.highlighted && `${id}-${p.id}-badge`,
                  `${id}-${p.id}-description`,
                  packError && packErrorId,
                )}
                invalid={Boolean(packError)}
                className={cn("sm:flex-col sm:gap-2.5", p.highlighted && "mt-2 sm:mt-0")}
              >
                {p.highlighted && (
                  <span id={`${id}-${p.id}-badge`} className="absolute -top-3 right-3">
                    <Badge tone="brand" icon={BadgePercent} className="border border-brand/25 bg-surface shadow-sm">
                      Meilleur prix
                    </Badge>
                  </span>
                )}
                <span className="grid min-w-0 flex-1 grid-cols-[1fr_auto] gap-x-3 gap-y-0.5 sm:w-full sm:grid-cols-1">
                  <span id={`${id}-${p.id}-label`} className="font-semibold text-ink sm:min-h-12">
                    {p.label}
                  </span>
                  <span
                    id={`${id}-${p.id}-price`}
                    className="text-right text-lg font-bold text-ink tabular-nums sm:mt-1 sm:text-left sm:text-2xl sm:tracking-tight"
                  >
                    {formatCurrency(p.price, { round: true })}
                  </span>
                  <span id={`${id}-${p.id}-description`} className="col-span-2 text-sm text-ink-muted sm:col-span-1">
                    {p.description}
                  </span>
                </span>
              </RadioCard>
            ))}
          </div>
        </fieldset>

        <PaymentMethodFieldset legend="Moyen de paiement" value={method} onChange={setMethod} />

        <div className="flex flex-col gap-4 rounded-2xl bg-subtle p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
          <div aria-live="polite" className="min-w-0">
            {pack ? (
              <>
                <p className="text-sm text-ink-muted">Total</p>
                <p className="text-2xl font-bold tracking-tight text-ink tabular-nums">
                  {formatCurrency(pack.price, { round: true })}
                </p>
                <p className="text-sm text-ink-muted">
                  <span className="tabular-nums">{formatHours(pack.hours)}</span> {addedHoursWord(pack.hours)} à votre
                  solde
                  {method === "klarna" && ", en 3 fois sans frais"}
                </p>
              </>
            ) : (
              <p className="text-sm text-ink-muted">Choisissez un pack pour voir le total.</p>
            )}
          </div>
          <Button
            type="submit"
            size="lg"
            className="w-full sm:w-auto"
            icon={<Lock className="size-4" aria-hidden />}
            aria-haspopup="dialog"
          >
            {pack ? `Payer ${formatCurrency(pack.price, { round: true })}` : "Payer"}
          </Button>
        </div>

        <p className="-mt-2 flex items-start gap-2 text-sm text-ink-muted">
          <ShieldCheck className="mt-0.5 size-4 shrink-0 text-success" aria-hidden />
          Paiement sécurisé par Stripe. L&apos;argent est versé directement à votre auto-école.
        </p>
      </form>

      {pack && (
        <CheckoutDialog
          open={open}
          // Stays open while the payment is pending, so its outcome (error included) is not missed.
          onClose={() => !isPending && setOpen(false)}
          title="Confirmer votre achat"
          summary={[
            { label: "Offre", value: pack.label },
            { label: "Heures ajoutées", value: <span className="tabular-nums">{formatHours(pack.hours)}</span> },
            {
              label: "Moyen de paiement",
              value: method === "klarna" ? "Klarna, en 3 fois sans frais" : PAYMENT_METHOD_META[method].label,
            },
          ]}
          total={pack.price}
          action={formAction}
          hiddenFields={{ packId: pack.id, method }}
          error={ownError ? state.message : undefined}
        />
      )}
    </div>
  );
}
