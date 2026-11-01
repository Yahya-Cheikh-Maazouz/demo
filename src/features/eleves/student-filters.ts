// Student list filters and search, encoded in the URL (/gestion/eleves?filtre=solde&q=durand). Pure.

import type { StudentRow } from "@/lib/types";

export type StudentFilter = "tous" | "solde" | "a_verifier" | "incomplet" | "archives";

export const STUDENT_FILTERS: Array<{ key: StudentFilter; label: string }> = [
  { key: "tous", label: "Tous" },
  { key: "solde", label: "Solde à surveiller" },
  { key: "a_verifier", label: "Pièces à vérifier" },
  { key: "incomplet", label: "Dossier incomplet" },
  { key: "archives", label: "Archivés" },
];

const MATCHERS: Record<StudentFilter, (row: StudentRow) => boolean> = {
  tous: (r) => !r.archived,
  solde: (r) => !r.archived && r.balance.state !== "ok",
  a_verifier: (r) => !r.archived && r.documents.toReview > 0,
  incomplet: (r) => !r.archived && r.documents.missing + r.documents.refused > 0,
  archives: (r) => r.archived,
};

export type StudentQuery = { filter: StudentFilter; q: string };

export function parseStudentQuery(params: Record<string, string | string[] | undefined>): StudentQuery {
  const filter = STUDENT_FILTERS.some((f) => f.key === params.filtre) ? (params.filtre as StudentFilter) : "tous";
  const q = typeof params.q === "string" ? params.q.slice(0, 80) : "";
  return { filter, q };
}

export function studentsHref(query: StudentQuery): string {
  const params = new URLSearchParams();
  if (query.filter !== "tous") params.set("filtre", query.filter);
  if (query.q.trim()) params.set("q", query.q.trim());
  const search = params.toString();
  return search ? `/gestion/eleves?${search}` : "/gestion/eleves";
}

const normalize = (value: string) =>
  value
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase();

/** Name (either order), e-mail, or at least 3 digits of the NEPH or phone. Accents ignored. */
function matchesSearch(row: StudentRow, q: string): boolean {
  const needle = normalize(q.trim());
  if (!needle) return true;
  const text = normalize(`${row.firstName} ${row.lastName} ${row.lastName} ${row.firstName} ${row.email}`);
  if (text.includes(needle)) return true;
  const digits = needle.replace(/\D/g, "");
  return digits.length >= 3 && (row.neph?.includes(digits) || row.phone.replace(/\D/g, "").includes(digits));
}

export function filterStudents(rows: StudentRow[], query: StudentQuery): StudentRow[] {
  return rows.filter((row) => MATCHERS[query.filter](row) && matchesSearch(row, query.q));
}

export function countByFilter(rows: StudentRow[]): Record<StudentFilter, number> {
  return Object.fromEntries(STUDENT_FILTERS.map(({ key }) => [key, rows.filter(MATCHERS[key]).length])) as Record<
    StudentFilter,
    number
  >;
}
