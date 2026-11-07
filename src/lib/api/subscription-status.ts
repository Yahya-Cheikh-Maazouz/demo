// Subscription state of the current auto-école, shared by every space. When the platform puts a
// school in read-only mode (unpaid after the grace period) every mutation is refused; when it is
// suspended only the gérant can sign in, to settle the subscription. The real API will apply this
// itself: the front only explains it and hides what cannot be done.

import { connection } from "next/server";
import * as store from "@/lib/mock/store";
import { getTenant } from "@/lib/tenant";
import type { SubscriptionStatus } from "@/lib/types";

const BLOCKED: Partial<Record<SubscriptionStatus, { code: string; error: string }>> = {
  lecture_seule: {
    code: "lecture_seule",
    error: "L'espace de l'auto-école est en lecture seule : son abonnement est impayé. Aucune modification n'est possible pour le moment.",
  },
  suspendu: {
    code: "suspendu",
    error: "L'espace de l'auto-école est suspendu. Seul le gérant peut se connecter pour régulariser l'abonnement.",
  },
};

/**
 * Error to return from a mutation when the school cannot be modified, or null when it can.
 * Call it in every mutation of src/lib/api/* before writing.
 */
export function subscriptionBlock(tenantSlug: string, now: Date): { ok: false; code: string; error: string } | null {
  const blocked = BLOCKED[store.readSubscriptionStatus(tenantSlug, now)];
  return blocked ? { ok: false, ...blocked } : null;
}

/** Status of the current request's auto-école, or null outside a school (platform host). */
export async function getSubscriptionStatus(): Promise<SubscriptionStatus | null> {
  const tenant = await getTenant();
  if (!tenant) return null;
  await connection();
  return store.readSubscriptionStatus(tenant.slug, new Date());
}
