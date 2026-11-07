import Link from "next/link";
import {
  CalendarDays,
  ChevronRight,
  CircleCheck,
  FileText,
  ListChecks,
  ShieldCheck,
  WalletCards,
  type LucideIcon,
} from "lucide-react";
import type { ReactNode } from "react";
import { Badge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { LoadingLabel, Skeleton } from "@/components/ui/skeleton";
import { DOCUMENT_STATUS_META } from "@/features/documents/document-meta";
import { LESSON_TYPE_META, studentStatusMeta } from "@/features/planning/lesson-meta";
import { BalanceStateBadge } from "@/features/solde/balance-summary";
import { ProgressRing } from "@/features/suivi/progress-ring";
import { cn } from "@/lib/cn";
import {
  formatCurrency,
  formatDate,
  formatDateLong,
  formatDayOfMonth,
  formatHours,
  formatMonthShort,
  formatPercent,
  formatTime,
} from "@/lib/format";
import type { ChildOverview } from "@/lib/types";
import { ChildNotFound, NOT_FOUND_TITLE } from "./child-not-found";
import { CONSENT_META, consentStatusMeta } from "./consent-meta";
import { getPageOverview } from "./data";
import { parentHeadline } from "./progress";
import { withChild } from "./query";

/** "Le parcours de Léa". Render inside <Suspense>. */
export async function HomeTitle({ child }: { child: string | null }) {
  const overview = await getPageOverview(child);
  return <>{overview ? `Le parcours de ${overview.child.firstName}` : NOT_FOUND_TITLE}</>;
}

/** Licence of the child, above the title. Render inside <Suspense>. */
export async function HomeEyebrow({ child }: { child: string | null }) {
  const overview = await getPageOverview(child);
  return <>{overview ? overview.child.licence : "Espace parent"}</>;
}

/** Everything the home shows comes from one API call. Render inside <Suspense>. */
export async function HomeContent({ child }: { child: string | null }) {
  const overview = await getPageOverview(child);
  if (!overview) return <ChildNotFound />;
  const href = (path: string) => withChild(path, child);

  return (
    <div className="space-y-6">
      <section aria-label="Prochaine leçon">
        <NextLesson overview={overview} planningHref={href("/parent/planning")} />
      </section>

      <div className="grid gap-4 sm:grid-cols-2">
        <ProgressCard overview={overview} href={href("/parent/progression")} />
        <BalanceCard overview={overview} href={href("/parent/paiements")} />
      </div>

      <section aria-labelledby="accueil-a-faire">
        <div className="mb-3">
          <h2 id="accueil-a-faire" className="text-lg font-bold tracking-tight text-ink">
            À faire de votre côté
          </h2>
          <p className="text-sm text-ink-muted">Ce que l&apos;auto-école attend de vous pour {overview.child.firstName}.</p>
        </div>
        <ul className="grid gap-4 lg:grid-cols-3">
          <li className="flex">
            <ValidationsCard overview={overview} href={href("/parent/autorisations#a-valider")} />
          </li>
          <li className="flex">
            <ConsentsCard overview={overview} href={href("/parent/autorisations#autorisations")} />
          </li>
          <li className="flex">
            <DocumentsCard overview={overview} href={href("/parent/documents")} />
          </li>
        </ul>
      </section>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Next lesson

function NextLesson({ overview, planningHref }: { overview: ChildOverview; planningHref: string }) {
  const { nextLesson: lesson, child } = overview;

  if (!lesson) {
    return (
      <Card className="flex flex-col items-start gap-4 p-6 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="eyebrow">Prochaine leçon</p>
          <p className="mt-2 text-xl font-extrabold tracking-[-0.02em] text-ink">Aucune leçon prévue</p>
          <p className="mt-1 text-sm text-ink-muted">
            {child.firstName} demande ses leçons depuis son espace élève ; le secrétariat peut aussi les réserver.
          </p>
        </div>
        <ButtonLink href={planningHref} variant="secondary" icon={<CalendarDays className="size-4" aria-hidden />}>
          Voir son planning
        </ButtonLink>
      </Card>
    );
  }

  const type = LESSON_TYPE_META[lesson.type];
  const status = studentStatusMeta(lesson);
  const instructor = `${lesson.instructor.firstName} ${lesson.instructor.lastName}`;

  return (
    <Card className="relative overflow-hidden border-brand/20 bg-gradient-to-br from-surface via-surface to-brand-soft/70 p-5 shadow-raised sm:p-6">
      <p className="eyebrow flex items-center gap-2">
        <span aria-hidden className="size-2 rounded-full bg-brand" />
        Prochaine leçon de {child.firstName}
      </p>

      <div className="mt-3 flex items-start gap-4">
        <div
          aria-hidden
          className="flex w-16 shrink-0 flex-col items-center rounded-2xl border border-brand/20 bg-brand-soft py-2 text-brand"
        >
          <span className="text-2xl leading-tight font-extrabold tabular-nums">{formatDayOfMonth(lesson.start)}</span>
          <span className="text-[11px] font-bold uppercase">{formatMonthShort(lesson.start)}</span>
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-ink-muted">
            <time dateTime={lesson.start}>{formatDateLong(lesson.start)}</time>
          </p>
          <p className="text-3xl font-extrabold tracking-[-0.03em] text-ink tabular-nums">
            {formatTime(lesson.start)} · {formatHours(lesson.durationHours)}
          </p>
          <p className="mt-1 text-sm text-ink-muted">
            {type.label} avec {instructor}
            {lesson.vehicle && <> · {lesson.vehicle.label}</>}
          </p>
          <p className="mt-0.5 text-xs text-ink-subtle">{lesson.meetingPoint}</p>
        </div>
        <span className="hidden flex-col items-center gap-1 rounded-2xl bg-surface/80 px-3 py-2 text-xs font-semibold text-ink-muted sm:flex">
          <type.icon className="size-5 text-brand" aria-hidden />
          {lesson.type === "conduite" ? "Conduite" : lesson.type === "code" ? "Code" : type.label}
        </span>
      </div>

      <div className="mt-5 flex flex-wrap items-center gap-2">
        <Badge tone={status.tone} icon={status.icon}>
          <span className="sr-only">Statut : </span>
          {status.label}
        </Badge>
        {lesson.status === "a_confirmer" && (
          <span className="text-sm text-ink-muted">En attente de la confirmation du moniteur</span>
        )}
        {lesson.status === "attente_paiement" && (
          <span className="text-sm text-ink-muted">Le solde d&apos;heures ne couvre pas encore cette leçon</span>
        )}
        <ButtonLink
          href={planningHref}
          variant="secondary"
          className="w-full sm:ml-auto sm:w-auto"
          icon={<CalendarDays className="size-4" aria-hidden />}
        >
          Voir son planning
        </ButtonLink>
      </div>
      {overview.upcomingCount > 1 && (
        <p className="mt-3 text-sm text-ink-muted">
          Puis {overview.upcomingCount - 1} autre{overview.upcomingCount > 2 ? "s" : ""} rendez-vous à venir.
        </p>
      )}
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Progress and balance

function ProgressCard({ overview, href }: { overview: ChildOverview; href: string }) {
  const { progress, child } = overview;
  return (
    <Link href={href} className="group block h-full rounded-3xl">
      <Card className="flex h-full items-center gap-4 p-4 transition-colors group-hover:border-brand/30 sm:p-5">
        <ProgressRing value={progress.overallProgress} className="size-16">
          <span className="text-sm font-bold text-ink tabular-nums">{formatPercent(progress.overallProgress)}</span>
        </ProgressRing>
        <div className="min-w-0 flex-1">
          <p className="text-sm text-ink-muted">
            Progression de {child.firstName}
            <span className="sr-only"> : {formatPercent(progress.overallProgress)}</span>
          </p>
          <p className="font-bold text-ink">Voir sa progression</p>
          <p className="mt-0.5 truncate text-xs text-ink-subtle">{parentHeadline(progress.headline, child.firstName)}</p>
        </div>
        <ChevronRight className="size-5 shrink-0 text-ink-subtle transition-transform group-hover:translate-x-0.5" aria-hidden />
      </Card>
    </Link>
  );
}

function BalanceCard({ overview, href }: { overview: ChildOverview; href: string }) {
  const { balance, nextInstallment } = overview;
  const hours = balance.afterReservationsHours;
  return (
    <Card className="flex h-full flex-col gap-3 p-4 sm:p-5">
      <div className="flex items-start gap-4">
        <span className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-brand-soft text-brand">
          <WalletCards className="size-5" aria-hidden />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm text-ink-muted">Heures restantes après les réservations</p>
          <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-1">
            <p className={cn("text-xl font-extrabold tabular-nums", hours < 0 ? "text-danger" : "text-ink")}>
              {formatHours(hours)}
            </p>
            <BalanceStateBadge state={balance.state} />
          </div>
        </div>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-line pt-3">
        <p className="text-sm text-ink-muted">
          {nextInstallment ? (
            <>
              Prochaine échéance :{" "}
              <span className="font-semibold text-ink tabular-nums">{formatCurrency(nextInstallment.amount, { round: true })}</span>{" "}
              le <time dateTime={nextInstallment.dueAt}>{formatDate(nextInstallment.dueAt)}</time>
            </>
          ) : (
            "Aucune échéance à venir."
          )}
        </p>
        <Link href={href} className="inline-flex h-11 items-center gap-1 rounded-lg px-2 text-sm font-semibold text-brand hover:bg-brand-soft">
          Paiements
          <ChevronRight className="size-4" aria-hidden />
        </Link>
      </div>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// To-do cards

function TodoCard({
  icon: Icon,
  title,
  count,
  countLabel,
  done,
  href,
  linkLabel,
  children,
}: {
  icon: LucideIcon;
  title: string;
  count: number;
  /** "2 à valider" */
  countLabel: string;
  /** Shown when count is 0. */
  done: string;
  href: string;
  linkLabel: string;
  children?: ReactNode;
}) {
  return (
    <Card className="flex w-full flex-col p-5">
      <div className="flex items-start justify-between gap-3">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-2xl bg-brand-soft text-brand">
          <Icon className="size-5" aria-hidden />
        </span>
        {count > 0 ? (
          <Badge tone="warning">{countLabel}</Badge>
        ) : (
          <Badge tone="success" icon={CircleCheck}>
            À jour
          </Badge>
        )}
      </div>
      <h3 className="mt-3 font-bold text-ink">{title}</h3>
      {count > 0 ? children : <p className="mt-1 text-sm text-ink-muted">{done}</p>}
      <Link
        href={href}
        className="mt-auto -ml-2 inline-flex h-11 items-center gap-1 self-start rounded-lg px-2 pt-0 text-sm font-semibold text-brand hover:bg-brand-soft"
      >
        {linkLabel}
        <ChevronRight className="size-4" aria-hidden />
      </Link>
    </Card>
  );
}

function ValidationsCard({ overview, href }: { overview: ChildOverview; href: string }) {
  const items = overview.pendingValidations;
  return (
    <TodoCard
      icon={ListChecks}
      title="À valider"
      count={items.length}
      countLabel={`${items.length} en attente`}
      done="Aucune proposition de l'auto-école en attente."
      href={href}
      linkLabel={items.length > 0 ? "Voir et répondre" : "Voir l'historique"}
    >
      <ul className="mt-1 mb-3 space-y-1 text-sm text-ink-muted">
        {items.slice(0, 2).map((v) => (
          <li key={v.id} className="font-medium text-ink">
            {v.title}
          </li>
        ))}
      </ul>
    </TodoCard>
  );
}

function ConsentsCard({ overview, href }: { overview: ChildOverview; href: string }) {
  const items = overview.consentsToGive;
  return (
    <TodoCard
      icon={ShieldCheck}
      title="Autorisations à donner"
      count={items.length}
      countLabel={`${items.length} à donner`}
      done="Toutes les autorisations ont reçu votre réponse."
      href={href}
      linkLabel="Gérer les autorisations"
    >
      <ul className="mt-1 mb-3 space-y-1.5 text-sm">
        {items.map((c) => {
          const status = consentStatusMeta(c);
          return (
            <li key={c.key} className="flex flex-wrap items-center gap-x-2 gap-y-1">
              <span className="font-medium text-ink">{CONSENT_META[c.key].label}</span>
              <Badge tone={status.tone} icon={status.icon}>
                {status.label}
              </Badge>
            </li>
          );
        })}
      </ul>
    </TodoCard>
  );
}

function DocumentsCard({ overview, href }: { overview: ChildOverview; href: string }) {
  const items = overview.documentsToSend;
  return (
    <TodoCard
      icon={FileText}
      title="Documents manquants"
      count={items.length}
      countLabel={`${items.length} à fournir`}
      done={`Dossier à jour : ${overview.documentsValidated} pièce${overview.documentsValidated > 1 ? "s" : ""} validée${overview.documentsValidated > 1 ? "s" : ""} sur ${overview.documentsTotal}.`}
      href={href}
      linkLabel="Voir le dossier"
    >
      <ul className="mt-1 mb-3 space-y-1.5 text-sm">
        {items.map((d) => {
          const meta = DOCUMENT_STATUS_META[d.status];
          return (
            <li key={d.id} className="flex flex-wrap items-center gap-x-2 gap-y-1">
              <span className="font-medium text-ink">{d.label}</span>
              <Badge tone={meta.tone} icon={meta.icon}>
                {meta.label}
              </Badge>
            </li>
          );
        })}
      </ul>
    </TodoCard>
  );
}

// ---------------------------------------------------------------------------
// Skeleton

export function HomeContentSkeleton() {
  return (
    <div className="space-y-6">
      <LoadingLabel>Chargement du parcours…</LoadingLabel>
      <Card className="p-5 sm:p-6">
        <Skeleton className="h-4 w-48" />
        <div className="mt-4 flex gap-4">
          <Skeleton className="h-[4.5rem] w-16 rounded-2xl" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-40" />
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-4 w-56 max-w-full" />
          </div>
        </div>
        <Skeleton className="mt-5 h-11 w-full rounded-xl sm:w-64" />
      </Card>
      <div className="grid gap-4 sm:grid-cols-2">
        <Skeleton className="h-[6.5rem] rounded-3xl" />
        <Skeleton className="h-[8.5rem] rounded-3xl" />
      </div>
      <div>
        <Skeleton className="h-6 w-56" />
        <Skeleton className="mt-2 h-4 w-72 max-w-full" />
        <div className="mt-3 grid gap-4 lg:grid-cols-3">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-52 rounded-3xl" />
          ))}
        </div>
      </div>
    </div>
  );
}
