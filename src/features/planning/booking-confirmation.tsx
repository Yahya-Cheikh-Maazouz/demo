"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { CreditCard, X } from "lucide-react";
import { Alert } from "@/components/ui/alert";
import { ButtonLink } from "@/components/ui/button";

type BookingConfirmationProps = {
  /** The lesson was created "en attente de paiement". */
  pendingPayment: boolean;
  /** Planning URL without the confirmation parameters, used when the banner is dismissed. */
  dismissHref: string;
};

/**
 * Banner shown after a booking (redirect to /eleve/planning?reservee=1). It takes the focus on
 * arrival so screen readers hear the confirmation, and can be dismissed (cleans the URL).
 */
export function BookingConfirmation({ pendingPayment, dismissHref }: BookingConfirmationProps) {
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
              <span className="pt-0.5">Demande envoyée : la leçon sera confirmée après paiement</span>
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
          Votre solde ne couvre pas cette leçon. Elle apparaît dans vos leçons à venir « en attente de paiement » :
          l&apos;auto-école la confirmera dès que vos heures seront réglées.
        </Alert>
      ) : (
        <Alert
          tone="success"
          className="animate-[dialog-in_200ms_ease-out]"
          title={
            <span className="flex items-start justify-between gap-2">
              <span className="pt-0.5">Leçon réservée, c&apos;est confirmé</span>
              {dismiss}
            </span>
          }
        >
          Elle apparaît dans vos leçons à venir, avec l&apos;adresse du rendez-vous.
        </Alert>
      )}
    </div>
  );
}
