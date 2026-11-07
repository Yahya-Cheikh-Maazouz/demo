// Reference data of the mock backend: auto-écoles, their staff, vehicles, accounts and students.
// Only src/lib/mock/store.ts reads this file.

import { PLATFORM_TENANT_SLUG } from "@/lib/auth-constants";
import type {
  BookingRules,
  DocumentStatus,
  HourPack,
  Instructor,
  MemberStatus,
  PackageOffer,
  Permission,
  PlatformPlan,
  PricingSettings,
  Role,
  SchoolRules,
  StaffRole,
  StudentProfile,
  SubscriptionStatus,
  Tenant,
  User,
  Vehicle,
} from "@/lib/types";

export const DEFAULT_TENANT_SLUG = "dupont";

export const TENANTS: Tenant[] = [
  {
    slug: "dupont",
    name: "Auto-école Dupont",
    logoInitials: "AD",
    brandColor: "#0f766e",
    city: "Paris 11e",
    phone: "01 43 55 12 34",
    email: "contact@ecole-dupont.fr",
  },
  {
    slug: "conduite-plus",
    name: "Conduite Plus",
    logoInitials: "CP",
    brandColor: "#4338ca",
    city: "Lyon 3e",
    phone: "04 78 60 21 09",
    email: "bonjour@conduite-plus.fr",
  },
];

// ---------------------------------------------------------------------------
// Staff and vehicles: each auto-école has its own, nothing is shared between tenants.

export type Staff = {
  /**
   * The second instructor of the demo schools is on leave for a few days. Empty for a school just
   * created from the platform back-office.
   */
  instructors: Instructor[];
  /** A lesson takes the first free vehicle with the student's gearbox. */
  vehicles: Vehicle[];
  agency: string;
  meetingPoints: Record<string, string>;
};

export const STAFF: Record<string, Staff> = {
  dupont: {
    instructors: [
      { id: "i-sophie", firstName: "Sophie", lastName: "Laurent" },
      { id: "i-karim", firstName: "Karim", lastName: "Benali" },
    ],
    vehicles: [
      { id: "v-clio", label: "Renault Clio V", plate: "GH-482-TK", gearbox: "manuelle" },
      { id: "v-208-paris", label: "Peugeot 208", plate: "GB-905-LM", gearbox: "manuelle" },
      { id: "v-yaris", label: "Toyota Yaris Hybride", plate: "FK-219-PL", gearbox: "automatique" },
    ],
    agency: "Agence — 12 place de la République, Paris 11e",
    meetingPoints: {
      "i-sophie": "Agence — 12 place de la République, Paris 11e",
      "i-karim": "Métro Oberkampf, sortie 1",
    },
  },
  "conduite-plus": {
    instructors: [
      { id: "i-lucas", firstName: "Lucas", lastName: "Moreau" },
      { id: "i-amina", firstName: "Amina", lastName: "Haddad" },
    ],
    vehicles: [
      { id: "v-208", label: "Peugeot 208", plate: "EV-731-RZ", gearbox: "manuelle" },
      { id: "v-polo", label: "Volkswagen Polo", plate: "FA-442-SN", gearbox: "manuelle" },
      { id: "v-zoe", label: "Renault Zoe", plate: "FT-058-KA", gearbox: "automatique" },
    ],
    agency: "Agence — 24 cours Lafayette, Lyon 3e",
    meetingPoints: {
      "i-lucas": "Agence — 24 cours Lafayette, Lyon 3e",
      "i-amina": "Métro Part-Dieu, sortie Vivier Merle",
    },
  },
};

/** Offices (sites) of each auto-école. */
export const OFFICES: Record<string, string[]> = {
  dupont: ["Paris République"],
  "conduite-plus": ["Lyon Part-Dieu"],
};

/**
 * Team members without a login in the demo: the instructors (their space is not built yet) and a
 * pending invitation. Staff with a login come from USERS.
 */
export const TEAM_FIXTURES: Record<
  string,
  Array<{
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    role: StaffRole;
    status: MemberStatus;
    twoFactorEnabled: boolean;
    /** Days since the last activity, or since the invitation for status "invitation". */
    daysAgo: number;
  }>
> = {
  dupont: [
    { id: "i-sophie", firstName: "Sophie", lastName: "Laurent", email: "sophie.laurent@ecole-dupont.fr", role: "moniteur", status: "actif", twoFactorEnabled: false, daysAgo: 0 },
    { id: "i-karim", firstName: "Karim", lastName: "Benali", email: "karim.benali@ecole-dupont.fr", role: "moniteur", status: "actif", twoFactorEnabled: false, daysAgo: 1 },
    { id: "u-invite-dupont", firstName: "Yasmine", lastName: "Cherif", email: "yasmine.cherif@ecole-dupont.fr", role: "assistante", status: "invitation", twoFactorEnabled: false, daysAgo: 2 },
  ],
  "conduite-plus": [
    { id: "i-lucas", firstName: "Lucas", lastName: "Moreau", email: "lucas.moreau@conduite-plus.fr", role: "moniteur", status: "actif", twoFactorEnabled: false, daysAgo: 0 },
    { id: "i-amina", firstName: "Amina", lastName: "Haddad", email: "amina.haddad@conduite-plus.fr", role: "moniteur", status: "actif", twoFactorEnabled: false, daysAgo: 3 },
  ],
};

// ---------------------------------------------------------------------------
// Rules and offers: defaults of each auto-école, then changed by the gérant in Réglages
// (the tenant state of store.ts holds the live copy).

export const BOOKING_RULES: BookingRules = {
  minNoticeHours: 24,
  freeCancellationHours: 48,
  // The client's example (meeting of 1 Nov 2026): 2 appointments and 4 h a week at most.
  maxLessonsPerWeek: 2,
  maxHoursPerWeek: 4,
  lateCancellationCharged: true,
  restrictedToReferent: false,
};

export const DEFAULT_RULES: SchoolRules = {
  booking: BOOKING_RULES,
  lowBalanceThresholdHours: 2,
  cashValidationThreshold: 500,
};

/** Package every seeded student is enrolled in. */
export const DEFAULT_PACKAGE_ID = "pkg-b20";

const PACKAGES: PackageOffer[] = [
  {
    id: DEFAULT_PACKAGE_ID,
    name: "Forfait B — 20 h",
    hours: 20,
    price: 1200,
    description: "Accès au code en ligne, 20 h de conduite et accompagnement à l'examen.",
    active: true,
  },
  {
    id: "pkg-auto13",
    name: "Forfait B boîte auto — 13 h",
    hours: 13,
    price: 890,
    description: "13 h de conduite sur boîte automatique, le minimum légal.",
    active: true,
  },
  {
    id: "pkg-aac",
    name: "Forfait AAC — 20 h",
    hours: 20,
    price: 1290,
    description: "Conduite accompagnée dès 15 ans : 20 h, rendez-vous pédagogiques compris.",
    active: true,
  },
  {
    id: "pkg-ete",
    name: "Forfait été — 15 h",
    hours: 15,
    price: 850,
    description: "Offre saisonnière, plus proposée aux nouveaux élèves.",
    active: false,
  },
];

export const HOUR_PACKS: HourPack[] = [
  { id: "pack-1", label: "1 heure de conduite", hours: 1, price: 60, description: "Pour une séance ponctuelle." },
  { id: "pack-5", label: "Pack 5 heures", hours: 5, price: 300, description: "Le plus simple pour avancer." },
  {
    id: "pack-10",
    label: "Pack 10 heures",
    hours: 10,
    price: 580,
    description: "20 € d'économie sur le tarif horaire.",
    highlighted: true,
  },
];

export const DEFAULT_PRICING: PricingSettings = {
  hourlyRate: 60,
  registrationFee: 50,
  packages: PACKAGES,
  hourPacks: HOUR_PACKS,
};

export const LICENCES = [
  "B · Boîte manuelle",
  "B · Boîte automatique",
  "B · Conduite accompagnée (AAC)",
  "B · Conduite supervisée",
];

export const FINANCERS = ["Personnel", "CPF", "France Travail", "Employeur", "Mission locale", "Permis à 1 € par jour"];

// ---------------------------------------------------------------------------
// Subscription to the platform. Names, prices and limits are placeholders until Ali sets them.

export const PLATFORM_PLANS: PlatformPlan[] = [
  { id: "essentiel", name: "Essentiel", monthlyPrice: 59, limits: { students: 20, instructors: 3, offices: 1 } },
  { id: "pro", name: "Pro", monthlyPrice: 119, limits: { students: 60, instructors: 8, offices: 3 } },
  { id: "reseau", name: "Réseau", monthlyPrice: 249, limits: { students: 200, instructors: 25, offices: 10 } },
];

export const SUBSCRIPTIONS: Record<string, { planId: string; status: SubscriptionStatus; renewsInDays: number }> = {
  // 16 active students out of 20: the 80 % warning shows from the start.
  dupont: { planId: "essentiel", status: "actif", renewsInDays: 12 },
  "conduite-plus": { planId: "pro", status: "actif", renewsInDays: 20 },
};

// ---------------------------------------------------------------------------
// Accounts and rights

export const ALL_PERMISSIONS: Permission[] = [
  "planning.voir",
  "planning.gerer",
  "planning.forcer",
  "eleves.voir",
  "eleves.gerer",
  "documents.valider",
  "caisse.encaisser",
  "caisse.valider",
  "finances.voir",
  "tarifs.gerer",
  "regles.gerer",
  "equipe.gerer",
  "abonnement.gerer",
];

/** Default rights per role (spec, section 1). The gérant can then adjust them per person. */
export const ROLE_PERMISSIONS: Record<Role, Permission[]> = {
  super_admin: [],
  gerant: ALL_PERMISSIONS,
  assistante: [
    "planning.voir",
    "planning.gerer",
    "eleves.voir",
    "eleves.gerer",
    "documents.valider",
    "caisse.encaisser",
    "finances.voir",
  ],
  moniteur: ["planning.voir"],
  eleve: [],
  parent: [],
};

export type MockUser = Omit<User, "permissions"> & {
  password: string;
  totpCode?: string;
  /** Per-person overrides decided by the gérant. */
  grantedPermissions?: Permission[];
  revokedPermissions?: Permission[];
};

export const USERS: MockUser[] = [
  {
    id: "u-jules",
    tenantSlug: "dupont",
    role: "eleve",
    firstName: "Jules",
    lastName: "Durand",
    email: "jules.durand@exemple.fr",
    twoFactorEnabled: false,
    password: "demo1234",
  },
  {
    id: "u-gerant-dupont",
    tenantSlug: "dupont",
    role: "gerant",
    firstName: "Claire",
    lastName: "Dupont",
    email: "gerant@ecole-dupont.fr",
    twoFactorEnabled: true,
    password: "demo1234",
    totpCode: "123456",
  },
  {
    id: "u-assistante-dupont",
    tenantSlug: "dupont",
    role: "assistante",
    firstName: "Lucie",
    lastName: "Bernard",
    email: "assistante@ecole-dupont.fr",
    twoFactorEnabled: true,
    password: "demo1234",
    totpCode: "123456",
  },
  {
    id: "u-ines",
    tenantSlug: "conduite-plus",
    role: "eleve",
    firstName: "Inès",
    lastName: "Martin",
    email: "ines.martin@exemple.fr",
    twoFactorEnabled: false,
    password: "demo1234",
  },
  {
    id: "u-gerant-cp",
    tenantSlug: "conduite-plus",
    role: "gerant",
    firstName: "Marc",
    lastName: "Rivière",
    email: "gerant@conduite-plus.fr",
    twoFactorEnabled: true,
    password: "demo1234",
    totpCode: "123456",
  },
  // Instructors log in with the id of their Instructor record (STAFF), so the link is direct.
  {
    id: "i-sophie",
    tenantSlug: "dupont",
    role: "moniteur",
    firstName: "Sophie",
    lastName: "Laurent",
    email: "sophie.laurent@ecole-dupont.fr",
    twoFactorEnabled: false,
    password: "demo1234",
  },
  {
    id: "i-lucas",
    tenantSlug: "conduite-plus",
    role: "moniteur",
    firstName: "Lucas",
    lastName: "Moreau",
    email: "lucas.moreau@conduite-plus.fr",
    twoFactorEnabled: false,
    password: "demo1234",
  },
  // Legal guardian of Léa Fontaine (minor, AAC): see GUARDIANS.
  {
    id: "u-parent-fontaine",
    tenantSlug: "dupont",
    role: "parent",
    firstName: "Nathalie",
    lastName: "Fontaine",
    email: "n.fontaine@exemple.fr",
    twoFactorEnabled: false,
    password: "demo1234",
  },
  // Platform support team (super-admin): signs in on admin.<domaine> only, never on a school.
  // Fictional person and address.
  {
    id: "u-superadmin",
    tenantSlug: PLATFORM_TENANT_SLUG,
    role: "super_admin",
    firstName: "Camille",
    lastName: "Perrin",
    email: "support@plateforme-autoecole.fr",
    twoFactorEnabled: true,
    password: "demo1234",
    totpCode: "123456",
  },
];

/** Children of each parent account (student ids of the same auto-école). */
export const GUARDIANS: Record<string, string[]> = {
  "u-parent-fontaine": ["s-lea"],
};

// ---------------------------------------------------------------------------
// Students

export type DocumentId = "doc-identite" | "doc-domicile" | "doc-ephoto" | "doc-assr" | "doc-jdc";

export type StudentFixture = Pick<
  StudentProfile,
  "id" | "firstName" | "lastName" | "email" | "phone" | "birthDate" | "gender" | "neph" | "address" | "office"
> &
  Partial<Pick<StudentProfile, "licence" | "accelerated" | "isMinor" | "legalGuardian" | "restrictedToReferent">> & {
    /** 0 or 1: index of the referent in Staff.instructors. */
    referent: 0 | 1;
    enrolledDaysAgo: number;
    /**
     * Hours paid on top of what is consumed and booked, which drives the balance state:
     * > 2 ok, 1–2 low, 0 exhausted, < 0 uncovered (booked lessons not paid).
     * Ignored for scripted students, whose lessons and payments are written by hand.
     */
    balanceDelta: number;
    /** Scripted story (the students who have a login): fixed lessons and payments. */
    scripted?: boolean;
    documents: Partial<Record<DocumentId, DocumentStatus>>;
  };

const PARIS_OFFICE = "Paris République";
const LYON_OFFICE = "Lyon Part-Dieu";

export const STUDENTS: Record<string, StudentFixture[]> = {
  dupont: [
    {
      id: "u-jules",
      firstName: "Jules",
      lastName: "Durand",
      email: "jules.durand@exemple.fr",
      phone: "06 12 34 56 90",
      birthDate: "2007-03-14T00:00:00.000Z",
      gender: "Homme",
      neph: "210376123476",
      address: { line1: "12 rue Oberkampf", postalCode: "75011", city: "Paris" },
      office: PARIS_OFFICE,
      referent: 0,
      enrolledDaysAgo: 41,
      balanceDelta: 0,
      scripted: true,
      documents: { "doc-identite": "valide", "doc-domicile": "refuse", "doc-ephoto": "en_verification" },
    },
    {
      id: "s-lea",
      firstName: "Léa",
      lastName: "Fontaine",
      email: "lea.fontaine@exemple.fr",
      phone: "06 48 21 77 03",
      birthDate: "2009-05-02T00:00:00.000Z",
      gender: "Femme",
      neph: "230914587210",
      address: { line1: "4 rue de Malte", postalCode: "75011", city: "Paris" },
      office: PARIS_OFFICE,
      licence: "B · Conduite accompagnée (AAC)",
      isMinor: true,
      legalGuardian: { name: "Nathalie Fontaine", phone: "06 61 30 42 88", email: "n.fontaine@exemple.fr" },
      referent: 0,
      enrolledDaysAgo: 60,
      balanceDelta: 4,
      documents: { "doc-identite": "valide", "doc-domicile": "valide", "doc-ephoto": "valide", "doc-assr": "en_verification" },
    },
    {
      id: "s-hugo",
      firstName: "Hugo",
      lastName: "Lefèvre",
      email: "hugo.lefevre@exemple.fr",
      phone: "07 82 15 64 39",
      birthDate: "2004-01-22T00:00:00.000Z",
      gender: "Homme",
      neph: "200118342907",
      address: { line1: "31 boulevard Voltaire", postalCode: "75011", city: "Paris" },
      office: PARIS_OFFICE,
      licence: "B · Boîte automatique",
      referent: 1,
      enrolledDaysAgo: 75,
      balanceDelta: -2,
      documents: { "doc-identite": "valide", "doc-domicile": "valide", "doc-ephoto": "valide", "doc-assr": "valide", "doc-jdc": "valide" },
    },
    {
      id: "s-sarah",
      firstName: "Sarah",
      lastName: "Mercier",
      email: "sarah.mercier@exemple.fr",
      phone: "06 27 93 10 54",
      birthDate: "2006-09-08T00:00:00.000Z",
      gender: "Femme",
      neph: "220587663041",
      address: { line1: "9 rue Saint-Maur", postalCode: "75011", city: "Paris" },
      office: PARIS_OFFICE,
      referent: 0,
      enrolledDaysAgo: 30,
      balanceDelta: 8,
      documents: { "doc-identite": "en_verification", "doc-domicile": "en_verification", "doc-ephoto": "valide" },
    },
    {
      id: "s-mehdi",
      firstName: "Mehdi",
      lastName: "Ait Ouali",
      email: "mehdi.aitouali@exemple.fr",
      phone: "06 90 44 18 72",
      birthDate: "2001-11-30T00:00:00.000Z",
      gender: "Homme",
      neph: "190662018345",
      address: { line1: "56 rue de la Roquette", postalCode: "75011", city: "Paris" },
      office: PARIS_OFFICE,
      referent: 1,
      enrolledDaysAgo: 90,
      balanceDelta: 1,
      documents: { "doc-identite": "valide", "doc-domicile": "valide", "doc-ephoto": "valide", "doc-assr": "valide", "doc-jdc": "valide" },
    },
    {
      id: "s-camille",
      firstName: "Camille",
      lastName: "Roux",
      email: "camille.roux@exemple.fr",
      phone: "07 51 66 29 80",
      birthDate: "2008-04-17T00:00:00.000Z",
      gender: "Femme",
      neph: "240231870562",
      address: { line1: "2 passage Saint-Ambroise", postalCode: "75011", city: "Paris" },
      office: PARIS_OFFICE,
      accelerated: true,
      referent: 0,
      enrolledDaysAgo: 18,
      balanceDelta: 0,
      documents: { "doc-identite": "valide", "doc-ephoto": "en_verification" },
    },
    {
      id: "s-tom",
      firstName: "Tom",
      lastName: "Girard",
      email: "tom.girard@exemple.fr",
      phone: "06 33 08 75 21",
      birthDate: "2007-07-25T00:00:00.000Z",
      gender: "Homme",
      neph: "230409126687",
      address: { line1: "18 rue Amelot", postalCode: "75011", city: "Paris" },
      office: PARIS_OFFICE,
      referent: 1,
      enrolledDaysAgo: 52,
      balanceDelta: 5,
      documents: { "doc-identite": "valide", "doc-domicile": "valide", "doc-ephoto": "valide", "doc-assr": "valide" },
    },
    {
      id: "s-nina",
      firstName: "Nina",
      lastName: "Petit",
      email: "nina.petit@exemple.fr",
      phone: "07 24 59 81 36",
      birthDate: "2005-02-11T00:00:00.000Z",
      gender: "Femme",
      neph: "210855304419",
      address: { line1: "7 cité Popincourt", postalCode: "75011", city: "Paris" },
      office: PARIS_OFFICE,
      referent: 0,
      enrolledDaysAgo: 120,
      balanceDelta: 3,
      documents: { "doc-identite": "valide", "doc-domicile": "valide", "doc-ephoto": "valide", "doc-assr": "valide", "doc-jdc": "valide" },
    },
  ],
  "conduite-plus": [
    {
      id: "u-ines",
      firstName: "Inès",
      lastName: "Martin",
      email: "ines.martin@exemple.fr",
      phone: "07 61 22 48 15",
      birthDate: "2008-06-02T00:00:00.000Z",
      gender: "Femme",
      neph: "220891456318",
      address: { line1: "8 rue Paul Bert", postalCode: "69003", city: "Lyon" },
      office: LYON_OFFICE,
      referent: 0,
      enrolledDaysAgo: 41,
      balanceDelta: 0,
      scripted: true,
      documents: { "doc-identite": "valide", "doc-domicile": "refuse", "doc-ephoto": "en_verification" },
    },
    {
      id: "s-theo",
      firstName: "Théo",
      lastName: "Blanc",
      email: "theo.blanc@exemple.fr",
      phone: "06 14 87 52 30",
      birthDate: "2006-12-03T00:00:00.000Z",
      gender: "Homme",
      neph: "220730918845",
      address: { line1: "15 rue Garibaldi", postalCode: "69003", city: "Lyon" },
      office: LYON_OFFICE,
      referent: 1,
      enrolledDaysAgo: 35,
      balanceDelta: 3,
      documents: { "doc-identite": "valide", "doc-domicile": "en_verification", "doc-ephoto": "valide" },
    },
    {
      id: "s-manon",
      firstName: "Manon",
      lastName: "Garnier",
      email: "manon.garnier@exemple.fr",
      phone: "07 39 20 61 47",
      birthDate: "2005-08-19T00:00:00.000Z",
      gender: "Femme",
      neph: "210664380192",
      address: { line1: "40 avenue Félix Faure", postalCode: "69003", city: "Lyon" },
      office: LYON_OFFICE,
      referent: 0,
      enrolledDaysAgo: 70,
      balanceDelta: -1,
      documents: { "doc-identite": "valide", "doc-domicile": "valide", "doc-ephoto": "valide", "doc-assr": "valide", "doc-jdc": "valide" },
    },
    {
      id: "s-yanis",
      firstName: "Yanis",
      lastName: "Chevalier",
      email: "yanis.chevalier@exemple.fr",
      phone: "06 58 03 94 26",
      birthDate: "2007-10-27T00:00:00.000Z",
      gender: "Homme",
      neph: "230118745530",
      address: { line1: "3 rue Servient", postalCode: "69003", city: "Lyon" },
      office: LYON_OFFICE,
      referent: 1,
      enrolledDaysAgo: 22,
      balanceDelta: 6,
      documents: { "doc-identite": "valide" },
    },
  ],
};

// More students with a complete file, so the planning and the lists look like a real school.
function extraStudents(
  slug: string,
  names: Array<[string, string, StudentProfile["gender"]]>,
  place: { office: string; postalCode: string; city: string; street: string },
): StudentFixture[] {
  const deltas = [3, 5, 2, 6, 1, 4, 8, 3];
  return names.map(([firstName, lastName, gender], i) => ({
    id: `s-${slug}-${i + 1}`,
    firstName,
    lastName,
    email: `${firstName}.${lastName}`.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "") + "@exemple.fr",
    phone: `0${6 + (i % 2)} ${String(11 + i * 7).padStart(2, "0")} ${String(23 + i * 5).padStart(2, "0")} ${String(40 + i * 3).padStart(2, "0")} ${String(10 + i * 9).padStart(2, "0")}`,
    birthDate: `${2002 + (i % 6)}-${String(1 + ((i * 5) % 12)).padStart(2, "0")}-${String(3 + i * 3).padStart(2, "0")}T00:00:00.000Z`,
    gender,
    neph: String(200000000000 + (i + 1) * 13_579_246_8),
    address: { line1: `${4 + i * 6} ${place.street}`, postalCode: place.postalCode, city: place.city },
    office: place.office,
    referent: (i % 2) as 0 | 1,
    enrolledDaysAgo: 28 + i * 9,
    balanceDelta: deltas[i % deltas.length],
    documents:
      i % 3 === 0
        ? { "doc-identite": "valide", "doc-domicile": "valide", "doc-ephoto": "valide" }
        : { "doc-identite": "valide", "doc-domicile": "valide", "doc-ephoto": "valide", "doc-assr": "valide", "doc-jdc": "valide" },
  }));
}

STUDENTS.dupont.push(
  ...extraStudents(
    "dupont",
    [
      ["Adam", "Lambert", "Homme"],
      ["Chloé", "Faure", "Femme"],
      ["Lucas", "Bonnet", "Homme"],
      ["Emma", "Rousseau", "Femme"],
      ["Rayan", "Morel", "Homme"],
      ["Zoé", "Fournier", "Femme"],
      ["Nathan", "Gauthier", "Homme"],
      ["Jade", "Perrin", "Femme"],
    ],
    { office: PARIS_OFFICE, postalCode: "75011", city: "Paris", street: "rue de Charonne" },
  ),
);
STUDENTS["conduite-plus"].push(
  ...extraStudents(
    "cp",
    [
      ["Louise", "Robin", "Femme"],
      ["Ethan", "Clément", "Homme"],
      ["Lina", "Masson", "Femme"],
      ["Sacha", "Henry", "Homme"],
    ],
    { office: LYON_OFFICE, postalCode: "69003", city: "Lyon", street: "rue Moncey" },
  ),
);

export const REQUIRED_DOCUMENTS: Array<{
  id: DocumentId;
  label: string;
  description: string;
  sensitive: boolean;
  fileName: string;
}> = [
  {
    id: "doc-identite",
    label: "Pièce d'identité",
    description: "Carte d'identité ou passeport en cours de validité, recto et verso.",
    sensitive: true,
    fileName: "piece-identite.pdf",
  },
  {
    id: "doc-domicile",
    label: "Justificatif de domicile",
    description: "Facture ou attestation de moins de 6 mois à votre nom.",
    sensitive: false,
    fileName: "facture-energie.pdf",
  },
  {
    id: "doc-ephoto",
    label: "Photo et signature numériques (e-photo)",
    description: "Ticket e-photo délivré par un photographe ou une cabine agréés ANTS.",
    sensitive: false,
    fileName: "ticket-ephoto.jpg",
  },
  {
    id: "doc-assr",
    label: "ASSR 2 ou ASR",
    description: "Attestation scolaire de sécurité routière, ou attestation de sécurité routière.",
    sensitive: false,
    fileName: "attestation-assr.pdf",
  },
  {
    id: "doc-jdc",
    label: "Certificat JDC",
    description: "Certificat de participation à la Journée défense et citoyenneté (17 à 25 ans).",
    sensitive: false,
    fileName: "certificat-jdc.pdf",
  },
];

export const REFUSAL_REASON_EXAMPLE = "Le document date de plus de 6 mois. Merci d'envoyer un justificatif récent.";
