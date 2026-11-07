import Link from "next/link";
import {
  ArrowRight,
  CalendarCheck2,
  CalendarDays,
  CalendarRange,
  CreditCard,
  History,
  Info,
  Phone,
  WalletCards,
  type LucideIcon,
} from "lucide-react";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { LoadingLabel, Skeleton } from "@/components/ui/skeleton";
import { getLessons } from "@/lib/api/eleve";
import { cn } from "@/lib/cn";
import {
  formatDayOfMonth,
  formatHours,
  formatMonthShort,
  formatTimeRange,
  formatWeekdayShort,
} from "@/lib/format";
import { PURCHASE_HREF } from "@/features/paiements/links";
import { getTenant } from "@/lib/tenant";
import type { Lesson, LessonRequestInput } from "@/lib/types";
import { CancelLessonButton } from "./cancel-lesson-button";
import { getPlanningBalance, getPlanningRules, getPlanningWeek } from "./data";
import { LESSON_TYPE_META, studentStatusMeta } from "./lesson-meta";
import { ReadyButton } from "./ready-button";
import { LessonTypeSwitch, WeekBooking } from "./week-booking";

export type PlanningQuery = {
  week: string | null;
  type: LessonRequestInput["type"];
  view: "upcoming" | "history";
  requestId: string | null;
};

type Params = Record<string, string | string[] | undefined>;
const text = (value: string | string[] | undefined) => (typeof value === "string" ? value : undefined);

export function parsePlanningQuery(params: Params): PlanningQuery {
  const week = text(params.semaine);
  const request = text(params.demande);
  return {
    week: week && /^\d{4}-\d{2}-\d{2}$/.test(week) ? week : null,
    type: text(params.type) === "code" ? "code" : "conduite",
    view: text(params.vue) === "historique" ? "history" : "upcoming",
    requestId: request && /^[\w:.-]{1,160}$/.test(request) ? request : null,
  };
}

/** "Le secrétariat 01 43 55 12 34", next to the title. Render inside <Suspense>. */
export async function SecretariatPill() {
  const tenant = await getTenant();
  if (!tenant) return null;
  return (
    <a
      href={`tel:${tenant.phone.replace(/\s/g, "")}`}
      className="flex items-center gap-3 rounded-2xl border border-line bg-surface px-4 py-2.5 shadow-card transition-colors hover:bg-subtle"
    >
      <Phone className="size-5 text-brand" aria-hidden />
      <span>
        <span className="block text-xs text-ink-muted">Le secrétariat</span>
        <span className="block font-bold text-brand tabular-nums">{tenant.phone}</span>
      </span>
    </a>
  );
}

function Stat({ icon: Icon, label, value, hint }: { icon: LucideIcon; label: string; value: string; hint?: string }) {
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-line/80 bg-surface p-4 shadow-card">
      <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-brand-soft text-brand">
        <Icon className="size-5" aria-hidden />
      </span>
      <div className="min-w-0">
        <p className="text-sm text-ink-muted">{label}</p>
        <p className="font-bold text-ink tabular-nums">{value}</p>
        {hint && <p className="text-xs text-ink-subtle">{hint}</p>}
      </div>
    </div>
  );
}

/** Credit, quota of the displayed week, free cancellation. Render inside <Suspense>. */
export async function PlanningStats({ query }: { query: PlanningQuery }) {
  const [balance, week] = await Promise.all([getPlanningBalance(), getPlanningWeek(query.week, query.type)]);
  const { rules, booked } = week;
  return (
    <div className="grid gap-3 sm:grid-cols-3">
      <Stat
        icon={WalletCards}
        label="Crédit disponible"
        value={formatHours(Math.max(0, balance.afterReservationsHours))}
        hint="Après vos leçons demandées"
      />
      <Stat
        icon={CalendarRange}
        label="Cette semaine affichée"
        value={`${booked.lessons} / ${rules.maxLessonsPerWeek} rendez-vous`}
        hint={`${formatHours(booked.hours)} sur ${formatHours(rules.maxHoursPerWeek)} maximum`}
      />
      <Stat icon={CalendarCheck2} label="Annulation en ligne" value={`Jusqu'à ${formatHours(rules.freeCancellationHours)} avant`} />
    </div>
  );
}

export function PlanningStatsSkeleton() {
  return (
    <div className="grid gap-3 sm:grid-cols-3">
      {[0, 1, 2].map((i) => (
        <Skeleton key={i} className="h-[5.25rem] rounded-2xl" />
      ))}
    </div>
  );
}

function Step({ number, title, description }: { number: string; title: string; description?: string }) {
  return (
    <div className="flex items-start gap-3">
      <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-brand-soft text-xs font-bold text-brand tabular-nums">
        {number}
      </span>
      <div>
        <h2 className="text-lg font-bold tracking-[-0.01em] text-ink">{title}</h2>
        {description && <p className="text-sm text-ink-muted">{description}</p>}
      </div>
    </div>
  );
}

/** Steps 01 (type) and 02 (week grid of the referent). Render inside <Suspense>. */
export async function BookingCard({ query }: { query: PlanningQuery }) {
  const week = await getPlanningWeek(query.week, query.type);
  return (
    <Card id="reserver" className="scroll-mt-24 p-5 sm:p-6">
      <Step
        number="01"
        title="Prendre un rendez-vous en ligne"
        description={`Avec votre moniteur référent · ${week.instructor.firstName} ${week.instructor.lastName}`}
      />
      <div className="mt-4">
        <LessonTypeSwitch week={week.weekStart} type={query.type} />
      </div>
      <div className="mt-7 border-t border-line pt-6">
        <Step
          number="02"
          title="Sélectionnez votre créneau"
          description="Les horaires en vert sont libres dans l'agenda de votre moniteur."
        />
        <div className="mt-5">
          <WeekBooking week={week} type={query.type} />
        </div>
      </div>
    </Card>
  );
}

export function BookingCardSkeleton() {
  return (
    <Card className="p-5 sm:p-6">
      <LoadingLabel>Chargement de l&apos;agenda…</LoadingLabel>
      <Skeleton className="h-9 w-72 max-w-full" />
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <Skeleton className="h-[4.75rem] rounded-2xl" />
        <Skeleton className="h-[4.75rem] rounded-2xl" />
      </div>
      <Skeleton className="mt-7 h-9 w-64 max-w-full" />
      <Skeleton className="mt-5 h-[22rem] rounded-2xl" />
    </Card>
  );
}

/** "Comment ça marche ?": the request flow and the quota, for students who book for the first time. */
export async function HowItWorks() {
  const rules = await getPlanningRules();
  const steps = [
    { title: "Vous choisissez", text: "Le type de leçon, le jour, l'heure et la durée souhaitée." },
    {
      title: "Nous vérifions",
      text: `Votre crédit et le quota : ${rules.maxLessonsPerWeek} rendez-vous, ${formatHours(rules.maxHoursPerWeek)} maximum par semaine.`,
    },
    { title: "Votre moniteur confirme", text: "La demande reste « À confirmer » jusqu'à son accord." },
  ];
  return (
    <Card className="border-brand/15 bg-brand-soft/40 p-5 sm:p-6">
      <p className="eyebrow">Comment ça marche ?</p>
      <h2 className="mt-2 text-xl font-extrabold tracking-[-0.02em] text-ink">Une réservation en toute clarté.</h2>
      <ol className="mt-5 space-y-4">
        {steps.map((step, index) => (
          <li key={step.title} className="flex gap-3">
            <span className="flex size-7 shrink-0 items-center justify-center rounded-full border border-brand/30 bg-surface text-xs font-bold text-brand">
              {index + 1}
            </span>
            <p className="text-sm text-ink-muted">
              <span className="block font-semibold text-ink">{step.title}</span>
              {step.text}
            </p>
          </li>
        ))}
      </ol>
      <p className="mt-5 flex items-start gap-2 border-t border-brand/15 pt-4 text-sm text-ink-muted">
        <Info className="mt-0.5 size-4 shrink-0 text-brand" aria-hidden />
        Besoin d&apos;un rendez-vous de plus avant un examen ? Le secrétariat peut le réserver pour vous.
      </p>
      <Link href={PURCHASE_HREF} className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-brand hover:underline">
        Recharger mon solde
        <ArrowRight className="size-4" aria-hidden />
      </Link>
    </Card>
  );
}

export function HowItWorksSkeleton() {
  return <Skeleton className="h-[26rem] rounded-3xl" />;
}

/** "Mar. 3 nov." */
function shortDay(iso: string) {
  const weekday = formatWeekdayShort(iso);
  return `${weekday.charAt(0).toUpperCase()}${weekday.slice(1)} ${formatDayOfMonth(iso)} ${formatMonthShort(iso)}`;
}

function AppointmentRow({
  lesson,
  now,
  upcoming,
  highlighted,
  lateCancellationCharged,
}: {
  lesson: Lesson;
  now: string;
  upcoming: boolean;
  highlighted: boolean;
  lateCancellationCharged: boolean;
}) {
  const type = LESSON_TYPE_META[lesson.type];
  const status = studentStatusMeta(lesson);
  const cancellable = upcoming && lesson.status !== "effectue" && lesson.status !== "annule";
  const canSayReady = upcoming && (lesson.status === "confirme" || lesson.status === "attente_paiement");
  return (
    <li
      id={`rdv-${lesson.id}`}
      className={cn(
        "scroll-mt-24 rounded-2xl px-3 py-4 sm:px-4",
        highlighted && "bg-brand-soft/50 ring-2 ring-brand/30",
      )}
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-5">
        <p className="flex shrink-0 items-center gap-2 font-semibold text-ink sm:w-36">
          <CalendarDays className="size-4 text-ink-subtle" aria-hidden />
          {shortDay(lesson.start)}
        </p>
        <div className="min-w-0 flex-1">
          <h3 className="flex items-center gap-2 font-bold text-ink">
            <type.icon className="size-4 shrink-0 text-brand" aria-hidden />
            {type.label}
          </h3>
          <p className="mt-0.5 text-sm text-ink-muted">
            <span className="tabular-nums">{formatTimeRange(lesson.start, lesson.end)}</span> · {lesson.instructor.firstName}{" "}
            {lesson.instructor.lastName} · {formatHours(lesson.durationHours)}
          </p>
          <p className="mt-0.5 text-xs text-ink-subtle">
            {lesson.vehicle ? `${lesson.vehicle.label} · ` : ""}
            {lesson.meetingPoint}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2 sm:justify-end">
          <Badge tone={status.tone} icon={status.icon}>
            {status.label}
          </Badge>
          {canSayReady && <ReadyButton lessonId={lesson.id} ready={Boolean(lesson.studentReadyAt)} size="sm" />}
          {cancellable && <CancelLessonButton lesson={lesson} now={now} lateCancellationCharged={lateCancellationCharged} />}
        </div>
      </div>
      {upcoming && lesson.status === "attente_paiement" && (
        <Alert
          tone="warning"
          className="mt-3"
          action={
            <ButtonLink href="/eleve/paiements" variant="secondary" icon={<CreditCard className="size-4" aria-hidden />}>
              Régler mes heures
            </ButtonLink>
          }
        >
          Votre solde ne couvre pas cette leçon : elle aura lieu une fois vos heures réglées.
        </Alert>
      )}
      {!upcoming && lesson.chargedHours ? (
        <p className="mt-2 text-sm text-ink-muted">
          {formatHours(lesson.chargedHours)} {lesson.chargedHours > 1 ? "décomptées" : "décomptée"} de votre solde.
        </p>
      ) : null}
    </li>
  );
}

const VIEWS = [
  { view: "upcoming", label: "À venir", icon: CalendarDays },
  { view: "history", label: "Historique", icon: History },
] as const;

/** "Mes rendez-vous": upcoming (requests included) and history. Render inside <Suspense>. */
export async function Appointments({ query }: { query: PlanningQuery }) {
  const [{ now, upcoming, history }, rules] = await Promise.all([getLessons(), getPlanningRules()]);
  const lessons = query.view === "history" ? history : upcoming;
  const hrefOf = (view: PlanningQuery["view"]) => {
    const params = new URLSearchParams({ type: query.type });
    if (query.week) params.set("semaine", query.week);
    if (view === "history") params.set("vue", "historique");
    return `/eleve/planning?${params.toString()}#mes-rendez-vous`;
  };

  return (
    <Card id="mes-rendez-vous" className="scroll-mt-24 p-5 sm:p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="eyebrow">Mes rendez-vous</p>
          <h2 className="mt-2 text-xl font-extrabold tracking-[-0.02em] text-ink">Tout votre planning, au même endroit.</h2>
        </div>
        <nav aria-label="Affichage des rendez-vous">
          <ul className="grid grid-cols-2 gap-1 rounded-2xl bg-subtle p-1">
            {VIEWS.map((item) => {
              const active = item.view === query.view;
              const count = item.view === "history" ? history.length : upcoming.length;
              return (
                <li key={item.view}>
                  <Link
                    href={hrefOf(item.view)}
                    scroll={false}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "flex h-11 items-center justify-center gap-2 rounded-xl px-4 text-sm font-semibold transition-colors",
                      active ? "bg-surface text-ink shadow-card" : "text-ink-muted hover:text-ink",
                    )}
                  >
                    <item.icon className={cn("size-4", active ? "text-brand" : "text-ink-subtle")} aria-hidden />
                    {item.label}
                    <span className="text-xs text-ink-subtle tabular-nums">
                      {count}
                      <span className="sr-only"> {count > 1 ? "rendez-vous" : "rendez-vous"}</span>
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
      </div>

      {lessons.length === 0 ? (
        <EmptyState
          icon={query.view === "history" ? History : CalendarDays}
          title={query.view === "history" ? "Pas encore d'historique" : "Aucun rendez-vous à venir"}
          description={
            query.view === "history"
              ? "Vos leçons effectuées et annulées apparaîtront ici."
              : "Choisissez un créneau libre dans l'agenda ci-dessus : votre demande apparaîtra ici."
          }
        />
      ) : (
        <ul className="mt-4 divide-y divide-line">
          {lessons.map((lesson) => (
            <AppointmentRow
              key={lesson.id}
              lesson={lesson}
              now={now}
              upcoming={query.view === "upcoming"}
              highlighted={lesson.id === query.requestId}
              lateCancellationCharged={rules.lateCancellationCharged}
            />
          ))}
        </ul>
      )}
    </Card>
  );
}

export function AppointmentsSkeleton() {
  return (
    <Card className="p-5 sm:p-6">
      <LoadingLabel>Chargement de vos rendez-vous…</LoadingLabel>
      <Skeleton className="h-4 w-32" />
      <Skeleton className="mt-3 h-7 w-80 max-w-full" />
      <div className="mt-6 space-y-5">
        {[0, 1, 2].map((i) => (
          <Skeleton key={i} className="h-16 rounded-2xl" />
        ))}
      </div>
    </Card>
  );
}
