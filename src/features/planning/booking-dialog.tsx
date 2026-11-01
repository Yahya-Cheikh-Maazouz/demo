"use client";

import { useActionState, useEffect, useRef, type ReactNode } from "react";
import { CalendarCheck, CalendarDays, Clock, CreditCard, MapPin, Send, UserRound, type LucideIcon } from "lucide-react";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button, ButtonLink } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { SubmitButton } from "@/components/ui/submit-button";
import { cn } from "@/lib/cn";
import { formatDateLong, formatHours, formatTimeRange } from "@/lib/format";
import type { Slot } from "@/lib/types";
import { INITIAL_PLANNING_STATE } from "./action-state";
import { bookSlotAction } from "./actions";

type BookingDialogProps = {
  open: boolean;
  onClose: () => void;
  /** The slot being booked; kept while the dialog closes. */
  slot: Slot | null;
  /** Changes on every opening: resets the form state. */
  attemptKey: number;
  isReferent: boolean;
  /** Balance after the reservations already made (from the API). */
  hoursAfterReservations: number;
};

export function BookingDialog({ open, onClose, slot, attemptKey, isReferent, hoursAfterReservations }: BookingDialogProps) {

  return (
    <div className="contents">
      <Dialog open={open} onClose={onClose} title="Confirmer la réservation" description="Vérifiez le créneau avant de confirmer.">
        {slot && (
          <BookingForm
            key={attemptKey}
            slot={slot}
            isReferent={isReferent}
            hoursAfterReservations={hoursAfterReservations}
            onClose={onClose}
          />
        )}
      </Dialog>
    </div>
  );
}

function SummaryRow({ icon: Icon, label, children }: { icon: LucideIcon; label: string; children: ReactNode }) {
  return (
    <div className="flex items-start gap-3 py-2.5 sm:py-3">
      {/* The icon lives in the <dt>: a <dl> group may only contain <dt> and <dd>. */}
      <dt className="flex w-27.5 shrink-0 items-start gap-3 text-sm text-ink-muted sm:w-31.5">
        <Icon className="mt-0.5 size-4.5 shrink-0 text-ink-subtle" aria-hidden />
        {label}
      </dt>
      <dd className="min-w-0 flex-1 text-sm font-semibold text-ink">{children}</dd>
    </div>
  );
}

function BookingForm({
  slot,
  isReferent,
  hoursAfterReservations,
  onClose,
}: {
  slot: Slot;
  isReferent: boolean;
  hoursAfterReservations: number;
  onClose: () => void;
}) {
  const [state, formAction] = useActionState(bookSlotAction, INITIAL_PLANNING_STATE);
  const feedbackRef = useRef<HTMLDivElement>(null);

  // The footer changes after an error: move the focus to the explanation so it is not lost.
  useEffect(() => {
    if (state.status === "error") feedbackRef.current?.focus();
  }, [state]);

  const hoursAfterBooking = hoursAfterReservations - slot.durationHours;
  const code = state.status === "error" ? state.code : undefined;
  const blocked = code === "creneau_indisponible" || code === "limite_hebdomadaire";
  // Known before submitting (figures from the API), or reported by the API on submit. It stays set
  // after another error (network), so "Réessayer" sends the same "en attente de paiement" request.
  const uncovered = !blocked && (code === "solde_insuffisant" || hoursAfterBooking < 0);
  const otherError = code !== undefined && !blocked && code !== "solde_insuffisant";

  return (
    <form action={formAction}>
      <input type="hidden" name="slotId" value={slot.id} />
      {uncovered && <input type="hidden" name="acceptPendingPayment" value="1" />}

      <dl className="divide-y divide-line rounded-2xl border border-line px-4">
        <SummaryRow icon={CalendarDays} label="Date">
          {formatDateLong(slot.start)}
        </SummaryRow>
        <SummaryRow icon={Clock} label="Heure">
          <span className="tabular-nums">{formatTimeRange(slot.start, slot.end)}</span>
          <span className="font-medium text-ink-muted tabular-nums"> · {formatHours(slot.durationHours)}</span>
          <span className="sr-only"> de leçon</span>
        </SummaryRow>
        <SummaryRow icon={UserRound} label="Moniteur">
          {slot.instructor.firstName} {slot.instructor.lastName}
          {isReferent && <Badge tone="brand" className="ml-2 align-middle">Référent·e</Badge>}
        </SummaryRow>
        <SummaryRow icon={MapPin} label="Lieu">
          <span className="font-medium">{slot.meetingPoint}</span>
        </SummaryRow>
      </dl>

      <p
        className={cn(
          "mt-3 flex items-center justify-between gap-3 rounded-xl px-4 py-3 text-sm",
          hoursAfterBooking < 0 ? "bg-warning-soft text-warning" : "bg-subtle text-ink-muted",
        )}
      >
        <span>Après cette réservation</span>
        <strong className={cn("font-bold tabular-nums", hoursAfterBooking < 0 ? "text-warning" : "text-ink")}>
          {hoursAfterBooking < 0
            ? `${formatHours(-hoursAfterBooking)} à couvrir`
            : `${formatHours(hoursAfterBooking)} ${hoursAfterBooking >= 2 ? "restantes" : "restante"}`}
        </strong>
      </p>

      <div ref={feedbackRef} tabIndex={-1} className="rounded-2xl outline-none">
        {code === "creneau_indisponible" && (
          <Alert key={state.attempt} tone="danger" role="alert" title="Ce créneau vient d'être pris" className="mt-4">
            {state.message} La liste des créneaux a été mise à jour.
          </Alert>
        )}
        {code === "limite_hebdomadaire" && (
          <Alert key={state.attempt} tone="warning" role="alert" title="Limite de la semaine atteinte" className="mt-4">
            {state.message} Choisissez un jour d&apos;une autre semaine.
          </Alert>
        )}
        {otherError && (
          <Alert key={state.attempt} tone="danger" role="alert" title="La réservation n'a pas abouti" className="mt-4">
            {state.message}
          </Alert>
        )}
        {uncovered && (
          <Alert
            key={code === "solde_insuffisant" ? state.attempt : 0}
            tone="warning"
            role={code === "solde_insuffisant" ? "alert" : "status"}
            title="Votre solde ne couvre pas cette leçon"
            className="mt-4"
          >
            <p>
              Réglez des heures pour la confirmer tout de suite, ou envoyez la demande : elle restera{" "}
              <strong className="font-semibold text-ink">en attente de paiement</strong> jusqu&apos;à validation par
              l&apos;auto-école.
            </p>
          </Alert>
        )}
      </div>

      <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        {blocked ? (
          <Button onClick={onClose}>
            {code === "limite_hebdomadaire" ? "Choisir un autre jour" : "Choisir un autre créneau"}
          </Button>
        ) : uncovered ? (
          <>
            <ButtonLink href="/eleve/paiements" variant="secondary" icon={<CreditCard className="size-4" aria-hidden />}>
              Acheter des heures
            </ButtonLink>
            <SubmitButton icon={<Send className="size-4" aria-hidden />} pendingLabel="Envoi…">
              {otherError ? "Réessayer l'envoi" : "Envoyer la demande"}
            </SubmitButton>
          </>
        ) : (
          <>
            <Button variant="secondary" onClick={onClose}>
              Retour
            </Button>
            <SubmitButton icon={<CalendarCheck className="size-4" aria-hidden />} pendingLabel="Réservation…">
              {otherError ? "Réessayer" : "Confirmer la réservation"}
            </SubmitButton>
          </>
        )}
      </div>
    </form>
  );
}
