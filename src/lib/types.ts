// Domain types shared by the whole frontend. They mirror what the API will return;
// dates are ISO 8601 strings so they can cross the server/client boundary.

export type Role = "super_admin" | "gerant" | "assistante" | "moniteur" | "eleve" | "parent";

/**
 * Fine-grained rights. Each role has defaults (spec section 1) and the gérant can open or close a
 * right for one person: the UI must test permissions, never the role name.
 */
export type Permission =
  | "planning.voir"
  | "planning.gerer"
  /** Save a lesson despite an instructor/vehicle/leave conflict. */
  | "planning.forcer"
  | "eleves.voir"
  | "eleves.gerer"
  | "documents.valider"
  | "caisse.encaisser"
  /** Validate cash entries above the threshold set by the gérant. */
  | "caisse.valider"
  | "finances.voir"
  /** Packages (formules), hourly rate, registration fee, hour packs. */
  | "tarifs.gerer"
  /** Booking and cancellation rules, low-balance and cash-validation thresholds. */
  | "regles.gerer"
  /** Team accounts and per-person rights. */
  | "equipe.gerer"
  /** The school's own subscription to the platform (plan, quotas). */
  | "abonnement.gerer";

export type Tenant = {
  slug: string;
  name: string;
  /** Two letters shown in the logo square when the school has no logo yet. */
  logoInitials: string;
  /** Hex color, validated before being injected as --brand. */
  brandColor: string;
  city: string;
  phone: string;
  email: string;
};

export type User = {
  id: string;
  tenantSlug: string;
  role: Role;
  firstName: string;
  lastName: string;
  email: string;
  twoFactorEnabled: boolean;
  /** Effective rights (role defaults + per-person overrides). Empty for students and parents. */
  permissions: Permission[];
};

export type Instructor = {
  id: string;
  firstName: string;
  lastName: string;
};

export type Vehicle = {
  id: string;
  label: string;
  plate: string;
  gearbox: "manuelle" | "automatique";
};

export type LessonType = "conduite" | "code" | "examen_blanc" | "examen";

export type LessonStatus = "confirme" | "effectue" | "annule" | "attente_paiement";

export type Lesson = {
  id: string;
  studentId: string;
  type: LessonType;
  status: LessonStatus;
  start: string;
  end: string;
  durationHours: number;
  instructor: Instructor;
  vehicle: Vehicle | null;
  meetingPoint: string;
  /** After this instant, cancelling may be charged (see BookingRules). */
  freeCancellationUntil: string;
  /** Hours of a late cancellation that were charged to the balance. */
  chargedHours?: number;
  /** Cancelled because the student did not show up. */
  noShow?: boolean;
};

/** Instructor leave: no lesson can be booked during it. */
export type Leave = {
  id: string;
  instructorId: string;
  start: string;
  end: string;
  reason: string;
};

/** What the staff planning needs to know about the student of a lesson. */
export type StudentSummary = {
  id: string;
  firstName: string;
  lastName: string;
  phone: string;
  neph: string | null;
  balanceState: BalanceState;
  afterReservationsHours: number;
};

export type PlanningLesson = Lesson & { student: StudentSummary };

export type Planning = {
  now: string;
  instructors: Instructor[];
  vehicles: Vehicle[];
  lessons: PlanningLesson[];
  leaves: Leave[];
};

/** One line of the staff student list. */
export type StudentRow = {
  id: string;
  firstName: string;
  lastName: string;
  neph: string | null;
  phone: string;
  email: string;
  office: string;
  isMinor: boolean;
  referent: Instructor;
  balance: Pick<Balance, "state" | "afterReservationsHours" | "toCoverHours">;
  documents: { total: number; validated: number; toReview: number; missing: number; refused: number };
  nextLesson: string | null;
  archived: boolean;
};

/** Everything the staff "fiche élève" shows. */
export type StudentFile = {
  now: string;
  profile: StudentProfile;
  balance: Balance;
  upcoming: Lesson[];
  history: Lesson[];
  documents: RequiredDocument[];
  payments: Payment[];
  stats: { lastLesson: Lesson | null; nextLesson: Lesson | null; noShows: number };
};

export type CashMethod = Exclude<PaymentMethod, "klarna">;

export type CashEntryStatus = "valide" | "a_valider" | "refuse";

/** Payment taken at the agency (caisse du jour). */
export type CashEntry = {
  id: string;
  studentId: string;
  studentName: string;
  amount: number;
  method: CashMethod;
  hours: number;
  note?: string;
  createdAt: string;
  createdBy: string;
  status: CashEntryStatus;
  reviewedBy?: string;
  invoiceNumber?: string;
};

export type Slot = {
  id: string;
  start: string;
  end: string;
  durationHours: number;
  instructor: Instructor;
  meetingPoint: string;
};

export type BookingRules = {
  minNoticeHours: number;
  freeCancellationHours: number;
  maxLessonsPerWeek: number;
  lateCancellationCharged: boolean;
  restrictedToReferent: boolean;
};

export type BalanceState = "ok" | "low" | "exhausted" | "uncovered" | "overdrawn";

/** Hours balance of the student's package. Computed by the API, never recomputed in the UI. */
export type Balance = {
  packageName: string;
  packageHours: number;
  packagePrice: number;
  hourlyRate: number;
  paidAmount: number;
  paidHours: number;
  consumedHours: number;
  reservedHours: number;
  /** paid − consumed */
  availableHours: number;
  /** paid − consumed − reserved */
  afterReservationsHours: number;
  /** Hours booked or consumed without a matching payment. */
  toCoverHours: number;
  lowThresholdHours: number;
  state: BalanceState;
};

export type InvoiceStatus = "payee" | "en_attente" | "en_retard";

export type Invoice = {
  id: string;
  number: string;
  label: string;
  amount: number;
  issuedAt: string;
  status: InvoiceStatus;
};

export type PaymentMethod = "carte" | "klarna" | "especes" | "cheque" | "virement";

export type Payment = {
  id: string;
  date: string;
  amount: number;
  method: PaymentMethod;
  hours: number;
  invoiceNumber: string;
};

export type InstallmentStatus = "a_venir" | "payee" | "en_retard";

export type Installment = {
  id: string;
  label: string;
  amount: number;
  hours: number;
  dueAt: string;
  status: InstallmentStatus;
};

export type HourPack = {
  id: string;
  label: string;
  hours: number;
  price: number;
  description: string;
  highlighted?: boolean;
};

export type DocumentStatus = "manquant" | "en_verification" | "valide" | "refuse";

export type RequiredDocument = {
  id: string;
  label: string;
  description: string;
  status: DocumentStatus;
  rejectionReason?: string;
  uploadedAt?: string;
  fileName?: string;
  /** Identity documents: only visible to gérant/assistante once uploaded. */
  sensitive: boolean;
};

export type DownloadableDocument = {
  id: string;
  label: string;
  category: "contrat" | "devis" | "facture" | "attestation";
  issuedAt: string;
  signed?: boolean;
};

export type Availability = {
  day: "Lundi" | "Mardi" | "Mercredi" | "Jeudi" | "Vendredi" | "Samedi";
  from: string;
  to: string;
};

export type StudentProfile = {
  id: string;
  firstName: string;
  lastName: string;
  birthDate: string;
  birthPlace: string | null;
  gender: "Homme" | "Femme" | "Autre";
  /** Full NEPH; mask it with maskNeph() before display. Null until the ANTS registration is done. */
  neph: string | null;
  email: string;
  phone: string;
  phoneSecondary: string | null;
  address: { line1: string; postalCode: string; city: string };
  office: string;
  licence: string;
  studentType: "Particulier" | "Entreprise";
  financer: string;
  accelerated: boolean;
  enrolledAt: string;
  isMinor: boolean;
  legalGuardian: { name: string; phone: string; email: string } | null;
  referentInstructor: Instructor;
  /** Students may only book with their referent. */
  restrictedToReferent: boolean;
  availabilities: Availability[];
  archived: boolean;
};

/**
 * Result of every mutation of the mock API. `fieldErrors` (code "invalide" or "doublon") is keyed
 * by input field name, dotted for nested fields ("address.postalCode", "legalGuardian.phone").
 */
export type ActionResult<T = undefined> =
  | ({ ok: true } & (T extends undefined ? object : { data: T }))
  | { ok: false; code: string; error: string; fieldErrors?: Record<string, string> };

// ---------------------------------------------------------------------------
// Student enrolment and file edition (staff)

/** What the staff fills in to enrol a student or edit their file. Dates: "YYYY-MM-DD". */
export type StudentInput = {
  firstName: string;
  lastName: string;
  birthDate: string;
  birthPlace: string | null;
  gender: StudentProfile["gender"];
  /** 12 digits, or null while the ANTS registration is pending. */
  neph: string | null;
  email: string;
  phone: string;
  phoneSecondary: string | null;
  address: StudentProfile["address"];
  office: string;
  licence: string;
  studentType: StudentProfile["studentType"];
  financer: string;
  accelerated: boolean;
  /** Required when the student is a minor (computed by the API from the birth date). */
  legalGuardian: StudentProfile["legalGuardian"];
  referentInstructorId: string;
  restrictedToReferent: boolean;
  availabilities: Availability[];
};

export type NewStudentInput = StudentInput & {
  /** Package (formule) chosen at enrolment; the student keeps its price if the offer changes later. */
  packageId: string;
};

/** Choices offered by the enrolment and edition forms. */
export type StudentFormOptions = {
  offices: string[];
  instructors: Instructor[];
  /** Active packages only. */
  packages: PackageOffer[];
  licences: string[];
  financers: string[];
  /** Active students quota of the school's plan. */
  quota: Quota;
  /** Next platform plan with a higher students limit, proposed when the quota is reached (null: none). */
  upgradePlan: PlatformPlan | null;
};

// ---------------------------------------------------------------------------
// School settings (réglages)

/** A package (formule) sold to students. */
export type PackageOffer = {
  id: string;
  name: string;
  hours: number;
  price: number;
  description: string;
  /** Inactive: no longer offered to new students; enrolled students keep theirs. */
  active: boolean;
};

export type PricingSettings = {
  /** Price of one extra hour of driving. */
  hourlyRate: number;
  registrationFee: number;
  packages: PackageOffer[];
  /** Extra hours students can buy online. */
  hourPacks: HourPack[];
};

export type PackageOfferInput = Omit<PackageOffer, "id" | "active"> & { id?: string };

export type HourPackInput = Omit<HourPack, "id" | "highlighted"> & { id?: string; highlighted: boolean };

export type SchoolRules = {
  booking: BookingRules;
  /** The balance is "low" at or below this many hours. */
  lowBalanceThresholdHours: number;
  /** Cash entries above this amount wait for someone with "caisse.valider". */
  cashValidationThreshold: number;
};

/** Sensitive changes (tariffs, rules, rights, imports…) are logged: who, what, when. */
export type AuditEntry = {
  id: string;
  at: string;
  actor: string;
  category: "tarifs" | "regles" | "equipe" | "abonnement" | "import" | "eleves";
  /** French sentence, e.g. "Tarif horaire : 60 € → 62 €". */
  summary: string;
};

// ---------------------------------------------------------------------------
// Team and rights

export type StaffRole = Extract<Role, "gerant" | "assistante" | "moniteur">;

export type MemberStatus = "actif" | "invitation" | "desactive";

export type TeamMember = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: StaffRole;
  status: MemberStatus;
  twoFactorEnabled: boolean;
  /** Office the person is limited to; null = every office. */
  office: string | null;
  /** Effective rights (role defaults + per-person overrides). */
  permissions: Permission[];
  /** Defaults of the role, to show what was opened or closed for this person. */
  rolePermissions: Permission[];
  /** False for the signed-in person and for gérants: their rights and status cannot be changed here. */
  editable: boolean;
  lastActiveAt: string | null;
  invitedAt: string | null;
};

export type TeamMemberInput = {
  firstName: string;
  lastName: string;
  email: string;
  role: Exclude<StaffRole, "gerant">;
  office: string | null;
};

// ---------------------------------------------------------------------------
// Subscription of the school to the platform

export type QuotaKey = "students" | "instructors" | "offices";

/** Warn at 80 % of the limit; at 100 % creation is blocked (existing data never is). */
export type Quota = { key: QuotaKey; label: string; used: number; limit: number };

export type PlatformPlan = {
  id: string;
  name: string;
  monthlyPrice: number;
  limits: Record<QuotaKey, number>;
};

export type SubscriptionStatus = "essai" | "actif" | "impaye" | "lecture_seule" | "suspendu";

export type Subscription = {
  plan: PlatformPlan;
  status: SubscriptionStatus;
  renewsAt: string;
  quotas: Quota[];
  plans: PlatformPlan[];
};

// ---------------------------------------------------------------------------
// Import of an existing school's students (CSV or Excel)

export type ImportField =
  | "lastName"
  | "firstName"
  | "gender"
  | "birthDate"
  | "email"
  | "phone"
  | "address"
  | "postalCode"
  | "city"
  | "neph"
  | "gearbox"
  | "package"
  | "hoursLeft"
  | "amountDue";

export type ImportFieldSpec = {
  field: ImportField;
  label: string;
  required: boolean;
  /** Example value, also used in the template file. */
  example: string;
  hint?: string;
};

/** Target field → index of the file column. */
export type ImportMapping = Partial<Record<ImportField, number>>;

export type ImportRowStatus = "ok" | "erreur" | "doublon";

export type ImportRow = {
  /** Line number in the file (the header is line 1). */
  line: number;
  values: Partial<Record<ImportField, string>>;
  status: ImportRowStatus;
  /** Why the row is skipped; on an "ok" row, non-blocking warnings (e.g. guardian to add for a minor). */
  issues: Array<{ field?: ImportField; message: string }>;
};

export type ImportReport = {
  importedAt: string;
  importedBy: string;
  created: number;
  skipped: Array<{ line: number; name: string; reason: string }>;
  undoneAt: string | null;
  undoneBy: string | null;
  /** Undo is refused once an imported student has lessons or payments recorded in the app. */
  canUndo: boolean;
  undoBlockedReason: string | null;
};

export type ImportStatus = "a_associer" | "a_verifier" | "importe" | "annule";

export type ImportSession = {
  id: string;
  fileName: string;
  createdAt: string;
  createdBy: string;
  status: ImportStatus;
  /** Header row as found in the file. */
  columns: string[];
  /** First data rows (at most 3), for the mapping step. */
  sample: string[][];
  rowCount: number;
  mapping: ImportMapping;
  /** Filled from "a_verifier" on. */
  rows: ImportRow[];
  /** Students that can still be created before reaching the plan's limit. */
  quotaRemaining: number;
  /** Filled from "importe" on. */
  report: ImportReport | null;
};
