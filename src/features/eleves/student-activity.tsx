import { CalendarCheck, CalendarClock, EyeOff, ReceiptText } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { LESSON_STATUS_META, LESSON_TYPE_META } from "@/features/planning/lesson-meta";
import { PAYMENT_METHOD_META } from "@/features/paiements/payment-meta";
import { cn } from "@/lib/cn";
import { formatCurrency, formatDateShort, formatHours, formatRelativeDay, formatTime, formatTimeRange } from "@/lib/format";
import type { Lesson, Payment, StudentFile } from "@/lib/types";

/** "Dernier RDV · RDV à venir · Non-présentations", as on the school's file. */
export function StudentStats({ stats, now }: { stats: StudentFile["stats"]; now: string }) {
  const lessonLabel = (lesson: Lesson | null) =>
    lesson ? `${formatRelativeDay(lesson.start, now)} · ${formatTime(lesson.start)}` : "Aucun RDV à afficher";
  const items = [
    { icon: CalendarCheck, label: "Dernier RDV", value: lessonLabel(stats.lastLesson), tone: "text-success" },
    { icon: CalendarClock, label: "RDV à venir", value: lessonLabel(stats.nextLesson), tone: "text-warning" },
    { icon: EyeOff, label: "Non-présentations", value: String(stats.noShows), tone: "text-info" },
  ];
  return (
    <dl className="grid gap-3 sm:grid-cols-3">
      {items.map(({ icon: Icon, label, value, tone }) => (
        <div key={label} className="flex items-start gap-3 rounded-2xl border border-line bg-surface p-4 shadow-card">
          <Icon className={cn("mt-0.5 size-5 shrink-0", tone)} aria-hidden />
          <div className="min-w-0">
            <dt className="text-xs font-medium text-ink-subtle">{label}</dt>
            <dd className="font-semibold text-ink">{value}</dd>
          </div>
        </div>
      ))}
    </dl>
  );
}

const HISTORY_LIMIT = 8;

/** Upcoming lessons, then the latest ones. */
export function StudentLessons({ upcoming, history }: { upcoming: Lesson[]; history: Lesson[] }) {
  const rows = [
    ...upcoming.map((lesson) => ({ lesson, upcoming: true })),
    ...history.slice(0, HISTORY_LIMIT).map((lesson) => ({ lesson, upcoming: false })),
  ];
  if (rows.length === 0) {
    return <EmptyState icon={CalendarClock} title="Aucune leçon" description="Les RDV de l'élève apparaîtront ici." />;
  }
  return (
    <ul className="divide-y divide-line">
      {rows.map(({ lesson, upcoming: isUpcoming }) => {
        const status = LESSON_STATUS_META[lesson.status];
        const type = LESSON_TYPE_META[lesson.type];
        return (
          <li key={lesson.id} className="flex flex-wrap items-center gap-x-4 gap-y-1 py-3">
            <span className="w-24 shrink-0 text-sm font-semibold text-ink tabular-nums">{formatDateShort(lesson.start)}</span>
            <span className="w-28 shrink-0 text-sm text-ink-muted tabular-nums">{formatTimeRange(lesson.start, lesson.end)}</span>
            <span className="flex min-w-0 flex-1 items-center gap-2 text-sm text-ink">
              <type.icon className="size-4 shrink-0 text-brand" aria-hidden />
              <span className="truncate">
                {type.label} · {lesson.instructor.firstName} {lesson.instructor.lastName}
              </span>
            </span>
            <span className="flex items-center gap-2">
              {isUpcoming && <span className="sr-only">À venir :</span>}
              <Badge tone={status.tone} icon={status.icon}>
                {lesson.noShow ? "Absent" : status.label}
              </Badge>
            </span>
          </li>
        );
      })}
      {history.length > HISTORY_LIMIT && (
        <li className="pt-3 text-sm text-ink-subtle">
          + {history.length - HISTORY_LIMIT} leçons plus anciennes
        </li>
      )}
    </ul>
  );
}

export function StudentPayments({ payments }: { payments: Payment[] }) {
  if (payments.length === 0) {
    return <EmptyState icon={ReceiptText} title="Aucun paiement" description="Les encaissements de l'élève apparaîtront ici." />;
  }
  return (
    <ul className="divide-y divide-line">
      {payments.map((payment) => {
        const method = PAYMENT_METHOD_META[payment.method];
        return (
          <li key={payment.id} className="flex items-center gap-3 py-3">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-subtle text-ink-muted">
              <method.icon className="size-5" aria-hidden />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block font-semibold text-ink tabular-nums">{formatCurrency(payment.amount)}</span>
              <span className="block truncate text-sm text-ink-muted">
                {method.label} · {formatDateShort(payment.date)} · {payment.invoiceNumber}
              </span>
            </span>
            {payment.hours > 0 && (
              <span className="shrink-0 text-sm font-semibold text-success tabular-nums">+ {formatHours(payment.hours)}</span>
            )}
          </li>
        );
      })}
    </ul>
  );
}
