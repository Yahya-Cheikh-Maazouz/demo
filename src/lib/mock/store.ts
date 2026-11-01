// In-memory mock of the backend, used until the real API exists.
// Everything here will be replaced by HTTP calls; pages must go through src/lib/api, never import this file.
//
// State is kept per auto-école (tenant): one shared timetable, so instructor, vehicle and leave
// conflicts are real, and one invoice sequence without gaps per school. The school's settings
// (tariffs, rules), team, subscription, imports and audit log live there too.
//
// The staff administration modules (students-admin.ts, imports.ts, settings.ts) build on the
// exports of the "Shared with the admin mock modules" section; this file never imports them.

import { formatTimeRange } from "@/lib/format";
import type {
  ActionResult,
  AuditEntry,
  Balance,
  BalanceState,
  BookingRules,
  CashEntry,
  CashMethod,
  DocumentStatus,
  DownloadableDocument,
  HourPack,
  Installment,
  Instructor,
  Invoice,
  Leave,
  Lesson,
  LessonType,
  MemberStatus,
  NewStudentInput,
  Payment,
  PaymentMethod,
  Permission,
  Planning,
  PlanningLesson,
  PricingSettings,
  Quota,
  RequiredDocument,
  SchoolRules,
  Slot,
  StudentProfile,
  StudentFile,
  StudentRow,
  StaffRole,
  StudentSummary,
  SubscriptionStatus,
  Tenant,
  ImportSession,
  User,
  Vehicle,
} from "@/lib/types";
import {
  DEFAULT_PACKAGE_ID,
  DEFAULT_PRICING,
  DEFAULT_RULES,
  DEFAULT_TENANT_SLUG,
  OFFICES,
  PLATFORM_PLANS,
  REFUSAL_REASON_EXAMPLE,
  REQUIRED_DOCUMENTS,
  ROLE_PERMISSIONS,
  STAFF,
  STUDENTS,
  SUBSCRIPTIONS,
  TEAM_FIXTURES,
  TENANTS,
  USERS,
  type MockUser,
  type Staff,
  type StudentFixture,
} from "./data";
import { parisTime, parisWeekday, parisWeekKey } from "@/lib/paris-time";

export { DEFAULT_TENANT_SLUG };

const HOUR_MS = 3_600_000;

export function findTenantBySlug(slug: string): Tenant | null {
  return TENANTS.find((t) => t.slug === slug) ?? null;
}

// ---------------------------------------------------------------------------
// Users and authentication

const MAX_FAILED_ATTEMPTS = 5;
const LOCK_MINUTES = 15;

type GlobalStore = {
  __aeTenantStates?: Map<string, TenantState>;
  __aeFailedLogins?: Map<string, { count: number; lockedUntil?: number }>;
};
const g = globalThis as unknown as GlobalStore;
const failedLogins = (g.__aeFailedLogins ??= new Map());

/** Role defaults, plus what the gérant opened, minus what they closed for this person. */
export function effectivePermissions(role: MockUser["role"], granted: Permission[] = [], revoked: Permission[] = []): Permission[] {
  return [...ROLE_PERMISSIONS[role], ...granted].filter((p, index, all) => all.indexOf(p) === index && !revoked.includes(p));
}

/** Team record of an account, once its school's state exists (it holds the gérant's changes). */
function memberOf(user: MockUser): MemberRecord | undefined {
  return tenantStates.get(user.tenantSlug)?.team.get(user.id);
}

function publicUser(user: MockUser): User {
  const { id, tenantSlug, role, firstName, lastName, email, twoFactorEnabled } = user;
  const member = memberOf(user);
  const permissions = member
    ? effectivePermissions(role, member.granted, member.revoked)
    : effectivePermissions(role, user.grantedPermissions, user.revokedPermissions);
  return { id, tenantSlug, role, firstName, lastName, email, twoFactorEnabled, permissions };
}

/** Null for unknown or deactivated accounts: a deactivated person's session stops working at once. */
export function findUserById(id: string): User | null {
  const user = USERS.find((u) => u.id === id);
  if (!user || memberOf(user)?.status === "desactive") return null;
  return publicUser(user);
}

export function sessionTokenFor(user: User): string {
  return `mock.${user.id}`;
}

export function findUserBySessionToken(token: string): User | null {
  return token.startsWith("mock.") ? findUserById(token.slice("mock.".length)) : null;
}

export function authenticate(
  tenantSlug: string,
  email: string,
  password: string,
  now: Date,
): ActionResult<{ user: User }> {
  const key = `${tenantSlug}:${email.trim().toLowerCase()}`;
  const attempts = failedLogins.get(key);
  if (attempts?.lockedUntil && attempts.lockedUntil > now.getTime()) {
    const minutes = Math.ceil((attempts.lockedUntil - now.getTime()) / 60_000);
    return {
      ok: false,
      code: "compte_bloque",
      error: `Trop de tentatives. Réessayez dans ${minutes} min ou réinitialisez votre mot de passe.`,
    };
  }

  const user = USERS.find(
    (u) => u.tenantSlug === tenantSlug && u.email.toLowerCase() === email.trim().toLowerCase(),
  );
  if (!user || user.password !== password) {
    const count = (attempts?.count ?? 0) + 1;
    const locked = count >= MAX_FAILED_ATTEMPTS;
    failedLogins.set(key, {
      count: locked ? 0 : count,
      lockedUntil: locked ? now.getTime() + LOCK_MINUTES * 60_000 : undefined,
    });
    return locked
      ? {
          ok: false,
          code: "compte_bloque",
          error: `Trop de tentatives. Réessayez dans ${LOCK_MINUTES} min ou réinitialisez votre mot de passe.`,
        }
      : { ok: false, code: "identifiants_invalides", error: "E-mail ou mot de passe incorrect." };
  }

  failedLogins.delete(key);
  if (memberOf(user)?.status === "desactive") {
    return { ok: false, code: "compte_desactive", error: "Ce compte a été désactivé. Contactez le gérant de l'auto-école." };
  }
  return { ok: true, data: { user: publicUser(user) } };
}

export function verifyTotp(userId: string, code: string): boolean {
  const user = USERS.find((u) => u.id === userId);
  return Boolean(user?.totpCode && user.totpCode === code.replace(/\s/g, ""));
}

// ---------------------------------------------------------------------------
// Tenant state

/** Package of a student, frozen at enrolment: later changes of the offer do not affect them. */
export type StudentPackage = { id: string; name: string; hours: number; price: number };

export type StudentRecord = {
  profile: StudentProfile;
  package: StudentPackage;
  payments: Payment[];
  installments: Installment[];
  requiredDocuments: RequiredDocument[];
  downloadables: DownloadableDocument[];
  deletionRequestedAt?: string;
  /** Set for students created by an import, so the import can be undone in bulk. */
  importId?: string;
};

/** A person of the team. Accounts with a login also exist in USERS (password, 2FA secret). */
export type MemberRecord = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: StaffRole;
  status: MemberStatus;
  twoFactorEnabled: boolean;
  office: string | null;
  /** Per-person overrides of the role defaults. */
  granted: Permission[];
  revoked: Permission[];
  lastActiveAt: string | null;
  invitedAt: string | null;
};

/** Import session plus what the mock needs internally (raw cells, created students). */
export type ImportRecord = ImportSession & {
  /** Data rows (header excluded), as strings. */
  cells: string[][];
  createdStudentIds: string[];
};

export type TenantState = {
  slug: string;
  staff: Staff;
  settings: { pricing: PricingSettings; rules: SchoolRules; offices: string[] };
  team: Map<string, MemberRecord>;
  subscription: { planId: string; status: SubscriptionStatus; renewsAt: string };
  students: Map<string, StudentRecord>;
  lessons: Lesson[];
  invoices: Array<Invoice & { studentId: string }>;
  leaves: Leave[];
  cashEntries: CashEntry[];
  imports: Map<string, ImportRecord>;
  audit: AuditEntry[];
  invoiceSeq: number;
  lessonSeq: number;
  /** For ids of students, members, imports, packages… created at runtime. */
  seq: number;
};

const tenantStates = (g.__aeTenantStates ??= new Map<string, TenantState>());

/** Types that consume hours of the driving package. */
const COUNTED_TYPES: LessonType[] = ["conduite", "examen_blanc"];
const isActive = (l: Lesson) => l.status === "confirme" || l.status === "attente_paiement";
/** Takes up the instructor, the vehicle and the student (past lessons included). */
const occupies = (l: Lesson) => l.status !== "annule";

export function tenantState(slug: string, now: Date): TenantState {
  let state = tenantStates.get(slug);
  if (!state) {
    state = seedTenant(slug, now);
    tenantStates.set(slug, state);
  }
  return state;
}

/** Tenant and record of a student who has a login. */
function studentContext(userId: string, now: Date): { t: TenantState; s: StudentRecord } {
  const user = findUserById(userId);
  if (!user || user.role !== "eleve") throw new Error(`Unknown student ${userId}`);
  const t = tenantState(user.tenantSlug, now);
  const s = t.students.get(userId);
  if (!s) throw new Error(`No student record for ${userId}`);
  return { t, s };
}

export const fullName = (p: { firstName: string; lastName: string }) => `${p.firstName} ${p.lastName}`;

// ---------------------------------------------------------------------------
// Seed

/** Day offset that never falls on a Sunday (the school is closed). */
function workday(now: Date, offset: number): number {
  return parisWeekday(now, offset) === 0 ? offset + 1 : offset;
}

function publicInvoice({ id, number, label, amount, issuedAt, status }: Invoice): Invoice {
  return { id, number, label, amount, issuedAt, status };
}

function invoiceNumber(dateIso: string, seq: number): string {
  const [year, month] = dateIso.slice(0, 7).split("-");
  return `F${year}${month}-${String(seq).padStart(5, "0")}`;
}

/** Small deterministic hash, so the demo schedule is the same on every restart. */
function hash(...values: number[]): number {
  return values.reduce((acc, v) => (Math.imul(acc ^ (v + 0x9e37), 0x45d9f3b) >>> 0) % 1_000_003, 7);
}

function buildProfile(f: StudentFixture, staff: Staff, now: Date): StudentProfile {
  return {
    id: f.id,
    firstName: f.firstName,
    lastName: f.lastName,
    birthDate: f.birthDate,
    birthPlace: null,
    gender: f.gender,
    neph: f.neph,
    email: f.email,
    phone: f.phone,
    phoneSecondary: null,
    address: f.address,
    office: f.office,
    licence: f.licence ?? "B · Boîte manuelle",
    studentType: "Particulier",
    financer: "Personnel",
    accelerated: f.accelerated ?? false,
    enrolledAt: parisTime(now, -f.enrolledDaysAgo, 10).toISOString(),
    isMinor: f.isMinor ?? false,
    legalGuardian: f.legalGuardian ?? null,
    referentInstructor: staff.instructors[f.referent],
    restrictedToReferent: f.restrictedToReferent ?? false,
    availabilities: [
      { day: "Lundi", from: "18:00", to: "20:00" },
      { day: "Mardi", from: "08:00", to: "12:00" },
      { day: "Samedi", from: "09:00", to: "12:00" },
    ],
    archived: false,
  };
}

function buildDocuments(f: StudentFixture, now: Date): RequiredDocument[] {
  return REQUIRED_DOCUMENTS.map((d) => {
    const status: DocumentStatus = f.documents[d.id] ?? "manquant";
    const uploadedAt =
      status === "manquant"
        ? undefined
        : parisTime(now, status === "en_verification" ? -2 : -f.enrolledDaysAgo + 1, 11).toISOString();
    return {
      id: d.id,
      label: d.label,
      description: d.description,
      status,
      rejectionReason: status === "refuse" ? REFUSAL_REASON_EXAMPLE : undefined,
      uploadedAt,
      fileName: uploadedAt ? d.fileName : undefined,
      sensitive: d.sensitive,
    };
  });
}

function buildDownloadables(f: StudentFixture, now: Date): DownloadableDocument[] {
  const d = (offset: number) => parisTime(now, -f.enrolledDaysAgo + offset, 10).toISOString();
  return [
    { id: "dl-devis", label: "Devis — Forfait B 20 h", category: "devis", issuedAt: d(0), signed: true },
    { id: "dl-contrat", label: "Contrat de formation", category: "contrat", issuedAt: d(1), signed: true },
    { id: "dl-attestation", label: "Attestation d'inscription", category: "attestation", issuedAt: d(3) },
  ];
}

function gearboxOf(profile: StudentProfile): Vehicle["gearbox"] {
  return profile.licence.includes("automatique") ? "automatique" : "manuelle";
}

function overlaps(l: { start: string; end: string }, start: number, end: number): boolean {
  return Date.parse(l.start) < end && Date.parse(l.end) > start;
}

/** First vehicle with the right gearbox that is free on the range, or null. */
function freeVehicle(
  t: TenantState,
  gearbox: Vehicle["gearbox"],
  start: number,
  end: number,
  ignoreLessonId?: string,
): Vehicle | null {
  return (
    t.staff.vehicles.find(
      (v) =>
        v.gearbox === gearbox &&
        !t.lessons.some((l) => l.id !== ignoreLessonId && occupies(l) && l.vehicle?.id === v.id && overlaps(l, start, end)),
    ) ?? null
  );
}

function newLesson(
  t: TenantState,
  input: {
    studentId: string;
    type: LessonType;
    status: Lesson["status"];
    start: Date;
    hours: number;
    instructor: Instructor;
    vehicle: Vehicle | null;
    meetingPoint?: string;
    id?: string;
  },
): Lesson {
  const start = input.start.getTime();
  return {
    id: input.id ?? `l-${t.slug}-${++t.lessonSeq}`,
    studentId: input.studentId,
    type: input.type,
    status: input.status,
    start: input.start.toISOString(),
    end: new Date(start + input.hours * HOUR_MS).toISOString(),
    durationHours: input.hours,
    instructor: input.instructor,
    vehicle: input.vehicle,
    meetingPoint:
      input.meetingPoint ?? (input.vehicle ? t.staff.meetingPoints[input.instructor.id] : t.staff.agency),
    freeCancellationUntil: new Date(start - t.settings.rules.booking.freeCancellationHours * HOUR_MS).toISOString(),
  };
}

/** The hand-written story of the students who have a login (the student space was designed on it). */
function scriptedLessons(t: TenantState, studentId: string, now: Date): Lesson[] {
  const [referent, other] = t.staff.instructors;
  const manual = t.staff.vehicles.find((v) => v.gearbox === "manuelle") ?? null;
  const at = (day: number, hour: number) => parisTime(now, workday(now, day), hour);
  const base = { studentId, type: "conduite" as const, status: "confirme" as const, instructor: referent, vehicle: manual };
  const code = { type: "code" as const, vehicle: null, meetingPoint: t.staff.agency };
  const id = (n: string) => `${studentId}-${n}`;
  return [
    newLesson(t, { ...base, id: id("01"), start: at(-38, 18), hours: 1, status: "effectue" }),
    newLesson(t, { ...base, id: id("02"), start: at(-31, 18), hours: 2, status: "effectue" }),
    newLesson(t, { ...base, id: id("03"), start: at(-24, 8), hours: 2, status: "effectue" }),
    newLesson(t, { ...base, id: id("04"), start: at(-17, 18), hours: 2, status: "annule" }),
    newLesson(t, { ...base, id: id("05"), start: at(-14, 10), hours: 2, status: "effectue", instructor: other }),
    newLesson(t, { ...base, ...code, id: id("06"), start: at(-10, 14), hours: 1, status: "effectue" }),
    newLesson(t, { ...base, id: id("07"), start: at(-7, 18), hours: 2, status: "effectue" }),
    newLesson(t, { ...base, id: id("08"), start: at(2, 18), hours: 2 }),
    newLesson(t, { ...base, ...code, id: id("09"), start: at(4, 19), hours: 1 }),
    newLesson(t, { ...base, id: id("10"), start: at(6, 8), hours: 2 }),
  ];
}

const GENERATED_HOURS = { weekday: [8, 10, 14, 16, 18], saturday: [8, 10] };
/** Below the booking rule (3), so the demo students stay around their 20 h package. */
const GENERATED_WEEKLY_CAP = 2;

/**
 * Fills the shared timetable with lessons of the other students, without any conflict.
 * Slots are visited in a shuffled (but stable) order so lessons spread over the whole week,
 * and each student has at most GENERATED_WEEKLY_CAP lessons a week.
 */
function generateLessons(t: TenantState, fixtures: StudentFixture[], now: Date) {
  const candidates: Array<{ day: number; instructorIndex: number; hour: number; seed: number }> = [];
  for (let day = -21; day <= 13; day++) {
    const weekday = parisWeekday(now, day);
    if (weekday === 0) continue;
    const hours = weekday === 6 ? GENERATED_HOURS.saturday : GENERATED_HOURS.weekday;
    t.staff.instructors.forEach((_, instructorIndex) => {
      hours.forEach((hour, hourIndex) => {
        candidates.push({ day, instructorIndex, hour, seed: hash(day + 50, instructorIndex, hourIndex) });
      });
    });
  }
  candidates.sort((a, b) => a.seed - b.seed);

  const weekCount = new Map<string, number>();
  for (const { day, instructorIndex, hour, seed } of candidates) {
    if (seed % 10 >= 8) continue;
    const instructor = t.staff.instructors[instructorIndex];
    const start = parisTime(now, day, hour);
    const end = start.getTime() + 2 * HOUR_MS;
    if (onLeave(t, instructor.id, start.getTime(), end)) continue;
    if (t.lessons.some((l) => occupies(l) && l.instructor.id === instructor.id && overlaps(l, start.getTime(), end))) continue;

    // Prefer the students whose referent is this instructor.
    const pool = [...fixtures].sort((a, b) => Number(b.referent === instructorIndex) - Number(a.referent === instructorIndex));
    for (let attempt = 0; attempt < pool.length; attempt++) {
      const f = pool[(seed + attempt) % pool.length];
      const record = t.students.get(f.id)!;
      if (start.getTime() < Date.parse(record.profile.enrolledAt) + 3 * 24 * HOUR_MS) continue;
      const weekKey = `${f.id}:${parisWeekKey(start)}`;
      if ((weekCount.get(weekKey) ?? 0) >= GENERATED_WEEKLY_CAP) continue;
      if (t.lessons.some((l) => l.studentId === f.id && occupies(l) && overlaps(l, start.getTime(), end))) continue;
      const vehicle = freeVehicle(t, gearboxOf(record.profile), start.getTime(), end);
      if (!vehicle) continue;

      const past = end <= now.getTime();
      const noShow = past && seed % 17 === 0;
      const cancelled = noShow || seed % 13 === 0;
      const lesson = newLesson(t, {
        studentId: f.id,
        type: seed % 9 === 0 ? "examen_blanc" : "conduite",
        status: cancelled ? "annule" : past ? "effectue" : "confirme",
        start,
        hours: 2,
        instructor,
        vehicle,
      });
      if (noShow) {
        lesson.noShow = true;
        lesson.chargedHours = lesson.durationHours;
      }
      t.lessons.push(lesson);
      if (!cancelled) weekCount.set(weekKey, (weekCount.get(weekKey) ?? 0) + 1);
      break;
    }
  }
}

function onLeave(t: TenantState, instructorId: string, start: number, end: number): Leave | null {
  return t.leaves.find((l) => l.instructorId === instructorId && overlaps(l, start, end)) ?? null;
}

/** Payment + invoice (numbered later, in date order, for the whole school). */
function seedPayment(
  t: TenantState,
  s: StudentRecord,
  date: Date,
  label: string,
  amount: number,
  hours: number,
  method: PaymentMethod,
): Payment {
  const id = `${s.profile.id}-pay-${s.payments.length + 1}`;
  const invoice = { id: `inv-${id}`, studentId: s.profile.id, number: "", label, amount, issuedAt: date.toISOString(), status: "payee" as const };
  t.invoices.push(invoice);
  const payment: Payment = { id, date: invoice.issuedAt, amount, method, hours, invoiceNumber: invoice.id };
  s.payments.push(payment);
  return payment;
}

/** Cash entries of the agency for today, for the "caisse du jour" demo. */
const TODAY_CASH: Record<string, { studentId: string; method: CashMethod; hour: number }[]> = {
  dupont: [
    { studentId: "s-sarah", method: "especes", hour: 9 },
    { studentId: "s-tom", method: "cheque", hour: 11 },
  ],
  "conduite-plus": [{ studentId: "s-theo", method: "carte", hour: 10 }],
};

function seedPayments(t: TenantState, f: StudentFixture, now: Date) {
  const s = t.students.get(f.id)!;
  const enrolled = new Date(s.profile.enrolledAt);

  if (f.scripted) {
    const d = (offset: number, hour = 10) => parisTime(now, offset, hour);
    seedPayment(t, s, d(-40), "Frais de dossier", t.settings.pricing.registrationFee, 0, "carte");
    seedPayment(t, s, d(-40, 11), `${s.package.name} · 1ᵉʳ versement`, 600, 10, "carte");
    seedPayment(t, s, d(-12), `${s.package.name} · 2ᵉ versement`, 300, 5, "klarna");
    s.installments = [
      { id: "ech-1", label: "1ᵉʳ versement", amount: 600, hours: 10, dueAt: d(-40).toISOString(), status: "payee" },
      { id: "ech-2", label: "2ᵉ versement", amount: 300, hours: 5, dueAt: d(-12).toISOString(), status: "payee" },
      { id: "ech-3", label: "3ᵉ versement", amount: 300, hours: 5, dueAt: d(18).toISOString(), status: "a_venir" },
    ];
    return;
  }

  // Pay exactly what is consumed and booked, plus the fixture's delta, in chunks of 5 h.
  const balance = computeBalance(t, f.id, now);
  let toPay = Math.max(0, balance.consumedHours + balance.reservedHours + f.balanceDelta);
  seedPayment(t, s, enrolled, "Frais de dossier", t.settings.pricing.registrationFee, 0, "carte");
  const hourlyRate = t.settings.pricing.hourlyRate;
  const cash = TODAY_CASH[t.slug]?.find((c) => c.studentId === f.id);
  const chunks: number[] = [];
  while (toPay > 0) {
    chunks.push(Math.min(5, toPay));
    toPay -= 5;
  }
  chunks.forEach((hours, index) => {
    const isLast = index === chunks.length - 1;
    if (isLast && cash) {
      const at = new Date(Math.min(parisTime(now, 0, cash.hour, 20).getTime(), now.getTime() - 30 * 60_000));
      const payment = seedPayment(t, s, at, "Encaissement à l'agence", hours * hourlyRate, hours, cash.method);
      t.cashEntries.push({
        id: `cash-${f.id}`,
        studentId: f.id,
        studentName: fullName(s.profile),
        amount: payment.amount,
        method: cash.method,
        hours,
        createdAt: payment.date,
        createdBy: "Lucie Bernard",
        status: "valide",
        invoiceNumber: payment.invoiceNumber,
      });
      return;
    }
    const span = Math.max(1, Math.round((now.getTime() - enrolled.getTime()) / (24 * HOUR_MS)));
    const date = new Date(enrolled.getTime() + Math.round((span * index) / Math.max(chunks.length, 1)) * 24 * HOUR_MS + HOUR_MS);
    seedPayment(t, s, date, `${s.package.name} · heures de conduite`, hours * hourlyRate, hours, index % 3 === 2 ? "klarna" : "carte");
  });

  // Booked lessons that the payments do not cover wait for a payment.
  let covered = computeBalance(t, f.id, now).availableHours;
  for (const l of t.lessons
    .filter((l) => l.studentId === f.id && COUNTED_TYPES.includes(l.type) && isActive(l) && Date.parse(l.start) > now.getTime())
    .sort((a, b) => a.start.localeCompare(b.start))) {
    covered -= l.durationHours;
    if (covered < 0) l.status = "attente_paiement";
  }
}

/** Accounts with a login (USERS) plus the instructors and pending invitations of the school. */
function seedTeam(slug: string, now: Date): Map<string, MemberRecord> {
  const team = new Map<string, MemberRecord>();
  for (const u of USERS) {
    if (u.tenantSlug !== slug || (u.role !== "gerant" && u.role !== "assistante")) continue;
    team.set(u.id, {
      id: u.id,
      firstName: u.firstName,
      lastName: u.lastName,
      email: u.email,
      role: u.role,
      status: "actif",
      twoFactorEnabled: u.twoFactorEnabled,
      office: null,
      granted: [...(u.grantedPermissions ?? [])],
      revoked: [...(u.revokedPermissions ?? [])],
      lastActiveAt: parisTime(now, 0, 8, 30).toISOString(),
      invitedAt: null,
    });
  }
  for (const m of TEAM_FIXTURES[slug] ?? []) {
    const invited = m.status === "invitation";
    team.set(m.id, {
      id: m.id,
      firstName: m.firstName,
      lastName: m.lastName,
      email: m.email,
      role: m.role,
      status: m.status,
      twoFactorEnabled: m.twoFactorEnabled,
      office: null,
      granted: [],
      revoked: [],
      lastActiveAt: invited ? null : parisTime(now, -m.daysAgo, 9).toISOString(),
      invitedAt: invited ? parisTime(now, -m.daysAgo, 15).toISOString() : null,
    });
  }
  return team;
}

function seedTenant(slug: string, now: Date): TenantState {
  const staff = STAFF[slug] ?? STAFF[DEFAULT_TENANT_SLUG];
  const fixtures = STUDENTS[slug] ?? [];
  const pricing = structuredClone(DEFAULT_PRICING);
  const subscription = SUBSCRIPTIONS[slug] ?? SUBSCRIPTIONS[DEFAULT_TENANT_SLUG];
  const t: TenantState = {
    slug,
    staff,
    settings: { pricing, rules: structuredClone(DEFAULT_RULES), offices: [...(OFFICES[slug] ?? [])] },
    team: seedTeam(slug, now),
    subscription: {
      planId: subscription.planId,
      status: subscription.status,
      renewsAt: parisTime(now, subscription.renewsInDays, 0).toISOString(),
    },
    students: new Map(),
    lessons: [],
    invoices: [],
    leaves: [
      {
        id: `leave-${staff.instructors[1].id}`,
        instructorId: staff.instructors[1].id,
        start: parisTime(now, 3, 0).toISOString(),
        end: parisTime(now, 6, 0).toISOString(),
        reason: "Congés",
      },
    ],
    cashEntries: [],
    imports: new Map(),
    audit: [],
    invoiceSeq: 61,
    lessonSeq: 0,
    seq: 0,
  };

  const offer = pricing.packages.find((p) => p.id === DEFAULT_PACKAGE_ID)!;
  for (const f of fixtures) {
    t.students.set(f.id, {
      profile: buildProfile(f, staff, now),
      package: { id: offer.id, name: offer.name, hours: offer.hours, price: offer.price },
      payments: [],
      installments: [],
      requiredDocuments: buildDocuments(f, now),
      downloadables: buildDownloadables(f, now),
    });
  }
  for (const f of fixtures.filter((f) => f.scripted)) t.lessons.push(...scriptedLessons(t, f.id, now));
  generateLessons(t, fixtures.filter((f) => !f.scripted), now);
  for (const f of fixtures) seedPayments(t, f, now);

  // One invoice sequence per school, without gaps, in date order.
  const numbers = new Map<string, string>();
  for (const invoice of [...t.invoices].sort((a, b) => a.issuedAt.localeCompare(b.issuedAt))) {
    invoice.number = invoiceNumber(invoice.issuedAt, t.invoiceSeq++);
    numbers.set(invoice.id, invoice.number);
  }
  for (const s of t.students.values()) {
    for (const p of s.payments) p.invoiceNumber = numbers.get(p.invoiceNumber) ?? p.invoiceNumber;
  }
  for (const c of t.cashEntries) c.invoiceNumber = c.invoiceNumber && (numbers.get(c.invoiceNumber) ?? c.invoiceNumber);

  // A large cash payment waiting for the gérant's validation.
  const waiting = fixtures.find((f) => !f.scripted && f.balanceDelta < 0);
  if (waiting && slug === DEFAULT_TENANT_SLUG) {
    const s = t.students.get(waiting.id)!;
    t.cashEntries.push({
      id: `cash-${waiting.id}-attente`,
      studentId: waiting.id,
      studentName: fullName(s.profile),
      amount: 600,
      method: "cheque",
      hours: 10,
      note: "Chèque à l'ordre de l'auto-école, encaissement demandé le 5 du mois.",
      createdAt: new Date(Math.min(parisTime(now, 0, 12, 5).getTime(), now.getTime() - 10 * 60_000)).toISOString(),
      createdBy: "Lucie Bernard",
      status: "a_valider",
    });
  }
  // A few past changes, so the journal of the settings is not empty.
  const gerant = USERS.find((u) => u.tenantSlug === slug && u.role === "gerant");
  if (gerant) {
    logAudit(t, fullName(gerant), "tarifs", "Tarif horaire : 58 € → 60 €", parisTime(now, -20, 9, 12));
    logAudit(t, fullName(gerant), "regles", "Délai d'annulation gratuite : 24 h → 48 h", parisTime(now, -14, 18, 40));
  }
  return t;
}

// ---------------------------------------------------------------------------
// Balance

function computeBalance(t: TenantState, studentId: string, now: Date): Balance {
  const s = t.students.get(studentId);
  const nowIso = now.toISOString();
  const lowThresholdHours = t.settings.rules.lowBalanceThresholdHours;
  const counted = t.lessons.filter((l) => l.studentId === studentId && COUNTED_TYPES.includes(l.type));
  const payments = s?.payments ?? [];

  const paidAmount = payments.filter((p) => p.hours > 0).reduce((sum, p) => sum + p.amount, 0);
  const paidHours = payments.reduce((sum, p) => sum + p.hours, 0);
  const consumedHours =
    counted.filter((l) => l.status === "effectue").reduce((sum, l) => sum + l.durationHours, 0) +
    counted.reduce((sum, l) => sum + (l.chargedHours ?? 0), 0);
  const reservedHours = counted.filter((l) => l.start > nowIso && isActive(l)).reduce((sum, l) => sum + l.durationHours, 0);

  const availableHours = paidHours - consumedHours;
  const afterReservationsHours = availableHours - reservedHours;
  const toCoverHours = Math.max(0, reservedHours - availableHours);

  let state: BalanceState = "ok";
  if (availableHours < 0) state = "overdrawn";
  else if (afterReservationsHours < 0) state = "uncovered";
  else if (afterReservationsHours === 0) state = "exhausted";
  else if (afterReservationsHours <= lowThresholdHours) state = "low";

  const pkg = s?.package;
  return {
    packageName: pkg?.name ?? "",
    packageHours: pkg?.hours ?? 0,
    packagePrice: pkg?.price ?? 0,
    hourlyRate: t.settings.pricing.hourlyRate,
    paidAmount,
    paidHours,
    consumedHours,
    reservedHours,
    availableHours,
    afterReservationsHours,
    toCoverHours,
    lowThresholdHours,
    state,
  };
}

// ---------------------------------------------------------------------------
// Conflicts (shared by the student booking and the staff planning)

type Candidate = {
  start: number;
  end: number;
  instructorId: string;
  vehicleId: string | null;
  studentId: string;
  ignoreLessonId?: string;
};

/** Ready-to-display reasons why a lesson cannot take place on this range (empty when it can). */
function findConflicts(t: TenantState, c: Candidate): string[] {
  const messages = new Set<string>();
  const instructorName = (id: string) => {
    const i = t.staff.instructors.find((x) => x.id === id);
    return i ? fullName(i) : "Le moniteur";
  };
  const studentName = (id: string) => {
    const s = t.students.get(id);
    return s ? fullName(s.profile) : "l'élève";
  };

  const leave = onLeave(t, c.instructorId, c.start, c.end);
  if (leave) messages.add(`${instructorName(c.instructorId)} est en congé sur ce créneau.`);

  for (const l of t.lessons) {
    if (l.id === c.ignoreLessonId || !occupies(l) || !overlaps(l, c.start, c.end)) continue;
    const range = formatTimeRange(l.start, l.end);
    if (l.instructor.id === c.instructorId) {
      messages.add(`${instructorName(c.instructorId)} a déjà une leçon de ${range} avec ${studentName(l.studentId)}.`);
    } else if (c.vehicleId && l.vehicle?.id === c.vehicleId) {
      messages.add(`La ${l.vehicle.label} est déjà utilisée de ${range} par ${instructorName(l.instructor.id)}.`);
    }
    if (l.studentId === c.studentId && l.instructor.id !== c.instructorId) {
      messages.add(`${studentName(c.studentId)} a déjà une leçon de ${range}.`);
    }
  }
  return [...messages];
}

// ---------------------------------------------------------------------------
// Student reads

export function readProfile(userId: string, now: Date): StudentProfile {
  return studentContext(userId, now).s.profile;
}

export function readLessons(userId: string, now: Date): Lesson[] {
  const { t } = studentContext(userId, now);
  return t.lessons.filter((l) => l.studentId === userId).sort((a, b) => a.start.localeCompare(b.start));
}

export function readBalance(userId: string, now: Date): Balance {
  const { t } = studentContext(userId, now);
  return computeBalance(t, userId, now);
}

export function readAvailableSlots(userId: string, now: Date): Slot[] {
  const { t, s } = studentContext(userId, now);
  const rules = t.settings.rules.booking;
  const restricted = rules.restrictedToReferent || s.profile.restrictedToReferent;
  const instructors = restricted ? [s.profile.referentInstructor] : t.staff.instructors;
  const earliest = now.getTime() + rules.minNoticeHours * HOUR_MS;
  const gearbox = gearboxOf(s.profile);
  const slots: Slot[] = [];

  for (let day = 1; day <= 14; day++) {
    const weekday = parisWeekday(now, day);
    if (weekday === 0) continue;
    const hours = weekday === 6 ? GENERATED_HOURS.saturday : GENERATED_HOURS.weekday;
    for (const instructor of instructors) {
      for (const hour of hours) {
        const start = parisTime(now, day, hour);
        const end = start.getTime() + 2 * HOUR_MS;
        if (start.getTime() < earliest) continue;
        const vehicle = freeVehicle(t, gearbox, start.getTime(), end);
        if (!vehicle) continue;
        const candidate = { start: start.getTime(), end, instructorId: instructor.id, vehicleId: vehicle.id, studentId: userId };
        if (findConflicts(t, candidate).length > 0) continue;
        slots.push({
          id: `${instructor.id}_${start.toISOString()}`,
          start: start.toISOString(),
          end: new Date(end).toISOString(),
          durationHours: 2,
          instructor,
          meetingPoint: t.staff.meetingPoints[instructor.id],
        });
      }
    }
  }
  return slots.sort((a, b) => a.start.localeCompare(b.start) || a.instructor.lastName.localeCompare(b.instructor.lastName));
}

export function readInvoices(userId: string, now: Date): Invoice[] {
  const { t } = studentContext(userId, now);
  return t.invoices
    .filter((i) => i.studentId === userId)
    .map(publicInvoice)
    .sort((a, b) => b.issuedAt.localeCompare(a.issuedAt));
}

export function readPayments(userId: string, now: Date): Payment[] {
  return [...studentContext(userId, now).s.payments].sort((a, b) => b.date.localeCompare(a.date));
}

export function readInstallments(userId: string, now: Date): Installment[] {
  const nowIso = now.toISOString();
  return studentContext(userId, now).s.installments.map((i) =>
    i.status === "a_venir" && i.dueAt < nowIso ? { ...i, status: "en_retard" as const } : i,
  );
}

/** Booking rules of the student's auto-école. */
export function readBookingRules(userId: string, now: Date): BookingRules {
  return studentContext(userId, now).t.settings.rules.booking;
}

export function readHourPacks(userId: string, now: Date): HourPack[] {
  return studentContext(userId, now).t.settings.pricing.hourPacks;
}

export function readRequiredDocuments(userId: string, now: Date): RequiredDocument[] {
  return studentContext(userId, now).s.requiredDocuments;
}

export function readDownloadables(userId: string, now: Date): DownloadableDocument[] {
  return studentContext(userId, now).s.downloadables;
}

export function readDeletionRequest(userId: string, now: Date): string | null {
  return studentContext(userId, now).s.deletionRequestedAt ?? null;
}

// ---------------------------------------------------------------------------
// Student mutations

export function writeBookSlot(
  userId: string,
  slotId: string,
  now: Date,
  options: { acceptPendingPayment?: boolean } = {},
): ActionResult<{ lesson: Lesson }> {
  const { t, s } = studentContext(userId, now);
  const slot = readAvailableSlots(userId, now).find((x) => x.id === slotId);
  if (!slot) {
    return { ok: false, code: "creneau_indisponible", error: "Ce créneau n'est plus disponible. Choisissez-en un autre." };
  }

  const week = parisWeekKey(new Date(slot.start));
  const lessonsThatWeek = t.lessons.filter(
    (l) => l.studentId === userId && COUNTED_TYPES.includes(l.type) && isActive(l) && parisWeekKey(new Date(l.start)) === week,
  ).length;
  const { maxLessonsPerWeek } = t.settings.rules.booking;
  if (lessonsThatWeek >= maxLessonsPerWeek) {
    return {
      ok: false,
      code: "limite_hebdomadaire",
      error: `Vous avez déjà ${maxLessonsPerWeek} leçons cette semaine-là, le maximum fixé par l'auto-école.`,
    };
  }

  const balance = computeBalance(t, userId, now);
  const uncovered = balance.afterReservationsHours - slot.durationHours < 0;
  if (uncovered && !options.acceptPendingPayment) {
    return {
      ok: false,
      code: "solde_insuffisant",
      error: `Votre solde ne couvre pas cette leçon de ${slot.durationHours} h. Réglez des heures, ou envoyez la demande à l'auto-école pour validation.`,
    };
  }

  const start = new Date(slot.start);
  const vehicle = freeVehicle(t, gearboxOf(s.profile), start.getTime(), Date.parse(slot.end));
  if (!vehicle) {
    return { ok: false, code: "creneau_indisponible", error: "Ce créneau n'est plus disponible. Choisissez-en un autre." };
  }
  const booked = newLesson(t, {
    studentId: userId,
    type: "conduite",
    status: uncovered ? "attente_paiement" : "confirme",
    start,
    hours: slot.durationHours,
    instructor: slot.instructor,
    vehicle,
    meetingPoint: slot.meetingPoint,
  });
  t.lessons.push(booked);
  return { ok: true, data: { lesson: booked } };
}

function cancel(t: TenantState, target: Lesson, now: Date, options: { noShow?: boolean } = {}) {
  const late = now.toISOString() > target.freeCancellationUntil;
  const charged =
    COUNTED_TYPES.includes(target.type) &&
    target.status === "confirme" &&
    (options.noShow || (late && t.settings.rules.booking.lateCancellationCharged));
  const chargedHours = charged ? target.durationHours : 0;
  target.status = "annule";
  target.chargedHours = chargedHours || undefined;
  target.noShow = options.noShow || undefined;
  return { late, chargedHours };
}

export function writeCancelLesson(
  userId: string,
  lessonId: string,
  now: Date,
): ActionResult<{ late: boolean; chargedHours: number }> {
  const { t } = studentContext(userId, now);
  const target = t.lessons.find((l) => l.id === lessonId && l.studentId === userId);
  if (!target || target.start <= now.toISOString()) {
    return { ok: false, code: "introuvable", error: "Cette leçon ne peut plus être annulée." };
  }
  if (!isActive(target)) {
    return { ok: false, code: "deja_annulee", error: "Cette leçon est déjà annulée." };
  }
  return { ok: true, data: cancel(t, target, now) };
}

export function recordPayment(
  t: TenantState,
  studentId: string,
  now: Date,
  label: string,
  amount: number,
  hours: number,
  method: PaymentMethod,
): Invoice {
  const s = t.students.get(studentId)!;
  const issuedAt = now.toISOString();
  const seq = t.invoiceSeq++;
  const invoice = { id: `inv-${t.slug}-${seq}`, studentId, number: invoiceNumber(issuedAt, seq), label, amount, issuedAt, status: "payee" as const };
  t.invoices.push(invoice);
  s.payments.push({ id: `pay-${t.slug}-${seq}`, date: issuedAt, amount, method, hours, invoiceNumber: invoice.number });
  // Booked lessons that were waiting for payment become confirmed once covered.
  let covered = computeBalance(t, studentId, now).availableHours;
  for (const l of t.lessons
    .filter((l) => l.studentId === studentId && COUNTED_TYPES.includes(l.type) && isActive(l) && l.start > issuedAt)
    .sort((a, b) => a.start.localeCompare(b.start))) {
    covered -= l.durationHours;
    if (l.status === "attente_paiement" && covered >= 0) l.status = "confirme";
  }
  return publicInvoice(invoice);
}

export function writePurchasePack(
  userId: string,
  packId: string,
  method: PaymentMethod,
  now: Date,
): ActionResult<{ invoice: Invoice }> {
  const { t } = studentContext(userId, now);
  const pack = t.settings.pricing.hourPacks.find((p) => p.id === packId);
  if (!pack) return { ok: false, code: "introuvable", error: "Cette offre n'existe plus." };
  return { ok: true, data: { invoice: recordPayment(t, userId, now, pack.label, pack.price, pack.hours, method) } };
}

export function writePayInstallment(
  userId: string,
  installmentId: string,
  method: PaymentMethod,
  now: Date,
): ActionResult<{ invoice: Invoice }> {
  const { t, s } = studentContext(userId, now);
  const installment = s.installments.find((i) => i.id === installmentId);
  if (!installment || installment.status === "payee") {
    return { ok: false, code: "introuvable", error: "Cette échéance est déjà réglée." };
  }
  installment.status = "payee";
  const invoice = recordPayment(t, userId, now, `${s.package.name} · ${installment.label}`, installment.amount, installment.hours, method);
  return { ok: true, data: { invoice } };
}

export function writeUploadDocument(
  userId: string,
  documentId: string,
  fileName: string,
  now: Date,
): ActionResult<{ document: RequiredDocument }> {
  const doc = studentContext(userId, now).s.requiredDocuments.find((d) => d.id === documentId);
  if (!doc) return { ok: false, code: "introuvable", error: "Pièce inconnue." };
  if (doc.status === "valide") {
    return { ok: false, code: "deja_valide", error: "Cette pièce est déjà validée par l'auto-école." };
  }
  doc.status = "en_verification";
  doc.fileName = fileName;
  doc.uploadedAt = now.toISOString();
  doc.rejectionReason = undefined;
  return { ok: true, data: { document: doc } };
}

export function writeContactDetails(
  userId: string,
  input: Pick<StudentProfile, "email" | "phone" | "phoneSecondary" | "address">,
  now: Date,
): ActionResult<{ profile: StudentProfile }> {
  const { s } = studentContext(userId, now);
  s.profile = { ...s.profile, ...input };
  return { ok: true, data: { profile: s.profile } };
}

export function writeDeletionRequest(userId: string, now: Date): ActionResult {
  const { s } = studentContext(userId, now);
  s.deletionRequestedAt ??= now.toISOString();
  return { ok: true };
}

// ---------------------------------------------------------------------------
// Staff reads (gérant / assistante). Rights are checked by src/lib/api/gestion.ts.

function summary(t: TenantState, studentId: string, now: Date): StudentSummary {
  const p = t.students.get(studentId)!.profile;
  const balance = computeBalance(t, studentId, now);
  return {
    id: p.id,
    firstName: p.firstName,
    lastName: p.lastName,
    phone: p.phone,
    neph: p.neph,
    balanceState: balance.state,
    afterReservationsHours: balance.afterReservationsHours,
  };
}

export function readPlanning(tenantSlug: string, now: Date, fromIso: string, toIso: string): Planning {
  const t = tenantState(tenantSlug, now);
  const from = Date.parse(fromIso);
  const to = Date.parse(toIso);
  const lessons: PlanningLesson[] = t.lessons
    .filter((l) => overlaps(l, from, to))
    .sort((a, b) => a.start.localeCompare(b.start))
    .map((l) => ({ ...l, student: summary(t, l.studentId, now) }));
  return {
    now: now.toISOString(),
    instructors: t.staff.instructors,
    vehicles: t.staff.vehicles,
    lessons,
    leaves: t.leaves.filter((l) => overlaps(l, from, to)),
  };
}

export function readStudentRows(tenantSlug: string, now: Date): StudentRow[] {
  const t = tenantState(tenantSlug, now);
  const nowIso = now.toISOString();
  return [...t.students.values()]
    .map(({ profile: p, requiredDocuments: docs }) => {
      const balance = computeBalance(t, p.id, now);
      const next = t.lessons
        .filter((l) => l.studentId === p.id && isActive(l) && l.start > nowIso)
        .sort((a, b) => a.start.localeCompare(b.start))[0];
      const count = (status: DocumentStatus) => docs.filter((d) => d.status === status).length;
      return {
        id: p.id,
        firstName: p.firstName,
        lastName: p.lastName,
        neph: p.neph,
        phone: p.phone,
        email: p.email,
        office: p.office,
        isMinor: p.isMinor,
        referent: p.referentInstructor,
        balance: {
          state: balance.state,
          afterReservationsHours: balance.afterReservationsHours,
          toCoverHours: balance.toCoverHours,
        },
        documents: {
          total: docs.length,
          validated: count("valide"),
          toReview: count("en_verification"),
          missing: count("manquant"),
          refused: count("refuse"),
        },
        nextLesson: next?.start ?? null,
        archived: p.archived,
      };
    })
    .sort((a, b) => a.lastName.localeCompare(b.lastName, "fr"));
}

export function readStudentFile(tenantSlug: string, studentId: string, now: Date): StudentFile | null {
  const t = tenantState(tenantSlug, now);
  const s = t.students.get(studentId);
  if (!s) return null;
  const nowIso = now.toISOString();
  const lessons = t.lessons.filter((l) => l.studentId === studentId).sort((a, b) => a.start.localeCompare(b.start));
  const upcoming = lessons.filter((l) => l.start > nowIso && isActive(l));
  const history = lessons.filter((l) => !(l.start > nowIso && isActive(l))).reverse();
  return {
    now: nowIso,
    profile: s.profile,
    balance: computeBalance(t, studentId, now),
    upcoming,
    history,
    documents: s.requiredDocuments,
    payments: [...s.payments].sort((a, b) => b.date.localeCompare(a.date)),
    stats: {
      lastLesson: history.find((l) => l.status === "effectue") ?? null,
      nextLesson: upcoming[0] ?? null,
      noShows: lessons.filter((l) => l.noShow).length,
    },
  };
}

/** Students that can be picked in a form (not archived), sorted by last name. */
export function readStudentChoices(tenantSlug: string, now: Date): Array<{ id: string; name: string; gearbox: Vehicle["gearbox"] }> {
  const t = tenantState(tenantSlug, now);
  return [...t.students.values()]
    .filter((s) => !s.profile.archived)
    .sort((a, b) => a.profile.lastName.localeCompare(b.profile.lastName, "fr"))
    .map((s) => ({ id: s.profile.id, name: `${s.profile.lastName} ${s.profile.firstName}`, gearbox: gearboxOf(s.profile) }));
}

/** Cash entries of the current Paris day, latest first. */
export function readCashDay(
  tenantSlug: string,
  now: Date,
): { now: string; threshold: number; hourlyRate: number; entries: CashEntry[] } {
  const t = tenantState(tenantSlug, now);
  const dayStart = parisTime(now, 0, 0).getTime();
  const dayEnd = parisTime(now, 1, 0).getTime();
  return {
    now: now.toISOString(),
    threshold: t.settings.rules.cashValidationThreshold,
    hourlyRate: t.settings.pricing.hourlyRate,
    entries: t.cashEntries
      .filter((c) => Date.parse(c.createdAt) >= dayStart && Date.parse(c.createdAt) < dayEnd)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
  };
}

// ---------------------------------------------------------------------------
// Staff mutations

export type LessonInput = {
  studentId: string;
  type: LessonType;
  instructorId: string;
  /** null: no vehicle (code lesson). "auto": first free vehicle with the student's gearbox. */
  vehicleId: string | null | "auto";
  start: string;
  durationHours: number;
};

function resolveVehicle(
  t: TenantState,
  input: Pick<LessonInput, "vehicleId" | "type" | "studentId">,
  start: number,
  end: number,
  ignoreLessonId?: string,
): Vehicle | null | undefined {
  if (input.type === "code" || input.vehicleId === null) return null;
  if (input.vehicleId === "auto") {
    const gearbox = gearboxOf(t.students.get(input.studentId)!.profile);
    return freeVehicle(t, gearbox, start, end, ignoreLessonId) ?? t.staff.vehicles.find((v) => v.gearbox === gearbox);
  }
  return t.staff.vehicles.find((v) => v.id === input.vehicleId);
}

/**
 * Creates a lesson from the staff planning. Code "conflit" lists the conflicts in `error`;
 * `force` saves anyway (the API only allows it with "planning.forcer").
 */
export function writeCreateLesson(
  tenantSlug: string,
  input: LessonInput,
  now: Date,
  options: { force?: boolean } = {},
): ActionResult<{ lesson: Lesson; pendingPayment: boolean }> {
  const t = tenantState(tenantSlug, now);
  if (!t.students.has(input.studentId)) return { ok: false, code: "introuvable", error: "Élève introuvable." };
  const instructor = t.staff.instructors.find((i) => i.id === input.instructorId);
  if (!instructor) return { ok: false, code: "introuvable", error: "Moniteur introuvable." };
  const start = Date.parse(input.start);
  if (Number.isNaN(start)) return { ok: false, code: "date_invalide", error: "Date ou heure invalide." };
  if (start <= now.getTime()) return { ok: false, code: "date_passee", error: "Ce créneau est déjà passé." };
  const end = start + input.durationHours * HOUR_MS;
  const vehicle = resolveVehicle(t, input, start, end);
  if (vehicle === undefined) return { ok: false, code: "introuvable", error: "Véhicule introuvable." };

  const conflicts = findConflicts(t, { start, end, instructorId: instructor.id, vehicleId: vehicle?.id ?? null, studentId: input.studentId });
  if (conflicts.length > 0 && !options.force) return { ok: false, code: "conflit", error: conflicts.join("\n") };

  const counted = COUNTED_TYPES.includes(input.type);
  const pendingPayment = counted && computeBalance(t, input.studentId, now).afterReservationsHours - input.durationHours < 0;
  const lesson = newLesson(t, {
    studentId: input.studentId,
    type: input.type,
    status: pendingPayment ? "attente_paiement" : "confirme",
    start: new Date(start),
    hours: input.durationHours,
    instructor,
    vehicle,
  });
  t.lessons.push(lesson);
  return { ok: true, data: { lesson, pendingPayment } };
}

/** Moves a lesson (drag and drop or edit). Same conflict rules as writeCreateLesson. */
export function writeMoveLesson(
  tenantSlug: string,
  lessonId: string,
  move: { start: string; instructorId: string },
  now: Date,
  options: { force?: boolean } = {},
): ActionResult<{ lesson: Lesson }> {
  const t = tenantState(tenantSlug, now);
  const lesson = t.lessons.find((l) => l.id === lessonId);
  if (!lesson || !isActive(lesson)) return { ok: false, code: "introuvable", error: "Ce RDV ne peut plus être déplacé." };
  const instructor = t.staff.instructors.find((i) => i.id === move.instructorId);
  if (!instructor) return { ok: false, code: "introuvable", error: "Moniteur introuvable." };
  const start = Date.parse(move.start);
  if (Number.isNaN(start)) return { ok: false, code: "date_invalide", error: "Date ou heure invalide." };
  if (start <= now.getTime()) return { ok: false, code: "date_passee", error: "Ce créneau est déjà passé." };
  const end = start + lesson.durationHours * HOUR_MS;

  // Keep the vehicle when it is free, otherwise take another one with the same gearbox.
  let vehicle = lesson.vehicle;
  if (vehicle) {
    const busy = t.lessons.some((l) => l.id !== lesson.id && occupies(l) && l.vehicle?.id === vehicle!.id && overlaps(l, start, end));
    if (busy) vehicle = freeVehicle(t, vehicle.gearbox, start, end, lesson.id) ?? vehicle;
  }

  const conflicts = findConflicts(t, {
    start,
    end,
    instructorId: instructor.id,
    vehicleId: vehicle?.id ?? null,
    studentId: lesson.studentId,
    ignoreLessonId: lesson.id,
  });
  if (conflicts.length > 0 && !options.force) return { ok: false, code: "conflit", error: conflicts.join("\n") };

  const instructorChanged = lesson.instructor.id !== instructor.id;
  lesson.start = new Date(start).toISOString();
  lesson.end = new Date(end).toISOString();
  lesson.instructor = instructor;
  lesson.vehicle = vehicle;
  if (instructorChanged && vehicle) lesson.meetingPoint = t.staff.meetingPoints[instructor.id];
  lesson.freeCancellationUntil = new Date(start - t.settings.rules.booking.freeCancellationHours * HOUR_MS).toISOString();
  return { ok: true, data: { lesson } };
}

/** "effectue" (only once started) or "annule" (a no-show is charged like a late cancellation). */
export function writeLessonStatus(
  tenantSlug: string,
  lessonId: string,
  status: "effectue" | "annule",
  now: Date,
  options: { noShow?: boolean } = {},
): ActionResult<{ chargedHours: number }> {
  const t = tenantState(tenantSlug, now);
  const lesson = t.lessons.find((l) => l.id === lessonId);
  if (!lesson || !isActive(lesson)) return { ok: false, code: "introuvable", error: "Ce RDV n'est plus modifiable." };
  if (status === "effectue") {
    if (lesson.start > now.toISOString()) {
      return { ok: false, code: "pas_commence", error: "Une leçon ne peut être marquée effectuée qu'une fois commencée." };
    }
    lesson.status = "effectue";
    return { ok: true, data: { chargedHours: 0 } };
  }
  const { chargedHours } = cancel(t, lesson, now, options);
  return { ok: true, data: { chargedHours } };
}

export function writeReviewDocument(
  tenantSlug: string,
  studentId: string,
  documentId: string,
  decision: "valide" | "refuse",
  reason: string | undefined,
  now: Date,
): ActionResult<{ document: RequiredDocument }> {
  const s = tenantState(tenantSlug, now).students.get(studentId);
  const doc = s?.requiredDocuments.find((d) => d.id === documentId);
  if (!doc) return { ok: false, code: "introuvable", error: "Pièce introuvable." };
  if (doc.status !== "en_verification") {
    return { ok: false, code: "deja_traitee", error: "Cette pièce n'est plus en attente de vérification." };
  }
  doc.status = decision;
  doc.rejectionReason = decision === "refuse" ? reason : undefined;
  return { ok: true, data: { document: doc } };
}

export function writeArchiveStudent(tenantSlug: string, studentId: string, archived: boolean, now: Date): ActionResult {
  const s = tenantState(tenantSlug, now).students.get(studentId);
  if (!s) return { ok: false, code: "introuvable", error: "Élève introuvable." };
  s.profile = { ...s.profile, archived };
  return { ok: true };
}

/**
 * Records a payment taken at the agency. Above the threshold, it waits for someone with
 * "caisse.valider" (the hours and the invoice only come once validated).
 */
export function writeCashEntry(
  tenantSlug: string,
  actor: User,
  input: { studentId: string; amount: number; method: CashMethod; hours: number; note?: string },
  now: Date,
): ActionResult<{ entry: CashEntry }> {
  const t = tenantState(tenantSlug, now);
  const s = t.students.get(input.studentId);
  if (!s) return { ok: false, code: "introuvable", error: "Élève introuvable." };
  const needsValidation = input.amount > t.settings.rules.cashValidationThreshold && !actor.permissions.includes("caisse.valider");
  const entry: CashEntry = {
    id: `cash-${t.slug}-${t.cashEntries.length + 1}-${now.getTime()}`,
    studentId: input.studentId,
    studentName: fullName(s.profile),
    amount: input.amount,
    method: input.method,
    hours: input.hours,
    note: input.note || undefined,
    createdAt: now.toISOString(),
    createdBy: fullName(actor),
    status: needsValidation ? "a_valider" : "valide",
  };
  if (!needsValidation) {
    entry.invoiceNumber = recordPayment(t, input.studentId, now, "Encaissement à l'agence", input.amount, input.hours, input.method).number;
  }
  t.cashEntries.push(entry);
  return { ok: true, data: { entry } };
}

export function writeReviewCashEntry(
  tenantSlug: string,
  actor: User,
  entryId: string,
  decision: "valide" | "refuse",
  now: Date,
): ActionResult<{ entry: CashEntry }> {
  const t = tenantState(tenantSlug, now);
  const entry = t.cashEntries.find((c) => c.id === entryId);
  if (!entry || entry.status !== "a_valider") {
    return { ok: false, code: "deja_traite", error: "Cet encaissement a déjà été traité." };
  }
  entry.status = decision;
  entry.reviewedBy = fullName(actor);
  if (decision === "valide") {
    entry.invoiceNumber = recordPayment(t, entry.studentId, now, "Encaissement à l'agence", entry.amount, entry.hours, entry.method).number;
  }
  return { ok: true, data: { entry } };
}

// ---------------------------------------------------------------------------
// Shared with the admin mock modules (students-admin.ts, imports.ts, settings.ts)

/** Id for anything created at runtime in this school. */
export function nextId(t: TenantState, prefix: string): string {
  return `${prefix}-${t.slug}-${++t.seq}`;
}

/** Sensitive changes are logged: who, what, when (spec, section 1). Newest first. */
export function logAudit(t: TenantState, actor: string, category: AuditEntry["category"], summary: string, now: Date): AuditEntry {
  const entry: AuditEntry = { id: nextId(t, "audit"), at: now.toISOString(), actor, category, summary };
  t.audit.unshift(entry);
  return entry;
}

/** Full years at `now`, from a "YYYY-MM-DD" or ISO birth date. */
export function ageAt(birthDate: string, now: Date): number {
  const [y, m, d] = birthDate.slice(0, 10).split("-").map(Number);
  const [ny, nm, nd] = parisTime(now, 0, 12).toISOString().slice(0, 10).split("-").map(Number);
  return ny - y - (nm < m || (nm === m && nd < d) ? 1 : 0);
}

/** Another student of the school with the same e-mail or NEPH, if any. */
export function findDuplicateStudent(
  t: TenantState,
  candidate: { email?: string | null; neph?: string | null },
  ignoreId?: string,
): { field: "email" | "neph"; student: StudentRecord } | null {
  const email = candidate.email?.trim().toLowerCase();
  const neph = candidate.neph?.replace(/\s/g, "");
  for (const s of t.students.values()) {
    if (s.profile.id === ignoreId) continue;
    if (email && s.profile.email.toLowerCase() === email) return { field: "email", student: s };
    if (neph && s.profile.neph === neph) return { field: "neph", student: s };
  }
  return null;
}

export function readOffices(tenantSlug: string, now: Date): string[] {
  return tenantState(tenantSlug, now).settings.offices;
}

export function planOf(t: TenantState) {
  return PLATFORM_PLANS.find((p) => p.id === t.subscription.planId) ?? PLATFORM_PLANS[0];
}

/** Usage of the plan's limits. Archived students and deactivated instructors do not count. */
export function readQuotas(tenantSlug: string, now: Date): Quota[] {
  const t = tenantState(tenantSlug, now);
  const { limits } = planOf(t);
  const students = [...t.students.values()].filter((s) => !s.profile.archived).length;
  const instructors = [...t.team.values()].filter((m) => m.role === "moniteur" && m.status !== "desactive").length;
  return [
    { key: "students", label: "Élèves actifs", used: students, limit: limits.students },
    { key: "instructors", label: "Moniteurs", used: instructors, limit: limits.instructors },
    { key: "offices", label: "Sites", used: t.settings.offices.length, limit: limits.offices },
  ];
}

/**
 * Creates the student record of an already validated input (callers check rights, quota,
 * duplicates and fields first). Every required document starts as "manquant".
 */
export function insertStudent(t: TenantState, input: NewStudentInput, now: Date, origin: { importId?: string } = {}): StudentRecord {
  const offer = t.settings.pricing.packages.find((p) => p.id === input.packageId);
  if (!offer) throw new Error(`Unknown package ${input.packageId}`);
  const referent = t.staff.instructors.find((i) => i.id === input.referentInstructorId) ?? t.staff.instructors[0];
  const id = nextId(t, "s");
  const record: StudentRecord = {
    profile: {
      id,
      firstName: input.firstName,
      lastName: input.lastName,
      birthDate: `${input.birthDate.slice(0, 10)}T00:00:00.000Z`,
      birthPlace: input.birthPlace,
      gender: input.gender,
      neph: input.neph,
      email: input.email,
      phone: input.phone,
      phoneSecondary: input.phoneSecondary,
      address: input.address,
      office: input.office,
      licence: input.licence,
      studentType: input.studentType,
      financer: input.financer,
      accelerated: input.accelerated,
      enrolledAt: now.toISOString(),
      isMinor: ageAt(input.birthDate, now) < 18,
      legalGuardian: input.legalGuardian,
      referentInstructor: referent,
      restrictedToReferent: input.restrictedToReferent,
      availabilities: input.availabilities,
      archived: false,
    },
    package: { id: offer.id, name: offer.name, hours: offer.hours, price: offer.price },
    payments: [],
    installments: [],
    requiredDocuments: REQUIRED_DOCUMENTS.map((d) => ({
      id: d.id,
      label: d.label,
      description: d.description,
      status: "manquant" as const,
      sensitive: d.sensitive,
    })),
    downloadables: [],
    importId: origin.importId,
  };
  t.students.set(id, record);
  return record;
}
