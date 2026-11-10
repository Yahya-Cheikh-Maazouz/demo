import Link from "next/link";
import { Car, ChevronRight, MapPin, PenLine, Phone, ShieldUser, UserCheck } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { buttonStyles } from "@/components/ui/button";
import { LESSON_TYPE_META } from "@/features/planning/lesson-meta";
import { cn } from "@/lib/cn";
import { formatHours, formatTimeRange } from "@/lib/format";
import type { InstructorLesson, InstructorStudent } from "@/lib/types";
import { deName } from "./french";
import { LessonLightIndicator } from "./lesson-light";
import { TO_SIGN_META, instructorStatusMeta, isToSign } from "./lesson-status";

/** Big touch target of the cards (the instructor uses the phone in the car, with one hand). */
export const bigButton = "h-14 rounded-2xl text-base";

/** "tel:0612345690" */
export const telHref = (phone: string) => `tel:${phone.replace(/[^\d+]/g, "")}`;

/**
 * Who "Appeler" reaches: the student, or the legal guardian of a minor who did not allow direct
 * phone contact (the API then sends no number for the student). Null when there is no number.
 */
export function callTarget(student: InstructorStudent): { phone: string; guardianName: string | null } | null {
  if (student.phone) return { phone: student.phone, guardianName: null };
  if (student.guardianContact) return { phone: student.guardianContact.phone, guardianName: student.guardianContact.name };
  return null;
}

/**
 * Under the name of a minor whose legal guardian did not allow direct phone contact: "Contact via
 * le représentant légal : Nathalie Fontaine", or "Passez par l'accueil" when no guardian is on file.
 */
export function GuardianContactNote({ student, className }: { student: InstructorStudent; className?: string }) {
  if (!student.isMinor || student.phone) return null;
  return (
    <p className={cn("flex items-start gap-1.5 text-sm text-ink-muted", className)}>
      <ShieldUser className="mt-0.5 size-4 shrink-0 text-brand" aria-hidden />
      {student.guardianContact ? (
        <span>
          Contact via le représentant légal : <span className="font-semibold text-ink">{student.guardianContact.name}</span>
        </span>
      ) : (
        <span>Pas de contact direct : passez par l&apos;accueil.</span>
      )}
    </p>
  );
}

/** One lesson of "Ma journée": time, type, student with "Appeler", light, vehicle, meeting point. */
export function InstructorLessonCard({ lesson, now }: { lesson: InstructorLesson; now: string }) {
  const type = LESSON_TYPE_META[lesson.type];
  const status = instructorStatusMeta(lesson);
  const toSign = isToSign(lesson, now);
  const cancelled = lesson.status === "annule";
  const name = `${lesson.student.firstName} ${lesson.student.lastName}`;
  const href = `/moniteur/lecons/${lesson.id}`;
  const titleId = `lecon-${lesson.id}`;
  const call = callTarget(lesson.student);
  const viaGuardian = Boolean(call?.guardianName);

  return (
    <article
      aria-labelledby={titleId}
      className={cn(
        "rounded-3xl border p-4 shadow-card sm:p-5",
        cancelled ? "border-dashed border-line-strong bg-subtle/60 shadow-none" : "border-line/80 bg-surface",
        toSign && "border-warning/40 ring-2 ring-warning/15",
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[1.375rem] leading-none font-extrabold tracking-[-0.02em] text-ink tabular-nums">
            {formatTimeRange(lesson.start, lesson.end)}
          </p>
          <p className="mt-2 flex items-center gap-1.5 text-sm font-semibold text-ink-muted">
            <type.icon className="size-4 shrink-0 text-brand" aria-hidden />
            {type.label} · {formatHours(lesson.durationHours)}
          </p>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1.5">
          <Badge tone={status.tone} icon={status.icon}>
            {status.label}
          </Badge>
          {toSign && (
            <Badge tone={TO_SIGN_META.tone} icon={TO_SIGN_META.icon}>
              {TO_SIGN_META.label}
            </Badge>
          )}
        </div>
      </div>

      <h2 id={titleId} className="mt-4 text-lg leading-snug font-bold text-ink">
        <Link href={href} className="rounded-md hover:underline">
          {name}
        </Link>
      </h2>
      <GuardianContactNote student={lesson.student} className="mt-1" />
      {lesson.studentReadyAt && !cancelled && (
        <p className="mt-1 flex items-center gap-1.5 text-sm font-semibold text-success">
          <UserCheck className="size-4" aria-hidden />
          Présence confirmée par l&apos;élève
        </p>
      )}

      {lesson.light && <LessonLightIndicator light={lesson.light} className="mt-3" />}

      <dl className="mt-3 space-y-1.5 text-sm text-ink-muted">
        {lesson.vehicle && (
          <div className="flex items-start gap-2">
            <dt>
              <Car className="mt-0.5 size-4 text-ink-subtle" aria-hidden />
              <span className="sr-only">Véhicule</span>
            </dt>
            <dd>
              {lesson.vehicle.label} · <span className="tabular-nums">{lesson.vehicle.plate}</span>
            </dd>
          </div>
        )}
        <div className="flex items-start gap-2">
          <dt>
            <MapPin className="mt-0.5 size-4 text-ink-subtle" aria-hidden />
            <span className="sr-only">Lieu de rendez-vous</span>
          </dt>
          <dd>{lesson.meetingPoint}</dd>
        </div>
      </dl>

      <div className="mt-4 grid grid-cols-2 gap-2">
        {cancelled ? (
          <Link href={href} className={buttonStyles({ variant: "secondary", size: "lg", className: cn(bigButton, "col-span-2") })}>
            Voir la fiche
            <span className="sr-only"> de la leçon {deName(name)}</span>
            <ChevronRight className="size-5" aria-hidden />
          </Link>
        ) : (
          <>
            {call && (
              <a
                href={telHref(call.phone)}
                className={buttonStyles({
                  variant: toSign || lesson.status === "effectue" ? "secondary" : "primary",
                  size: "lg",
                  // The guardian's button says who it calls: it needs the whole row.
                  className: cn(bigButton, viaGuardian && "col-span-2"),
                })}
              >
                <Phone className="size-5" aria-hidden />
                {viaGuardian ? "Appeler le représentant légal" : "Appeler"}
                <span className="sr-only">{viaGuardian ? `, ${call.guardianName}, pour ${name}` : ` ${name}`}</span>
              </a>
            )}
            <Link
              href={href}
              className={buttonStyles({
                variant: toSign ? "primary" : "secondary",
                size: "lg",
                // Alone on its row when the guardian's button takes the whole row, or without any number.
                className: cn(bigButton, (viaGuardian || !call) && "col-span-2"),
              })}
            >
              {toSign ? <PenLine className="size-5" aria-hidden /> : null}
              {toSign ? "Émarger" : lesson.status === "a_confirmer" ? "Répondre" : "Fiche"}
              <span className="sr-only"> : leçon {deName(name)}</span>
              {!toSign && <ChevronRight className="size-5" aria-hidden />}
            </Link>
          </>
        )}
      </div>
    </article>
  );
}
