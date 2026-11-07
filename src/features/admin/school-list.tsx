import Link from "next/link";
import { Building2, ChevronRight, Search, SearchX } from "lucide-react";
import { Button, ButtonLink } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { inputStyles } from "@/components/ui/field";
import { SUBSCRIPTION_STATUSES, SUBSCRIPTION_STATUS_META } from "@/features/abonnement/status-meta";
import { SubscriptionStatusBadge } from "@/features/abonnement/subscription-status-badge";
import { cn } from "@/lib/cn";
import { formatCurrency, formatRelativeDay, formatTime } from "@/lib/format";
import type { PlatformSchool, SubscriptionStatus } from "@/lib/types";
import { filterSchools, schoolsHref, type SchoolQuery, type SchoolStatusFilter } from "./school-filters";

const SEARCH_INPUT = inputStyles.replace("px-3.5", "pr-3.5 pl-11");

const plural = (count: number, one: string, many: string) => `${count} ${count > 1 ? many : one}`;

function hostOf(url: string): string {
  return url.replace(/^https?:\/\//, "");
}

export function LastActivity({ iso, now }: { iso: string | null; now: string }) {
  if (!iso) return <span className="text-ink-subtle">Aucune connexion</span>;
  return (
    <span className="text-ink-muted">
      {formatRelativeDay(iso, now)} · <span className="tabular-nums">{formatTime(iso)}</span>
    </span>
  );
}

function UsersCell({ users }: { users: PlatformSchool["users"] }) {
  return (
    <div>
      <span className="font-semibold text-ink tabular-nums">{users.total}</span>
      <p className="text-xs text-ink-subtle">
        {plural(users.team, "membre", "membres")} d&apos;équipe · {plural(users.parents, "parent", "parents")}
      </p>
    </div>
  );
}

/**
 * Schools of the platform: search, status filters, a table on desktop and cards on a phone. Only
 * usage figures: never a student's name or a payment.
 */
export function SchoolList({
  schools,
  query,
  counts,
  now,
}: {
  schools: PlatformSchool[];
  query: SchoolQuery;
  counts: Record<SubscriptionStatus, number>;
  now: string;
}) {
  const visible = filterSchools(schools, query);
  const filters: Array<{ key: SchoolStatusFilter; label: string; count: number }> = [
    { key: "tous", label: "Toutes", count: schools.length },
    ...SUBSCRIPTION_STATUSES.map((status) => ({ key: status, label: SUBSCRIPTION_STATUS_META[status].label, count: counts[status] })),
  ];

  return (
    <div className="space-y-4">
      <form action="/admin" role="search" className="flex max-w-xl gap-2">
        {query.status !== "tous" && <input type="hidden" name="statut" value={query.status} />}
        <label htmlFor="recherche-auto-ecole" className="sr-only">
          Rechercher une auto-école
        </label>
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute top-1/2 left-3.5 size-5 -translate-y-1/2 text-ink-subtle" aria-hidden />
          <input
            id="recherche-auto-ecole"
            type="search"
            name="q"
            defaultValue={query.q}
            placeholder="Nom ou sous-domaine"
            className={SEARCH_INPUT}
          />
        </div>
        <Button type="submit" variant="secondary" size="lg">
          Rechercher
        </Button>
      </form>

      <nav aria-label="Filtrer par statut" className="-mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
        <ul className="flex w-max gap-2">
          {filters.map(({ key, label, count }) => {
            const active = query.status === key;
            return (
              <li key={key}>
                <Link
                  href={schoolsHref({ status: key, q: query.q })}
                  aria-current={active ? "true" : undefined}
                  className={cn(
                    "inline-flex h-11 items-center gap-2 rounded-xl px-3.5 text-sm font-semibold transition-colors",
                    active ? "bg-brand text-on-brand shadow-sm" : "border border-line bg-surface text-ink-muted hover:bg-subtle hover:text-ink",
                  )}
                >
                  {label}
                  <span
                    className={cn(
                      "rounded-full px-1.5 text-xs tabular-nums",
                      active ? "bg-on-brand/20 text-on-brand" : "bg-subtle text-ink-subtle",
                    )}
                  >
                    {count}
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      <p className="text-sm text-ink-muted">
        {plural(visible.length, "auto-école", "auto-écoles")}
        {query.q.trim() && <> pour « {query.q.trim()} »</>}
      </p>

      {visible.length === 0 ? (
        <Card>
          <EmptyState
            icon={schools.length === 0 ? Building2 : SearchX}
            title={schools.length === 0 ? "Aucune auto-école" : "Aucune auto-école trouvée"}
            description={
              schools.length === 0 ? "Créez la première auto-école de la plateforme." : "Vérifiez l'orthographe, ou changez de statut."
            }
            action={
              schools.length === 0 ? (
                <ButtonLink href="/admin/auto-ecoles/nouvelle">Créer une auto-école</ButtonLink>
              ) : (
                <ButtonLink href="/admin" variant="secondary">
                  Voir toutes les auto-écoles
                </ButtonLink>
              )
            }
          />
        </Card>
      ) : (
        <>
          <div className="hidden overflow-hidden rounded-3xl border border-line/80 bg-surface shadow-card md:block">
            <table className="w-full text-left text-sm">
              <caption className="sr-only">Auto-écoles de la plateforme</caption>
              <thead className="border-b border-line bg-subtle text-xs font-semibold tracking-wide text-ink-subtle uppercase">
                <tr>
                  <th scope="col" className="px-5 py-3">Auto-école</th>
                  <th scope="col" className="px-4 py-3">Formule</th>
                  <th scope="col" className="px-4 py-3">Statut</th>
                  <th scope="col" className="px-4 py-3">Utilisateurs</th>
                  <th scope="col" className="px-4 py-3">Élèves actifs</th>
                  <th scope="col" className="px-4 py-3">Dernière activité</th>
                  <th scope="col" className="w-10 px-2 py-3">
                    <span className="sr-only">Ouvrir</span>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {visible.map((school) => (
                  <tr key={school.slug} className="relative transition-colors hover:bg-subtle">
                    <td className="px-5 py-3.5">
                      <Link
                        href={`/admin/auto-ecoles/${school.slug}`}
                        className="font-semibold text-ink after:absolute after:inset-0 hover:underline"
                      >
                        {school.name}
                      </Link>
                      <p className="truncate text-xs text-ink-subtle">{hostOf(school.url)}</p>
                    </td>
                    <td className="px-4 py-3.5">
                      <span className="font-semibold text-ink">{school.plan.name}</span>
                      <p className="text-xs text-ink-subtle tabular-nums">{formatCurrency(school.plan.monthlyPrice, { round: true })} / mois</p>
                    </td>
                    <td className="px-4 py-3.5">
                      <SubscriptionStatusBadge status={school.status} />
                    </td>
                    <td className="px-4 py-3.5">
                      <UsersCell users={school.users} />
                    </td>
                    <td className="px-4 py-3.5 text-ink-muted tabular-nums">
                      <span className="font-semibold text-ink">{school.activeStudents}</span> / {school.plan.limits.students}
                    </td>
                    <td className="px-4 py-3.5">
                      <LastActivity iso={school.lastActivityAt} now={now} />
                    </td>
                    <td className="px-2 py-3.5 text-ink-subtle">
                      <ChevronRight className="size-5" aria-hidden />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <ul className="space-y-3 md:hidden">
            {visible.map((school) => (
              <li key={school.slug}>
                <Link
                  href={`/admin/auto-ecoles/${school.slug}`}
                  className="flex gap-3 rounded-3xl border border-line/80 bg-surface p-4 shadow-card hover:bg-subtle"
                >
                  <span className="min-w-0 flex-1 space-y-2">
                    <span className="block">
                      <span className="block font-semibold text-ink">{school.name}</span>
                      <span className="block truncate text-sm text-ink-subtle">{hostOf(school.url)}</span>
                    </span>
                    <span className="flex flex-wrap items-center gap-1.5">
                      <SubscriptionStatusBadge status={school.status} />
                      <span className="text-sm text-ink-muted">
                        {school.plan.name} · {formatCurrency(school.plan.monthlyPrice, { round: true })} / mois
                      </span>
                    </span>
                    <span className="block text-sm text-ink-muted tabular-nums">
                      {plural(school.users.total, "utilisateur", "utilisateurs")} · {school.activeStudents} / {school.plan.limits.students}{" "}
                      élèves actifs
                    </span>
                    <span className="block text-sm">
                      Dernière activité : <LastActivity iso={school.lastActivityAt} now={now} />
                    </span>
                  </span>
                  <ChevronRight className="size-5 shrink-0 self-center text-ink-subtle" aria-hidden />
                </Link>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
