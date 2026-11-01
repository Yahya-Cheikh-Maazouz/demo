// Mock of the backend for the import of an existing school's students (CSV or Excel), spec
// section 5: template → upload → column mapping → preview of the errors → validation → report,
// and undo in bulk. The real API parses the file; here it is parsed in memory (no dependency).

import type {
  ActionResult,
  ImportField,
  ImportFieldSpec,
  ImportMapping,
  ImportRow,
  ImportSession,
  User,
} from "@/lib/types";

/** Files above this size are refused (code "trop_lourd"). */
export const IMPORT_MAX_BYTES = 5 * 1024 * 1024;

/**
 * Fields of the template, in column order. Required: last name, first name, birth date, phone,
 * e-mail. The others are optional: gender (Homme/Femme, M./Mme, H/F; "Autre" when empty), address,
 * postal code, city, NEPH, gearbox (manuelle / automatique), package (name of an active package,
 * default package otherwise), hours left (opening balance) and amount due (opening debt).
 * Fields not in the file get defaults: first office and instructor, licence from the gearbox,
 * financer "Personnel", type "Particulier", no availabilities.
 */
export const IMPORT_FIELDS: ImportFieldSpec[] = [];

/** CSV template ("modele-import-eleves.csv"): ";" separator, UTF-8 with BOM (Excel FR), header + one example row. */
export function readImportTemplate(): { fileName: string; contentType: string; content: string } {
  throw new Error("Not implemented");
}

/** Every session of the school except discarded ones, newest first. */
export function readImportHistory(tenantSlug: string, now: Date): ImportSession[] {
  void tenantSlug;
  void now;
  throw new Error("Not implemented");
}

export function readImportSession(tenantSlug: string, importId: string, now: Date): ImportSession | null {
  void tenantSlug;
  void importId;
  void now;
  throw new Error("Not implemented");
}

/**
 * Parses the file: .csv (";" or "," detected, quotes, UTF-8 with or without BOM, Windows-1252
 * fallback) or .xlsx (first sheet, shared and inline strings, date serials). Codes: "format"
 * (other type or unreadable), "trop_lourd", "vide" (no data row). Creates a session in
 * "a_associer" with a suggested mapping (header names matched without accents or case, e.g.
 * "Nom", "Prénom", "Date de naissance", "Tél", "Mail", "Code postal"…).
 */
export function writeUploadImport(
  tenantSlug: string,
  actor: User,
  file: { name: string; type: string; bytes: Uint8Array },
  now: Date,
): ActionResult<{ session: ImportSession }> {
  void tenantSlug;
  void actor;
  void file;
  void now;
  throw new Error("Not implemented");
}

/**
 * Applies the mapping (each required field mapped, a column used once at most: code "invalide"
 * with `fieldErrors` keyed by field) and validates every row → status "a_verifier". A row is
 * "erreur" when a required field is empty or a value is invalid (dates JJ/MM/AAAA or AAAA-MM-JJ
 * or Excel serial, phone, e-mail, NEPH, postal code, gearbox, package, numbers), "doublon" when its
 * e-mail or NEPH is already used by a student of the school or by an earlier row of the file.
 */
export function writeMapImport(
  tenantSlug: string,
  actor: User,
  importId: string,
  mapping: ImportMapping,
  now: Date,
): ActionResult<{ session: ImportSession }> {
  void tenantSlug;
  void actor;
  void importId;
  void mapping;
  void now;
  throw new Error("Not implemented");
}

/** Corrects one row of a session in "a_verifier" and validates it again. */
export function writeUpdateImportRow(
  tenantSlug: string,
  actor: User,
  importId: string,
  line: number,
  values: Partial<Record<ImportField, string>>,
  now: Date,
): ActionResult<{ row: ImportRow }> {
  void tenantSlug;
  void actor;
  void importId;
  void line;
  void values;
  void now;
  throw new Error("Not implemented");
}

/**
 * Creates the "ok" rows (insertStudent with the import id, opening balance as a payment of 0 €
 * for the hours left, amount due as an installment), within the remaining quota: rows beyond it
 * are skipped with the reason. Rows in error or duplicates are skipped too. → "importe", with
 * the report and an audit entry ("import").
 */
export function writeCommitImport(
  tenantSlug: string,
  actor: User,
  importId: string,
  now: Date,
): ActionResult<{ session: ImportSession }> {
  void tenantSlug;
  void actor;
  void importId;
  void now;
  throw new Error("Not implemented");
}

/**
 * Removes every student created by the import → "annule". Refused (code "annulation_impossible")
 * once one of them has a lesson or a payment recorded after the import.
 */
export function writeUndoImport(
  tenantSlug: string,
  actor: User,
  importId: string,
  now: Date,
): ActionResult<{ session: ImportSession }> {
  void tenantSlug;
  void actor;
  void importId;
  void now;
  throw new Error("Not implemented");
}

/** Drops a session that was not imported yet ("a_associer" or "a_verifier"). */
export function writeDiscardImport(tenantSlug: string, actor: User, importId: string, now: Date): ActionResult {
  void tenantSlug;
  void actor;
  void importId;
  void now;
  throw new Error("Not implemented");
}
