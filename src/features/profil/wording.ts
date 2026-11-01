import type { StudentProfile } from "@/lib/types";

/** Agrees a word with the gender recorded by the school: "Inscrit", "Inscrite", "Inscrit·e". */
export function byGender(
  gender: StudentProfile["gender"],
  forms: { masculine: string; feminine: string; inclusive: string },
): string {
  if (gender === "Homme") return forms.masculine;
  if (gender === "Femme") return forms.feminine;
  return forms.inclusive;
}
