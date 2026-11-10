// Mock of the backend for the parent space (legal guardian of a minor student): children linked to
// the account, authorisations, validations proposed by the school, payment of the child's plan.
// Pages go through src/lib/api/parent.ts, never this file. The API layer checks the session; this
// module checks the link between the parent and the child on every call. Reads never write: the
// demo data is seeded with the school's state (guardian.ts), decisions are written by mutations.

import { parisTime } from "@/lib/paris-time";
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
  GuardianChild,
  GuardianValidation,
  Installment,
  Invoice,
  ParentAccount,
  PaymentMethod,
  RequiredDocument,
} from "@/lib/types";
import { GUARDIANS } from "./data";
import { CONSENT_KEYS, REQUIRED_CONSENTS, ensureGuardian, guardianOf, type GuardianRecord } from "./guardian";
import {
  ageAt,
  computeBalance,
  findUserById,
  fullName,
  logAudit,
  recordPayment,
  tenantState,
  type StudentRecord,
  type TenantState,
} from "./store";
import { readLivretFor } from "./student-space";

const NOT_FOUND = { ok: false as const, code: "introuvable", error: "Cet élève n'est pas rattaché à votre compte." };

/** How each decision reads in the school's journal. */
const CONSENT_AUDIT_LABEL: Record<ConsentKey, string> = {
  photos: "photos et vidéos pendant les leçons",
  contact_telephone: "contact téléphonique direct par le moniteur",
  rgpd: "consentement RGPD",
  communications: "communications par e-mail et SMS",
};

// ---------------------------------------------------------------------------
// Parent account (deletion request), kept apart from the school's state

type AccountRecord = { deletionRequestedAt?: string };
const globalStore = globalThis as unknown as { __aeParentAccounts?: Map<string, AccountRecord> };
const accounts = (globalStore.__aeParentAccounts ??= new Map<string, AccountRecord>());

function parentOf(parentId: string) {
  const user = findUserById(parentId);
  if (!user || user.role !== "parent") throw new Error(`Unknown parent ${parentId}`);
  return user;
}

// ---------------------------------------------------------------------------
// Link between the parent and the children

/**
 * Children of the parent in the parent's own school (never another school's). The link of the
 * account (GUARDIANS) only counts while the school's file agrees: a minor, not archived, whose
 * legal guardian is this parent (same e-mail). A guardian removed or changed in the file, an
 * archived file or a child who came of age closes the access.
 */
function childrenOf(parentId: string, now: Date): { t: TenantState; records: StudentRecord[] } {
  const parent = parentOf(parentId);
  const t = tenantState(parent.tenantSlug, now);
  const email = parent.email.trim().toLowerCase();
  const records = (GUARDIANS[parentId] ?? [])
    .map((id) => t.students.get(id))
    .filter((s): s is StudentRecord => {
      if (!s) return false;
      const p = s.profile;
      return (
        !p.archived &&
        p.isMinor &&
        ageAt(p.birthDate, now) < 18 &&
        p.legalGuardian?.email.trim().toLowerCase() === email
      );
    });
  return { t, records };
}

/**
 * The child the parent asked for, or the first one when `childId` is null. Null when the id is
 * not one of the parent's children: an id from the URL is never trusted without this check.
 */
function findChild(parentId: string, childId: string | null, now: Date): { t: TenantState; s: StudentRecord } | null {
  const { t, records } = childrenOf(parentId, now);
  const s = childId === null ? records[0] : records.find((r) => r.profile.id === childId);
  return s ? { t, s } : null;
}

function childView(s: StudentRecord, now: Date): GuardianChild {
  const p = s.profile;
  return {
    id: p.id,
    firstName: p.firstName,
    lastName: p.lastName,
    age: ageAt(p.birthDate, now),
    licence: p.licence,
    office: p.office,
    referentInstructor: p.referentInstructor,
  };
}

// ---------------------------------------------------------------------------
// Views

function consentsOf(g: GuardianRecord): Consent[] {
  return CONSENT_KEYS.map((key) => {
    const decision = g.consents[key];
    return {
      key,
      granted: decision?.granted ?? false,
      decidedAt: decision?.decidedAt ?? null,
      decidedBy: decision?.decidedBy ?? null,
      required: REQUIRED_CONSENTS.includes(key),
    };
  });
}

function publicValidation(v: GuardianRecord["validations"][number]): GuardianValidation {
  // `offer` (the frozen formula) stays on the server.
  const { id, kind, title, description, proposedAt, proposedBy, status, decidedAt, decidedBy } = v;
  return { id, kind, title, description, proposedAt, proposedBy, status, decidedAt, decidedBy };
}

function validationsOf(g: GuardianRecord): GuardianValidation[] {
  const rank = (v: GuardianValidation) => (v.status === "en_attente" ? 0 : 1);
  return g.validations
    .map(publicValidation)
    .sort((a, b) => rank(a) - rank(b) || (b.decidedAt ?? b.proposedAt).localeCompare(a.decidedAt ?? a.proposedAt));
}

function installmentsOf(s: StudentRecord, now: Date): Installment[] {
  const nowIso = now.toISOString();
  return s.installments
    .map((i) => (i.status === "a_venir" && i.dueAt < nowIso ? { ...i, status: "en_retard" as const } : i))
    .sort((a, b) => a.dueAt.localeCompare(b.dueAt));
}

function lessonsOf(t: TenantState, s: StudentRecord, now: Date) {
  const nowIso = now.toISOString();
  const lessons = t.lessons.filter((l) => l.studentId === s.profile.id).sort((a, b) => a.start.localeCompare(b.start));
  return {
    upcoming: lessons.filter((l) => l.start > nowIso && l.status !== "annule"),
    history: lessons.filter((l) => l.start <= nowIso || l.status === "annule").reverse(),
  };
}

/** Identity pieces are only seen by the school: the parent gets their status, not the file. */
function documentsOf(s: StudentRecord): RequiredDocument[] {
  return s.requiredDocuments.map((d) => {
    if (!d.sensitive) return { ...d };
    const { id, label, description, status, rejectionReason, sensitive } = d;
    return { id, label, description, status, rejectionReason, sensitive };
  });
}

// ---------------------------------------------------------------------------
// Reads

export function readParentAccount(parentId: string, now: Date): ParentAccount {
  const parent = parentOf(parentId);
  const { records } = childrenOf(parentId, now);
  return {
    now: now.toISOString(),
    firstName: parent.firstName,
    lastName: parent.lastName,
    email: parent.email,
    children: records.map((s) => childView(s, now)),
    deletionRequestedAt: accounts.get(parentId)?.deletionRequestedAt ?? null,
  };
}

export function readChildOverview(parentId: string, childId: string | null, now: Date): ChildOverview | null {
  const found = findChild(parentId, childId, now);
  if (!found) return null;
  const { t, s } = found;
  const g = guardianOf(s);
  const { upcoming } = lessonsOf(t, s, now);
  const livret = readLivretFor(t.slug, s.profile.id, now)!;
  const documents = s.requiredDocuments;
  return {
    now: now.toISOString(),
    child: childView(s, now),
    nextLesson: upcoming[0] ?? null,
    upcomingCount: upcoming.length,
    progress: { overallProgress: livret.overallProgress, headline: livret.headline, drivingHours: livret.drivingHours },
    balance: computeBalance(t, s.profile.id, now),
    documentsToSend: documents
      .filter((d) => d.status === "manquant" || d.status === "refuse")
      .map(({ id, label, status }) => ({ id, label, status })),
    documentsTotal: documents.length,
    documentsValidated: documents.filter((d) => d.status === "valide").length,
    consentsToGive: consentsOf(g).filter((c) => c.decidedAt === null || (c.required && !c.granted)),
    pendingValidations: validationsOf(g).filter((v) => v.status === "en_attente"),
    nextInstallment: installmentsOf(s, now).find((i) => i.status !== "payee") ?? null,
  };
}

export function readChildLessons(parentId: string, childId: string | null, now: Date): ChildLessons | null {
  const found = findChild(parentId, childId, now);
  if (!found) return null;
  return { now: now.toISOString(), child: childView(found.s, now), ...lessonsOf(found.t, found.s, now) };
}

export function readChildProgress(parentId: string, childId: string | null, now: Date): ChildProgress | null {
  const found = findChild(parentId, childId, now);
  if (!found) return null;
  const livret = readLivretFor(found.t.slug, found.s.profile.id, now)!;
  return { now: now.toISOString(), child: childView(found.s, now), livret };
}

export function readChildPayments(parentId: string, childId: string | null, now: Date): ChildPayments | null {
  const found = findChild(parentId, childId, now);
  if (!found) return null;
  const { t, s } = found;
  const invoices: Invoice[] = t.invoices
    .filter((i) => i.studentId === s.profile.id)
    .map(({ id, number, label, amount, issuedAt, status }) => ({ id, number, label, amount, issuedAt, status }))
    .sort((a, b) => b.issuedAt.localeCompare(a.issuedAt));
  return {
    now: now.toISOString(),
    child: childView(s, now),
    balance: computeBalance(t, s.profile.id, now),
    installments: installmentsOf(s, now),
    invoices,
  };
}

export function readChildDocuments(parentId: string, childId: string | null, now: Date): ChildDocuments | null {
  const found = findChild(parentId, childId, now);
  if (!found) return null;
  return { now: now.toISOString(), child: childView(found.s, now), documents: documentsOf(found.s) };
}

export function readChildAuthorisations(parentId: string, childId: string | null, now: Date): ChildAuthorisations | null {
  const found = findChild(parentId, childId, now);
  if (!found) return null;
  const g = guardianOf(found.s);
  return { now: now.toISOString(), child: childView(found.s, now), consents: consentsOf(g), validations: validationsOf(g) };
}

// ---------------------------------------------------------------------------
// Mutations (the API layer checks the subscription state first)

export function writeConsent(
  parentId: string,
  childId: string,
  key: ConsentKey,
  granted: boolean,
  now: Date,
): ActionResult<{ consent: Consent }> {
  const found = findChild(parentId, childId, now);
  if (!found) return NOT_FOUND;
  if (!CONSENT_KEYS.includes(key)) return { ok: false, code: "invalide", error: "Autorisation inconnue." };
  const { t, s } = found;
  const g = ensureGuardian(s);
  const author = fullName(parentOf(parentId));
  const previous = g.consents[key];
  g.consents[key] = { granted, decidedAt: now.toISOString(), decidedBy: author };
  // Every decision reaches the school's journal, where the staff sees it.
  if (previous?.granted !== granted) {
    const verb = granted ? "accordé" : previous?.granted ? "retiré" : "refusé";
    logAudit(t, author, "eleves", `${fullName(s.profile)} : ${CONSENT_AUDIT_LABEL[key]} ${verb} par le représentant légal`, now);
  }
  return { ok: true, data: { consent: consentsOf(g).find((c) => c.key === key)! } };
}

/**
 * Accepts or refuses an item proposed by the school. Accepting a change of formula applies the
 * formula as it was proposed (price and hours frozen then); a higher price adds a complement to
 * the payment plan. Codes "deja_traitee", "formule_modifiee" (the school changed or withdrew the
 * offer since: it has to send a new proposal).
 */
export function writeValidationDecision(
  parentId: string,
  childId: string,
  validationId: string,
  decision: "accepte" | "refuse",
  now: Date,
): ActionResult<{ validation: GuardianValidation }> {
  const found = findChild(parentId, childId, now);
  if (!found) return NOT_FOUND;
  const { t, s } = found;
  const validation = guardianOf(s).validations.find((v) => v.id === validationId);
  if (!validation) return { ok: false, code: "introuvable", error: "Cette demande n'existe plus." };
  if (validation.status !== "en_attente") {
    return { ok: false, code: "deja_traitee", error: "Cette demande a déjà été traitée." };
  }
  const author = fullName(parentOf(parentId));

  if (decision === "accepte" && validation.kind === "changement_formule") {
    const proposed = validation.offer;
    const current = proposed && t.settings.pricing.packages.find((p) => p.id === proposed.id && p.active);
    if (!proposed || !current || current.price !== proposed.price || current.hours !== proposed.hours) {
      return {
        ok: false,
        code: "formule_modifiee",
        error: "L'auto-école a modifié ou retiré cette formule depuis sa proposition. Elle doit vous en envoyer une nouvelle : contactez-la.",
      };
    }
    const previous = s.package;
    s.package = { ...proposed };
    const difference = proposed.price - previous.price;
    if (difference > 0) {
      s.installments.push({
        id: `${s.profile.id}-ech-${s.installments.length + 1}`,
        label: `Complément · ${proposed.name}`,
        amount: difference,
        hours: Math.max(0, proposed.hours - previous.hours),
        dueAt: parisTime(now, 30, 12).toISOString(),
        status: "a_venir",
      });
    }
  }

  validation.status = decision === "accepte" ? "acceptee" : "refusee";
  validation.decidedAt = now.toISOString();
  validation.decidedBy = author;
  logAudit(
    t,
    author,
    "eleves",
    `${fullName(s.profile)} : « ${validation.title} » ${decision === "accepte" ? "accepté" : "refusé"} par le représentant légal`,
    now,
  );
  return { ok: true, data: { validation: publicValidation(validation) } };
}

/** Mock of a Stripe payment of the child's next instalment: the invoice is issued at once. */
export function writePayChildInstallment(
  parentId: string,
  childId: string,
  installmentId: string,
  method: Extract<PaymentMethod, "carte" | "klarna">,
  now: Date,
): ActionResult<{ invoice: Invoice; hours: number }> {
  const found = findChild(parentId, childId, now);
  if (!found) return NOT_FOUND;
  const { t, s } = found;
  const next = installmentsOf(s, now).find((i) => i.status !== "payee");
  const installment = s.installments.find((i) => i.id === installmentId);
  if (!installment || installment.status === "payee" || !next) {
    return { ok: false, code: "deja_reglee", error: "Cette échéance est déjà réglée." };
  }
  if (next.id !== installment.id) {
    return { ok: false, code: "ordre", error: "Réglez d'abord l'échéance la plus ancienne." };
  }
  installment.status = "payee";
  // Plan labels name what is paid ("Forfait B — 20 h · 2ᵉ versement", "Pack 10 heures · …").
  const label = installment.label.includes(" · ") ? installment.label : `${s.package.name} · ${installment.label}`;
  const invoice = recordPayment(t, s.profile.id, now, label, installment.amount, installment.hours, method);
  return { ok: true, data: { invoice, hours: installment.hours } };
}

export function writeParentDeletionRequest(parentId: string, now: Date): ActionResult<{ requestedAt: string }> {
  parentOf(parentId);
  const record = accounts.get(parentId) ?? {};
  record.deletionRequestedAt ??= now.toISOString();
  accounts.set(parentId, record);
  return { ok: true, data: { requestedAt: record.deletionRequestedAt } };
}
