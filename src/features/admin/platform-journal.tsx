import Link from "next/link";
import { History } from "lucide-react";
import { EmptyState } from "@/components/ui/empty-state";
import { formatDateShort, formatTime } from "@/lib/format";
import type { PlatformAuditEntry } from "@/lib/types";

/** Platform journal (who, what, when), newest first. `showSchool` adds a link to each school. */
export function PlatformJournal({ entries, showSchool = false }: { entries: PlatformAuditEntry[]; showSchool?: boolean }) {
  if (entries.length === 0) {
    return <EmptyState icon={History} title="Aucune action pour le moment" className="py-6" />;
  }
  return (
    <ol className="divide-y divide-line">
      {entries.map((entry) => (
        <li key={entry.id} className="flex flex-col gap-1 py-3 first:pt-0 last:pb-0 sm:flex-row sm:gap-4">
          <time dateTime={entry.at} className="shrink-0 text-sm text-ink-subtle tabular-nums sm:w-36">
            {formatDateShort(entry.at)} · {formatTime(entry.at)}
          </time>
          <div className="min-w-0 text-sm">
            <p className="text-ink">
              {showSchool && (
                <>
                  <Link href={`/admin/auto-ecoles/${entry.schoolSlug}`} className="font-semibold text-brand hover:underline">
                    {entry.schoolName}
                  </Link>{" "}
                  ·{" "}
                </>
              )}
              {entry.summary}
            </p>
            <p className="text-xs text-ink-subtle">par {entry.actor}</p>
          </div>
        </li>
      ))}
    </ol>
  );
}
