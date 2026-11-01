import Link from "next/link";
import { ChevronRight, FileWarning, Search, SearchX } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { inputStyles } from "@/components/ui/field";
import { BalanceStateBadge } from "@/features/solde/balance-summary";
import { cn } from "@/lib/cn";
import { formatHours, formatRelativeDay, formatTime, initials, maskNeph } from "@/lib/format";
import type { StudentRow } from "@/lib/types";
import {
  STUDENT_FILTERS,
  countByFilter,
  filterStudents,
  studentsHref,
  type StudentQuery,
} from "./student-filters";

const SEARCH_INPUT = inputStyles.replace("px-3.5", "pr-3.5 pl-11");

function DocumentsCell({ documents }: { documents: StudentRow["documents"] }) {
  const toSend = documents.missing + documents.refused;
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <span className="text-sm font-semibold text-ink tabular-nums">
        {documents.validated}/{documents.total}
      </span>
      {documents.toReview > 0 && (
        <Badge tone="info" icon={FileWarning}>
          {documents.toReview} à vérifier
        </Badge>
      )}
      {toSend > 0 && (
        <Badge tone="warning">
          {toSend} {toSend > 1 ? "manquantes" : "manquante"}
        </Badge>
      )}
    </div>
  );
}

function NextLesson({ iso, now }: { iso: string | null; now: string }) {
  if (!iso) return <span className="text-ink-subtle">Aucune</span>;
  return (
    <span className="text-ink-muted">
      {formatRelativeDay(iso, now)} · <span className="tabular-nums">{formatTime(iso)}</span>
    </span>
  );
}

/** Staff student list: search, filters, a table on desktop and cards on a phone. */
export function StudentList({ rows, now, query }: { rows: StudentRow[]; now: string; query: StudentQuery }) {
  const visible = filterStudents(rows, query);
  const counts = countByFilter(rows);

  return (
    <div className="space-y-4">
      <form action="/gestion/eleves" role="search" className="flex max-w-xl gap-2">
        {query.filter !== "tous" && <input type="hidden" name="filtre" value={query.filter} />}
        <label htmlFor="recherche-eleve" className="sr-only">
          Rechercher un élève
        </label>
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute top-1/2 left-3.5 size-5 -translate-y-1/2 text-ink-subtle" aria-hidden />
          <input
            id="recherche-eleve"
            type="search"
            name="q"
            defaultValue={query.q}
            placeholder="Nom, e-mail, NEPH ou téléphone"
            className={SEARCH_INPUT}
          />
        </div>
        <Button type="submit" variant="secondary" size="lg">
          Rechercher
        </Button>
      </form>

      <nav aria-label="Filtres" className="-mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
        <ul className="flex w-max gap-2">
          {STUDENT_FILTERS.map(({ key, label }) => {
            const active = query.filter === key;
            return (
              <li key={key}>
                <Link
                  href={studentsHref({ filter: key, q: query.q })}
                  aria-current={active ? "true" : undefined}
                  className={cn(
                    "inline-flex h-10 items-center gap-2 rounded-xl px-3.5 text-sm font-semibold transition-colors",
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
                    {counts[key]}
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      <p className="text-sm text-ink-muted">
        {visible.length} {visible.length > 1 ? "élèves" : "élève"}
        {query.q.trim() && <> pour « {query.q.trim()} »</>}
      </p>

      {visible.length === 0 ? (
        <Card>
          <EmptyState
            icon={SearchX}
            title="Aucun élève trouvé"
            description="Vérifiez l'orthographe, ou cherchez par e-mail, NEPH ou téléphone."
          />
        </Card>
      ) : (
        <>
          <div className="hidden overflow-hidden rounded-2xl border border-line bg-surface shadow-card md:block">
            <table className="w-full text-left text-sm">
              <caption className="sr-only">Élèves de l&apos;auto-école</caption>
              <thead className="border-b border-line bg-subtle text-xs font-semibold tracking-wide text-ink-subtle uppercase">
                <tr>
                  <th scope="col" className="px-4 py-3">Élève</th>
                  <th scope="col" className="px-4 py-3">NEPH</th>
                  <th scope="col" className="px-4 py-3">Référent·e</th>
                  <th scope="col" className="px-4 py-3">Solde</th>
                  <th scope="col" className="px-4 py-3">Dossier</th>
                  <th scope="col" className="px-4 py-3">Prochaine leçon</th>
                  <th scope="col" className="w-10 px-2 py-3">
                    <span className="sr-only">Ouvrir</span>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {visible.map((row) => (
                  <tr key={row.id} className="relative transition-colors hover:bg-subtle">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <Avatar initials={initials(row.firstName, row.lastName)} size="sm" />
                        <div className="min-w-0">
                          <Link
                            href={`/gestion/eleves/${row.id}`}
                            className="font-semibold text-ink after:absolute after:inset-0 hover:underline"
                          >
                            {row.lastName} {row.firstName}
                          </Link>
                          {row.isMinor && (
                            <Badge tone="brand" className="ml-2">
                              Mineur
                            </Badge>
                          )}
                          <p className="truncate text-xs text-ink-subtle">{row.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 font-medium tracking-wider text-ink-muted tabular-nums">
                      {row.neph ? maskNeph(row.neph) : <span className="font-normal tracking-normal text-ink-subtle italic">En attente</span>}
                    </td>
                    <td className="px-4 py-3 text-ink-muted">
                      {row.referent.firstName} {row.referent.lastName}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-col items-start gap-1">
                        <BalanceStateBadge state={row.balance.state} />
                        <span className="text-xs text-ink-subtle tabular-nums">
                          {formatHours(row.balance.afterReservationsHours)} après réservations
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <DocumentsCell documents={row.documents} />
                    </td>
                    <td className="px-4 py-3">
                      <NextLesson iso={row.nextLesson} now={now} />
                    </td>
                    <td className="px-2 py-3 text-ink-subtle">
                      <ChevronRight className="size-5" aria-hidden />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <ul className="space-y-3 md:hidden">
            {visible.map((row) => (
              <li key={row.id}>
                <Link
                  href={`/gestion/eleves/${row.id}`}
                  className="flex gap-3 rounded-2xl border border-line bg-surface p-4 shadow-card hover:bg-subtle"
                >
                  <Avatar initials={initials(row.firstName, row.lastName)} />
                  <span className="min-w-0 flex-1 space-y-2">
                    <span className="block">
                      <span className="block font-semibold text-ink">
                        {row.lastName} {row.firstName}
                      </span>
                      <span className="block text-sm text-ink-muted">
                        Référent·e : {row.referent.firstName} {row.referent.lastName}
                      </span>
                    </span>
                    <span className="flex flex-wrap gap-1.5">
                      <BalanceStateBadge state={row.balance.state} />
                      {row.isMinor && <Badge tone="brand">Mineur</Badge>}
                    </span>
                    <DocumentsCell documents={row.documents} />
                    <span className="block text-sm">
                      Prochaine leçon : <NextLesson iso={row.nextLesson} now={now} />
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
