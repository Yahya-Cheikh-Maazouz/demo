"use server";

import { refresh } from "next/cache";
import { unstable_rethrow } from "next/navigation";
import { regularizeSubscription } from "@/lib/api/gestion";
import type { RegularizeState } from "./action-state";

const NETWORK_ERROR = "Le serveur n'a pas répondu. Vérifiez votre connexion puis réessayez.";

/** "Mettre à jour le moyen de paiement": mock of Stripe, the payment succeeds and the subscription is active again. */
export async function regularizeAction(prev: RegularizeState, formData: FormData): Promise<RegularizeState> {
  void formData;
  const attempt = (prev.attempt ?? 0) + 1;
  try {
    const result = await regularizeSubscription();
    if (!result.ok) return { status: "error", code: result.code, message: result.error, attempt };
    refresh();
    return {
      status: "success",
      message: "Paiement accepté : votre abonnement est de nouveau actif. Toute l'équipe, vos élèves et les parents retrouvent leur espace.",
      attempt,
    };
  } catch (error) {
    unstable_rethrow(error);
    return { status: "error", code: "reseau", message: NETWORK_ERROR, attempt };
  }
}
