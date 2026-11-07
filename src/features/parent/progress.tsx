import { MessageSquareQuote, Route } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { LoadingLabel, Skeleton } from "@/components/ui/skeleton";
import { COMPETENCE_STATUS_META } from "@/features/suivi/competence-meta";
import { ProgressRing } from "@/features/suivi/progress-ring";
import { formatDate, formatHours, formatPercent } from "@/lib/format";
import type { Competence, Livret } from "@/lib/types";
import { ChildNotFound, NOT_FOUND_TITLE } from "./child-not-found";
import { getPageProgress } from "./data";

/** Small uppercase label on the dark hero (the `eyebrow` utility is brand-colored, for light surfaces). */
const darkEyebrow = "text-[0.6875rem] leading-tight font-bold tracking-[0.14em] text-brand-bright uppercase";

/** The livret's headline is written for the student ("Votre conduite…"): reworded for the parent. */
export function parentHeadline(headline: string, firstName: string): string {
  return headline.replace(/^Vous approchez/, `${firstName} approche`).replace(/^Votre /, "Sa ");
}

/** "La progression de Léa". Render inside <Suspense>. */
export async function ProgressTitle({ child }: { child: string | null }) {
  const data = await getPageProgress(child);
  return <>{data ? `La progression de ${data.child.firstName}` : NOT_FOUND_TITLE}</>;
}

/** The child's livret (REMC competences) and the instructors' comments, read-only. Render inside <Suspense>. */
export async function ProgressContent({ child }: { child: string | null }) {
  const data = await getPageProgress(child);
  if (!data) return <ChildNotFound />;
  const { livret, child: kid } = data;

  return (
    <div className="flex flex-col gap-6">
      <ProgressHero livret={livret} firstName={kid.firstName} />

      <section aria-labelledby="progression-competences">
        <h2 id="progression-competences" className="mb-3 text-lg font-bold tracking-tight text-ink">
          Compétences du livret
        </h2>
        <ul className="grid gap-4 md:grid-cols-2">
          {livret.competences.map((competence, index) => (
            <li key={competence.code} className="flex">
              <CompetenceCard competence={competence} number={index + 1} />
            </li>
          ))}
        </ul>
      </section>

      <Card id="retours">
        <CardHeader
          title="Retours après leçon"
          description="Les commentaires des moniteurs, du plus récent au plus ancien."
          icon={<MessageSquareQuote className="size-5" aria-hidden />}
        />
        {livret.feedback.length === 0 ? (
          <EmptyState
            icon={MessageSquareQuote}
            title="Pas encore de retour"
            description={`Les moniteurs de ${kid.firstName} écriront ici après ses leçons de conduite.`}
          />
        ) : (
          <ol className="mt-3 divide-y divide-line border-t border-line">
            {livret.feedback.map((entry) => (
              <li key={`${entry.at}-${entry.author}`} className="px-5 py-4 sm:px-6">
                <figure>
                  <blockquote className="text-base font-medium text-ink">« {entry.text} »</blockquote>
                  <figcaption className="mt-1.5 text-sm text-ink-muted">
                    <span className="font-semibold text-ink">{entry.author}</span> ·{" "}
                    <time dateTime={entry.at}>{formatDate(entry.at)}</time>
                  </figcaption>
                </figure>
              </li>
            ))}
          </ol>
        )}
      </Card>
    </div>
  );
}

function ProgressHero({ livret, firstName }: { livret: Livret; firstName: string }) {
  const acquired = livret.competences.filter((c) => c.status === "acquis").length;
  return (
    <section
      aria-labelledby="progression-generale"
      className="relative overflow-hidden rounded-3xl bg-sidebar p-5 text-white shadow-raised sm:p-7"
    >
      <div aria-hidden className="pointer-events-none absolute -top-28 -right-20 size-80 rounded-full bg-brand/35 blur-3xl" />
      <div className="relative flex flex-col gap-6 lg:flex-row lg:items-center lg:gap-8">
        <div className="flex min-w-0 flex-1 items-center gap-4 sm:gap-6">
          <div
            role="progressbar"
            aria-label={`Progression générale de ${firstName}`}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={livret.overallProgress}
            aria-valuetext={formatPercent(livret.overallProgress)}
          >
            <ProgressRing
              value={livret.overallProgress}
              className="size-24 sm:size-32"
              trackClassName="text-white/12"
              indicatorClassName="text-brand-bright"
            >
              <span className="text-xl font-extrabold tracking-tight tabular-nums sm:text-[1.75rem]">
                {formatPercent(livret.overallProgress)}
              </span>
              <span className="mt-0.5 text-[0.625rem] font-bold tracking-[0.14em] text-white/70 uppercase">Global</span>
            </ProgressRing>
          </div>
          <div className="min-w-0">
            <p className={darkEyebrow}>Progression générale</p>
            <h2 id="progression-generale" className="mt-1.5 text-xl leading-snug font-extrabold tracking-[-0.02em] sm:text-2xl">
              {parentHeadline(livret.headline, firstName)}
            </h2>
            <p className="mt-1.5 text-sm text-white/75">Le livret est rempli par les moniteurs après chaque leçon.</p>
          </div>
        </div>

        <dl className="grid grid-cols-2 gap-2 lg:w-56 lg:shrink-0 lg:grid-cols-1">
          <div className="rounded-2xl border border-white/10 bg-white/[0.06] px-4 py-3">
            <dt className={darkEyebrow}>Heures de conduite</dt>
            <dd className="mt-1 text-lg font-bold tabular-nums">{formatHours(livret.drivingHours)}</dd>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/[0.06] px-4 py-3">
            <dt className={darkEyebrow}>Compétences acquises</dt>
            <dd className="mt-1 text-lg font-bold tabular-nums">
              {acquired} / {livret.competences.length}
            </dd>
          </div>
        </dl>
      </div>
    </section>
  );
}

function CompetenceCard({ competence, number }: { competence: Competence; number: number }) {
  const status = COMPETENCE_STATUS_META[competence.status];
  return (
    <Card className="flex w-full flex-col p-5 sm:p-6">
      <div className="flex items-center justify-between gap-3">
        <span className="text-sm font-bold text-ink-subtle tabular-nums">
          <span aria-hidden>{String(number).padStart(2, "0")}</span>
          <span className="sr-only">Compétence {competence.code}</span>
        </span>
        <Badge tone={status.tone} icon={status.icon}>
          {status.label}
        </Badge>
      </div>
      <h3 className="mt-3 text-lg font-bold tracking-[-0.01em] text-ink">{competence.label}</h3>
      <p className="mt-1 text-sm text-ink-muted">{competence.description}</p>

      <div className="mt-auto flex items-center gap-4 pt-6">
        {/* The percentage next to it carries the value. */}
        <div aria-hidden className="h-2.5 flex-1 overflow-hidden rounded-full bg-subtle">
          <div
            className="h-full rounded-full bg-linear-to-r from-brand-strong to-brand"
            style={{ width: `${Math.min(100, Math.max(0, competence.progress))}%` }}
          />
        </div>
        <p className="text-3xl font-extrabold tracking-tight text-ink tabular-nums">
          <span className="sr-only">Progression : </span>
          {formatPercent(competence.progress)}
        </p>
      </div>

      <div className="mt-4 flex items-start gap-3 rounded-2xl bg-subtle/70 px-4 py-3">
        <Route className="mt-0.5 size-4 shrink-0 text-brand" aria-hidden />
        <p className="min-w-0 text-sm">
          <span className="block text-[0.625rem] font-bold tracking-[0.14em] text-ink-subtle uppercase">Prochain objectif</span>
          <span className="font-semibold text-ink">{competence.nextGoal}</span>
        </p>
      </div>
    </Card>
  );
}

export function ProgressContentSkeleton() {
  return (
    <div className="flex flex-col gap-6">
      <LoadingLabel>Chargement de la progression…</LoadingLabel>
      <div className="flex flex-col gap-6 rounded-3xl bg-sidebar p-5 sm:p-7 lg:flex-row lg:items-center lg:gap-8">
        <div className="flex flex-1 items-center gap-4 sm:gap-6">
          <div className="size-24 shrink-0 rounded-full border-[9px] border-white/10 sm:size-32" />
          <div className="flex-1 space-y-2.5">
            <div className="h-3 w-36 rounded bg-white/10" />
            <div className="h-7 w-72 max-w-full rounded-lg bg-white/10" />
            <div className="h-4 w-80 max-w-full rounded bg-white/10" />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2 lg:w-56 lg:shrink-0 lg:grid-cols-1">
          <div className="h-[4.5rem] rounded-2xl bg-white/[0.06]" />
          <div className="h-[4.5rem] rounded-2xl bg-white/[0.06]" />
        </div>
      </div>
      <Skeleton className="h-6 w-56" />
      <div className="grid gap-4 md:grid-cols-2">
        {[0, 1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-64 rounded-3xl" />
        ))}
      </div>
      <Skeleton className="h-48 rounded-3xl" />
    </div>
  );
}
