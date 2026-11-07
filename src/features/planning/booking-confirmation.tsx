"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { CreditCard, X } from "lucide-react";
import { Alert } from "@/components/ui/alert";
import { ButtonLink } from "@/components/ui/button";

type BookingConfirmationProps = {
  /** "à Sophie Laurent pour le vendredi 6 novembre à 15:00". */
  summary: string;
  /** The credit does not cover it: once confirmed, it will wait for a payment. */
  pendingPayment: boolean;
  /** Planning URL without the confirmation parameters, used when the banner is dismissed. */
  dismissHref: string;
};

/**
 * Banner shown after a lesson request (redirect to /eleve/planning?demande=<id>). It takes the
 * focus on arrival so screen readers hear the confirmation, and can be dismissed (cleans the URL).
 */
export function BookingConfirmation({ summary, pendingPayment, dismissHref }: BookingConfirmationProps) {
  const router = useRouter();
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    ref.current?.focus();
  }, []);

  const dismiss = (
    <button
      type="button"
      onClick={() => router.replace(dismissHref, { scroll: false })}
      className="-mt-2.5 -mr-2 -mb-2 flex size-11 shrink-0 items-center justify-center rounded-full text-ink-subtle hover:bg-ink/5 hover:text-ink"
      aria-label="Masquer ce message"
    >
      <X className="size-5" aria-hidden />
    </button>
  );

  return (
    <div ref={ref} tabIndex={-1} className="mb-6 rounded-2xl outline-none">
      {pendingPayment ? (
        <Alert
          tone="warning"
          className="animate-[dialog-in_200ms_ease-out]"
          title={
            <span className="flex items-start justify-between gap-2">
              <span className="pt-0.5">Demande envoyée {summary}</span>
              {dismiss}
            </span>
          }
          action={
            <ButtonLink
              href="/eleve/paiements"
              variant="secondary"
              icon={<CreditCard className="size-4" aria-hidden />}
            >
              Régler mes heures
            </ButtonLink>
          }
        >
          Votre crédit ne couvre pas cette leçon : une fois confirmée par votre moniteur, elle attendra le
          règlement de vos heures.
        </Alert>
      ) : (
        <Alert
          tone="success"
          className="animate-[dialog-in_200ms_ease-out]"
          title={
            <span className="flex items-start justify-between gap-2">
              <span className="pt-0.5">Demande envoyée {summary}</span>
              {dismiss}
            </span>
          }
        >
          Elle apparaît « À confirmer » dans vos rendez-vous. Vous serez prévenu(e) dès que votre moniteur
          l&apos;aura confirmée.
        </Alert>
      )}
    </div>
  );
}
