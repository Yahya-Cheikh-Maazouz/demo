// Mock of the backend for the instructor space (PWA moniteur). Pages go through
// src/lib/api/moniteur.ts, never this file.
//
// The instructor works on the school's shared timetable (store.ts): confirming a request, the
// émargement or a declared leave are seen at once by the student, the parent and the staff.
// The instructor never sees a balance: only a light telling whether the lesson can take place.

import { dayKey, formatDateLong, formatTimeRange } from "@/lib/format";
import { addDays, parisDateTime, parisWeekKey, weekdayOf } from "@/lib/paris-time";
import type {
  ActionResult,
  InstructorDay,
  InstructorHours,
  InstructorLeave,
  InstructorLesson,
  InstructorLessonDetail,
  Leave,
  LeaveConflict,
  LeaveInput,
  LeaveReason,
  LeaveResult,
  Lesson,
  LessonType,
  Livret,
} from "@/lib/types";
import {
  findUserById,
  fullName,
  nextId,
  tenantState,
  writeLessonStatus,
  writeReviewLessonRequest,
  type StudentRecord,
  type TenantState,
} from "./store";
import { readLivretFor, writeLivretUpdate } from "./student-space";

const HOUR_MS = 3_600_000;
const DAY_MS = 24 * HOUR_MS;

/** Started lessons older than this are left to the agency. */
const TO_CLOSE_DAYS = 14;
/** The signature is a small PNG drawn on the phone. */
export const SIGNATURE_MAX_BYTES = 200 * 1024;
export const LEAVE_REASONS: LeaveReason[] = ["Congés", "Maladie", "Formation", "Autre"];
const LEAVE_MAX_DAYS = 60;
/** Types whose progress goes into the livret (REMC). */
const LIVRET_TYPES: LessonType[] = ["conduite", "examen_blanc"];

type Signature = { dataUrl: string; signedAt: string };

type InstructorGlobals = {
  __aeSignatures?: Map<string, Signature>;
  __aeInstructorLeaves?: Set<string>;
  __aeInstructorDemo?: WeakMap<TenantState, Set<string>>;
};
const g = globalThis as unknown as InstructorGlobals;
/** Émargements, by `${tenant}:${lessonId}`. */
const signatures = (g.__aeSignatures ??= new Map());
/** Leaves declared by the instructors themselves, by `${tenant}:${leaveId}`. */
const declaredLeaves = (g.__aeInstructorLeaves ??= new Set());
/** Instructors whose demo lessons to sign were already added, per school state. */
const demoSeeds = (g.__aeInstructorDemo ??= new WeakMap());

const key = (t: TenantState, id: string) => `${t.slug}:${id}`;

function overlaps(item: { start: string; end: string }, start: number, end: number): boolean {
  return Date.parse(item.start) < end && Date.parse(item.end) > start;
}

/** Booked and not done yet (a request holds the slot too). */
const isActive = (l: Lesson) => l.status === "a_confirmer" || l.status === "confirme" || l.status === "attente_paiement";
/** Confirmed: it will take place, or it took place and is still to sign. */
const isConfirmed = (l: Lesson) => l.status === "confirme" || l.status === "attente_paiement";

function view(t: TenantState, lesson: Lesson): InstructorLesson {
  const profile = t.students.get(lesson.studentId)?.profile;
  return {
    id: lesson.id,
    studentId: lesson.studentId,
    type: lesson.type,
    status: lesson.status,
    start: lesson.start,
    end: lesson.end,
    durationHours: lesson.durationHours,
    instructor: lesson.instructor,
    vehicle: lesson.vehicle,
    meetingPoint: lesson.meetingPoint,
    freeCancellationUntil: lesson.freeCancellationUntil,
    noShow: lesson.noShow,
    studentReadyAt: lesson.studentReadyAt,
    student: {
      id: lesson.studentId,
      firstName: profile?.firstName ?? "Élève",
      lastName: profile?.lastName ?? "",
      phone: profile?.phone ?? "",
      neph: profile?.neph ?? null,
      licence: profile?.licence ?? "",
    },
    light: isConfirmed(lesson) ? (lesson.status === "attente_paiement" ? "rouge" : "vert") : null,
    signedAt: signatures.get(key(t, lesson.id))?.signedAt ?? null,
  };
}

function leaveView(t: TenantState, leave: Leave): InstructorLeave {
  return { ...leave, declaredByInstructor: declaredLeaves.has(key(t, leave.id)) };
}

function ownLesson(t: TenantState, instructorId: string, lessonId: string): Lesson | null {
  return t.lessons.find((l) => l.id === lessonId && l.instructor.id === instructorId) ?? null;
}

type Failure = { ok: false; code: string; error: string };

const NOT_FOUND: Failure = { ok: false, code: "introuvable", error: "Cette leçon est introuvable dans votre planning." };

// ---------------------------------------------------------------------------
// Demo: lessons left to sign, so the émargement can be shown on any day

/** Hours left free by the generated timetable (lessons start at 8, 10, 14, 16 and 18). */
const DEMO_HOURS = [12, 13];

/** Today once both demo lessons have started, otherwise the previous working day. */
function demoDay(now: Date): string {
  const today = dayKey(now.toISOString());
  let day = now.getTime() >= parisDateTime(today, 13, 30).getTime() ? today : addDays(today, -1);
  if (weekdayOf(day) === 0) day = addDays(day, -1);
  return day;
}

const manualGearbox = (s: StudentRecord) => !s.profile.licence.includes("automatique");

/**
 * Once per instructor: the student with a login (scripted story) and another adult student of the
 * instructor each get a 1 h lesson that has started and still waits for the émargement.
 */
function ensureDemoLessons(t: TenantState, instructorId: string, now: Date) {
  const seeded = demoSeeds.get(t) ?? new Set<string>();
  demoSeeds.set(t, seeded);
  if (seeded.has(instructorId)) return;
  seeded.add(instructorId);

  const instructor = t.staff.instructors.find((i) => i.id === instructorId);
  if (!instructor) return;
  const candidates = [...t.students.values()].filter(
    (s) => s.profile.referentInstructor.id === instructorId && !s.profile.isMinor && !s.profile.archived && manualGearbox(s),
  );
  const withLogin = candidates.find((s) => findUserById(s.profile.id)?.role === "eleve");
  const other = candidates.find((s) => s !== withLogin && !findUserById(s.profile.id));
  const day = demoDay(now);

  [withLogin, other].forEach((student, index) => {
    if (!student) return;
    const start = parisDateTime(day, DEMO_HOURS[index]).getTime();
    const end = start + HOUR_MS;
    const busy = t.lessons.some(
      (l) => l.status !== "annule" && overlaps(l, start, end) && (l.instructor.id === instructorId || l.studentId === student.profile.id),
    );
    const onLeave = t.leaves.some((l) => l.instructorId === instructorId && overlaps(l, start, end));
    const vehicle = t.staff.vehicles.find(
      (v) => v.gearbox === "manuelle" && !t.lessons.some((l) => l.status !== "annule" && l.vehicle?.id === v.id && overlaps(l, start, end)),
    );
    if (busy || onLeave || !vehicle) return;
    t.lessons.push({
      id: `l-${t.slug}-${++t.lessonSeq}`,
      studentId: student.profile.id,
      type: "conduite",
      status: "confirme",
      start: new Date(start).toISOString(),
      end: new Date(end).toISOString(),
      durationHours: 1,
      instructor,
      vehicle,
      meetingPoint: t.staff.meetingPoints[instructorId] ?? t.staff.agency,
      freeCancellationUntil: new Date(start - t.settings.rules.booking.freeCancellationHours * HOUR_MS).toISOString(),
    });
  });
}

function instructorState(tenantSlug: string, instructorId: string, now: Date): TenantState {
  const t = tenantState(tenantSlug, now);
  ensureDemoLessons(t, instructorId, now);
  return t;
}

// ---------------------------------------------------------------------------
// Reads

/** "Ma journée": lessons and leaves of one Paris day, plus the started lessons still to close. */
export function readInstructorDay(tenantSlug: string, instructorId: string, dateKey: string, now: Date): InstructorDay {
  const t = instructorState(tenantSlug, instructorId, now);
  const dayStart = parisDateTime(dateKey, 0).getTime();
  const dayEnd = parisDateTime(addDays(dateKey, 1), 0).getTime();
  const nowIso = now.toISOString();
  const since = new Date(now.getTime() - TO_CLOSE_DAYS * DAY_MS).toISOString();
  const mine = t.lessons.filter((l) => l.instructor.id === instructorId).sort((a, b) => a.start.localeCompare(b.start));
  return {
    now: nowIso,
    date: dateKey,
    today: dayKey(nowIso),
    lessons: mine.filter((l) => dayKey(l.start) === dateKey).map((l) => view(t, l)),
    leaves: t.leaves
      .filter((l) => l.instructorId === instructorId && overlaps(l, dayStart, dayEnd))
      .sort((a, b) => a.start.localeCompare(b.start))
      .map((l) => leaveView(t, l)),
    toClose: mine
      .filter((l) => isConfirmed(l) && l.start <= nowIso && l.start >= since && dayKey(l.start) !== dateKey)
      .map((l) => view(t, l)),
  };
}

/** One lesson of the instructor (null when it is not theirs), with the student's livret. */
export function readInstructorLesson(
  tenantSlug: string,
  instructorId: string,
  lessonId: string,
  now: Date,
): InstructorLessonDetail | null {
  const t = instructorState(tenantSlug, instructorId, now);
  const lesson = ownLesson(t, instructorId, lessonId);
  if (!lesson) return null;
  const livret: Livret | null = LIVRET_TYPES.includes(lesson.type) ? readLivretFor(tenantSlug, lesson.studentId, now) : null;
  const signature = signatures.get(key(t, lesson.id)) ?? null;
  return { now: now.toISOString(), lesson: view(t, lesson), livret, signature };
}

/** Requests sent by the students, still to confirm, soonest first. */
export function readInstructorRequests(tenantSlug: string, instructorId: string, now: Date): InstructorLesson[] {
  const t = instructorState(tenantSlug, instructorId, now);
  const nowIso = now.toISOString();
  return t.lessons
    .filter((l) => l.instructor.id === instructorId && l.status === "a_confirmer" && l.start > nowIso)
    .sort((a, b) => a.start.localeCompare(b.start))
    .map((l) => view(t, l));
}

/** Upcoming and current leaves of the instructor (agency's ones included), soonest first. */
export function readInstructorLeaves(tenantSlug: string, instructorId: string, now: Date): InstructorLeave[] {
  const t = instructorState(tenantSlug, instructorId, now);
  const nowIso = now.toISOString();
  return t.leaves
    .filter((l) => l.instructorId === instructorId && l.end > nowIso)
    .sort((a, b) => a.start.localeCompare(b.start))
    .map((l) => leaveView(t, l));
}

export function readInstructorHours(tenantSlug: string, instructorId: string, now: Date): InstructorHours {
  const t = instructorState(tenantSlug, instructorId, now);
  const nowMs = now.getTime();
  const monday = parisWeekKey(now);
  const weekStart = parisDateTime(monday, 0).getTime();
  const weekEnd = parisDateTime(addDays(monday, 7), 0).getTime();
  const today = dayKey(now.toISOString());
  const monthKey = `${today.slice(0, 8)}01`;
  const [year, month] = today.split("-").map(Number);
  const nextMonthKey = month === 12 ? `${year + 1}-01-01` : `${year}-${String(month + 1).padStart(2, "0")}-01`;
  const monthStart = parisDateTime(monthKey, 0).getTime();
  const monthEnd = parisDateTime(nextMonthKey, 0).getTime();

  const mine = t.lessons.filter((l) => l.instructor.id === instructorId);
  const within = (l: Lesson, from: number, to: number) => {
    const start = Date.parse(l.start);
    return start >= from && start < to;
  };
  const hours = (lessons: Lesson[]) => lessons.reduce((sum, l) => sum + l.durationHours, 0);
  const doneWeek = mine.filter((l) => l.status === "effectue" && within(l, weekStart, weekEnd));
  const doneMonth = mine.filter((l) => l.status === "effectue" && within(l, monthStart, monthEnd));
  const planned = mine.filter((l) => isConfirmed(l) && within(l, nowMs, weekEnd));
  const requested = mine.filter((l) => l.status === "a_confirmer" && within(l, nowMs, weekEnd));
  return {
    now: now.toISOString(),
    week: {
      start: monday,
      doneLessons: doneWeek.length,
      doneHours: hours(doneWeek),
      plannedLessons: planned.length,
      plannedHours: hours(planned),
      requestedHours: hours(requested),
    },
    month: {
      start: monthKey,
      doneLessons: doneMonth.length,
      doneHours: hours(doneMonth),
      noShows: mine.filter((l) => l.status === "annule" && l.noShow && within(l, monthStart, Math.min(monthEnd, nowMs + 1))).length,
    },
  };
}

// ---------------------------------------------------------------------------
// Mutations

/** Confirms ("Planifié" for the student) or refuses a request. */
export function writeReviewRequest(
  tenantSlug: string,
  instructorId: string,
  lessonId: string,
  decision: "accepte" | "refuse",
  now: Date,
): ActionResult<{ lesson: InstructorLesson }> {
  const t = instructorState(tenantSlug, instructorId, now);
  const lesson = ownLesson(t, instructorId, lessonId);
  if (!lesson) return NOT_FOUND;
  if (lesson.status !== "a_confirmer") return { ok: false, code: "deja_traitee", error: "Cette demande a déjà été traitée." };
  if (lesson.start <= now.toISOString()) {
    return { ok: false, code: "expiree", error: "L'heure de cette demande est passée : voyez avec l'accueil." };
  }
  const result = writeReviewLessonRequest(tenantSlug, lessonId, decision, now);
  if (!result.ok) return result;
  return { ok: true, data: { lesson: view(t, result.data.lesson) } };
}

function startedAndConfirmed(lesson: Lesson, now: Date): Failure | null {
  if (!isConfirmed(lesson)) {
    return {
      ok: false,
      code: lesson.status === "a_confirmer" ? "a_confirmer" : "deja_cloturee",
      error: lesson.status === "a_confirmer" ? "Confirmez d'abord la demande de l'élève." : "Cette leçon est déjà clôturée.",
    };
  }
  if (lesson.start > now.toISOString()) {
    return { ok: false, code: "pas_commence", error: "La leçon n'a pas encore commencé." };
  }
  return null;
}

const PNG_SIGNATURE = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];

/** Null when `dataUrl` is a PNG data URL of at most SIGNATURE_MAX_BYTES, otherwise the error. */
function checkSignature(dataUrl: string): Failure | null {
  const prefix = "data:image/png;base64,";
  const invalid: Failure = { ok: false, code: "signature_invalide", error: "La signature n'a pas pu être lue. Faites signer l'élève à nouveau." };
  if (!dataUrl.startsWith(prefix)) return invalid;
  const base64 = dataUrl.slice(prefix.length);
  if (!/^[A-Za-z0-9+/]+={0,2}$/.test(base64)) return invalid;
  const bytes = Buffer.from(base64, "base64");
  if (bytes.length > SIGNATURE_MAX_BYTES) {
    return { ok: false, code: "signature_trop_lourde", error: "La signature est trop lourde (200 Ko au plus). Effacez-la et recommencez." };
  }
  if (bytes.length < 100 || PNG_SIGNATURE.some((byte, i) => bytes[i] !== byte)) return invalid;
  return null;
}

/** Émargement: keeps the student's signature and marks the lesson done (hours consumed). */
export function writeSignAndComplete(
  tenantSlug: string,
  instructorId: string,
  lessonId: string,
  signatureDataUrl: string,
  now: Date,
): ActionResult<{ lesson: InstructorLesson }> {
  const t = instructorState(tenantSlug, instructorId, now);
  const lesson = ownLesson(t, instructorId, lessonId);
  if (!lesson) return NOT_FOUND;
  const blocked = startedAndConfirmed(lesson, now) ?? checkSignature(signatureDataUrl);
  if (blocked) return blocked;
  const result = writeLessonStatus(tenantSlug, lessonId, "effectue", now);
  if (!result.ok) return result;
  signatures.set(key(t, lesson.id), { dataUrl: signatureDataUrl, signedAt: now.toISOString() });
  return { ok: true, data: { lesson: view(t, lesson) } };
}

/** The student did not come: cancelled and charged like a no-show recorded at the agency. */
export function writeNoShow(
  tenantSlug: string,
  instructorId: string,
  lessonId: string,
  now: Date,
): ActionResult<{ lesson: InstructorLesson }> {
  const t = instructorState(tenantSlug, instructorId, now);
  const lesson = ownLesson(t, instructorId, lessonId);
  if (!lesson) return NOT_FOUND;
  const blocked = startedAndConfirmed(lesson, now);
  if (blocked) return blocked;
  const result = writeLessonStatus(tenantSlug, lessonId, "annule", now, { noShow: true });
  if (!result.ok) return result;
  return { ok: true, data: { lesson: view(t, lesson) } };
}

/**
 * Livret after a lesson: the 4 REMC competences (0–100) and an optional comment, signed with the
 * instructor's name. Only for the instructor's driving lessons and mock exams that took place or will.
 */
export function writeInstructorLivret(
  tenantSlug: string,
  instructorId: string,
  author: string,
  lessonId: string,
  input: { progress: number[]; note: string | null },
  now: Date,
): ActionResult<{ livret: Livret }> {
  const t = instructorState(tenantSlug, instructorId, now);
  const lesson = ownLesson(t, instructorId, lessonId);
  if (!lesson) return NOT_FOUND;
  if (!LIVRET_TYPES.includes(lesson.type) || lesson.status === "a_confirmer" || lesson.status === "annule") {
    return { ok: false, code: "interdit", error: "Le livret se remplit pour une leçon de conduite confirmée ou effectuée." };
  }
  return writeLivretUpdate(tenantSlug, lesson.studentId, author, input, now);
}

function conflictOf(t: TenantState, lesson: Lesson): LeaveConflict {
  const profile = t.students.get(lesson.studentId)?.profile;
  return {
    lessonId: lesson.id,
    start: lesson.start,
    end: lesson.end,
    type: lesson.type,
    studentName: profile ? fullName(profile) : "Élève",
  };
}

/**
 * Declares a leave. Codes: "invalide" (fieldErrors start, end, reason), "chevauchement" (another
 * leave on the period), "conflit" (active lessons on the period, listed in `conflicts`).
 */
export function writeLeave(tenantSlug: string, instructorId: string, input: LeaveInput, now: Date): LeaveResult {
  const t = instructorState(tenantSlug, instructorId, now);
  const fieldErrors: Record<string, string> = {};
  const start = Date.parse(input.start);
  const end = Date.parse(input.end);
  const todayStart = parisDateTime(dayKey(now.toISOString()), 0).getTime();
  if (Number.isNaN(start)) fieldErrors.start = "Indiquez la date et l'heure de début.";
  else if (start < todayStart) fieldErrors.start = "Le début ne peut pas être avant aujourd'hui.";
  if (Number.isNaN(end)) fieldErrors.end = "Indiquez la date et l'heure de fin.";
  else if (!Number.isNaN(start) && end <= start) fieldErrors.end = "La fin doit être après le début.";
  else if (end <= now.getTime()) fieldErrors.end = "Cette période est déjà passée.";
  else if (!Number.isNaN(start) && end - start > LEAVE_MAX_DAYS * DAY_MS) {
    fieldErrors.end = `Une indisponibilité dure ${LEAVE_MAX_DAYS} jours au plus : au-delà, voyez avec l'accueil.`;
  }
  if (!LEAVE_REASONS.includes(input.reason)) fieldErrors.reason = "Choisissez un motif.";
  if (Object.keys(fieldErrors).length > 0) {
    return { ok: false, code: "invalide", error: "Vérifiez les champs signalés.", fieldErrors };
  }

  if (t.leaves.some((l) => l.instructorId === instructorId && overlaps(l, start, end))) {
    return { ok: false, code: "chevauchement", error: "Vous avez déjà une indisponibilité sur cette période." };
  }
  const blocking = t.lessons
    .filter((l) => l.instructor.id === instructorId && isActive(l) && overlaps(l, start, end))
    .sort((a, b) => a.start.localeCompare(b.start));
  if (blocking.length > 0) {
    return {
      ok: false,
      code: "conflit",
      error:
        blocking.length > 1
          ? `${blocking.length} leçons sont prévues sur cette période.`
          : `Une leçon est prévue sur cette période (${formatDateLong(blocking[0].start).toLowerCase()}, ${formatTimeRange(blocking[0].start, blocking[0].end)}).`,
      conflicts: blocking.map((l) => conflictOf(t, l)),
    };
  }

  const leave: Leave = {
    id: nextId(t, "indispo"),
    instructorId,
    start: new Date(start).toISOString(),
    end: new Date(end).toISOString(),
    reason: input.reason,
  };
  t.leaves.push(leave);
  declaredLeaves.add(key(t, leave.id));
  return { ok: true, data: { leave: leaveView(t, leave) } };
}

/** Deletes a leave the instructor declared, until it starts (afterwards the agency handles it). */
export function deleteLeave(tenantSlug: string, instructorId: string, leaveId: string, now: Date): ActionResult {
  const t = instructorState(tenantSlug, instructorId, now);
  const index = t.leaves.findIndex((l) => l.id === leaveId && l.instructorId === instructorId);
  if (index < 0) return { ok: false, code: "introuvable", error: "Cette indisponibilité n'existe plus." };
  const leave = t.leaves[index];
  if (!declaredLeaves.has(key(t, leave.id))) {
    return { ok: false, code: "interdit", error: "Cette indisponibilité a été saisie par l'accueil : voyez avec lui pour la retirer." };
  }
  if (leave.start <= now.toISOString()) {
    return { ok: false, code: "commencee", error: "Cette indisponibilité a commencé : voyez avec l'accueil pour la modifier." };
  }
  t.leaves.splice(index, 1);
  declaredLeaves.delete(key(t, leave.id));
  return { ok: true };
}
