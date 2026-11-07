// Mock of the backend for the parent space (legal guardian of a minor student): children linked to
// the account, authorisations, validations proposed by the school, payment of the child's plan.
// Pages go through src/lib/api/parent.ts, never this file. The API layer checks the session; this
// module checks the link between the parent and the child on every call.

import { formatCurrency } from "@/lib/format";
import { parisTime, parisWeekday, parisWeekKey } from "@/lib/paris-time";
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
  Lesson,
  ParentAccount,
  PaymentMethod,
  RequiredDocument,
} from "@/lib/types";
import { GUARDIANS, USERS } from "./data";
import {
  ageAt,
  computeBalance,
  findUserById,
  fullName,
  logAudit,
  recordPayment,
  tenantState,
  writeCreateLesson,
  type StudentRecord,
  type TenantState,
} from "./store";
import { readLivretFor } from "./student-space";

type GuardianRecord = NonNullable<StudentRecord["guardian"]>;

/** Display order of the authorisations. */
export const CONSENT_KEYS: ConsentKey[] = ["photos", "contact_telephone", "rgpd", "communications"];
const REQUIRED_CONSENTS: ConsentKey[] = ["rgpd"];
/** Given at enrolment, on the paper file signed by the legal guardian. */
const SEEDED_CONSENTS: ConsentKey[] = ["rgpd", "communications"];

/** Formula proposed to minors in accompanied driving (AAC) who are still on another one. */
const AAC_PACKAGE_ID = "pkg-aac";

const NOT_FOUND = { ok: false as const, code: "introuvable", error: "Cet élève n'est pas rattaché à votre compte." };

// ---------------------------------------------------------------------------
// Parent account (deletion request), kept apart from the school's state

type AccountRecord = { deletionRequestedAt?: string };
const globalStore = globalThis as unknown as {
  __aeParentAccounts?: Map<string, AccountRecord>;
  __aeParentRequestSeeded?: WeakSet<StudentRecord>;
};
const accounts = (globalStore.__aeParentAccounts ??= new Map<string, AccountRecord>());
/** Children whose pending lesson request was seeded (keyed by record: a new demo state seeds again). */
const requestSeeded = (globalStore.__aeParentRequestSeeded ??= new WeakSet<StudentRecord>());

function parentOf(parentId: string) {
  const user = findUserById(parentId);
  if (!user || user.role !== "parent") throw new Error(`Unknown parent ${parentId}`);
  return user;
}

// ---------------------------------------------------------------------------
// Link between the parent and the children

/** Children of the parent that exist in the parent's own school (never another school's). */
function childrenOf(parentId: string, now: Date): { t: TenantState; records: StudentRecord[] } {
  const parent = parentOf(parentId);
  const t = tenantState(parent.tenantSlug, now);
  const records = (GUARDIANS[parentId] ?? [])
    .map((id) => t.students.get(id))
    .filter((s): s is StudentRecord => Boolean(s));
  return { t, records };
}

/**
 * The child the parent asked for, or the first one when `childId` is null. Null when the id is
 * not one of the parent's children: an id from the URL is never trusted without this check.
 */
function findChild(parentId: string, childId: string | null, now: Date): { t: TenantState; s: StudentRecord } | null {
  const { t, records } = childrenOf(parentId, now);
  const s = childId === null ? records[0] : records.find((r) => r.profile.id === childId);
  if (!s) return null;
  ensureGuardian(t, s, parentId, now);
  if (!requestSeeded.has(s)) {
    requestSeeded.add(s);
    seedPendingRequest(t, s, now);
  }
  return { t, s };
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
// Seed (once per child, on first read)

function ensureGuardian(t: TenantState, s: StudentRecord, parentId: string, now: Date): GuardianRecord {
  if (s.guardian) return s.guardian;
  const parentName = fullName(parentOf(parentId));
  const enrolledAt = s.profile.enrolledAt;

  const consents: GuardianRecord["consents"] = {};
  for (const key of SEEDED_CONSENTS) consents[key] = { granted: true, decidedAt: enrolledAt, decidedBy: parentName };

  const validations: GuardianRecord["validations"] = [];
  const aac = t.settings.pricing.packages.find((p) => p.id === AAC_PACKAGE_ID && p.active);
  if (aac && s.profile.licence.includes("AAC") && s.package.id !== aac.id) {
    const gerant = USERS.find((u) => u.tenantSlug === t.slug && u.role === "gerant");
    const difference = aac.price - s.package.price;
    validations.push({
      id: `val-${s.profile.id}-formule`,
      kind: "changement_formule",
      title: `Changement de formule : ${aac.name} (${formatCurrency(aac.price, { round: true })})`,
      description:
        `${s.profile.firstName} est en conduite accompagnée : l'auto-école propose de remplacer le ${s.package.name} ` +
        `(${formatCurrency(s.package.price, { round: true })}) par le ${aac.name}. ${aac.description}` +
        (difference > 0
          ? ` La différence de ${formatCurrency(difference, { round: true })} sera répartie sur les prochaines échéances.`
          : ""),
      proposedAt: parisTime(now, -2, 10, 30).toISOString(),
      proposedBy: gerant ? fullName(gerant) : "Votre auto-école",
      status: "en_attente",
      decidedAt: null,
      decidedBy: null,
      packageId: aac.id,
    });
  }

  // A child paying in instalments: the package in three payments, the first one already paid.
  let planSeeded = false;
  if (s.installments.length === 0) {
    const price = s.package.price;
    const third = Math.floor(price / 3);
    const amounts = [price - 2 * third, third, third];
    const hours = [Math.ceil(s.package.hours / 3), Math.ceil(s.package.hours / 3)];
    hours.push(s.package.hours - hours[0] - hours[1]);
    const dueAt = [enrolledAt, parisTime(now, 6, 12).toISOString(), parisTime(now, 36, 12).toISOString()];
    const labels = ["1ᵉʳ versement", "2ᵉ versement", "3ᵉ versement"];
    s.installments = labels.map((label, i) => ({
      id: `${s.profile.id}-ech-${i + 1}`,
      label,
      amount: amounts[i],
      hours: hours[i],
      dueAt: dueAt[i],
      status: i === 0 ? ("payee" as const) : ("a_venir" as const),
    }));
    planSeeded = true;
  }

  s.guardian = { consents, validations, planSeeded };
  return s.guardian;
}

const ACTIVE_STATUSES: Lesson["status"][] = ["a_confirmer", "confirme", "attente_paiement"];
const REQUEST_HOURS = [14, 10, 16];

/**
 * The generated timetable only holds confirmed, done and cancelled lessons. A minor asks for lessons
 * from the student space too: seed one request waiting for the referent instructor (as the
 * scripted students have), on a free slot that respects the school's weekly quota.
 */
function seedPendingRequest(t: TenantState, s: StudentRecord, now: Date) {
  const nowIso = now.toISOString();
  const id = s.profile.id;
  const mine = t.lessons.filter((l) => l.studentId === id);
  if (mine.some((l) => l.status === "a_confirmer" && l.start > nowIso)) return;
  const rules = t.settings.rules.booking;
  const duration = 2;

  for (let day = 3; day <= 20; day++) {
    const weekday = parisWeekday(now, day);
    if (weekday === 0 || weekday === 6) continue;
    const week = parisWeekKey(parisTime(now, day, 12));
    const booked = mine.filter(
      (l) => (l.type === "conduite" || l.type === "code") && ACTIVE_STATUSES.includes(l.status) && parisWeekKey(new Date(l.start)) === week,
    );
    const bookedHours = booked.reduce((sum, l) => sum + l.durationHours, 0);
    if (booked.length + 1 > rules.maxLessonsPerWeek || bookedHours + duration > rules.maxHoursPerWeek) continue;

    for (const hour of REQUEST_HOURS) {
      // Same checks as a booking by the agency (instructor, vehicle, leave, the child's own lessons).
      const created = writeCreateLesson(
        t.slug,
        {
          studentId: id,
          type: "conduite",
          instructorId: s.profile.referentInstructor.id,
          vehicleId: "auto",
          start: parisTime(now, day, hour).toISOString(),
          durationHours: duration,
        },
        now,
      );
      if (created.ok) {
        created.data.lesson.status = "a_confirmer";
        return;
      }
    }
  }
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
  const g = s.guardian!;
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
  const g = found.s.guardian!;
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
  const g = s.guardian!;
  const author = fullName(parentOf(parentId));
  const previous = g.consents[key];
  g.consents[key] = { granted, decidedAt: now.toISOString(), decidedBy: author };
  if (key === "rgpd" && previous?.granted !== granted) {
    logAudit(
      t,
      author,
      "eleves",
      `${fullName(s.profile)} : consentement RGPD ${granted ? "donné" : "retiré"} par le représentant légal`,
      now,
    );
  }
  return { ok: true, data: { consent: consentsOf(g).find((c) => c.key === key)! } };
}

/**
 * Accepts or refuses an item proposed by the school. Accepting a change of formula applies it:
 * the price difference is spread over the unpaid instalments (or added as a new one).
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
  const validation = s.guardian!.validations.find((v) => v.id === validationId);
  if (!validation) return { ok: false, code: "introuvable", error: "Cette demande n'existe plus." };
  if (validation.status !== "en_attente") {
    return { ok: false, code: "deja_traitee", error: "Cette demande a déjà été traitée." };
  }
  const author = fullName(parentOf(parentId));

  if (decision === "accepte" && validation.kind === "changement_formule") {
    const offer = t.settings.pricing.packages.find((p) => p.id === validation.packageId && p.active);
    if (!offer) {
      return { ok: false, code: "formule_retiree", error: "Cette formule n'est plus proposée. Contactez votre auto-école." };
    }
    const difference = offer.price - s.package.price;
    s.package = { id: offer.id, name: offer.name, hours: offer.hours, price: offer.price };
    const unpaid = s.installments.filter((i) => i.status !== "payee").sort((a, b) => a.dueAt.localeCompare(b.dueAt));
    if (difference !== 0 && unpaid.length > 0) {
      const share = Math.floor(difference / unpaid.length);
      unpaid.forEach((i, index) => {
        i.amount += index === 0 ? difference - share * (unpaid.length - 1) : share;
      });
    } else if (difference > 0) {
      s.installments.push({
        id: `${s.profile.id}-ech-${s.installments.length + 1}`,
        label: "Complément de formule",
        amount: difference,
        hours: 0,
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
  const invoice = recordPayment(t, s.profile.id, now, `${s.package.name} · ${installment.label}`, installment.amount, installment.hours, method);
  return { ok: true, data: { invoice, hours: installment.hours } };
}

export function writeParentDeletionRequest(parentId: string, now: Date): ActionResult<{ requestedAt: string }> {
  parentOf(parentId);
  const record = accounts.get(parentId) ?? {};
  record.deletionRequestedAt ??= now.toISOString();
  accounts.set(parentId, record);
  return { ok: true, data: { requestedAt: record.deletionRequestedAt } };
}
