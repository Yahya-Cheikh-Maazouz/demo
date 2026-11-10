// Staff API (gérant / assistante). Today it reads the in-memory mock; tomorrow each function
// becomes an HTTP call to the backend with the session cookie. Keep signatures stable.
//
// Every function checks the caller's permission, like the real API will: hiding a button in the
// UI is never enough. Reads throw on a missing permission (pages check it first and show an
// "accès refusé" state); mutations return { ok: false, code: "interdit" }.
// All functions read the session (cookies): render their callers inside <Suspense>.

import { redirect } from "next/navigation";
import { connection } from "next/server";
import * as imports from "@/lib/mock/imports";
import * as parentSpace from "@/lib/mock/parent-space";
import * as platform from "@/lib/mock/platform";
import * as settings from "@/lib/mock/settings";
import * as store from "@/lib/mock/store";
import * as studentsAdmin from "@/lib/mock/students-admin";
import { can } from "@/lib/permissions";
import { requireStaff } from "@/lib/session";
import { subscriptionBlock } from "./subscription-status";
import type {
  ActionResult,
  AuditEntry,
  CashEntry,
  CashMethod,
  GuardianDecisions,
  HourPack,
  HourPackInput,
  ImportField,
  ImportFieldSpec,
  ImportMapping,
  ImportRow,
  ImportSession,
  Lesson,
  NewStudentInput,
  PackageOffer,
  PackageOfferInput,
  Permission,
  Planning,
  PricingSettings,
  Quota,
  RequiredDocument,
  SchoolRules,
  StudentFile,
  StudentFormOptions,
  StudentInput,
  StudentProfile,
  StudentRow,
  Subscription,
  SubscriptionOverview,
  SubscriptionStatus,
  TeamMember,
  TeamMemberInput,
  User,
  Vehicle,
} from "@/lib/types";

export type { LessonInput } from "@/lib/mock/store";

const MUTATION_LATENCY_MS = 250;
const settle = () => new Promise((resolve) => setTimeout(resolve, MUTATION_LATENCY_MS));

const FORBIDDEN: Record<Permission, string> = {
  "planning.voir": "Vous n'avez pas accès au planning.",
  "planning.gerer": "Vous n'avez pas le droit de modifier le planning.",
  "planning.forcer": "Seul le gérant peut forcer un RDV en conflit.",
  "eleves.voir": "Vous n'avez pas accès aux dossiers élèves.",
  "eleves.gerer": "Vous n'avez pas le droit de modifier les dossiers élèves.",
  "documents.valider": "Vous n'avez pas le droit de valider les documents.",
  "caisse.encaisser": "Vous n'avez pas le droit d'encaisser.",
  "caisse.valider": "Seul le gérant peut valider cet encaissement.",
  "finances.voir": "Vous n'avez pas accès aux chiffres.",
  "tarifs.gerer": "Vous n'avez pas le droit de modifier les tarifs.",
  "regles.gerer": "Vous n'avez pas le droit de modifier les règles de l'auto-école.",
  "equipe.gerer": "Vous n'avez pas le droit de gérer l'équipe.",
  "abonnement.gerer": "Seul le gérant peut gérer l'abonnement.",
};

function forbidden(permission: Permission): { ok: false; code: string; error: string } {
  return { ok: false, code: "interdit", error: FORBIDDEN[permission] };
}

async function context() {
  const user = await requireStaff();
  // Cookies alone can be resolved during a prerender; connection() makes "now" a request-time value.
  await connection();
  return { user, tenant: user.tenantSlug, now: new Date() };
}

async function readContext(permission: Permission) {
  const ctx = await context();
  // Suspended school: only the gérant still signs in, and only to settle the subscription.
  if (store.readSubscriptionStatus(ctx.tenant, ctx.now) === "suspendu") redirect("/gestion/abonnement");
  if (!can(ctx.user, permission)) throw new Error(FORBIDDEN[permission]);
  return ctx;
}

/** The signed-in gérant or assistante, with their effective permissions. */
export async function getStaffUser(): Promise<User> {
  return (await context()).user;
}

/** Server time as ISO string, for components that need "today". */
export async function getStaffNow(): Promise<string> {
  return (await context()).now.toISOString();
}

/** Lessons, leaves, instructors and vehicles overlapping [from, to). */
export async function getPlanning(fromIso: string, toIso: string): Promise<Planning> {
  const { tenant, now } = await readContext("planning.voir");
  return store.readPlanning(tenant, now, fromIso, toIso);
}

export async function getStudentRows(): Promise<StudentRow[]> {
  const { tenant, now } = await readContext("eleves.voir");
  return store.readStudentRows(tenant, now);
}

/** Null when the student does not exist in this auto-école. */
export async function getStudentFile(studentId: string): Promise<StudentFile | null> {
  const { tenant, now } = await readContext("eleves.voir");
  return store.readStudentFile(tenant, studentId, now);
}

/**
 * Authorisations given by the legal guardian of a minor (parent space) and the answers to the
 * school's proposals, for the student's file. Null when the student is not a minor of this school.
 */
export async function getStudentGuardianDecisions(studentId: string): Promise<GuardianDecisions | null> {
  const { tenant, now } = await readContext("eleves.voir");
  return parentSpace.readGuardianDecisions(tenant, studentId, now);
}

/** Active students for the pickers of the planning and the cash register. */
export async function getStudentChoices(): Promise<Array<{ id: string; name: string; gearbox: Vehicle["gearbox"] }>> {
  const { tenant, now } = await readContext("eleves.voir");
  return store.readStudentChoices(tenant, now);
}

/** Today's cash entries, the amount above which the gérant must validate, and the package hourly rate. */
export async function getCashDay(): Promise<{ now: string; threshold: number; hourlyRate: number; entries: CashEntry[] }> {
  const { tenant, now } = await readContext("caisse.encaisser");
  return store.readCashDay(tenant, now);
}

// ---------------------------------------------------------------------------
// Mutations

/** Error code "conflit" lists the conflicts in `error` (one per line). `force` needs "planning.forcer". */
export async function createLesson(
  input: store.LessonInput,
  options: { force?: boolean } = {},
): Promise<ActionResult<{ lesson: Lesson; pendingPayment: boolean }>> {
  const { user, tenant, now } = await context();
  if (!can(user, "planning.gerer")) return forbidden("planning.gerer");
  if (options.force && !can(user, "planning.forcer")) return forbidden("planning.forcer");
  const blocked = subscriptionBlock(tenant, now);
  if (blocked) return blocked;
  await settle();
  return store.writeCreateLesson(tenant, input, now, options);
}

export async function moveLesson(
  lessonId: string,
  move: { start: string; instructorId: string },
  options: { force?: boolean } = {},
): Promise<ActionResult<{ lesson: Lesson }>> {
  const { user, tenant, now } = await context();
  if (!can(user, "planning.gerer")) return forbidden("planning.gerer");
  if (options.force && !can(user, "planning.forcer")) return forbidden("planning.forcer");
  const blocked = subscriptionBlock(tenant, now);
  if (blocked) return blocked;
  await settle();
  return store.writeMoveLesson(tenant, lessonId, move, now, options);
}

/** A no-show is cancelled and charged like a late cancellation. */
export async function setLessonStatus(
  lessonId: string,
  status: "effectue" | "annule",
  options: { noShow?: boolean } = {},
): Promise<ActionResult<{ chargedHours: number }>> {
  const { user, tenant, now } = await context();
  if (!can(user, "planning.gerer")) return forbidden("planning.gerer");
  const blocked = subscriptionBlock(tenant, now);
  if (blocked) return blocked;
  await settle();
  return store.writeLessonStatus(tenant, lessonId, status, now, options);
}

/** Confirms ("accepte") or refuses a student's lesson request. */
export async function reviewLessonRequest(lessonId: string, decision: "accepte" | "refuse"): Promise<ActionResult<{ lesson: Lesson }>> {
  const { user, tenant, now } = await context();
  if (!can(user, "planning.gerer")) return forbidden("planning.gerer");
  const blocked = subscriptionBlock(tenant, now);
  if (blocked) return blocked;
  await settle();
  return store.writeReviewLessonRequest(tenant, lessonId, decision, now);
}

export async function reviewDocument(
  studentId: string,
  documentId: string,
  decision: "valide" | "refuse",
  reason?: string,
): Promise<ActionResult<{ document: RequiredDocument }>> {
  const { user, tenant, now } = await context();
  if (!can(user, "documents.valider")) return forbidden("documents.valider");
  const blocked = subscriptionBlock(tenant, now);
  if (blocked) return blocked;
  await settle();
  return store.writeReviewDocument(tenant, studentId, documentId, decision, reason, now);
}

export async function setStudentArchived(studentId: string, archived: boolean): Promise<ActionResult> {
  const { user, tenant, now } = await context();
  if (!can(user, "eleves.gerer")) return forbidden("eleves.gerer");
  const blocked = subscriptionBlock(tenant, now);
  if (blocked) return blocked;
  await settle();
  return store.writeArchiveStudent(tenant, studentId, archived, now);
}

/** Above the threshold, without "caisse.valider", the entry waits for the gérant. */
export async function recordCashEntry(input: {
  studentId: string;
  amount: number;
  method: CashMethod;
  hours: number;
  note?: string;
}): Promise<ActionResult<{ entry: CashEntry }>> {
  const { user, tenant, now } = await context();
  if (!can(user, "caisse.encaisser")) return forbidden("caisse.encaisser");
  const blocked = subscriptionBlock(tenant, now);
  if (blocked) return blocked;
  await settle();
  return store.writeCashEntry(tenant, user, input, now);
}

export async function reviewCashEntry(entryId: string, decision: "valide" | "refuse"): Promise<ActionResult<{ entry: CashEntry }>> {
  const { user, tenant, now } = await context();
  if (!can(user, "caisse.valider")) return forbidden("caisse.valider");
  const blocked = subscriptionBlock(tenant, now);
  if (blocked) return blocked;
  await settle();
  return store.writeReviewCashEntry(tenant, user, entryId, decision, now);
}

// ---------------------------------------------------------------------------
// Enrolment and student file

/** Usage of the plan's limits (active students, instructors, offices), for every staff member. */
export async function getQuotas(): Promise<Quota[]> {
  const { tenant, now } = await context();
  return store.readQuotas(tenant, now);
}

/** Offices (sites) of the auto-école. */
export async function getOffices(): Promise<string[]> {
  const { tenant, now } = await context();
  return store.readOffices(tenant, now);
}

/** Choices of the enrolment and edition forms, with the active students quota. */
export async function getStudentFormOptions(): Promise<StudentFormOptions> {
  const { tenant, now } = await readContext("eleves.gerer");
  return studentsAdmin.readStudentFormOptions(tenant, now);
}

/** Codes: "quota_atteint", "invalide" and "doublon" (with `fieldErrors`). */
export async function createStudent(input: NewStudentInput): Promise<ActionResult<{ studentId: string }>> {
  const { user, tenant, now } = await context();
  if (!can(user, "eleves.gerer")) return forbidden("eleves.gerer");
  const blocked = subscriptionBlock(tenant, now);
  if (blocked) return blocked;
  await settle();
  return studentsAdmin.writeCreateStudent(tenant, user, input, now);
}

/** Only the fields present in `patch` change. Codes: "introuvable", "invalide", "doublon". */
export async function updateStudent(
  studentId: string,
  patch: Partial<StudentInput>,
): Promise<ActionResult<{ profile: StudentProfile }>> {
  const { user, tenant, now } = await context();
  if (!can(user, "eleves.gerer")) return forbidden("eleves.gerer");
  const blocked = subscriptionBlock(tenant, now);
  if (blocked) return blocked;
  await settle();
  return studentsAdmin.writeUpdateStudent(tenant, user, studentId, patch, now);
}

// ---------------------------------------------------------------------------
// Import of students (CSV / Excel)

export const IMPORT_MAX_BYTES = imports.IMPORT_MAX_BYTES;

export async function getImportFields(): Promise<ImportFieldSpec[]> {
  await readContext("eleves.gerer");
  return imports.IMPORT_FIELDS;
}

/** The template file to download (served by a route handler of the import page). */
export async function getImportTemplate(): Promise<{ fileName: string; contentType: string; content: string }> {
  await readContext("eleves.gerer");
  return imports.readImportTemplate();
}

export async function getImportHistory(): Promise<ImportSession[]> {
  const { tenant, now } = await readContext("eleves.gerer");
  return imports.readImportHistory(tenant, now);
}

/** Null when the session does not exist in this auto-école (or was discarded). */
export async function getImportSession(importId: string): Promise<ImportSession | null> {
  const { tenant, now } = await readContext("eleves.gerer");
  return imports.readImportSession(tenant, importId, now);
}

/** Codes: "format", "trop_lourd", "vide". */
export async function uploadImport(file: {
  name: string;
  type: string;
  bytes: Uint8Array;
}): Promise<ActionResult<{ session: ImportSession }>> {
  const { user, tenant, now } = await context();
  if (!can(user, "eleves.gerer")) return forbidden("eleves.gerer");
  const blocked = subscriptionBlock(tenant, now);
  if (blocked) return blocked;
  await settle();
  return imports.writeUploadImport(tenant, user, file, now);
}

/** Codes: "introuvable", "etape" (wrong status), "invalide" (with `fieldErrors` keyed by field). */
export async function mapImportColumns(importId: string, mapping: ImportMapping): Promise<ActionResult<{ session: ImportSession }>> {
  const { user, tenant, now } = await context();
  if (!can(user, "eleves.gerer")) return forbidden("eleves.gerer");
  const blocked = subscriptionBlock(tenant, now);
  if (blocked) return blocked;
  await settle();
  return imports.writeMapImport(tenant, user, importId, mapping, now);
}

export async function updateImportRow(
  importId: string,
  line: number,
  values: Partial<Record<ImportField, string>>,
): Promise<ActionResult<{ row: ImportRow }>> {
  const { user, tenant, now } = await context();
  if (!can(user, "eleves.gerer")) return forbidden("eleves.gerer");
  const blocked = subscriptionBlock(tenant, now);
  if (blocked) return blocked;
  await settle();
  return imports.writeUpdateImportRow(tenant, user, importId, line, values, now);
}

export async function commitImport(importId: string): Promise<ActionResult<{ session: ImportSession }>> {
  const { user, tenant, now } = await context();
  if (!can(user, "eleves.gerer")) return forbidden("eleves.gerer");
  const blocked = subscriptionBlock(tenant, now);
  if (blocked) return blocked;
  await settle();
  return imports.writeCommitImport(tenant, user, importId, now);
}

/** Code "annulation_impossible" once an imported student has lessons or payments. */
export async function undoImport(importId: string): Promise<ActionResult<{ session: ImportSession }>> {
  const { user, tenant, now } = await context();
  if (!can(user, "eleves.gerer")) return forbidden("eleves.gerer");
  const blocked = subscriptionBlock(tenant, now);
  if (blocked) return blocked;
  await settle();
  return imports.writeUndoImport(tenant, user, importId, now);
}

export async function discardImport(importId: string): Promise<ActionResult> {
  const { user, tenant, now } = await context();
  if (!can(user, "eleves.gerer")) return forbidden("eleves.gerer");
  const blocked = subscriptionBlock(tenant, now);
  if (blocked) return blocked;
  await settle();
  return imports.writeDiscardImport(tenant, user, importId, now);
}

// ---------------------------------------------------------------------------
// Settings: tariffs, rules, audit log

export async function getPricing(): Promise<PricingSettings> {
  const { tenant, now } = await readContext("tarifs.gerer");
  return settings.readPricing(tenant, now);
}

export async function updateRates(input: { hourlyRate: number; registrationFee: number }): Promise<ActionResult<{ pricing: PricingSettings }>> {
  const { user, tenant, now } = await context();
  if (!can(user, "tarifs.gerer")) return forbidden("tarifs.gerer");
  const blocked = subscriptionBlock(tenant, now);
  if (blocked) return blocked;
  await settle();
  return settings.writeRates(tenant, user, input, now);
}

/** Creates the package without `id`, updates it otherwise. */
export async function savePackageOffer(input: PackageOfferInput): Promise<ActionResult<{ offer: PackageOffer }>> {
  const { user, tenant, now } = await context();
  if (!can(user, "tarifs.gerer")) return forbidden("tarifs.gerer");
  const blocked = subscriptionBlock(tenant, now);
  if (blocked) return blocked;
  await settle();
  return settings.writePackageOffer(tenant, user, input, now);
}

/** Code "dernier_forfait": at least one package stays active. */
export async function setPackageOfferActive(offerId: string, active: boolean): Promise<ActionResult<{ offer: PackageOffer }>> {
  const { user, tenant, now } = await context();
  if (!can(user, "tarifs.gerer")) return forbidden("tarifs.gerer");
  const blocked = subscriptionBlock(tenant, now);
  if (blocked) return blocked;
  await settle();
  return settings.writePackageOfferActive(tenant, user, offerId, active, now);
}

export async function saveHourPack(input: HourPackInput): Promise<ActionResult<{ pack: HourPack }>> {
  const { user, tenant, now } = await context();
  if (!can(user, "tarifs.gerer")) return forbidden("tarifs.gerer");
  const blocked = subscriptionBlock(tenant, now);
  if (blocked) return blocked;
  await settle();
  return settings.writeHourPack(tenant, user, input, now);
}

export async function deleteHourPack(packId: string): Promise<ActionResult> {
  const { user, tenant, now } = await context();
  if (!can(user, "tarifs.gerer")) return forbidden("tarifs.gerer");
  const blocked = subscriptionBlock(tenant, now);
  if (blocked) return blocked;
  await settle();
  return settings.writeDeleteHourPack(tenant, user, packId, now);
}

export async function getRules(): Promise<SchoolRules> {
  const { tenant, now } = await readContext("regles.gerer");
  return settings.readRules(tenant, now);
}

export async function updateRules(rules: SchoolRules): Promise<ActionResult<{ rules: SchoolRules }>> {
  const { user, tenant, now } = await context();
  if (!can(user, "regles.gerer")) return forbidden("regles.gerer");
  const blocked = subscriptionBlock(tenant, now);
  if (blocked) return blocked;
  await settle();
  return settings.writeRules(tenant, user, rules, now);
}

const AUDIT_PERMISSION: Record<AuditEntry["category"], Permission> = {
  tarifs: "tarifs.gerer",
  regles: "regles.gerer",
  equipe: "equipe.gerer",
  abonnement: "abonnement.gerer",
  import: "eleves.gerer",
  eleves: "eleves.gerer",
};

/** Journal of sensitive changes, limited to the categories the person manages. */
export async function getAuditLog(categories: AuditEntry["category"][]): Promise<AuditEntry[]> {
  const { user, tenant, now } = await context();
  const allowed = categories.filter((c) => can(user, AUDIT_PERMISSION[c]));
  return allowed.length > 0 ? settings.readAuditLog(tenant, allowed, now) : [];
}

// ---------------------------------------------------------------------------
// Team and rights

export async function getTeam(): Promise<TeamMember[]> {
  const { user, tenant, now } = await readContext("equipe.gerer");
  return settings.readTeam(tenant, user, now);
}

/** Codes: "invalide", "doublon" (with `fieldErrors`), "quota_atteint" (instructors). */
export async function inviteTeamMember(input: TeamMemberInput): Promise<ActionResult<{ member: TeamMember }>> {
  const { user, tenant, now } = await context();
  if (!can(user, "equipe.gerer")) return forbidden("equipe.gerer");
  const blocked = subscriptionBlock(tenant, now);
  if (blocked) return blocked;
  await settle();
  return settings.writeInviteMember(tenant, user, input, now);
}

/** Refused (code "interdit") for oneself and for gérants. */
export async function updateMemberAccess(
  memberId: string,
  access: { permissions: Permission[]; office: string | null },
): Promise<ActionResult<{ member: TeamMember }>> {
  const { user, tenant, now } = await context();
  if (!can(user, "equipe.gerer")) return forbidden("equipe.gerer");
  const blocked = subscriptionBlock(tenant, now);
  if (blocked) return blocked;
  await settle();
  return settings.writeMemberAccess(tenant, user, memberId, access, now);
}

export async function setMemberStatus(memberId: string, status: "actif" | "desactive"): Promise<ActionResult<{ member: TeamMember }>> {
  const { user, tenant, now } = await context();
  if (!can(user, "equipe.gerer")) return forbidden("equipe.gerer");
  const blocked = subscriptionBlock(tenant, now);
  if (blocked) return blocked;
  await settle();
  return settings.writeMemberStatus(tenant, user, memberId, status, now);
}

export async function resendInvitation(memberId: string): Promise<ActionResult> {
  const { user, tenant, now } = await context();
  if (!can(user, "equipe.gerer")) return forbidden("equipe.gerer");
  const blocked = subscriptionBlock(tenant, now);
  if (blocked) return blocked;
  await settle();
  return settings.writeResendInvitation(tenant, user, memberId, now);
}

// ---------------------------------------------------------------------------
// Subscription of the school to the platform

export async function getSubscription(): Promise<Subscription> {
  const { tenant, now } = await readContext("abonnement.gerer");
  return settings.readSubscription(tenant, now);
}

/** Code "quota_depasse" when the usage exceeds a limit of the smaller plan. */
export async function changePlan(planId: string): Promise<ActionResult<{ subscription: Subscription }>> {
  const { user, tenant, now } = await context();
  if (!can(user, "abonnement.gerer")) return forbidden("abonnement.gerer");
  const blocked = subscriptionBlock(tenant, now);
  if (blocked) return blocked;
  await settle();
  return settings.writeChangePlan(tenant, user, planId, now);
}

/**
 * Plan, status (with the grace period and trial dates) and quota usage, for /gestion/abonnement.
 * Readable even while the school is suspended: it is the page where the gérant settles it.
 */
export async function getSubscriptionOverview(): Promise<SubscriptionOverview> {
  const { user, tenant, now } = await context();
  if (!can(user, "abonnement.gerer")) throw new Error(FORBIDDEN["abonnement.gerer"]);
  return platform.readSubscriptionOverview(tenant, now);
}

/**
 * "Mettre à jour le moyen de paiement" of an unpaid, read-only or suspended school. Mock of Stripe:
 * the new card is charged at once and the subscription is active again. Not subject to
 * subscriptionBlock (it is the way out). Code "rien_a_regulariser" when nothing is unpaid.
 */
export async function regularizeSubscription(): Promise<ActionResult<{ status: SubscriptionStatus }>> {
  const { user, tenant, now } = await context();
  if (!can(user, "abonnement.gerer")) return forbidden("abonnement.gerer");
  await settle();
  return platform.writeRegularize(user, tenant, now);
}
