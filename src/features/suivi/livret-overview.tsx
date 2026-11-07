import Link from "next/link";
import { ArrowRight, MessageSquareQuote, Route } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { LoadingLabel, Skeleton } from "@/components/ui/skeleton";
import { getLivret } from "@/lib/api/eleve";
import { formatDate, formatHours, formatPercent } from "@/lib/format";
import type { Competence, Livret } from "@/lib/types";
import { COMPETENCE_STATUS_META } from "./competence-meta";
import { ProgressRing } from "./progress-ring";

/** Small uppercase label on the dark hero (the `eyebrow` utility is brand-colored, for light surfaces). */
const darkEyebrow = "text-[0.6875rem] leading-tight font-bold tracking-[0.14em] text-brand-bright uppercase";

function drivenHours(hours: number): string {
  if (hours <= 0) return "Aucune heure de conduite réalisée pour l'instant.";
  return `${formatHours(hours)} de conduite ${hours >= 2 ? "réalisées" : "réalisée"}.`;
}

/** The REMC skills record (livret), read-only: filled in by the instructors. Render inside <Suspense>. */
export async function LivretOverview() {
  const livret = await getLivret();
  return (
    <div className="flex flex-col gap-6">
      <LivretHero livret={livret} />

      <section aria-labelledby="livret-competences">
        <h2 id="livret-competences" className="sr-only">
          Mes compétences
        </h2>
        <ul className="grid gap-4 md:grid-cols-2">
          {livret.competences.map((competence, index) => (
            <li key={competence.code} className="flex">
              <CompetenceCard competence={competence} number={index + 1} />
            </li>
          ))}
        </ul>
      </section>

      <InstructorNote note={livret.instructorNote} />
    </div>
  );
}

function LivretHero({ livret }: { livret: Livret }) {
  const acquired = livret.competences.filter((c) => c.status === "acquis").length;
  const total = livret.competences.length;
  return (
    <section
      aria-labelledby="livret-progression"
      className="relative overflow-hidden rounded-3xl bg-sidebar p-5 text-white shadow-raised sm:p-7"
    >
      <div aria-hidden className="pointer-events-none absolute -top-28 -right-20 size-80 rounded-full bg-brand/35 blur-3xl" />
      <div className="relative flex flex-col gap-6 lg:flex-row lg:items-center lg:gap-8">
        <div className="flex min-w-0 flex-1 items-center gap-4 sm:gap-6">
          <div
            role="progressbar"
            aria-label="Progression générale"
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
            <h2 id="livret-progression" className="mt-1.5 text-xl leading-snug font-extrabold tracking-[-0.02em] sm:text-2xl">
              {livret.headline}
            </h2>
            <p className="mt-1.5 text-sm text-white/75">
              {drivenHours(livret.drivingHours)} Les résultats sont mis à jour par vos moniteurs.
            </p>
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
              {acquired} / {total}
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

function InstructorNote({ note }: { note: Livret["instructorNote"] }) {
  return (
    <section
      aria-labelledby="livret-note"
      className="flex flex-col gap-4 rounded-3xl border border-brand/15 bg-brand-soft/50 p-5 shadow-card sm:flex-row sm:items-center sm:gap-5 sm:p-6"
    >
      <div className="flex min-w-0 flex-1 items-start gap-4">
        <span className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-surface text-brand shadow-card">
          <MessageSquareQuote className="size-5" aria-hidden />
        </span>
        <div className="min-w-0">
          <h2 id="livret-note" className="eyebrow">
            Note de votre moniteur·rice
          </h2>
          {note ? (
            <figure className="mt-1.5">
              <blockquote className="text-base font-semibold text-ink">« {note.text} »</blockquote>
              <figcaption className="mt-1 text-sm text-ink-muted">
                {note.author} · mise à jour le {formatDate(note.updatedAt)}
              </figcaption>
            </figure>
          ) : (
            <p className="mt-1.5 text-sm text-ink-muted">
              Votre moniteur·rice ajoutera une note ici après vos premières leçons de conduite.
            </p>
          )}
        </div>
      </div>
      <Link
        href="/eleve/messagerie"
        className="inline-flex h-11 shrink-0 items-center gap-1.5 self-start rounded-lg px-2 text-sm font-semibold text-brand transition-colors hover:bg-brand-soft sm:self-center"
      >
        Échanger
        <span className="sr-only"> avec votre moniteur·rice</span>
        <ArrowRight className="size-4" aria-hidden />
      </Link>
    </section>
  );
}

export function LivretOverviewSkeleton() {
  return (
    <div className="flex flex-col gap-6">
      <LoadingLabel>Chargement de votre livret…</LoadingLabel>
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
      <div className="grid gap-4 md:grid-cols-2">
        {[0, 1, 2, 3].map((i) => (
          <Card key={i} className="p-5 sm:p-6">
            <div className="flex items-center justify-between">
              <Skeleton className="h-4 w-6" />
              <Skeleton className="h-6 w-28 rounded-full" />
            </div>
            <Skeleton className="mt-3 h-6 w-48" />
            <Skeleton className="mt-2 h-4 w-64 max-w-full" />
            <div className="flex items-center gap-4 pt-6">
              <Skeleton className="h-2.5 flex-1 rounded-full" />
              <Skeleton className="h-9 w-20" />
            </div>
            <Skeleton className="mt-4 h-[3.75rem] rounded-2xl" />
          </Card>
        ))}
      </div>
      <Skeleton className="h-28 rounded-3xl" />
    </div>
  );
}
