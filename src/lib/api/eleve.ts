// Student-facing API. Today it reads the in-memory mock; tomorrow each function becomes
// an HTTP call to the backend with the session cookie. Keep signatures stable.
//
// Every function reads the session (cookies), so callers are dynamic: render them inside
// <Suspense>. Mutations are meant to be called from Server Actions.

import { connection } from "next/server";
import { requireStudent } from "@/lib/session";
import * as store from "@/lib/mock/store";
import type {
  ActionResult,
  Balance,
  BookingRules,
  DownloadableDocument,
  HourPack,
  Installment,
  Instructor,
  Invoice,
  Lesson,
  Payment,
  PaymentMethod,
  RequiredDocument,
  Slot,
  StudentProfile,
} from "@/lib/types";

const MUTATION_LATENCY_MS = 250;
const settle = () => new Promise((resolve) => setTimeout(resolve, MUTATION_LATENCY_MS));

async function context() {
  const user = await requireStudent();
  // Cookies alone can be resolved during a prerender; connection() makes "now" a request-time value.
  await connection();
  return { userId: user.id, now: new Date() };
}

/** Server time as ISO string. Pass it to components that need "today" (never call new Date() in render). */
export async function getNow(): Promise<string> {
  const { now } = await context();
  return now.toISOString();
}

export async function getStudentProfile(): Promise<StudentProfile> {
  const { userId, now } = await context();
  return store.readProfile(userId, now);
}

/** `upcoming`: future, not cancelled, soonest first. `history`: everything else, latest first. */
export async function getLessons(): Promise<{ now: string; upcoming: Lesson[]; history: Lesson[] }> {
  const { userId, now } = await context();
  const nowIso = now.toISOString();
  const lessons = store.readLessons(userId, now);
  return {
    now: nowIso,
    upcoming: lessons.filter((l) => l.start > nowIso && l.status !== "annule"),
    history: lessons.filter((l) => l.start <= nowIso || l.status === "annule").reverse(),
  };
}

export async function getBookingRules(): Promise<BookingRules> {
  const { userId, now } = await context();
  return store.readBookingRules(userId, now);
}

/** Free slots for the next 14 days, already filtered by the booking rules (notice, leaves, overlaps). */
export async function getAvailableSlots(): Promise<{
  now: string;
  rules: BookingRules;
  referent: Instructor;
  slots: Slot[];
}> {
  const { userId, now } = await context();
  return {
    now: now.toISOString(),
    rules: store.readBookingRules(userId, now),
    referent: store.readProfile(userId, now).referentInstructor,
    slots: store.readAvailableSlots(userId, now),
  };
}

export async function getBalance(): Promise<Balance> {
  const { userId, now } = await context();
  return store.readBalance(userId, now);
}

export async function getInvoices(): Promise<Invoice[]> {
  const { userId, now } = await context();
  return store.readInvoices(userId, now);
}

export async function getPayments(): Promise<Payment[]> {
  const { userId, now } = await context();
  return store.readPayments(userId, now);
}

export async function getInstallments(): Promise<Installment[]> {
  const { userId, now } = await context();
  return store.readInstallments(userId, now);
}

export async function getHourPacks(): Promise<HourPack[]> {
  const { userId, now } = await context();
  return store.readHourPacks(userId, now);
}

export async function getRequiredDocuments(): Promise<RequiredDocument[]> {
  const { userId, now } = await context();
  return store.readRequiredDocuments(userId, now);
}

export async function getDownloadableDocuments(): Promise<DownloadableDocument[]> {
  const { userId, now } = await context();
  return store.readDownloadables(userId, now);
}

/** ISO date of the pending account deletion request, if any. */
export async function getDeletionRequest(): Promise<string | null> {
  const { userId, now } = await context();
  return store.readDeletionRequest(userId, now);
}

// ---------------------------------------------------------------------------
// Mutations

/**
 * Books a free slot. Fails with code "solde_insuffisant" when the balance does not cover it,
 * unless `acceptPendingPayment` is set: the lesson is then created as "attente_paiement".
 * Other codes: "creneau_indisponible", "limite_hebdomadaire".
 */
export async function bookSlot(
  slotId: string,
  options: { acceptPendingPayment?: boolean } = {},
): Promise<ActionResult<{ lesson: Lesson }>> {
  const { userId, now } = await context();
  await settle();
  return store.writeBookSlot(userId, slotId, now, options);
}

/** `late` is true past the free cancellation deadline; `chargedHours` are then deducted. */
export async function cancelLesson(
  lessonId: string,
): Promise<ActionResult<{ late: boolean; chargedHours: number }>> {
  const { userId, now } = await context();
  await settle();
  return store.writeCancelLesson(userId, lessonId, now);
}

/** Mock of a Stripe payment: succeeds immediately and returns the generated invoice. */
export async function purchaseHourPack(
  packId: string,
  method: Extract<PaymentMethod, "carte" | "klarna">,
): Promise<ActionResult<{ invoice: Invoice }>> {
  const { userId, now } = await context();
  await settle();
  return store.writePurchasePack(userId, packId, method, now);
}

export async function payInstallment(
  installmentId: string,
  method: Extract<PaymentMethod, "carte" | "klarna">,
): Promise<ActionResult<{ invoice: Invoice }>> {
  const { userId, now } = await context();
  await settle();
  return store.writePayInstallment(userId, installmentId, method, now);
}

/** Validate type and size in the Server Action before calling this (PDF, JPG, PNG; 10 Mo max). */
export async function uploadRequiredDocument(
  documentId: string,
  fileName: string,
): Promise<ActionResult<{ document: RequiredDocument }>> {
  const { userId, now } = await context();
  await settle();
  return store.writeUploadDocument(userId, documentId, fileName, now);
}

export async function updateContactDetails(
  input: Pick<StudentProfile, "email" | "phone" | "phoneSecondary" | "address">,
): Promise<ActionResult<{ profile: StudentProfile }>> {
  const { userId, now } = await context();
  await settle();
  return store.writeContactDetails(userId, input, now);
}

/** RGPD: the export is prepared by the backend and sent by e-mail. */
export async function requestDataExport(): Promise<ActionResult> {
  await context();
  await settle();
  return { ok: true };
}

/** RGPD: invoices are kept for the legal retention period even after deletion. */
export async function requestAccountDeletion(): Promise<ActionResult> {
  const { userId, now } = await context();
  await settle();
  return store.writeDeletionRequest(userId, now);
}
