// Decisions of the legal guardian of a minor student (parent space), in the mock of the backend:
// what they mean for the rest of the school, and the demo data of the children followed by a
// parent account.
//
// - Every space reads the decisions through guardianConsent() / guardianConsents() below, never
//   StudentRecord.guardian directly: an authorisation applies only when it was given.
// - What each one changes: "rgpd" withdrawn → no new lesson (trainingSuspension, store.ts);
//   "contact_telephone" not given → the instructor gets the guardian's number, not the minor's
//   (instructor-space.ts); "photos" and "communications" → shown to the staff in the student's file
//   (parent-space.ts readGuardianDecisions), who apply them. Anything that sends reminders or
//   information by e-mail or SMS on its own (an SMS outbox) must skip a minor and their guardian
//   unless guardianConsent(s, "communications") is true.
// - Seed: written once with the school's state (store.ts seedTenant), never from a read.
//
// This file only imports types from store.ts, so the store can call it without an import cycle.

import { formatCurrency } from "@/lib/format";
import { parisTime } from "@/lib/paris-time";
import type { Consent, ConsentKey, Installment, PaymentMethod } from "@/lib/types";
import { GUARDIANS, USERS } from "./data";
import type { StudentRecord, TenantState } from "./store";

export type GuardianRecord = NonNullable<StudentRecord["guardian"]>;

/** Display order of the authorisations. */
export const CONSENT_KEYS: ConsentKey[] = ["photos", "contact_telephone", "rgpd", "communications"];
/** The training cannot go on without them. */
export const REQUIRED_CONSENTS: ConsentKey[] = ["rgpd"];
/** Given at enrolment, on the paper file signed by the legal guardian. */
const PAPER_FILE_CONSENTS: ConsentKey[] = ["rgpd", "communications"];

/** Formula proposed to minors in accompanied driving (AAC) who are still on another one. */
const AAC_PACKAGE_ID = "pkg-aac";
/** Hours beyond the package: this pack, paid in two instalments. */
const EXTRA_PACK_ID = "pack-10";

const HOUR_MS = 3_600_000;
const DAY_MS = 24 * HOUR_MS;

const nameOf = (p: { firstName: string; lastName: string }) => `${p.firstName} ${p.lastName}`;

/** A child without a parent account yet: no decision recorded. Never written by a read. */
const NO_DECISION = Object.freeze({ consents: Object.freeze({}), validations: Object.freeze([]) }) as unknown as GuardianRecord;

/** The guardian's decisions on the child, or "nothing decided" (read-only: do not mutate). */
export function guardianOf(s: StudentRecord): GuardianRecord {
  return s.guardian ?? NO_DECISION;
}

/** The guardian's decisions on the child, created on the first decision (mutations only). */
export function ensureGuardian(s: StudentRecord): GuardianRecord {
  s.guardian ??= { consents: {}, validations: [] };
  return s.guardian;
}

// ---------------------------------------------------------------------------
// Reading the decisions (every space)

/**
 * The legal guardian's decision on one authorisation of the student: true (given), false (refused
 * or withdrawn), null (nobody decided yet, or no guardian decides for this student). An
 * authorisation applies only when it is `true`.
 */
export function guardianConsent(s: StudentRecord | undefined, key: ConsentKey): boolean | null {
  return s?.guardian?.consents[key]?.granted ?? null;
}

/** Every authorisation in display order, with the last decision (date, author) when there is one. */
export function guardianConsents(s: StudentRecord): Consent[] {
  return CONSENT_KEYS.map((key) => {
    const decision = s.guardian?.consents[key];
    return {
      key,
      granted: decision?.granted ?? false,
      decidedAt: decision?.decidedAt ?? null,
      decidedBy: decision?.decidedBy ?? null,
      required: REQUIRED_CONSENTS.includes(key),
    };
  });
}

// ---------------------------------------------------------------------------
// Rules applied by the other spaces

/**
 * Refusal of any new lesson (booking by the staff, request by the student, confirmation of a
 * request) while the legal guardian has withdrawn the RGPD consent. Null: nothing blocks.
 */
export function trainingSuspension(s: StudentRecord | undefined): { ok: false; code: string; error: string } | null {
  if (!s || guardianConsent(s, "rgpd") !== false) return null;
  return {
    ok: false,
    code: "formation_suspendue",
    error: `La formation de ${nameOf(s.profile)} est suspendue : son représentant légal a retiré le consentement au traitement des données (RGPD). Aucune nouvelle leçon ne peut être planifiée.`,
  };
}

// ---------------------------------------------------------------------------
// Seed of the children followed by a parent account

/** store.ts's own payment seed (payment + invoice, numbered later in date order). */
export type SeedPayment = (s: StudentRecord, date: Date, label: string, amount: number, hours: number, method: PaymentMethod) => void;

/**
 * Called once by store.ts when the school's state is created, after the generic payments and
 * before the invoices are numbered: consents of the paper file, the school's proposal, a payment
 * plan that matches the invoices, and a lesson request waiting for the referent instructor.
 */
export function seedGuardians(t: TenantState, now: Date, pay: SeedPayment): void {
  for (const [parentId, childIds] of Object.entries(GUARDIANS)) {
    const parent = USERS.find((u) => u.id === parentId && u.role === "parent");
    if (!parent || parent.tenantSlug !== t.slug) continue;
    for (const childId of childIds) {
      const s = t.students.get(childId);
      if (!s || s.guardian) continue;
      const consents: GuardianRecord["consents"] = {};
      for (const key of PAPER_FILE_CONSENTS) {
        consents[key] = { granted: true, decidedAt: s.profile.enrolledAt, decidedBy: nameOf(parent) };
      }
      s.guardian = { consents, validations: formulaProposal(t, s, now) };
      if (s.installments.length === 0) seedPaymentPlan(t, s, now, pay);
      seedPendingRequest(t, s, now);
    }
  }
}

function formulaProposal(t: TenantState, s: StudentRecord, now: Date): GuardianRecord["validations"] {
  const aac = t.settings.pricing.packages.find((p) => p.id === AAC_PACKAGE_ID && p.active);
  if (!aac || !s.profile.licence.includes("AAC") || s.package.id === aac.id) return [];
  const gerant = USERS.find((u) => u.tenantSlug === t.slug && u.role === "gerant");
  const difference = aac.price - s.package.price;
  return [
    {
      id: `val-${s.profile.id}-formule`,
      kind: "changement_formule",
      title: `Changement de formule : ${aac.name} (${formatCurrency(aac.price, { round: true })})`,
      description:
        `${s.profile.firstName} est en conduite accompagnée : l'auto-école propose de remplacer le ${s.package.name} ` +
        `(${formatCurrency(s.package.price, { round: true })}) par le ${aac.name}. ${aac.description}` +
        (difference > 0
          ? ` La différence de ${formatCurrency(difference, { round: true })} s'ajoute à l'échéancier, à régler sous 30 jours.`
          : ""),
      proposedAt: parisTime(now, -2, 10, 30).toISOString(),
      proposedBy: gerant ? nameOf(gerant) : "Votre auto-école",
      status: "en_attente",
      decidedAt: null,
      decidedBy: null,
      // Frozen: accepting applies what the parent read, even if the school edits the offer later.
      offer: { id: aac.id, name: aac.name, hours: aac.hours, price: aac.price },
    },
  ];
}

const ORDINALS = ["1ᵉʳ versement", "2ᵉ versement", "3ᵉ versement"];

/**
 * The generic seed bought exactly the hours the child needs (consumed, booked, plus a margin) at
 * the hourly rate. Replace those purchases by what a family paying in instalments has: the
 * package in three instalments, then, once the package is used up, an hour pack in two
 * instalments. The total of hours paid stays the same, so the balance and the lessons do not
 * change; every paid instalment is a payment with its invoice.
 */
function seedPaymentPlan(t: TenantState, s: StudentRecord, now: Date, pay: SeedPayment) {
  const id = s.profile.id;
  // Cash entries point to their invoice: leave such a child as the generic seed made them.
  if (t.cashEntries.some((c) => c.studentId === id)) return;
  const needed = s.payments.reduce((sum, p) => sum + p.hours, 0);
  for (let i = t.invoices.length - 1; i >= 0; i--) if (t.invoices[i].studentId === id) t.invoices.splice(i, 1);
  s.payments = [];

  const enrolled = new Date(s.profile.enrolledAt);
  const latest = now.getTime() - 2 * DAY_MS;
  const after = (days: number) => new Date(Math.min(enrolled.getTime() + days * DAY_MS + HOUR_MS, latest));
  pay(s, enrolled, "Frais de dossier", t.settings.pricing.registrationFee, 0, "carte");

  const plan: Installment[] = [];
  let paid = 0;
  let lastPaidAt = enrolled.getTime();
  let scheduled = 0;
  const add = (label: string, amount: number, hours: number, paidAt: Date | null, method: PaymentMethod) => {
    const index = plan.length + 1;
    if (paidAt) {
      pay(s, paidAt, label, amount, hours, method);
      paid += hours;
      lastPaidAt = paidAt.getTime();
    }
    plan.push({
      id: `${id}-ech-${index}`,
      label,
      amount,
      hours,
      dueAt: (paidAt ?? parisTime(now, 6 + 30 * scheduled++, 12)).toISOString(),
      status: paidAt ? "payee" : "a_venir",
    });
  };

  // The package in three instalments, three weeks apart, paid while the child needs the hours.
  const { name, price, hours } = s.package;
  const third = Math.floor(price / 3);
  const perInstalment = Math.ceil(hours / 3);
  ORDINALS.forEach((ordinal, i) => {
    const amount = i === 0 ? price - 2 * third : third;
    const instalmentHours = i === 2 ? hours - 2 * perInstalment : perInstalment;
    add(`${name} · ${ordinal}`, amount, instalmentHours, paid < needed ? after(21 * i) : null, i === 1 ? "klarna" : "carte");
  });

  // Package used up: the next hours come from an hour pack, the first half paid last week.
  const pack = t.settings.pricing.hourPacks.find((p) => p.id === EXTRA_PACK_ID);
  if (pack && paid < needed) {
    const half = Math.floor(pack.price / 2);
    const halfHours = Math.ceil(pack.hours / 2);
    const lastWeek = new Date(Math.max(lastPaidAt + DAY_MS, Math.min(parisTime(now, -6, 18).getTime(), now.getTime() - HOUR_MS)));
    add(`${pack.label} · ${ORDINALS[0]}`, pack.price - half, halfHours, lastWeek, "carte");
    add(`${pack.label} · ${ORDINALS[1]}`, half, pack.hours - halfHours, null, "carte");
  }
  // Anything still missing was paid at the hourly rate (an hour bought on the way).
  if (paid < needed) {
    const missing = needed - paid;
    pay(s, new Date(Math.min(lastPaidAt + HOUR_MS, now.getTime() - HOUR_MS)), "Heures de conduite supplémentaires", missing * t.settings.pricing.hourlyRate, missing, "carte");
  }
  s.installments = plan;
}

/**
 * A minor asks for lessons from the student space too: one of the child's upcoming driving lessons
 * with the referent instructor (not the next one, at least 3 days ahead) is still a request
 * waiting for the instructor, as some lessons of the other students are.
 */
function seedPendingRequest(t: TenantState, s: StudentRecord, now: Date) {
  const nowIso = now.toISOString();
  const upcoming = t.lessons
    .filter((l) => l.studentId === s.profile.id && l.start > nowIso && l.status !== "annule")
    .sort((a, b) => a.start.localeCompare(b.start));
  if (upcoming.some((l) => l.status === "a_confirmer")) return;
  const from = parisTime(now, 3, 0).toISOString();
  const lesson = upcoming
    .slice(1)
    .find(
      (l) =>
        l.type === "conduite" &&
        l.status === "confirme" &&
        l.instructor.id === s.profile.referentInstructor.id &&
        l.start >= from,
    );
  if (lesson) lesson.status = "a_confirmer";
}
