// Mock of the platform back-office (super-admin): registry of the auto-écoles, creation of a school
// in one step, subscription states (essai → actif → impayé → lecture seule → suspendu) and the
// platform journal. Rights are checked by src/lib/api/admin.ts (and gestion.ts for the gérant's
// regularization); this file validates the data like the API will.
//
// The platform only reads usage figures of a school (counts, dates, quotas): never its business
// content (students, notes, payments).

import { PLATFORM_SUBDOMAIN } from "@/lib/auth-constants";
import type {
  ActionResult,
  NewSchoolInput,
  PlatformAuditEntry,
  PlatformOverview,
  PlatformPlan,
  PlatformSchool,
  PlatformSchoolDetail,
  SchoolStatusAction,
  SubscriptionOverview,
  SubscriptionStatus,
  User,
} from "@/lib/types";
import { PLATFORM_PLANS, USERS, type MockUser } from "./data";
import * as store from "./store";

/** Unpaid subscription: the space stays usable this long, then becomes read-only (spec, section 2). */
export const GRACE_DAYS = 14;
const DAY_MS = 86_400_000;
const BILLING_PERIOD_DAYS = 30;

/** Subdomains no auto-école can take. */
export const RESERVED_SUBDOMAINS = [PLATFORM_SUBDOMAIN, "www", "api", "app", "static"];

/** Actor of the platform's entries in a school's own journal: the school does not see who at the platform acted. */
const PLATFORM_ACTOR = "Plateforme";

const STATUS_LABELS: Record<SubscriptionStatus, string> = {
  essai: "Essai",
  actif: "Actif",
  impaye: "Impayé",
  lecture_seule: "Lecture seule",
  suspendu: "Suspendu",
};

const TRANSITIONS: Record<SubscriptionStatus, SchoolStatusAction[]> = {
  essai: ["reactiver", "echec_paiement", "suspendre"],
  actif: ["echec_paiement", "suspendre"],
  impaye: ["reactiver", "fin_delai_grace", "suspendre"],
  lecture_seule: ["reactiver", "suspendre"],
  suspendu: ["reactiver"],
};

const TARGET: Record<SchoolStatusAction, SubscriptionStatus> = {
  echec_paiement: "impaye",
  fin_delai_grace: "lecture_seule",
  suspendre: "suspendu",
  reactiver: "actif",
};

const ACTION_REASONS: Record<SchoolStatusAction, string> = {
  echec_paiement: "paiement refusé, gérant prévenu",
  fin_delai_grace: `fin du délai de grâce de ${GRACE_DAYS} jours`,
  suspendre: "suspension par la plateforme",
  reactiver: "paiement reçu",
};

/** Platform data of each school (fictional SIRET numbers for the demo schools). */
type SchoolRecord = { siret: string; createdAt: string };

const DEMO_SCHOOLS: Record<string, SchoolRecord> = {
  dupont: { siret: "82415769300014", createdAt: "2025-09-01T07:30:00.000Z" },
  "conduite-plus": { siret: "90132846500025", createdAt: "2026-02-16T08:15:00.000Z" },
};

type GlobalPlatform = {
  __aePlatformSchools?: Map<string, SchoolRecord>;
  __aePlatformJournal?: { seq: number; entries: PlatformAuditEntry[] };
};
const g = globalThis as unknown as GlobalPlatform;
const schools = (g.__aePlatformSchools ??= new Map(Object.entries(DEMO_SCHOOLS)));
const journal = (g.__aePlatformJournal ??= {
  seq: 0,
  entries: Object.entries(DEMO_SCHOOLS)
    .map(([slug, record], index) => ({
      id: `pj-demo-${index + 1}`,
      at: record.createdAt,
      actor: "Camille Perrin",
      schoolSlug: slug,
      schoolName: store.findTenantBySlug(slug)?.name ?? slug,
      summary: "Auto-école créée",
    }))
    // Newest first, like every later entry (unshift).
    .sort((a, b) => b.at.localeCompare(a.at)),
});

const fullName = (u: Pick<User, "firstName" | "lastName">) => `${u.firstName} ${u.lastName}`.trim();
const addDaysIso = (now: Date, days: number) => new Date(now.getTime() + days * DAY_MS).toISOString();

function logPlatform(actor: string, slug: string, summary: string, now: Date): PlatformAuditEntry {
  const entry: PlatformAuditEntry = {
    id: `pj-${++journal.seq}`,
    at: now.toISOString(),
    actor,
    schoolSlug: slug,
    schoolName: store.findTenantBySlug(slug)?.name ?? slug,
    summary,
  };
  journal.entries.unshift(entry);
  return entry;
}

function planById(planId: string): PlatformPlan | undefined {
  return PLATFORM_PLANS.find((p) => p.id === planId);
}

// ---------------------------------------------------------------------------
// Reads (usage figures only)

function usersOf(t: store.TenantState): PlatformSchool["users"] {
  const team = [...t.team.values()].filter((m) => m.status !== "desactive").length;
  const students = [...t.students.values()].filter((s) => !s.profile.archived).length;
  const parents = USERS.filter((u) => u.tenantSlug === t.slug && u.role === "parent").length;
  return { total: team + students + parents, team, students, parents };
}

/** Latest sign-in or change made by someone of the school (the platform's own actions do not count). */
function lastActivityOf(t: store.TenantState): string | null {
  const dates = [
    t.lastSignInAt,
    ...[...t.team.values()].map((m) => m.lastActiveAt),
    t.audit.find((e) => e.actor !== PLATFORM_ACTOR)?.at,
  ].filter((d): d is string => Boolean(d));
  return dates.length > 0 ? dates.reduce((a, b) => (a > b ? a : b)) : null;
}

function schoolRow(slug: string, now: Date): Omit<PlatformSchool, "url"> | null {
  const tenant = store.findTenantBySlug(slug);
  if (!tenant) return null;
  const t = store.tenantState(slug, now);
  const users = usersOf(t);
  return {
    slug,
    name: tenant.name,
    plan: store.planOf(t),
    status: t.subscription.status,
    users,
    activeStudents: users.students,
    lastActivityAt: lastActivityOf(t),
    createdAt: schools.get(slug)?.createdAt ?? now.toISOString(),
  };
}

export function readOverview(now: Date): Omit<PlatformOverview, "schools"> & { schools: Array<Omit<PlatformSchool, "url">> } {
  const rows = store
    .listTenants()
    .map((t) => schoolRow(t.slug, now))
    .filter((r): r is Omit<PlatformSchool, "url"> => r !== null);
  const countsByStatus: Record<SubscriptionStatus, number> = { essai: 0, actif: 0, impaye: 0, lecture_seule: 0, suspendu: 0 };
  for (const r of rows) countsByStatus[r.status]++;
  const sum = (statuses: SubscriptionStatus[]) =>
    rows.filter((r) => statuses.includes(r.status)).reduce((total, r) => total + r.plan.monthlyPrice, 0);
  return {
    now: now.toISOString(),
    schools: rows,
    mrr: sum(["actif"]),
    unpaidMrr: sum(["impaye", "lecture_seule"]),
    countsByStatus,
  };
}

export function readSchoolDetail(slug: string, now: Date): Omit<PlatformSchoolDetail, "url"> | null {
  const row = schoolRow(slug, now);
  if (!row) return null;
  const t = store.tenantState(slug, now);
  const gerant = USERS.find((u) => u.tenantSlug === slug && u.role === "gerant");
  const { subscription } = t;
  return {
    ...row,
    now: now.toISOString(),
    siret: schools.get(slug)?.siret ?? "",
    gerantEmail: gerant?.email ?? "",
    renewsAt: subscription.renewsAt,
    trialEndsAt: subscription.trialEndsAt ?? null,
    unpaidSince: subscription.unpaidSince ?? null,
    graceEndsAt: subscription.graceEndsAt ?? null,
    quotas: store.readQuotas(slug, now),
    plans: PLATFORM_PLANS,
    actions: TRANSITIONS[subscription.status],
    journal: journal.entries.filter((e) => e.schoolSlug === slug),
  };
}

/** Whole platform journal, newest first. */
export function readJournal(limit: number): PlatformAuditEntry[] {
  return journal.entries.slice(0, limit);
}

export function readPlans(): PlatformPlan[] {
  return PLATFORM_PLANS;
}

/** True when no school uses this subdomain and it is not reserved. */
export function isSubdomainFree(slug: string): boolean {
  return !RESERVED_SUBDOMAINS.includes(slug) && !store.findTenantBySlug(slug);
}

// ---------------------------------------------------------------------------
// Creation of a school

const NAME_MAX = 80;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
/** 3 to 30 characters, lowercase letters, digits and hyphens, no hyphen at either end. */
const SUBDOMAIN_PATTERN = /^[a-z0-9](?:[a-z0-9-]{1,28})[a-z0-9]$/;
const TRIAL_DAYS: readonly number[] = [0, 14, 30];

/** SIRET: 14 digits whose Luhn sum is a multiple of 10. */
export function isValidSiret(siret: string): boolean {
  if (!/^\d{14}$/.test(siret)) return false;
  let sum = 0;
  for (let i = 0; i < 14; i++) {
    let digit = Number(siret[13 - i]);
    if (i % 2 === 1) {
      digit *= 2;
      if (digit > 9) digit -= 9;
    }
    sum += digit;
  }
  return sum % 10 === 0;
}

function initialsOf(name: string): string {
  const words = name.split(/[\s-]+/).filter((w) => /[a-zà-ÿ0-9]/i.test(w));
  const letters = (words.length >= 2 ? [words[0][0], words[1][0]] : [...(words[0] ?? "AE").slice(0, 2)]).join("");
  return letters.toUpperCase();
}

const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

/** "jean.dupont@…" → Jean Dupont. The gérant completes their profile at the first sign-in. */
function nameFromEmail(email: string): { firstName: string; lastName: string } {
  const parts = email.split("@")[0].split(/[._-]+/).filter(Boolean).map(capitalize);
  if (parts.length >= 2) return { firstName: parts[0], lastName: parts.slice(1).join(" ") };
  return { firstName: parts[0] ?? "Gérant", lastName: "" };
}

/** 12 characters without look-alikes (0/O, 1/l/I), in three groups: "hX7k-2mPq-9TzR". */
function provisionalPassword(): string {
  const alphabet = "abcdefghijkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const bytes = crypto.getRandomValues(new Uint8Array(12));
  const chars = [...bytes].map((b) => alphabet[b % alphabet.length]);
  return [chars.slice(0, 4), chars.slice(4, 8), chars.slice(8)].map((group) => group.join("")).join("-");
}

/**
 * Creates the school with the default settings (tariffs, rules, one office) and its gérant's
 * account, invited with a provisional password. Code "invalide" with `fieldErrors` keyed by input
 * name; "sous_domaine_pris" when the subdomain is taken (fieldErrors.slug).
 */
export function writeCreateSchool(
  actor: User,
  input: NewSchoolInput,
  now: Date,
): ActionResult<{ slug: string; name: string; gerantEmail: string; provisionalPassword: string }> {
  const name = input.name.trim().replace(/\s+/g, " ");
  const siret = input.siret.replace(/\s/g, "");
  const gerantEmail = input.gerantEmail.trim().toLowerCase();
  const slug = input.slug.trim().toLowerCase();
  const plan = planById(input.planId);

  const fieldErrors: Record<string, string> = {};
  if (name.length < 2) fieldErrors.name = "Indiquez le nom de l'auto-école.";
  else if (name.length > NAME_MAX) fieldErrors.name = `Le nom ne doit pas dépasser ${NAME_MAX} caractères.`;
  if (!/^\d{14}$/.test(siret)) fieldErrors.siret = "Le SIRET compte 14 chiffres.";
  else if (!isValidSiret(siret)) fieldErrors.siret = "Ce numéro SIRET n'est pas valide : vérifiez les chiffres.";
  if (!EMAIL_PATTERN.test(gerantEmail)) fieldErrors.gerantEmail = "Saisissez une adresse e-mail valide, par exemple nom@exemple.fr.";
  if (!plan) fieldErrors.planId = "Choisissez une formule.";
  if (!SUBDOMAIN_PATTERN.test(slug)) {
    fieldErrors.slug =
      "De 3 à 30 caractères : lettres minuscules sans accent, chiffres et tirets, sans tiret au début ni à la fin.";
  } else if (RESERVED_SUBDOMAINS.includes(slug)) {
    fieldErrors.slug = `«\u00a0${slug}\u00a0» est réservé à la plateforme. Choisissez un autre sous-domaine.`;
  }
  if (!TRIAL_DAYS.includes(input.trialDays)) fieldErrors.trialDays = "Choisissez la durée de l'essai.";
  if (Object.keys(fieldErrors).length > 0 || !plan) {
    return { ok: false, code: "invalide", error: "Certains champs sont à corriger.", fieldErrors };
  }
  if (store.findTenantBySlug(slug)) {
    return {
      ok: false,
      code: "sous_domaine_pris",
      error: "Ce sous-domaine est déjà utilisé.",
      fieldErrors: { slug: `«\u00a0${slug}\u00a0» est déjà utilisé par une autre auto-école.` },
    };
  }

  const password = provisionalPassword();
  const gerant: MockUser = {
    id: `u-gerant-${slug}`,
    tenantSlug: slug,
    role: "gerant",
    ...nameFromEmail(gerantEmail),
    email: gerantEmail,
    // TOTP enrolment at the first sign-in is not built in the front yet: the gérant activates it later.
    twoFactorEnabled: false,
    password,
  };
  const trial = input.trialDays > 0;
  store.registerTenant({
    tenant: {
      slug,
      name,
      logoInitials: initialsOf(name),
      // Default brand until the gérant sets theirs in the start-up wizard.
      brandColor: "#0f766e",
      city: "",
      phone: "",
      email: gerantEmail,
    },
    gerant,
    subscription: {
      planId: plan.id,
      status: trial ? "essai" : "actif",
      renewsAt: addDaysIso(now, trial ? input.trialDays : BILLING_PERIOD_DAYS),
      trialEndsAt: trial ? addDaysIso(now, input.trialDays) : null,
      unpaidSince: null,
      graceEndsAt: null,
    },
    offices: ["Agence principale"],
    createdAt: now.toISOString(),
  });
  schools.set(slug, { siret, createdAt: now.toISOString() });
  // Seeds the (empty) school at once, so its first page loads like any other.
  store.tenantState(slug, now);

  logPlatform(
    fullName(actor),
    slug,
    `Auto-école créée · formule ${plan.name} · ${trial ? `essai de ${input.trialDays} jours` : "sans essai"} · gérant invité (${gerantEmail})`,
    now,
  );
  return { ok: true, data: { slug, name, gerantEmail, provisionalPassword: password } };
}

// ---------------------------------------------------------------------------
// Subscription states

function applyStatus(t: store.TenantState, action: SchoolStatusAction, now: Date) {
  const sub = t.subscription;
  sub.status = TARGET[action];
  if (action === "echec_paiement") {
    sub.unpaidSince = now.toISOString();
    sub.graceEndsAt = addDaysIso(now, GRACE_DAYS);
  } else if (action === "fin_delai_grace") {
    sub.graceEndsAt = now.toISOString();
  } else if (action === "reactiver") {
    sub.unpaidSince = null;
    sub.graceEndsAt = null;
    sub.trialEndsAt = null;
    sub.renewsAt = addDaysIso(now, BILLING_PERIOD_DAYS);
  }
}

/** Code "introuvable"; "transition" when the action is not possible from the current status. */
export function writeSchoolStatus(
  actor: User,
  slug: string,
  action: SchoolStatusAction,
  now: Date,
): ActionResult<{ status: SubscriptionStatus }> {
  if (!store.findTenantBySlug(slug)) return { ok: false, code: "introuvable", error: "Cette auto-école n'existe pas." };
  const t = store.tenantState(slug, now);
  const from = t.subscription.status;
  if (!TRANSITIONS[from].includes(action)) {
    return {
      ok: false,
      code: "transition",
      error: `Action impossible : l'abonnement est déjà «\u00a0${STATUS_LABELS[from]}\u00a0». Rechargez la page.`,
    };
  }
  applyStatus(t, action, now);
  const change = `Statut : ${STATUS_LABELS[from]} → ${STATUS_LABELS[TARGET[action]]}`;
  logPlatform(fullName(actor), slug, `${change} (${ACTION_REASONS[action]})`, now);
  store.logAudit(t, PLATFORM_ACTOR, "abonnement", `Abonnement — ${change} (${ACTION_REASONS[action]})`, now);
  return { ok: true, data: { status: t.subscription.status } };
}

/** Code "quota_depasse" when the usage exceeds a limit of the new plan (existing data is never blocked). */
export function writeSchoolPlan(actor: User, slug: string, planId: string, now: Date): ActionResult<{ plan: PlatformPlan }> {
  if (!store.findTenantBySlug(slug)) return { ok: false, code: "introuvable", error: "Cette auto-école n'existe pas." };
  const plan = planById(planId);
  if (!plan) return { ok: false, code: "invalide", error: "Choisissez une formule.", fieldErrors: { planId: "Choisissez une formule." } };
  const t = store.tenantState(slug, now);
  const current = store.planOf(t);
  if (current.id === plan.id) {
    return { ok: false, code: "invalide", error: "C'est déjà la formule de l'auto-école.", fieldErrors: { planId: "C'est déjà la formule actuelle." } };
  }
  const over = store.readQuotas(slug, now).filter((q) => q.used > plan.limits[q.key]);
  if (over.length > 0) {
    const list = over.map((q) => `${q.label.toLowerCase()} : ${q.used} pour ${plan.limits[q.key]} maximum`).join(", ");
    return {
      ok: false,
      code: "quota_depasse",
      error: `La formule ${plan.name} ne suffit pas à l'usage actuel (${list}).`,
      fieldErrors: { planId: `Usage actuel trop élevé pour ${plan.name} (${list}).` },
    };
  }
  t.subscription.planId = plan.id;
  const change = `Formule : ${current.name} → ${plan.name}`;
  logPlatform(fullName(actor), slug, change, now);
  store.logAudit(t, PLATFORM_ACTOR, "abonnement", `Abonnement — ${change}`, now);
  return { ok: true, data: { plan } };
}

// ---------------------------------------------------------------------------
// The gérant's side (/gestion/abonnement)

export function readSubscriptionOverview(slug: string, now: Date): SubscriptionOverview {
  const t = store.tenantState(slug, now);
  const { subscription } = t;
  return {
    now: now.toISOString(),
    plan: store.planOf(t),
    status: subscription.status,
    renewsAt: subscription.renewsAt,
    trialEndsAt: subscription.trialEndsAt ?? null,
    unpaidSince: subscription.unpaidSince ?? null,
    graceEndsAt: subscription.graceEndsAt ?? null,
    quotas: store.readQuotas(slug, now),
  };
}

const REGULARIZABLE: SubscriptionStatus[] = ["impaye", "lecture_seule", "suspendu"];

/**
 * Mock of Stripe: the new payment method is charged at once and the subscription is active again.
 * Code "rien_a_regulariser" when the subscription is not unpaid.
 */
export function writeRegularize(actor: User, slug: string, now: Date): ActionResult<{ status: SubscriptionStatus }> {
  const t = store.tenantState(slug, now);
  const from = t.subscription.status;
  if (!REGULARIZABLE.includes(from)) {
    return { ok: false, code: "rien_a_regulariser", error: "L'abonnement est à jour : il n'y a rien à régulariser." };
  }
  applyStatus(t, "reactiver", now);
  const change = `Statut : ${STATUS_LABELS[from]} → ${STATUS_LABELS.actif}`;
  logPlatform(fullName(actor), slug, `${change} (moyen de paiement mis à jour par le gérant, paiement reçu)`, now);
  store.logAudit(t, fullName(actor), "abonnement", `Abonnement — moyen de paiement mis à jour, paiement reçu (${change})`, now);
  return { ok: true, data: { status: t.subscription.status } };
}
