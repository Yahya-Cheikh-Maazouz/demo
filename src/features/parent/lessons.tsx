import { CalendarCheck2, CalendarDays, CreditCard, History, Info, Phone, UserRoundCheck, type LucideIcon } from "lucide-react";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { LoadingLabel, Skeleton } from "@/components/ui/skeleton";
import { LESSON_TYPE_META, studentStatusMeta } from "@/features/planning/lesson-meta";
import {
  formatDayOfMonth,
  formatHours,
  formatMonthShort,
  formatTimeRange,
  formatWeekdayShort,
} from "@/lib/format";
import { getTenant } from "@/lib/tenant";
import type { Lesson } from "@/lib/types";
import { MissingChild, missingChildTitle } from "./child-not-found";
import { getPageLessons } from "./data";
import { withChild } from "./query";

/** "Le planning de Léa". Render inside <Suspense>. */
export async function PlanningTitle({ child }: { child: string | null }) {
  const data = await getPageLessons(child);
  return <>{data ? `Le planning de ${data.child.firstName}` : await missingChildTitle()}</>;
}

/** The school's phone, next to the title: parents book or cancel through the secretariat. Render inside <Suspense>. */
export async function SchoolPhonePill() {
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

function Stat({ icon: Icon, label, value }: { icon: LucideIcon; label: string; value: string }) {
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-line/80 bg-surface p-4 shadow-card">
      <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-brand-soft text-brand">
        <Icon className="size-5" aria-hidden />
      </span>
      <div className="min-w-0">
        <p className="text-sm text-ink-muted">{label}</p>
        <p className="truncate font-bold text-ink tabular-nums">{value}</p>
      </div>
    </div>
  );
}

/** "Mar. 3 nov." */
function shortDay(iso: string) {
  const weekday = formatWeekdayShort(iso);
  return `${weekday.charAt(0).toUpperCase()}${weekday.slice(1)} ${formatDayOfMonth(iso)} ${formatMonthShort(iso)}`;
}

function LessonRow({ lesson, upcoming, paymentsHref }: { lesson: Lesson; upcoming: boolean; paymentsHref: string }) {
  const type = LESSON_TYPE_META[lesson.type];
  const status = studentStatusMeta(lesson);
  return (
    <li className="px-5 py-4 sm:px-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-5">
        <p className="flex shrink-0 items-center gap-2 font-semibold text-ink sm:w-36">
          <CalendarDays className="size-4 text-ink-subtle" aria-hidden />
          <time dateTime={lesson.start}>{shortDay(lesson.start)}</time>
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
        <div className="flex flex-wrap items-center gap-2 sm:max-w-56 sm:justify-end">
          <Badge tone={status.tone} icon={status.icon}>
            <span className="sr-only">Statut : </span>
            {status.label}
          </Badge>
          {upcoming && lesson.status === "a_confirmer" && (
            <span className="text-xs text-ink-muted sm:text-right">En attente de la confirmation du moniteur</span>
          )}
        </div>
      </div>
      {upcoming && lesson.status === "attente_paiement" && (
        <Alert
          tone="warning"
          className="mt-3"
          action={
            <ButtonLink href={paymentsHref} variant="secondary" icon={<CreditCard className="size-4" aria-hidden />}>
              Voir les paiements
            </ButtonLink>
          }
        >
          Le solde d&apos;heures ne couvre pas cette leçon : elle aura lieu une fois les heures réglées.
        </Alert>
      )}
      {!upcoming && lesson.chargedHours ? (
        <p className="mt-2 text-sm text-ink-muted">
          {formatHours(lesson.chargedHours)} {lesson.chargedHours >= 2 ? "décomptées" : "décomptée"} du solde.
        </p>
      ) : null}
    </li>
  );
}

/** Upcoming lessons (requests included) and history, read-only. Render inside <Suspense>. */
export async function PlanningContent({ child }: { child: string | null }) {
  const data = await getPageLessons(child);
  if (!data) return <MissingChild />;
  const { upcoming, history, child: kid } = data;
  const done = history.filter((l) => l.status === "effectue").length;
  const referent = kid.referentInstructor;
  const paymentsHref = withChild("/parent/paiements", child);

  return (
    <div className="space-y-6">
      <Alert tone="info" icon={Info} title="Planning en lecture seule">
        {kid.firstName} demande ses leçons depuis son espace élève et son moniteur les confirme. Pour réserver, déplacer
        ou annuler une leçon à sa place, appelez le secrétariat.
      </Alert>

      <div className="grid gap-3 sm:grid-cols-3">
        <Stat icon={CalendarDays} label="À venir" value={`${upcoming.length} rendez-vous`} />
        <Stat icon={CalendarCheck2} label="Leçons effectuées" value={`${done}`} />
        <Stat icon={UserRoundCheck} label="Moniteur·rice référent·e" value={`${referent.firstName} ${referent.lastName}`} />
      </div>

      <Card id="a-venir" className="scroll-mt-24">
        <CardHeader
          title="À venir"
          description="Rendez-vous planifiés et demandes en attente de confirmation."
          icon={<CalendarDays className="size-5" aria-hidden />}
        />
        {upcoming.length === 0 ? (
          <EmptyState
            icon={CalendarDays}
            title="Aucun rendez-vous à venir"
            description={`Les leçons demandées par ${kid.firstName} ou réservées par l'auto-école apparaîtront ici.`}
          />
        ) : (
          <ul className="mt-3 divide-y divide-line border-t border-line">
            {upcoming.map((lesson) => (
              <LessonRow key={lesson.id} lesson={lesson} upcoming paymentsHref={paymentsHref} />
            ))}
          </ul>
        )}
      </Card>

      <Card id="historique" className="scroll-mt-24">
        <CardHeader
          title="Historique"
          description="Leçons effectuées, absences et annulations, de la plus récente à la plus ancienne."
          icon={<History className="size-5" aria-hidden />}
        />
        {history.length === 0 ? (
          <EmptyState icon={History} title="Pas encore d'historique" description="Les leçons passées apparaîtront ici." />
        ) : (
          <ul className="mt-3 divide-y divide-line border-t border-line">
            {history.map((lesson) => (
              <LessonRow key={lesson.id} lesson={lesson} upcoming={false} paymentsHref={paymentsHref} />
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}

export function PlanningContentSkeleton() {
  return (
    <div className="space-y-6">
      <LoadingLabel>Chargement du planning…</LoadingLabel>
      <Skeleton className="h-24 rounded-2xl sm:h-20" />
      <div className="grid gap-3 sm:grid-cols-3">
        {[0, 1, 2].map((i) => (
          <Skeleton key={i} className="h-[4.5rem] rounded-2xl" />
        ))}
      </div>
      {[0, 1].map((card) => (
        <Card key={card} className="p-5 sm:p-6">
          <Skeleton className="h-6 w-40" />
          <Skeleton className="mt-2 h-4 w-72 max-w-full" />
          <div className="mt-6 space-y-5">
            {[0, 1, 2].map((i) => (
              <Skeleton key={i} className="h-16 rounded-2xl" />
            ))}
          </div>
        </Card>
      ))}
    </div>
  );
}
