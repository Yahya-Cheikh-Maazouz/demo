import Link from "next/link";
import { CalendarDays, Inbox, Phone } from "lucide-react";
import { buttonStyles } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { LoadingLabel, Skeleton } from "@/components/ui/skeleton";
import { LESSON_TYPE_META } from "@/features/planning/lesson-meta";
import { getInstructorRequests } from "@/lib/api/moniteur";
import { formatDateLong, formatHours, formatRelativeDay, formatTimeRange } from "@/lib/format";
import type { InstructorLesson } from "@/lib/types";
import { GuardianContactNote, callTarget, telHref } from "./lesson-card";
import { RequestReview } from "./request-review";

function RequestCard({ lesson, now }: { lesson: InstructorLesson; now: string }) {
  const type = LESSON_TYPE_META[lesson.type];
  const name = `${lesson.student.firstName} ${lesson.student.lastName}`;
  const relative = formatRelativeDay(lesson.start, now);
  const date = formatDateLong(lesson.start);
  const titleId = `demande-${lesson.id}`;
  const call = callTarget(lesson.student);
  return (
    <article aria-labelledby={titleId} className="rounded-3xl border border-line/80 bg-surface p-4 shadow-card sm:p-5">
      <p className="flex items-center gap-2 text-sm font-semibold text-brand">
        <CalendarDays className="size-4" aria-hidden />
        {relative === date ? date : `${relative} · ${date}`}
      </p>
      <p className="mt-2 text-[1.375rem] leading-none font-extrabold tracking-[-0.02em] text-ink tabular-nums">
        {formatTimeRange(lesson.start, lesson.end)}
      </p>
      <p className="mt-2 flex items-center gap-1.5 text-sm font-semibold text-ink-muted">
        <type.icon className="size-4 shrink-0 text-brand" aria-hidden />
        {type.label} · {formatHours(lesson.durationHours)}
      </p>
      <div className="mt-4 flex items-center justify-between gap-3">
        <h2 id={titleId} className="min-w-0 text-lg leading-snug font-bold text-ink">
          <Link href={`/moniteur/lecons/${lesson.id}`} className="rounded-md hover:underline">
            {name}
          </Link>
        </h2>
        {call && !call.guardianName && (
          <a href={telHref(call.phone)} className={buttonStyles({ variant: "ghost", className: "h-12 shrink-0 rounded-2xl text-brand" })}>
            <Phone className="size-5" aria-hidden />
            Appeler
            <span className="sr-only"> {name}</span>
          </a>
        )}
      </div>
      {call?.guardianName && (
        <div className="mt-1 flex flex-wrap items-center justify-between gap-x-3">
          <GuardianContactNote student={lesson.student} />
          <a href={telHref(call.phone)} className={buttonStyles({ variant: "ghost", className: "-ml-3 h-12 rounded-2xl text-brand" })}>
            <Phone className="size-5" aria-hidden />
            Appeler le représentant légal
            <span className="sr-only">, {call.guardianName}, pour {name}</span>
          </a>
        </div>
      )}
      <RequestReview
        className="mt-4"
        lessonId={lesson.id}
        studentName={name}
        summary={`${type.label}, ${date.toLowerCase()}, ${formatTimeRange(lesson.start, lesson.end)}`}
      />
    </article>
  );
}

/** Requests sent by the students, soonest first, with "Confirmer" / "Refuser". Render inside <Suspense>. */
export async function RequestsList() {
  const { now, requests } = await getInstructorRequests();
  if (requests.length === 0) {
    return (
      <Card>
        <EmptyState
          icon={Inbox}
          title="Aucune demande à traiter"
          description="Quand un élève demande un créneau dans votre semaine, il apparaît ici pour que vous le confirmiez."
        />
      </Card>
    );
  }
  return (
    <>
      <p className="mb-4 text-sm font-semibold text-ink-muted">
        {requests.length > 1 ? `${requests.length} demandes à confirmer` : "1 demande à confirmer"}
      </p>
      <ol aria-label="Demandes à confirmer" className="space-y-4">
        {requests.map((lesson) => (
          <li key={lesson.id}>
            <RequestCard lesson={lesson} now={now} />
          </li>
        ))}
      </ol>
    </>
  );
}

export function RequestsListSkeleton() {
  return (
    <div>
      <LoadingLabel>Chargement des demandes…</LoadingLabel>
      <Skeleton className="mb-4 h-5 w-44" />
      <div className="space-y-4">
        {[0, 1].map((i) => (
          <Skeleton key={i} className="h-[17.5rem] rounded-3xl" />
        ))}
      </div>
    </div>
  );
}
