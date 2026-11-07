// Platform back-office API (super-admin), served on the platform host only (admin.<domaine>).
// Today it reads the in-memory mock; tomorrow each function becomes an HTTP call to the backend.
//
// Every function checks the super-admin session (404 on a school's host). The platform only
// gets usage figures of a school: never its students, notes or payments.
// All functions read the session (cookies): render their callers inside <Suspense>.

import { headers } from "next/headers";
import { connection } from "next/server";
import { PLATFORM_SUBDOMAIN } from "@/lib/auth-constants";
import * as platform from "@/lib/mock/platform";
import { requireSuperAdmin } from "@/lib/session";
import type {
  ActionResult,
  CreatedSchool,
  NewSchoolInput,
  PlatformAuditEntry,
  PlatformOverview,
  PlatformPlan,
  PlatformSchoolDetail,
  SchoolStatusAction,
  SubscriptionStatus,
  User,
} from "@/lib/types";

const MUTATION_LATENCY_MS = 250;
const settle = () => new Promise((resolve) => setTimeout(resolve, MUTATION_LATENCY_MS));

async function context() {
  const user = await requireSuperAdmin();
  // Cookies alone can be resolved during a prerender; connection() makes "now" a request-time value.
  await connection();
  return { user, now: new Date() };
}

/**
 * Address of a school's space, built from the platform host: admin.localhost:3000 gives
 * http://<slug>.localhost:3000, admin.<domaine> gives https://<slug>.<domaine>.
 */
async function schoolAddress(): Promise<{ proto: string; base: string }> {
  const h = await headers();
  const host = h.get("host") ?? "";
  const hostname = host.split(":")[0];
  const local = hostname === "localhost" || hostname.endsWith(".localhost");
  const proto = h.get("x-forwarded-proto")?.split(",")[0] ?? (local ? "http" : "https");
  const prefix = `${PLATFORM_SUBDOMAIN}.`;
  const base = host.startsWith(prefix) ? host.slice(prefix.length) : (process.env.NEXT_PUBLIC_ROOT_DOMAIN ?? host);
  return { proto, base };
}

async function schoolUrl(): Promise<(slug: string) => string> {
  const { proto, base } = await schoolAddress();
  return (slug) => `${proto}://${slug}.${base}`;
}

/** Domain after the subdomain of every school, e.g. "localhost:3000" or "<domaine>" (creation form). */
export async function getSchoolsDomain(): Promise<string> {
  await context();
  return (await schoolAddress()).base;
}

/** The signed-in super-admin. */
export async function getSuperAdmin(): Promise<User> {
  return (await context()).user;
}

/** Every school with its plan, status and usage, plus the revenue and status totals. */
export async function getPlatformOverview(): Promise<PlatformOverview> {
  const { now } = await context();
  const url = await schoolUrl();
  const overview = platform.readOverview(now);
  return { ...overview, schools: overview.schools.map((s) => ({ ...s, url: url(s.slug) })) };
}

/** Null when no school has this subdomain. */
export async function getPlatformSchool(slug: string): Promise<PlatformSchoolDetail | null> {
  const { now } = await context();
  const url = await schoolUrl();
  const detail = platform.readSchoolDetail(slug, now);
  return detail && { ...detail, url: url(detail.slug) };
}

export async function getPlatformPlans(): Promise<PlatformPlan[]> {
  await context();
  return platform.readPlans();
}

/** Latest entries of the platform journal (every school), newest first. */
export async function getPlatformJournal(limit = 20): Promise<PlatformAuditEntry[]> {
  await context();
  return platform.readJournal(limit);
}

/** Days of the grace period before an unpaid school becomes read-only. */
export const GRACE_DAYS = platform.GRACE_DAYS;

// ---------------------------------------------------------------------------
// Mutations

/**
 * Creates the school and its gérant's account. Codes: "invalide" and "sous_domaine_pris" (with
 * `fieldErrors` keyed by input name). The provisional password is only returned here.
 */
export async function createSchool(input: NewSchoolInput): Promise<ActionResult<{ school: CreatedSchool }>> {
  const { user, now } = await context();
  await settle();
  const result = platform.writeCreateSchool(user, input, now);
  if (!result.ok) return result;
  const url = await schoolUrl();
  return { ok: true, data: { school: { ...result.data, url: url(result.data.slug) } } };
}

/** Codes: "introuvable", "transition" (not possible from the current status). */
export async function setSchoolStatus(slug: string, action: SchoolStatusAction): Promise<ActionResult<{ status: SubscriptionStatus }>> {
  const { user, now } = await context();
  await settle();
  return platform.writeSchoolStatus(user, slug, action, now);
}

/** Codes: "introuvable", "invalide", "quota_depasse" (usage above a limit of the new plan). */
export async function changeSchoolPlan(slug: string, planId: string): Promise<ActionResult<{ plan: PlatformPlan }>> {
  const { user, now } = await context();
  await settle();
  return platform.writeSchoolPlan(user, slug, planId, now);
}
