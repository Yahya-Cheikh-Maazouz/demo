import Link from "next/link";
import type { ReactNode } from "react";
import { CalendarClock, CalendarPlus, CreditCard, History, Info } from "lucide-react";
import { Alert } from "@/components/ui/alert";
import { ButtonLink } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { LoadingLabel, Skeleton } from "@/components/ui/skeleton";
import { getLessons } from "@/lib/api/eleve";
import { cn } from "@/lib/cn";
import { dayKey, formatHours, formatMonthYear, formatRelativeDay } from "@/lib/format";
import type { Lesson } from "@/lib/types";
import { CancelLessonButton } from "./cancel-lesson-button";
import { getPlanningRules } from "./data";
import { groupBy } from "./dates";
import { LessonCard } from "./lesson-card";
import { LessonCardSkeleton } from "./lesson-card-skeleton";

type View = "upcoming" | "history";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

function readParam(value: string | string[] | undefined): string | undefined {
  return typeof value === "string" ? value : undefined;
}

/** "À venir" / "Historique" switch and the matching list. Render inside <Suspense>. */
export async function LessonsPanel({ searchParams }: { searchParams: SearchParams }) {
  const [params, { now, upcoming, history }, rules] = await Promise.all([
    searchParams,
    getLessons(),
    getPlanningRules(),
  ]);
  const view: View = readParam(params.vue) === "historique" ? "history" : "upcoming";
  const highlightId = readParam(params.lecon);

  return (
    <>
      <ViewSwitch view={view} counts={{ upcoming: upcoming.length, history: history.length }} />
      <div className="mt-5">
        {view === "upcoming" ? (
          <UpcomingLessons
            now={now}
            lessons={upcoming}
            highlightId={highlightId}
            lateCancellationCharged={rules.lateCancellationCharged}
          />
        ) : (
          <PastLessons now={now} lessons={history} />
        )}
      </div>
    </>
  );
}

/** Segmented control made of two links: the view lives in the URL (?vue=historique). */
function ViewSwitch({ view, counts }: { view: View; counts: Record<View, number> }) {
  const items: Array<{ view: View; href: string; label: string; icon: typeof CalendarClock }> = [
    { view: "upcoming", href: "/eleve/planning", label: "À venir", icon: CalendarClock },
    { view: "history", href: "/eleve/planning?vue=historique", label: "Historique", icon: History },
  ];
  return (
    <nav aria-label="Affichage des leçons">
      <ul className="grid grid-cols-2 gap-1 rounded-2xl bg-line/60 p-1 sm:inline-grid sm:min-w-80">
        {items.map((item) => {
          const active = item.view === view;
          return (
            <li key={item.view}>
              <Link
                href={item.href}
                scroll={false}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex h-11 items-center justify-center gap-2 rounded-xl px-4 text-sm font-semibold transition-[background-color,color,box-shadow] duration-150",
                  active ? "bg-surface text-ink shadow-card" : "text-ink-muted hover:bg-surface/60 hover:text-ink",
                )}
              >
                <item.icon className={cn("size-4", active ? "text-brand" : "text-ink-subtle")} aria-hidden />
                {item.label}
                <span
                  className={cn(
                    "min-w-6 rounded-full px-1.5 py-0.5 text-center text-xs tabular-nums",
                    active ? "bg-brand-soft text-brand" : "bg-surface/70 text-ink-subtle",
                  )}
                >
                  {counts[item.view]}
                  <span className="sr-only"> {counts[item.view] > 1 ? "leçons" : "leçon"}</span>
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

/** Day (or month) heading of a group, with a hairline running to the right edge. */
function GroupHeading({ id, children, aside }: { id: string; children: ReactNode; aside?: string }) {
  return (
    <div className="mb-3 flex items-center gap-3">
      <h2 id={id} className="shrink-0 text-base font-bold text-ink">
        {children}
      </h2>
      {aside && <span className="shrink-0 text-sm text-ink-subtle">{aside}</span>}
      <span aria-hidden className="h-px flex-1 bg-line" />
    </div>
  );
}

function UpcomingLessons({
  now,
  lessons,
  highlightId,
  lateCancellationCharged,
}: {
  now: string;
  lessons: Lesson[];
  highlightId?: string;
  lateCancellationCharged: boolean;
}) {
  if (lessons.length === 0) {
    return (
      <Card>
        <EmptyState
          icon={CalendarPlus}
          title="Aucune leçon à venir"
          description="Choisissez un créneau libre avec votre moniteur : vos prochaines leçons s'afficheront ici."
          action={
            <ButtonLink href="/eleve/planning/reserver" icon={<CalendarPlus className="size-4" aria-hidden />}>
              Réserver une leçon
            </ButtonLink>
          }
        />
      </Card>
    );
  }

  const days = groupBy(lessons, (lesson) => dayKey(lesson.start));
  return (
    <div className="space-y-6">
      {days.map(({ key, items }) => (
        <section key={key} aria-labelledby={`jour-${key}`}>
          <GroupHeading id={`jour-${key}`} aside={items.length > 1 ? `${items.length} leçons` : undefined}>
            {formatRelativeDay(items[0].start, now)}
          </GroupHeading>
          <ul className="space-y-3">
            {items.map((lesson) => (
              <li key={lesson.id}>
                <LessonCard
                  lesson={lesson}
                  now={now}
                  headingLevel="h3"
                  className={cn(
                    lesson.id === highlightId && "ring-2 ring-brand/40 ring-offset-2 ring-offset-canvas",
                  )}
                  actions={
                    <>
                      {lesson.status === "attente_paiement" && (
                        <Alert
                          tone="warning"
                          className="w-full"
                          title="En attente de paiement"
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
                          Votre solde ne couvre pas cette leçon. Elle sera confirmée dès que vos heures seront
                          réglées.
                        </Alert>
                      )}
                      {(lesson.status === "confirme" || lesson.status === "attente_paiement") && (
                        <CancelLessonButton
                          lesson={lesson}
                          now={now}
                          lateCancellationCharged={lateCancellationCharged}
                        />
                      )}
                    </>
                  }
                />
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}

function PastLessons({ now, lessons }: { now: string; lessons: Lesson[] }) {
  if (lessons.length === 0) {
    return (
      <Card>
        <EmptyState
          icon={History}
          title="Pas encore d'historique"
          description="Vos leçons effectuées et annulées apparaîtront ici."
        />
      </Card>
    );
  }

  // Already sorted latest first by the API.
  const months = groupBy(lessons, (lesson) => dayKey(lesson.start).slice(0, 7));
  return (
    <div className="space-y-6">
      {months.map(({ key, items }) => (
        <section key={key} aria-labelledby={`mois-${key}`}>
          <GroupHeading id={`mois-${key}`} aside={`${items.length} ${items.length > 1 ? "leçons" : "leçon"}`}>
            {formatMonthYear(items[0].start)}
          </GroupHeading>
          <ul className="space-y-3">
            {items.map((lesson) => (
              <li key={lesson.id}>
                <LessonCard
                  lesson={lesson}
                  now={now}
                  headingLevel="h3"
                  actions={
                    lesson.chargedHours ? (
                      <p className="flex items-start gap-2 text-sm text-ink-muted">
                        <Info className="mt-0.5 size-4 shrink-0 text-warning" aria-hidden />
                        Annulation tardive : {formatHours(lesson.chargedHours)}{" "}
                        {lesson.chargedHours > 1 ? "décomptées" : "décomptée"} de votre solde.
                      </p>
                    ) : undefined
                  }
                />
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}

export function LessonsPanelSkeleton() {
  return (
    <>
      <LoadingLabel>Chargement de vos leçons…</LoadingLabel>
      <Skeleton className="h-13 w-full rounded-2xl sm:w-80" />
      <div className="mt-5 space-y-6">
        {[0, 1].map((group) => (
          <div key={group}>
            <div className="mb-3 flex h-6 items-center gap-3">
              <Skeleton className="h-5 w-36" />
              <span aria-hidden className="h-px flex-1 bg-line" />
            </div>
            <LessonCardSkeleton withAction />
          </div>
        ))}
      </div>
    </>
  );
}
