// Mock of the backend for the school's settings: tariffs and packages, rules, team and rights,
// subscription to the platform, and the audit log of these sensitive changes.
// Rights are checked by src/lib/api/gestion.ts; this file validates the data like the API will.
// Every successful write adds an audit entry (logAudit in store.ts) describing the change in
// French, e.g. "Tarif horaire : 60 € → 62 €", "Lucie Bernard : droit « Valider la caisse » ouvert".

import type {
  ActionResult,
  AuditEntry,
  HourPack,
  HourPackInput,
  PackageOffer,
  PackageOfferInput,
  Permission,
  PricingSettings,
  SchoolRules,
  Subscription,
  TeamMember,
  TeamMemberInput,
  User,
} from "@/lib/types";

// ---------------------------------------------------------------------------
// Tariffs and packages

export function readPricing(tenantSlug: string, now: Date): PricingSettings {
  void tenantSlug;
  void now;
  throw new Error("Not implemented");
}

/** Amounts in euros, > 0 and ≤ 500 for the hourly rate, ≥ 0 and ≤ 1000 for the fee (code "invalide" + fieldErrors). */
export function writeRates(
  tenantSlug: string,
  actor: User,
  input: { hourlyRate: number; registrationFee: number },
  now: Date,
): ActionResult<{ pricing: PricingSettings }> {
  void tenantSlug;
  void actor;
  void input;
  void now;
  throw new Error("Not implemented");
}

/**
 * Creates (no id) or updates a package. Name unique in the school, 1–100 hours, price > 0.
 * Students already enrolled keep the package as it was when they enrolled.
 */
export function writePackageOffer(
  tenantSlug: string,
  actor: User,
  input: PackageOfferInput,
  now: Date,
): ActionResult<{ offer: PackageOffer }> {
  void tenantSlug;
  void actor;
  void input;
  void now;
  throw new Error("Not implemented");
}

/** At least one package must stay active (code "dernier_forfait"). */
export function writePackageOfferActive(
  tenantSlug: string,
  actor: User,
  offerId: string,
  active: boolean,
  now: Date,
): ActionResult<{ offer: PackageOffer }> {
  void tenantSlug;
  void actor;
  void offerId;
  void active;
  void now;
  throw new Error("Not implemented");
}

/** Creates or updates an hour pack sold online. At most one highlighted pack (highlighting one clears the others). */
export function writeHourPack(tenantSlug: string, actor: User, input: HourPackInput, now: Date): ActionResult<{ pack: HourPack }> {
  void tenantSlug;
  void actor;
  void input;
  void now;
  throw new Error("Not implemented");
}

export function writeDeleteHourPack(tenantSlug: string, actor: User, packId: string, now: Date): ActionResult {
  void tenantSlug;
  void actor;
  void packId;
  void now;
  throw new Error("Not implemented");
}

// ---------------------------------------------------------------------------
// Rules

export function readRules(tenantSlug: string, now: Date): SchoolRules {
  void tenantSlug;
  void now;
  throw new Error("Not implemented");
}

/**
 * Replaces the rules. Bounds: notice 0–168 h, free cancellation 0–168 h, 1–14 lessons a week,
 * low balance 0–10 h, cash threshold 0–10 000 €. New values apply to lessons booked from now on.
 */
export function writeRules(tenantSlug: string, actor: User, rules: SchoolRules, now: Date): ActionResult<{ rules: SchoolRules }> {
  void tenantSlug;
  void actor;
  void rules;
  void now;
  throw new Error("Not implemented");
}

/** Entries of these categories, newest first, at most 50. */
export function readAuditLog(tenantSlug: string, categories: AuditEntry["category"][], now: Date): AuditEntry[] {
  void tenantSlug;
  void categories;
  void now;
  throw new Error("Not implemented");
}

// ---------------------------------------------------------------------------
// Team and rights

/** Gérants first, then assistantes, then instructors; deactivated people last. */
export function readTeam(tenantSlug: string, actor: User, now: Date): TeamMember[] {
  void tenantSlug;
  void actor;
  void now;
  throw new Error("Not implemented");
}

/**
 * Invites an assistante or an instructor (status "invitation", e-mail sent by the API). E-mail
 * unique among the team; instructors count in the plan's quota (code "quota_atteint").
 */
export function writeInviteMember(
  tenantSlug: string,
  actor: User,
  input: TeamMemberInput,
  now: Date,
): ActionResult<{ member: TeamMember }> {
  void tenantSlug;
  void actor;
  void input;
  void now;
  throw new Error("Not implemented");
}

/**
 * Sets the effective rights and the office of a person: stored as overrides of the role defaults
 * (granted / revoked), so the person's next request already uses them. Refused for oneself and
 * for gérants (code "interdit").
 */
export function writeMemberAccess(
  tenantSlug: string,
  actor: User,
  memberId: string,
  access: { permissions: Permission[]; office: string | null },
  now: Date,
): ActionResult<{ member: TeamMember }> {
  void tenantSlug;
  void actor;
  void memberId;
  void access;
  void now;
  throw new Error("Not implemented");
}

/**
 * Deactivates (their session stops at once, nothing is deleted) or reactivates a person.
 * Refused for oneself and for gérants; reactivating an instructor counts in the quota.
 */
export function writeMemberStatus(
  tenantSlug: string,
  actor: User,
  memberId: string,
  status: "actif" | "desactive",
  now: Date,
): ActionResult<{ member: TeamMember }> {
  void tenantSlug;
  void actor;
  void memberId;
  void status;
  void now;
  throw new Error("Not implemented");
}

/** Sends the invitation again (status "invitation" only). */
export function writeResendInvitation(tenantSlug: string, actor: User, memberId: string, now: Date): ActionResult {
  void tenantSlug;
  void actor;
  void memberId;
  void now;
  throw new Error("Not implemented");
}

// ---------------------------------------------------------------------------
// Subscription

export function readSubscription(tenantSlug: string, now: Date): Subscription {
  void tenantSlug;
  void now;
  throw new Error("Not implemented");
}

/**
 * Changes the plan at once (the real API goes through Stripe Billing). A smaller plan is refused
 * while the usage exceeds one of its limits (code "quota_depasse", the error names the limits).
 */
export function writeChangePlan(tenantSlug: string, actor: User, planId: string, now: Date): ActionResult<{ subscription: Subscription }> {
  void tenantSlug;
  void actor;
  void planId;
  void now;
  throw new Error("Not implemented");
}
