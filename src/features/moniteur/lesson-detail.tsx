import type { ReactNode } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  CalendarClock,
  Car,
  CircleCheck,
  CircleX,
  Clock3,
  Hourglass,
  IdCard,
  MapPin,
  MessageSquareQuote,
  Phone,
  ShieldUser,
  UserCheck,
  UserX,
} from "lucide-react";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { buttonStyles } from "@/components/ui/button";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { RevealValue } from "@/components/ui/reveal-value";
import { LoadingLabel, Skeleton } from "@/components/ui/skeleton";
import { LESSON_TYPE_META } from "@/features/planning/lesson-meta";
import { NephValue } from "@/features/profil/neph-value";
import { getInstructorLesson } from "@/lib/api/moniteur";
import { formatDateLong, formatHours, formatPercent, formatRelativeDay, formatTime, formatTimeRange, dayKey, maskPhone } from "@/lib/format";
import type { InstructorLesson, InstructorLessonDetail } from "@/lib/types";
import { AbsentButton } from "./absent-button";
import { InstructorFeedbackProvider, InstructorFeedbackRegion } from "./feedback";
import { deName, guillemets } from "./french";
import { bigButton, callTarget, telHref } from "./lesson-card";
import { LessonLightIndicator } from "./lesson-light";
import { TO_SIGN_META, dayHref, instructorStatusMeta, isToSign } from "./lesson-status";
import { LivretEditor } from "./livret-editor";
import { RequestReview } from "./request-review";
import { SignatureSheet } from "./signature-sheet";

const ID_PATTERN = /^[\w:.-]{1,160}$/;

/** "Leçon de conduite · jeudi 5 novembre, 12:00 – 13:00" */
function summaryOf(lesson: InstructorLesson): string {
  return `${LESSON_TYPE_META[lesson.type].label} · ${formatDateLong(lesson.start).toLowerCase()}, ${formatTimeRange(lesson.start, lesson.end)}`;
}

function Row({ icon: Icon, label, children }: { icon: typeof Car; label: string; children: ReactNode }) {
  return (
    <div className="flex items-start gap-3 py-3">
      <Icon className="mt-0.5 size-5 shrink-0 text-ink-subtle" aria-hidden />
      <div className="min-w-0 flex-1">
        <dt className="text-xs font-semibold text-ink-subtle">{label}</dt>
        <dd className="mt-0.5 text-ink">{children}</dd>
      </div>
    </div>
  );
}

/** What can be done now: answer the request, the émargement, or what happened. */
function ActionsCard({ detail }: { detail: InstructorLessonDetail }) {
  const { lesson, now, signature } = detail;
  const name = `${lesson.student.firstName} ${lesson.student.lastName}`;
  const summary = summaryOf(lesson);

  if (lesson.status === "a_confirmer") {
    const past = lesson.start <= now;
    return (
      <Card>
        <CardHeader
          icon={<Hourglass className="size-5" aria-hidden />}
          title="Demande de l'élève"
          description={past ? undefined : `L'élève attend votre réponse. Une fois confirmée, il la voit ${guillemets("Planifié")}.`}
        />
        <CardBody>
          {past ? (
            <Alert tone="warning">L&apos;heure de cette demande est passée sans réponse : voyez avec l&apos;accueil.</Alert>
          ) : (
            <RequestReview lessonId={lesson.id} studentName={name} summary={summary} />
          )}
        </CardBody>
      </Card>
    );
  }

  if (lesson.status === "effectue") {
    return (
      <Card>
        <CardHeader icon={<CircleCheck className="size-5" aria-hidden />} title="Leçon effectuée" />
        <CardBody>
          {signature ? (
            <>
              <p className="text-sm text-ink-muted">
                Émargée par {name} le {formatDateLong(signature.signedAt).toLowerCase()} à {formatTime(signature.signedAt)}.
              </p>
              <figure className="mt-3 rounded-2xl border border-line bg-surface p-2">
                {/* eslint-disable-next-line @next/next/no-img-element -- data URL of the signature, nothing to optimize */}
                <img src={signature.dataUrl} alt={`Signature de ${name}`} className="h-28 w-full object-contain" />
              </figure>
            </>
          ) : (
            <p className="text-sm text-ink-muted">Leçon clôturée par l&apos;accueil.</p>
          )}
        </CardBody>
      </Card>
    );
  }

  if (lesson.status === "annule") {
    return lesson.noShow ? (
      <Alert tone="danger" icon={UserX} title="Élève absent">
        L&apos;absence est enregistrée. Pour toute question, l&apos;accueil a le détail.
      </Alert>
    ) : (
      <Alert tone="neutral" icon={CircleX} title="Leçon annulée">
        Cette leçon a été annulée ou la demande refusée : le créneau est libre.
      </Alert>
    );
  }

  // Confirmed (or waiting for a payment).
  const started = isToSign(lesson, now);
  return (
    <Card>
      <CardHeader
        icon={<CalendarClock className="size-5" aria-hidden />}
        title="Émargement"
        description={
          started
            ? "À la fin de la leçon, l'élève signe sur votre téléphone."
            : `L'émargement s'ouvre au début de la leçon, ${formatRelativeDay(lesson.start, now).toLowerCase()} à ${formatTime(lesson.start)}.`
        }
      />
      {started && (
        <CardBody className="grid gap-2 sm:grid-cols-2">
          <SignatureSheet lessonId={lesson.id} studentName={name} summary={summary} />
          <AbsentButton lessonId={lesson.id} studentName={name} summary={summary} />
        </CardBody>
      )}
      {!started && <div className="pb-5 sm:pb-6" />}
    </Card>
  );
}

/** Why the livret can or cannot be filled on this lesson. */
function livretDescription(lesson: InstructorLesson, editable: boolean): string {
  if (editable) return "Ajustez les compétences REMC et laissez un retour après la leçon.";
  if (lesson.status === "a_confirmer") return "Le livret se remplit une fois la leçon confirmée.";
  return lesson.noShow
    ? "Élève absent : le livret ne se remplit pas sur cette leçon."
    : "Leçon annulée : le livret ne se remplit pas sur cette leçon.";
}

/** Livret REMC: editable for a confirmed or done lesson, otherwise the levels only. */
function LivretCard({ detail }: { detail: InstructorLessonDetail }) {
  const { lesson, livret } = detail;
  if (!livret) return null;
  const editable = lesson.status === "confirme" || lesson.status === "attente_paiement" || lesson.status === "effectue";
  const latest = livret.feedback[0];
  return (
    <Card>
      <CardHeader title="Livret de l'élève" description={livretDescription(lesson, editable)} />
      <CardBody className="space-y-5">
        {editable ? (
          <LivretEditor
            lessonId={lesson.id}
            studentFirstName={lesson.student.firstName}
            competences={livret.competences.map(({ code, label, progress }) => ({ code, label, progress }))}
          />
        ) : (
          <ul className="grid grid-cols-2 gap-2">
            {livret.competences.map((c) => (
              <li key={c.code} className="rounded-2xl border border-line p-3">
                <p className="text-xs font-bold text-brand">{c.code}</p>
                <p className="text-sm font-semibold text-ink">{c.label}</p>
                <p className="mt-1 text-lg font-extrabold text-ink tabular-nums">{formatPercent(c.progress)}</p>
              </li>
            ))}
          </ul>
        )}
        {latest && (
          <figure className="rounded-2xl bg-subtle p-4">
            <figcaption className="flex items-center gap-2 text-xs font-semibold text-ink-muted">
              <MessageSquareQuote className="size-4 text-brand" aria-hidden />
              Dernier retour · {latest.author}, {formatDateLong(latest.at).toLowerCase()}
            </figcaption>
            <blockquote className="mt-1.5 text-sm text-ink">{latest.text}</blockquote>
          </figure>
        )}
      </CardBody>
    </Card>
  );
}

/** Fiche leçon of the instructor (404 when the lesson is not theirs). Render inside <Suspense>. */
export async function LessonDetail({ id }: { id: Promise<string> }) {
  const lessonId = await id;
  const detail = ID_PATTERN.test(lessonId) ? await getInstructorLesson(lessonId) : null;
  if (!detail) notFound();
  const { lesson, now } = detail;
  const type = LESSON_TYPE_META[lesson.type];
  const status = instructorStatusMeta(lesson);
  const toSign = isToSign(lesson, now);
  const name = `${lesson.student.firstName} ${lesson.student.lastName}`;
  const today = dayKey(now);
  const day = dayKey(lesson.start);
  const { student } = lesson;
  const call = callTarget(student);

  return (
    <InstructorFeedbackProvider>
      <Link
        href={dayHref(day, today)}
        className="-ml-2 mb-3 inline-flex h-11 items-center gap-1.5 rounded-lg px-2 text-sm font-semibold text-ink-muted transition-colors hover:bg-subtle hover:text-ink"
      >
        <ArrowLeft className="size-4" aria-hidden />
        {day === today ? "Ma journée" : `Journée du ${formatDateLong(lesson.start).toLowerCase()}`}
      </Link>

      <PageHeader
        eyebrow={`${formatRelativeDay(lesson.start, now)} · ${formatTimeRange(lesson.start, lesson.end)}`}
        title={type.label}
        description={`${name} · ${formatHours(lesson.durationHours)}`}
        className="mb-4 sm:mb-5"
      />

      <div className="mb-5 flex flex-wrap gap-2">
        <Badge tone={status.tone} icon={status.icon}>
          {status.label}
        </Badge>
        {toSign && (
          <Badge tone={TO_SIGN_META.tone} icon={TO_SIGN_META.icon}>
            {TO_SIGN_META.label}
          </Badge>
        )}
        {lesson.studentReadyAt && lesson.status !== "annule" && (
          <Badge tone="success" icon={UserCheck}>
            Présence confirmée par l&apos;élève
          </Badge>
        )}
      </div>

      <InstructorFeedbackRegion />

      <div className="space-y-5">
        {lesson.light && <LessonLightIndicator light={lesson.light} className="text-base" />}

        <ActionsCard detail={detail} />

        <Card>
          <CardHeader title={name} description={student.licence} />
          <CardBody className="space-y-3">
            {call && (
              <a href={telHref(call.phone)} className={buttonStyles({ size: "lg", fullWidth: true, className: bigButton })}>
                <Phone className="size-5" aria-hidden />
                {call.guardianName ? "Appeler le représentant légal" : `Appeler ${student.firstName}`}
                {call.guardianName && <span className="sr-only">, {call.guardianName}</span>}
              </a>
            )}
            {student.isMinor && !student.phone && (
              <p className="flex items-start gap-2 rounded-2xl bg-subtle p-3 text-sm text-ink-muted">
                <ShieldUser className="mt-0.5 size-4 shrink-0 text-brand" aria-hidden />
                <span>
                  {student.guardianContact
                    ? `Son représentant légal n'a pas autorisé le contact direct avec ${student.firstName} : passez par lui pour un retard ou un changement de rendez-vous.`
                    : `Son représentant légal n'a pas autorisé le contact direct avec ${student.firstName} : passez par l'accueil.`}
                </span>
              </p>
            )}
            <dl className="divide-y divide-line">
              {student.phone && (
                <Row icon={Phone} label="Téléphone">
                  <RevealValue
                    value={student.phone}
                    masked={maskPhone(student.phone)}
                    maskedLabel={`masqué, se termine par ${student.phone.slice(-2)}`}
                    noun="le téléphone"
                  />
                </Row>
              )}
              {student.guardianContact && (
                <Row icon={ShieldUser} label="Représentant légal">
                  <span className="block font-semibold">{student.guardianContact.name}</span>
                  <RevealValue
                    value={student.guardianContact.phone}
                    masked={maskPhone(student.guardianContact.phone)}
                    maskedLabel={`masqué, se termine par ${student.guardianContact.phone.slice(-2)}`}
                    noun={`le téléphone ${deName(student.guardianContact.name)}`}
                  />
                </Row>
              )}
              <Row icon={IdCard} label="NEPH">
                <NephValue neph={student.neph} />
              </Row>
            </dl>
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="La leçon" />
          <CardBody className="pt-2">
            <dl className="divide-y divide-line">
              <Row icon={Clock3} label="Horaire">
                <span className="tabular-nums">
                  {formatDateLong(lesson.start)}, {formatTimeRange(lesson.start, lesson.end)}
                </span>{" "}
                · {formatHours(lesson.durationHours)}
              </Row>
              {lesson.vehicle && (
                <Row icon={Car} label="Véhicule">
                  {lesson.vehicle.label} · <span className="tabular-nums">{lesson.vehicle.plate}</span> ·{" "}
                  {lesson.vehicle.gearbox === "automatique" ? "boîte automatique" : "boîte manuelle"}
                </Row>
              )}
              <Row icon={MapPin} label="Lieu de rendez-vous">
                {lesson.meetingPoint}
              </Row>
            </dl>
          </CardBody>
        </Card>

        <LivretCard detail={detail} />
      </div>
    </InstructorFeedbackProvider>
  );
}

export function LessonDetailSkeleton() {
  return (
    <div>
      <LoadingLabel>Chargement de la leçon…</LoadingLabel>
      <Skeleton className="mb-3 h-11 w-32" />
      <Skeleton className="h-3 w-44" />
      <Skeleton className="mt-3 h-9 w-60 max-w-full" />
      <Skeleton className="mt-3 h-5 w-40" />
      <div className="mt-4 mb-5 flex gap-2">
        <Skeleton className="h-6 w-24 rounded-full" />
        <Skeleton className="h-6 w-24 rounded-full" />
      </div>
      <div className="space-y-5">
        <Skeleton className="h-12 rounded-2xl" />
        <Skeleton className="h-48 rounded-3xl" />
        <Skeleton className="h-64 rounded-3xl" />
      </div>
    </div>
  );
}
