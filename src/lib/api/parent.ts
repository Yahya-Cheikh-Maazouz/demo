// Parent-facing API (legal guardian of a minor student). Today it reads the in-memory mock;
// tomorrow each function becomes an HTTP call to the backend with the session cookie.
//
// Rights (spec, section 1): the parent reads the child's progress and planning, never books,
// pays for the child and decides on the child's personal data. Every function takes the child id
// asked for in the URL (?enfant=), or null for the first child; the API answers null (reads) or
// { ok: false, code: "introuvable" } (mutations) when that child is not linked to the signed-in
// parent of this school. Every function reads the session: render callers inside <Suspense>.

import { connection } from "next/server";
import * as parentSpace from "@/lib/mock/parent-space";
import { requireParent } from "@/lib/session";
import type {
  ActionResult,
  ChildAuthorisations,
  ChildDocuments,
  ChildLessons,
  ChildOverview,
  ChildPayments,
  ChildProgress,
  Consent,
  ConsentKey,
  GuardianValidation,
  Invoice,
  ParentAccount,
  PaymentMethod,
} from "@/lib/types";
import { subscriptionBlock } from "./subscription-status";

const MUTATION_LATENCY_MS = 250;
const settle = () => new Promise((resolve) => setTimeout(resolve, MUTATION_LATENCY_MS));

/** Child ids are opaque; anything that cannot be one is refused before reaching the API. */
const CHILD_ID_PATTERN = /^[\w-]{1,64}$/;

async function context() {
  const user = await requireParent();
  // Cookies alone can be resolved during a prerender; connection() makes "now" a request-time value.
  await connection();
  return { userId: user.id, tenant: user.tenantSlug, now: new Date() };
}

/** null or "" → the first child; a malformed id stays a refusal (never "the first child"). */
function childKey(childId: string | null): string | null {
  if (childId === null || childId === "") return null;
  return CHILD_ID_PATTERN.test(childId) ? childId : "\u0000";
}

// ---------------------------------------------------------------------------
// Reads

/** The parent's own account and the children linked to it. */
export async function getParentAccount(): Promise<ParentAccount> {
  const { userId, now } = await context();
  return parentSpace.readParentAccount(userId, now);
}

/** Next lesson, progress, balance and what waits for the parent. Null: child not linked. */
export async function getChildOverview(childId: string | null): Promise<ChildOverview | null> {
  const { userId, now } = await context();
  return parentSpace.readChildOverview(userId, childKey(childId), now);
}

/** `upcoming`: future, not cancelled, soonest first. `history`: everything else, latest first. */
export async function getChildLessons(childId: string | null): Promise<ChildLessons | null> {
  const { userId, now } = await context();
  return parentSpace.readChildLessons(userId, childKey(childId), now);
}

/** The child's skills record (livret) and the instructors' comments after lessons, read-only. */
export async function getChildProgress(childId: string | null): Promise<ChildProgress | null> {
  const { userId, now } = await context();
  return parentSpace.readChildProgress(userId, childKey(childId), now);
}

/** Balance (computed by the API), payment plan and invoices of the child. */
export async function getChildPayments(childId: string | null): Promise<ChildPayments | null> {
  const { userId, now } = await context();
  return parentSpace.readChildPayments(userId, childKey(childId), now);
}

/** Pieces of the child's file; identity pieces come with their status only. */
export async function getChildDocuments(childId: string | null): Promise<ChildDocuments | null> {
  const { userId, now } = await context();
  return parentSpace.readChildDocuments(userId, childKey(childId), now);
}

/** Authorisations given by the parent and items proposed by the school. */
export async function getChildAuthorisations(childId: string | null): Promise<ChildAuthorisations | null> {
  const { userId, now } = await context();
  return parentSpace.readChildAuthorisations(userId, childKey(childId), now);
}

// ---------------------------------------------------------------------------
// Mutations. Codes: "introuvable" (child not linked), "lecture_seule" / "suspendu" (school's
// subscription), plus those listed on each function.

/** Records the parent's decision, with its date and author. Code "invalide" for an unknown key. */
export async function setChildConsent(
  childId: string,
  key: ConsentKey,
  granted: boolean,
): Promise<ActionResult<{ consent: Consent }>> {
  const { userId, tenant, now } = await context();
  const blocked = subscriptionBlock(tenant, now);
  if (blocked) return blocked;
  await settle();
  return parentSpace.writeConsent(userId, childKey(childId) ?? "", key, granted, now);
}

/** Accepts or refuses an item proposed by the school. Codes "deja_traitee", "formule_retiree". */
export async function decideChildValidation(
  childId: string,
  validationId: string,
  decision: "accepte" | "refuse",
): Promise<ActionResult<{ validation: GuardianValidation }>> {
  const { userId, tenant, now } = await context();
  const blocked = subscriptionBlock(tenant, now);
  if (blocked) return blocked;
  await settle();
  return parentSpace.writeValidationDecision(userId, childKey(childId) ?? "", validationId, decision, now);
}

/**
 * Mock of a Stripe payment of the child's next instalment: succeeds at once and returns the
 * invoice. Codes "deja_reglee", "ordre" (an older instalment is still unpaid).
 */
export async function payChildInstallment(
  childId: string,
  installmentId: string,
  method: Extract<PaymentMethod, "carte" | "klarna">,
): Promise<ActionResult<{ invoice: Invoice; hours: number }>> {
  const { userId, tenant, now } = await context();
  const blocked = subscriptionBlock(tenant, now);
  if (blocked) return blocked;
  await settle();
  return parentSpace.writePayChildInstallment(userId, childKey(childId) ?? "", installmentId, method, now);
}

/** RGPD: the export of the parent's own data is prepared by the backend and sent by e-mail. */
export async function requestParentDataExport(): Promise<ActionResult> {
  const { tenant, now } = await context();
  const blocked = subscriptionBlock(tenant, now);
  if (blocked) return blocked;
  await settle();
  return { ok: true };
}

/** RGPD: the school processes the request; invoices are kept for the legal retention period. */
export async function requestParentAccountDeletion(): Promise<ActionResult<{ requestedAt: string }>> {
  const { userId, tenant, now } = await context();
  const blocked = subscriptionBlock(tenant, now);
  if (blocked) return blocked;
  await settle();
  return parentSpace.writeParentDeletionRequest(userId, now);
}
