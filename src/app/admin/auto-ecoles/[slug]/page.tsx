import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { ArrowLeft, CalendarClock, ExternalLink, Gauge, History, Landmark, ShieldCheck, UsersRound } from "lucide-react";
import { ButtonLink } from "@/components/ui/button";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { LoadingLabel, Skeleton } from "@/components/ui/skeleton";
import { TONE_BORDER } from "@/components/ui/tone";
import { QuotaMeters } from "@/features/abonnement/quota-meters";
import { SUBSCRIPTION_STATUS_META } from "@/features/abonnement/status-meta";
import { SubscriptionStatusBadge } from "@/features/abonnement/subscription-status-badge";
import { PlatformJournal } from "@/features/admin/platform-journal";
import { SchoolPlanForm } from "@/features/admin/school-plan-form";
import { LastActivity } from "@/features/admin/school-list";
import { SchoolStatusActions } from "@/features/admin/school-status-actions";
import { GRACE_DAYS, getPlatformSchool } from "@/lib/api/admin";
import { cn } from "@/lib/cn";
import { formatCurrency, formatDate } from "@/lib/format";
import type { PlatformSchoolDetail } from "@/lib/types";

export const metadata: Metadata = { title: "Auto-école · Plateforme" };

const SLUG = /^[a-z0-9-]{1,40}$/;

const plural = (count: number, one: string, many: string) => `${count} ${count > 1 ? many : one}`;

/** "824 157 693 00014": SIREN by groups of three, then the NIC. */
function formatSiret(siret: string): string {
  return siret.length === 14 ? `${siret.slice(0, 3)} ${siret.slice(3, 6)} ${siret.slice(6, 9)} ${siret.slice(9)}` : siret;
}

function hostOf(url: string): string {
  return url.replace(/^https?:\/\//, "");
}

/** Dates that explain the current status. */
function statusDates(school: PlatformSchoolDetail): Array<{ label: string; value: string }> {
  const dates: Array<{ label: string; value: string }> = [];
  if (school.status === "essai" && school.trialEndsAt) dates.push({ label: "Fin de l'essai", value: formatDate(school.trialEndsAt) });
  if (school.unpaidSince) dates.push({ label: "Impayé depuis le", value: formatDate(school.unpaidSince) });
  if (school.status === "impaye" && school.graceEndsAt) {
    dates.push({ label: `Lecture seule le (délai de ${GRACE_DAYS} jours)`, value: formatDate(school.graceEndsAt) });
  }
  if (school.status === "lecture_seule" && school.graceEndsAt) dates.push({ label: "Délai de grâce terminé le", value: formatDate(school.graceEndsAt) });
  if (school.status === "actif") dates.push({ label: "Prochaine échéance", value: formatDate(school.renewsAt) });
  return dates;
}

async function SchoolHeader({ params }: { params: Promise<{ slug: string }> }) {
  const school = await loadSchool(params);
  return (
    <PageHeader
      eyebrow="Auto-école"
      title={school.name}
      description={
        <a href={school.url} target="_blank" rel="noreferrer" className="inline-flex min-h-11 items-center gap-1.5 font-semibold text-brand hover:underline">
          {hostOf(school.url)}
          <ExternalLink className="size-4" aria-hidden />
          <span className="sr-only">(nouvel onglet)</span>
        </a>
      }
    />
  );
}

async function loadSchool(params: Promise<{ slug: string }>): Promise<PlatformSchoolDetail> {
  const { slug } = await params;
  const school = SLUG.test(slug) ? await getPlatformSchool(slug) : null;
  if (!school) notFound();
  return school;
}

async function SchoolContent({ params }: { params: Promise<{ slug: string }> }) {
  const school = await loadSchool(params);
  const meta = SUBSCRIPTION_STATUS_META[school.status];
  const dates = statusDates(school);

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      <div className="space-y-6 lg:col-span-2">
        <Card className={cn("border-2", TONE_BORDER[meta.tone])}>
          <CardBody className="space-y-5">
            <div>
              <p className="eyebrow">Abonnement</p>
              <div className="mt-2 flex flex-wrap items-center gap-3">
                <h2 className="text-2xl font-extrabold tracking-[-0.02em] text-ink">Statut</h2>
                <SubscriptionStatusBadge status={school.status} className="px-3 py-1.5 text-sm" />
              </div>
              <p className="mt-2 text-ink-muted">{meta.meaning}</p>
            </div>
            {dates.length > 0 && (
              <dl className="grid gap-3 sm:grid-cols-2">
                {dates.map((date) => (
                  <div key={date.label} className="rounded-2xl bg-subtle px-4 py-3">
                    <dt className="flex items-center gap-1.5 text-sm text-ink-muted">
                      <CalendarClock className="size-4" aria-hidden />
                      {date.label}
                    </dt>
                    <dd className="mt-0.5 font-bold text-ink">{date.value}</dd>
                  </div>
                ))}
              </dl>
            )}
            <SchoolStatusActions slug={school.slug} name={school.name} status={school.status} actions={school.actions} graceDays={GRACE_DAYS} />
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="Usage" description="Limites de la formule, comptes et activité. Aucun contenu de l'auto-école." icon={<Gauge className="size-5" aria-hidden />} />
          <CardBody className="grid gap-6 sm:grid-cols-2">
            <QuotaMeters quotas={school.quotas} />
            <dl className="space-y-4 text-sm">
              <div>
                <dt className="flex items-center gap-1.5 text-ink-muted">
                  <UsersRound className="size-4" aria-hidden />
                  Utilisateurs
                </dt>
                <dd className="mt-0.5 text-2xl font-extrabold text-ink tabular-nums">{school.users.total}</dd>
                <dd className="text-ink-muted">
                  {plural(school.users.team, "membre", "membres")} d&apos;équipe · {plural(school.users.students, "élève actif", "élèves actifs")} ·{" "}
                  {plural(school.users.parents, "parent", "parents")}
                </dd>
              </div>
              <div>
                <dt className="text-ink-muted">Dernière activité</dt>
                <dd className="mt-0.5 font-semibold">
                  <LastActivity iso={school.lastActivityAt} now={school.now} />
                </dd>
              </div>
            </dl>
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="Journal" description="Actions de la plateforme sur cette auto-école : qui, quoi, quand." icon={<History className="size-5" aria-hidden />} />
          <CardBody>
            <PlatformJournal entries={school.journal} />
          </CardBody>
        </Card>
      </div>

      <div className="space-y-6">
        <Card>
          <CardHeader title="Formule" icon={<Landmark className="size-5" aria-hidden />} />
          <CardBody className="space-y-4">
            <div>
              <p className="text-2xl font-extrabold tracking-[-0.02em] text-ink">{school.plan.name}</p>
              <p className="text-ink-muted tabular-nums">{formatCurrency(school.plan.monthlyPrice, { round: true })} par mois</p>
              <p className="mt-2 text-sm text-ink-muted">
                {plural(school.plan.limits.students, "élève actif", "élèves actifs")} · {plural(school.plan.limits.instructors, "moniteur", "moniteurs")} ·{" "}
                {plural(school.plan.limits.offices, "site", "sites")}
              </p>
            </div>
            <SchoolPlanForm slug={school.slug} name={school.name} currentPlanId={school.plan.id} plans={school.plans} />
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="Identité" />
          <CardBody>
            <dl className="space-y-3 text-sm">
              <div>
                <dt className="text-ink-muted">SIRET</dt>
                <dd className="font-semibold text-ink tabular-nums">{school.siret ? formatSiret(school.siret) : "Non renseigné"}</dd>
              </div>
              <div>
                <dt className="text-ink-muted">E-mail du gérant</dt>
                <dd className="font-semibold break-all text-ink">{school.gerantEmail || "Non renseigné"}</dd>
              </div>
              <div>
                <dt className="text-ink-muted">Sous-domaine</dt>
                <dd className="font-semibold text-ink">{school.slug}</dd>
              </div>
              <div>
                <dt className="text-ink-muted">Créée le</dt>
                <dd className="font-semibold text-ink">{formatDate(school.createdAt)}</dd>
              </div>
            </dl>
          </CardBody>
        </Card>

        <p className="flex gap-3 rounded-3xl border border-line/80 bg-surface/70 p-4 text-sm text-ink-muted">
          <ShieldCheck className="size-5 shrink-0 text-brand" aria-hidden />
          Les élèves, notes et paiements de l&apos;auto-école ne sont pas visibles depuis la plateforme. Un accès support
          tracé et limité dans le temps arrivera plus tard.
        </p>
      </div>
    </div>
  );
}

function SchoolSkeleton() {
  return (
    <div className="grid gap-6 lg:grid-cols-3">
      <LoadingLabel>Chargement de l&apos;auto-école…</LoadingLabel>
      <div className="space-y-6 lg:col-span-2">
        <Skeleton className="h-72 rounded-3xl" />
        <Skeleton className="h-64 rounded-3xl" />
        <Skeleton className="h-48 rounded-3xl" />
      </div>
      <div className="space-y-6">
        <Skeleton className="h-56 rounded-3xl" />
        <Skeleton className="h-64 rounded-3xl" />
      </div>
    </div>
  );
}

export default function AdminSchoolPage({ params }: PageProps<"/admin/auto-ecoles/[slug]">) {
  return (
    <>
      <ButtonLink href="/admin" variant="ghost" className="-ml-3 mb-2" icon={<ArrowLeft className="size-4" aria-hidden />}>
        Auto-écoles
      </ButtonLink>
      <Suspense
        fallback={
          <div className="mb-6 space-y-3 sm:mb-8">
            <Skeleton className="h-3 w-24" />
            <Skeleton className="h-10 w-72 max-w-full" />
            <Skeleton className="h-6 w-56" />
          </div>
        }
      >
        <SchoolHeader params={params} />
      </Suspense>
      <Suspense fallback={<SchoolSkeleton />}>
        <SchoolContent params={params} />
      </Suspense>
    </>
  );
}
