// Instructor API (PWA moniteur). Today it reads the in-memory mock; tomorrow each function becomes
// an HTTP call to the backend with the session cookie. Keep signatures stable.
//
// The signed-in instructor's user id is their Instructor id. Every function reads the session
// (cookies): render callers inside <Suspense>. Mutations check the subscription state (read-only
// or suspended school) and that the lesson or leave belongs to the instructor ("introuvable").

import { connection } from "next/server";
import * as instructorSpace from "@/lib/mock/instructor-space";
import { dayKey } from "@/lib/format";
import { requireInstructor } from "@/lib/session";
import type {
  ActionResult,
  InstructorDay,
  InstructorHours,
  InstructorLeave,
  InstructorLesson,
  InstructorLessonDetail,
  LeaveInput,
  LeaveResult,
  Livret,
  User,
} from "@/lib/types";
import { subscriptionBlock } from "./subscription-status";

const MUTATION_LATENCY_MS = 250;
const settle = () => new Promise((resolve) => setTimeout(resolve, MUTATION_LATENCY_MS));

const DATE_KEY = /^\d{4}-\d{2}-\d{2}$/;
/** How far "Ma journée" can go from today, both ways. */
const DAY_RANGE_DAYS = 366;

async function context() {
  const user = await requireInstructor();
  // Cookies alone can be resolved during a prerender; connection() makes "now" a request-time value.
  await connection();
  return { user, tenant: user.tenantSlug, instructorId: user.id, now: new Date() };
}

/** The signed-in instructor. */
export async function getInstructorUser(): Promise<User> {
  return (await context()).user;
}

/** Server time as ISO string (never call new Date() in render). */
export async function getNow(): Promise<string> {
  return (await context()).now.toISOString();
}

/** A real calendar day near today, or today. */
function validDay(date: string | null, now: Date): string {
  const today = dayKey(now.toISOString());
  if (!date || !DATE_KEY.test(date)) return today;
  const ms = Date.parse(`${date}T12:00:00Z`);
  if (Number.isNaN(ms) || new Date(ms).toISOString().slice(0, 10) !== date) return today;
  const distance = Math.abs(ms - Date.parse(`${today}T12:00:00Z`)) / 86_400_000;
  return distance > DAY_RANGE_DAYS ? today : date;
}

/** "Ma journée". `date` ("YYYY-MM-DD", Paris), null or invalid for today. */
export async function getInstructorDay(date: string | null): Promise<InstructorDay> {
  const { tenant, instructorId, now } = await context();
  return instructorSpace.readInstructorDay(tenant, instructorId, validDay(date, now), now);
}

/** One of the instructor's lessons; null when it does not exist or belongs to someone else. */
export async function getInstructorLesson(lessonId: string): Promise<InstructorLessonDetail | null> {
  const { tenant, instructorId, now } = await context();
  return instructorSpace.readInstructorLesson(tenant, instructorId, lessonId, now);
}

/** Requests of the students waiting for the instructor, soonest first. */
export async function getInstructorRequests(): Promise<{ now: string; requests: InstructorLesson[] }> {
  const { tenant, instructorId, now } = await context();
  return { now: now.toISOString(), requests: instructorSpace.readInstructorRequests(tenant, instructorId, now) };
}

/** For the badge of the "Demandes" tab. */
export async function getPendingRequestsCount(): Promise<number> {
  const { tenant, instructorId, now } = await context();
  return instructorSpace.readInstructorRequests(tenant, instructorId, now).length;
}

/** Current and upcoming leaves, the agency's included. */
export async function getInstructorLeaves(): Promise<{ now: string; leaves: InstructorLeave[] }> {
  const { tenant, instructorId, now } = await context();
  return { now: now.toISOString(), leaves: instructorSpace.readInstructorLeaves(tenant, instructorId, now) };
}

export async function getInstructorHours(): Promise<InstructorHours> {
  const { tenant, instructorId, now } = await context();
  return instructorSpace.readInstructorHours(tenant, instructorId, now);
}

// ---------------------------------------------------------------------------
// Mutations

/** Codes: "introuvable", "deja_traitee", "expiree", "lecture_seule", "suspendu". */
export async function reviewRequest(
  lessonId: string,
  decision: "accepte" | "refuse",
): Promise<ActionResult<{ lesson: InstructorLesson }>> {
  const { tenant, instructorId, now } = await context();
  const blocked = subscriptionBlock(tenant, now);
  if (blocked) return blocked;
  await settle();
  return instructorSpace.writeReviewRequest(tenant, instructorId, lessonId, decision, now);
}

/**
 * Émargement: the student's signature (PNG data URL, 200 Ko max) and the lesson becomes "effectue".
 * Codes: "introuvable", "pas_commence", "a_confirmer", "deja_cloturee", "signature_invalide",
 * "signature_trop_lourde", "lecture_seule", "suspendu".
 */
export async function signAndCompleteLesson(
  lessonId: string,
  signatureDataUrl: string,
): Promise<ActionResult<{ lesson: InstructorLesson }>> {
  const { tenant, instructorId, now } = await context();
  const blocked = subscriptionBlock(tenant, now);
  if (blocked) return blocked;
  await settle();
  return instructorSpace.writeSignAndComplete(tenant, instructorId, lessonId, signatureDataUrl, now);
}

/** The student did not come (charged like a no-show recorded at the agency). Same codes as above. */
export async function markStudentAbsent(lessonId: string): Promise<ActionResult<{ lesson: InstructorLesson }>> {
  const { tenant, instructorId, now } = await context();
  const blocked = subscriptionBlock(tenant, now);
  if (blocked) return blocked;
  await settle();
  return instructorSpace.writeNoShow(tenant, instructorId, lessonId, now);
}

/** C1–C4 in % (whole numbers, 0–100) and an optional comment. Codes: "introuvable", "interdit", "invalide". */
export async function updateLessonLivret(
  lessonId: string,
  input: { progress: number[]; note: string | null },
): Promise<ActionResult<{ livret: Livret }>> {
  const { user, tenant, instructorId, now } = await context();
  const blocked = subscriptionBlock(tenant, now);
  if (blocked) return blocked;
  await settle();
  const author = `${user.firstName} ${user.lastName}`;
  return instructorSpace.writeInstructorLivret(tenant, instructorId, author, lessonId, input, now);
}

/** Codes: "invalide" (fieldErrors), "chevauchement", "conflit" (lessons in `conflicts`). */
export async function declareLeave(input: LeaveInput): Promise<LeaveResult> {
  const { tenant, instructorId, now } = await context();
  const blocked = subscriptionBlock(tenant, now);
  if (blocked) return blocked;
  await settle();
  return instructorSpace.writeLeave(tenant, instructorId, input, now);
}

/** Codes: "introuvable", "interdit" (declared by the agency), "commencee". */
export async function deleteLeave(leaveId: string): Promise<ActionResult> {
  const { tenant, instructorId, now } = await context();
  const blocked = subscriptionBlock(tenant, now);
  if (blocked) return blocked;
  await settle();
  return instructorSpace.deleteLeave(tenant, instructorId, leaveId, now);
}
