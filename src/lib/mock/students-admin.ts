// Mock of the backend for the enrolment and the edition of a student's file by the staff.
// Rights are checked by src/lib/api/gestion.ts; this file validates the data like the API will.

import type {
  ActionResult,
  Availability,
  NewStudentInput,
  StudentFormOptions,
  StudentInput,
  StudentProfile,
  User,
} from "@/lib/types";
import { FINANCERS, LICENCES, PLATFORM_PLANS } from "./data";
import {
  ageAt,
  findDuplicateStudent,
  fullName,
  insertStudent,
  logAudit,
  planOf,
  readQuotas,
  tenantState,
  type StudentRecord,
  type TenantState,
} from "./store";
import { cleanText, isValidTime, normalizeDate, normalizeEmail, normalizeNeph, normalizePhone, normalizePostalCode } from "./validators";

const GENDERS: StudentProfile["gender"][] = ["Femme", "Homme", "Autre"];
const STUDENT_TYPES: StudentProfile["studentType"][] = ["Particulier", "Entreprise"];
const DAYS: Availability["day"][] = ["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi"];
const MAX_AVAILABILITIES = 12;
/** Plausible ages at enrolment: the AAC starts at 15; anything outside is a typo. */
const MIN_AGE = 14;
const MAX_AGE = 99;

type FieldErrors = Record<string, string>;

function studentsQuota(tenantSlug: string, now: Date) {
  const quota = readQuotas(tenantSlug, now).find((q) => q.key === "students");
  if (!quota) throw new Error("Missing students quota");
  return quota;
}

/** Cheapest plan that accepts more active students than the current one. */
function upgradePlanOf(t: TenantState) {
  const current = planOf(t);
  return (
    [...PLATFORM_PLANS]
      .sort((a, b) => a.limits.students - b.limits.students)
      .find((p) => p.limits.students > current.limits.students) ?? null
  );
}

/**
 * Offices, instructors, active packages, licences and financers of the school, plus the active
 * students quota (see readQuotas in store.ts).
 */
export function readStudentFormOptions(tenantSlug: string, now: Date): StudentFormOptions {
  const t = tenantState(tenantSlug, now);
  return {
    offices: [...t.settings.offices],
    instructors: [...t.staff.instructors],
    packages: t.settings.pricing.packages.filter((p) => p.active),
    licences: [...LICENCES],
    financers: [...FINANCERS],
    quota: studentsQuota(tenantSlug, now),
    upgradePlan: upgradePlanOf(t),
  };
}

// ---------------------------------------------------------------------------
// Validation, shared by the creation and the edition

const text = (value: unknown) => (typeof value === "string" ? value : "");

/** Validates a complete input; returns the normalized input, or one message per invalid field. */
function validateStudent(
  t: TenantState,
  input: StudentInput,
  now: Date,
): { ok: true; value: StudentInput } | { ok: false; fieldErrors: FieldErrors } {
  const errors: FieldErrors = {};

  const firstName = cleanText(text(input.firstName), 60);
  if (!firstName) errors.firstName = text(input.firstName).trim() ? "60 caractères au maximum." : "Indiquez le prénom.";
  const lastName = cleanText(text(input.lastName), 60);
  if (!lastName) errors.lastName = text(input.lastName).trim() ? "60 caractères au maximum." : "Indiquez le nom.";

  const birthDate = normalizeDate(text(input.birthDate));
  let minor = false;
  if (!text(input.birthDate).trim()) errors.birthDate = "Indiquez la date de naissance.";
  else if (!birthDate) errors.birthDate = "Date invalide. Saisissez-la au format JJ/MM/AAAA.";
  else {
    const age = ageAt(birthDate, now);
    if (birthDate >= now.toISOString().slice(0, 10)) errors.birthDate = "La date de naissance doit être dans le passé.";
    else if (age < MIN_AGE || age > MAX_AGE) {
      errors.birthDate = `Vérifiez l'année : l'élève aurait ${age} ans (de ${MIN_AGE} à ${MAX_AGE} ans attendus).`;
    }
    minor = age < 18;
  }

  const birthPlaceRaw = text(input.birthPlace).trim();
  const birthPlace = birthPlaceRaw ? cleanText(birthPlaceRaw, 80) : null;
  if (birthPlaceRaw && !birthPlace) errors.birthPlace = "80 caractères au maximum.";

  if (!GENDERS.includes(input.gender)) errors.gender = "Indiquez le genre.";

  const nephRaw = text(input.neph).trim();
  const neph = nephRaw ? normalizeNeph(nephRaw) : null;
  if (nephRaw && !neph) errors.neph = "Le NEPH compte 12 chiffres. Laissez vide s'il n'est pas encore attribué.";

  const email = normalizeEmail(text(input.email));
  if (!email) errors.email = text(input.email).trim() ? "Adresse e-mail invalide, par exemple prenom.nom@exemple.fr." : "Indiquez l'adresse e-mail.";

  const phone = normalizePhone(text(input.phone));
  if (!phone) {
    errors.phone = text(input.phone).trim()
      ? "Numéro invalide : 10 chiffres commençant par 0, ou +33."
      : "Indiquez le numéro de téléphone.";
  }
  const phoneSecondaryRaw = text(input.phoneSecondary).trim();
  const phoneSecondary = phoneSecondaryRaw ? normalizePhone(phoneSecondaryRaw) : null;
  if (phoneSecondaryRaw && !phoneSecondary) errors.phoneSecondary = "Numéro invalide : 10 chiffres commençant par 0, ou +33.";

  const address = input.address ?? { line1: "", postalCode: "", city: "" };
  const line1 = cleanText(text(address.line1), 120);
  if (!line1) errors["address.line1"] = text(address.line1).trim() ? "120 caractères au maximum." : "Indiquez l'adresse.";
  const postalCode = normalizePostalCode(text(address.postalCode));
  if (!postalCode) errors["address.postalCode"] = text(address.postalCode).trim() ? "Le code postal compte 5 chiffres." : "Indiquez le code postal.";
  const city = cleanText(text(address.city), 80);
  if (!city) errors["address.city"] = text(address.city).trim() ? "80 caractères au maximum." : "Indiquez la ville.";

  if (!t.settings.offices.includes(input.office)) errors.office = "Choisissez le bureau de l'élève.";
  if (!LICENCES.includes(input.licence)) errors.licence = "Choisissez le permis préparé.";
  if (!STUDENT_TYPES.includes(input.studentType)) errors.studentType = "Choisissez le type d'élève.";
  if (!FINANCERS.includes(input.financer)) errors.financer = "Choisissez le financeur.";

  let legalGuardian: StudentInput["legalGuardian"] = null;
  const guardian = input.legalGuardian;
  const guardianGiven = Boolean(guardian && (text(guardian.name).trim() || text(guardian.phone).trim() || text(guardian.email).trim()));
  if (minor || guardianGiven) {
    const required = minor ? " : obligatoire pour un élève mineur." : ".";
    const name = cleanText(text(guardian?.name), 120);
    const guardianPhone = normalizePhone(text(guardian?.phone));
    const guardianEmail = normalizeEmail(text(guardian?.email));
    if (!name) errors["legalGuardian.name"] = text(guardian?.name).trim() ? "120 caractères au maximum." : `Indiquez le nom du représentant légal${required}`;
    if (!guardianPhone) {
      errors["legalGuardian.phone"] = text(guardian?.phone).trim()
        ? "Numéro invalide : 10 chiffres commençant par 0, ou +33."
        : `Indiquez le téléphone du représentant légal${required}`;
    }
    if (!guardianEmail) {
      errors["legalGuardian.email"] = text(guardian?.email).trim()
        ? "Adresse e-mail invalide, par exemple prenom.nom@exemple.fr."
        : `Indiquez l'e-mail du représentant légal${required}`;
    }
    if (name && guardianPhone && guardianEmail) legalGuardian = { name, phone: guardianPhone, email: guardianEmail };
  }

  if (!t.staff.instructors.some((i) => i.id === input.referentInstructorId)) {
    errors.referentInstructorId = "Choisissez le moniteur référent.";
  }

  const availabilities: Availability[] = [];
  const slots = Array.isArray(input.availabilities) ? input.availabilities : [];
  if (slots.length > MAX_AVAILABILITIES) errors.availabilities = `${MAX_AVAILABILITIES} créneaux au maximum.`;
  slots.slice(0, MAX_AVAILABILITIES).forEach((slot, index) => {
    const key = `availabilities.${index}`;
    const from = text(slot?.from);
    const to = text(slot?.to);
    if (!DAYS.includes(slot?.day)) errors[`${key}.day`] = "Choisissez un jour du lundi au samedi.";
    if (!isValidTime(from)) errors[`${key}.from`] = "Heure de début invalide (HH:MM).";
    if (!isValidTime(to)) errors[`${key}.to`] = "Heure de fin invalide (HH:MM).";
    else if (isValidTime(from) && from >= to) errors[`${key}.to`] = "La fin doit être après le début.";
    if (errors[`${key}.day`] || errors[`${key}.from`] || errors[`${key}.to`]) return;
    const overlap = availabilities.find((a) => a.day === slot.day && a.from < to && from < a.to);
    if (overlap) errors[`${key}.from`] = `Chevauche le créneau du ${slot.day.toLowerCase()} ${overlap.from} – ${overlap.to}.`;
    else availabilities.push({ day: slot.day, from, to });
  });
  availabilities.sort((a, b) => DAYS.indexOf(a.day) - DAYS.indexOf(b.day) || a.from.localeCompare(b.from));

  if (Object.keys(errors).length > 0) return { ok: false, fieldErrors: errors };
  return {
    ok: true,
    value: {
      firstName: firstName!,
      lastName: lastName!,
      birthDate: birthDate!,
      birthPlace,
      gender: input.gender,
      neph,
      email: email!,
      phone: phone!,
      phoneSecondary,
      address: { line1: line1!, postalCode: postalCode!, city: city! },
      office: input.office,
      licence: input.licence,
      studentType: input.studentType,
      financer: input.financer,
      accelerated: input.accelerated === true,
      legalGuardian,
      referentInstructorId: input.referentInstructorId,
      restrictedToReferent: input.restrictedToReferent === true,
      availabilities,
    },
  };
}

/** "jules.durand@exemple.fr" is already used by Jules Durand → message naming that student. */
function duplicateErrors(t: TenantState, value: Pick<StudentInput, "email" | "neph">, ignoreId?: string): FieldErrors {
  const errors: FieldErrors = {};
  const describe = (s: StudentRecord) => `${fullName(s.profile)}${s.profile.archived ? " (dossier archivé)" : ""}`;
  const byEmail = findDuplicateStudent(t, { email: value.email }, ignoreId);
  if (byEmail) errors.email = `Cette adresse e-mail est déjà celle de ${describe(byEmail.student)}.`;
  const byNeph = value.neph ? findDuplicateStudent(t, { neph: value.neph }, ignoreId) : null;
  if (byNeph) errors.neph = `Ce NEPH est déjà celui de ${describe(byNeph.student)}.`;
  return errors;
}

function invalid(fieldErrors: FieldErrors) {
  const count = Object.keys(fieldErrors).length;
  return {
    ok: false as const,
    code: "invalide",
    error: count > 1 ? `${count} champs sont à corriger.` : "Un champ est à corriger.",
    fieldErrors,
  };
}

function duplicate(fieldErrors: FieldErrors) {
  const names = Object.values(fieldErrors);
  return { ok: false as const, code: "doublon", error: names.length > 1 ? "Cet élève semble déjà inscrit." : names[0], fieldErrors };
}

/** The student's file as an input, to merge a patch into it. */
function inputOf(profile: StudentProfile): StudentInput {
  return {
    firstName: profile.firstName,
    lastName: profile.lastName,
    birthDate: profile.birthDate.slice(0, 10),
    birthPlace: profile.birthPlace,
    gender: profile.gender,
    neph: profile.neph,
    email: profile.email,
    phone: profile.phone,
    phoneSecondary: profile.phoneSecondary,
    address: profile.address,
    office: profile.office,
    licence: profile.licence,
    studentType: profile.studentType,
    financer: profile.financer,
    accelerated: profile.accelerated,
    legalGuardian: profile.legalGuardian,
    referentInstructorId: profile.referentInstructor.id,
    restrictedToReferent: profile.restrictedToReferent,
    availabilities: profile.availabilities,
  };
}

/** Groups of fields named in the audit log (never the values: they are personal data). */
const CHANGE_GROUPS: Array<{ label: string; fields: Array<keyof StudentInput> }> = [
  { label: "identité", fields: ["firstName", "lastName", "birthDate", "birthPlace", "gender", "neph"] },
  { label: "adresse", fields: ["address"] },
  { label: "inscription", fields: ["office", "licence", "studentType", "financer", "accelerated"] },
  { label: "contact", fields: ["email", "phone", "phoneSecondary"] },
  { label: "représentant légal", fields: ["legalGuardian"] },
  { label: "moniteur référent", fields: ["referentInstructorId", "restrictedToReferent"] },
  { label: "disponibilités", fields: ["availabilities"] },
];

// ---------------------------------------------------------------------------
// Writes

/**
 * Enrols a student. Checks, in this order:
 * - quota: at 100 % of the plan's active students → code "quota_atteint", error proposing the plan above;
 * - fields (code "invalide", one message per field in `fieldErrors`, dotted for nested fields):
 *   names, birth date (past, "YYYY-MM-DD"), e-mail, French phone (10 digits, or +33), optional
 *   12-digit NEPH, 5-digit postal code, known office / licence / financer / instructor / active
 *   package, legal guardian (name, phone, e-mail) required for a minor, availabilities "HH:MM" with from < to;
 * - duplicates (code "doublon"): same e-mail or NEPH as another student of the school,
 *   `fieldErrors.email` / `fieldErrors.neph` names that student.
 * Then insertStudent() and an audit entry ("eleves").
 */
export function writeCreateStudent(
  tenantSlug: string,
  actor: User,
  input: NewStudentInput,
  now: Date,
): ActionResult<{ studentId: string }> {
  const t = tenantState(tenantSlug, now);

  const quota = studentsQuota(tenantSlug, now);
  if (quota.used >= quota.limit) {
    const plan = planOf(t);
    const upgrade = upgradePlanOf(t);
    return {
      ok: false,
      code: "quota_atteint",
      error:
        `Votre formule ${plan.name} est limitée à ${quota.limit} élèves actifs et cette limite est atteinte. ` +
        (upgrade
          ? `Passez à la formule ${upgrade.name} (jusqu'à ${upgrade.limits.students} élèves actifs) ou archivez les dossiers terminés.`
          : "Archivez les dossiers terminés ou contactez-nous pour augmenter la limite."),
    };
  }

  const checked = validateStudent(t, input, now);
  const offer = t.settings.pricing.packages.find((p) => p.id === input.packageId && p.active);
  if (!checked.ok || !offer) {
    const fieldErrors = checked.ok ? {} : checked.fieldErrors;
    if (!offer) fieldErrors.packageId = "Choisissez une formule proposée actuellement.";
    return invalid(fieldErrors);
  }

  const duplicates = duplicateErrors(t, checked.value);
  if (Object.keys(duplicates).length > 0) return duplicate(duplicates);

  const record = insertStudent(t, { ...checked.value, packageId: offer.id }, now);
  logAudit(t, fullName(actor), "eleves", `Inscription de ${fullName(record.profile)} (${offer.name})`, now);
  return { ok: true, data: { studentId: record.profile.id } };
}

/**
 * Updates the editable fields of a student's file (the patch is merged into the current file,
 * then validated like the creation; duplicates ignore the student themself). An archived student
 * can still be edited. Changing the referent keeps the booked lessons as they are.
 */
export function writeUpdateStudent(
  tenantSlug: string,
  actor: User,
  studentId: string,
  patch: Partial<StudentInput>,
  now: Date,
): ActionResult<{ profile: StudentProfile }> {
  const t = tenantState(tenantSlug, now);
  const record = t.students.get(studentId);
  if (!record) return { ok: false, code: "introuvable", error: "Élève introuvable." };

  const current = inputOf(record.profile);
  const defined = Object.fromEntries(Object.entries(patch).filter(([, v]) => v !== undefined)) as Partial<StudentInput>;
  const checked = validateStudent(t, { ...current, ...defined }, now);
  if (!checked.ok) return invalid(checked.fieldErrors);

  const value = checked.value;
  const duplicates = duplicateErrors(t, value, studentId);
  if (Object.keys(duplicates).length > 0) return duplicate(duplicates);

  const changed = CHANGE_GROUPS.filter(({ fields }) =>
    fields.some((field) => JSON.stringify(value[field]) !== JSON.stringify(current[field])),
  ).map((g) => g.label);

  const referent = t.staff.instructors.find((i) => i.id === value.referentInstructorId) ?? record.profile.referentInstructor;
  record.profile = {
    ...record.profile,
    firstName: value.firstName,
    lastName: value.lastName,
    birthDate: `${value.birthDate}T00:00:00.000Z`,
    birthPlace: value.birthPlace,
    gender: value.gender,
    neph: value.neph,
    email: value.email,
    phone: value.phone,
    phoneSecondary: value.phoneSecondary,
    address: value.address,
    office: value.office,
    licence: value.licence,
    studentType: value.studentType,
    financer: value.financer,
    accelerated: value.accelerated,
    isMinor: ageAt(value.birthDate, now) < 18,
    legalGuardian: value.legalGuardian,
    referentInstructor: referent,
    restrictedToReferent: value.restrictedToReferent,
    availabilities: value.availabilities,
  };

  if (changed.length > 0) {
    logAudit(t, fullName(actor), "eleves", `Fiche de ${fullName(record.profile)} modifiée : ${changed.join(", ")}`, now);
  }
  return { ok: true, data: { profile: record.profile } };
}
