"use server";

import { refresh } from "next/cache";
import { unstable_rethrow } from "next/navigation";
import { getStudentProfile, updateAvailabilities } from "@/lib/api/eleve";
import type { AvailabilityFormState } from "./action-state";
import { cellsOf, isCellKey, rangesFor } from "./periods";

const NETWORK_ERROR = "Le serveur n'a pas répondu. Vérifiez votre connexion puis réessayez.";

/** Saves the checked cells of the weekly grid as time ranges (see periods.ts). */
export async function saveAvailabilitiesAction(
  prev: AvailabilityFormState,
  formData: FormData,
): Promise<AvailabilityFormState> {
  const attempt = (prev.attempt ?? 0) + 1;
  const cells = formData.getAll("creneau").filter(isCellKey);

  let result: Awaited<ReturnType<typeof updateAvailabilities>>;
  try {
    // The ranges recorded until now: those the student did not touch are kept with their exact hours.
    const { availabilities } = await getStudentProfile();
    result = await updateAvailabilities(rangesFor(cells, availabilities));
  } catch (error) {
    unstable_rethrow(error);
    return { status: "error", message: NETWORK_ERROR, attempt };
  }
  if (!result.ok) return { status: "error", message: result.error, attempt };

  refresh();
  return {
    status: "success",
    message: "Vos disponibilités ont été enregistrées. Votre auto-école en tiendra compte pour vos prochaines leçons.",
    cells: cellsOf(result.data.availabilities),
    attempt,
  };
}
