import { CalendarCheck, CalendarRange, Clock, Coins, ListChecks, UserRound, type LucideIcon } from "lucide-react";
import { CardBody, CardHeader } from "@/components/ui/card";
import { LoadingLabel, Skeleton } from "@/components/ui/skeleton";
import { formatHours } from "@/lib/format";
import type { BookingRules } from "@/lib/types";
import { getPlanningRules } from "./data";

/** Card header + body. Render inside a <Card>, with the body inside <Suspense>. */
export function BookingRulesHeader() {
  return (
    <CardHeader
      title="Règles de réservation"
      description="Fixées par votre auto-école."
      icon={<ListChecks className="size-5" aria-hidden />}
    />
  );
}

/** Render inside <Suspense>. */
export async function BookingRulesBody() {
  return <BookingRulesList rules={await getPlanningRules()} />;
}

export function BookingRulesList({ rules }: { rules: BookingRules }) {
  const items: Array<{ icon: LucideIcon; title: string; detail: string }> = [
    {
      icon: Clock,
      title: `Réservation ${formatHours(rules.minNoticeHours)} avant`,
      detail: "Délai minimum pour réserver une leçon.",
    },
    {
      icon: CalendarCheck,
      title: `Annulation gratuite ${formatHours(rules.freeCancellationHours)} avant`,
      detail: "Au-delà, l'annulation est tardive.",
    },
    {
      icon: CalendarRange,
      title: `${rules.maxLessonsPerWeek} ${rules.maxLessonsPerWeek > 1 ? "leçons" : "leçon"} par semaine`,
      detail: "Au maximum, du lundi au dimanche.",
    },
    rules.lateCancellationCharged
      ? {
          icon: Coins,
          title: "Annulation tardive facturée",
          detail: "Les heures de la leçon sont décomptées de votre solde.",
        }
      : {
          icon: Coins,
          title: "Annulation tardive non facturée",
          detail: "Aucune heure n'est décomptée de votre solde.",
        },
    ...(rules.restrictedToReferent
      ? [
          {
            icon: UserRound,
            title: "Avec votre moniteur référent",
            detail: "Seul votre référent est proposé à la réservation.",
          },
        ]
      : []),
  ];

  return (
    <CardBody>
      <ul className="space-y-4">
        {items.map((item) => (
          <li key={item.title} className="flex items-start gap-3">
            <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-subtle text-ink-muted">
              <item.icon className="size-4.5" aria-hidden />
            </span>
            <p className="min-w-0 pt-0.5 text-sm text-pretty text-ink-muted">
              <span className="block font-semibold text-ink tabular-nums">{item.title}</span>
              {item.detail}
            </p>
          </li>
        ))}
      </ul>
    </CardBody>
  );
}

export function BookingRulesSkeleton() {
  return (
    <CardBody>
      <LoadingLabel>Chargement des règles de réservation…</LoadingLabel>
      <div className="space-y-4">
        {[0, 1, 2, 3].map((row) => (
          <div key={row} className="flex items-start gap-3">
            <Skeleton className="size-9 shrink-0 rounded-xl" />
            <div className="flex-1 space-y-1.5 pt-0.5">
              <Skeleton className="h-4 w-48 max-w-full" />
              <Skeleton className="h-4 w-36 max-w-full" />
            </div>
          </div>
        ))}
      </div>
    </CardBody>
  );
}
