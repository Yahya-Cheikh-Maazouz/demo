// Short-lived cookie set between the password step and the 2FA step.
// Mock: it holds the user id. The real API will issue an opaque, signed token instead.

import { cookies } from "next/headers";
import { findUserById } from "@/lib/api/auth";
import { PENDING_2FA_COOKIE } from "@/lib/auth-constants";
import type { User } from "@/lib/types";

const PENDING_MAX_AGE_SECONDS = 5 * 60;

/** Server Actions only. */
export async function startPendingTwoFactor(user: User): Promise<void> {
  (await cookies()).set(PENDING_2FA_COOKIE, user.id, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: PENDING_MAX_AGE_SECONDS,
  });
}

/** User waiting for their code on this auto-école, or null (no cookie, expired, other school). */
export async function getPendingTwoFactorUser(): Promise<User | null> {
  const userId = (await cookies()).get(PENDING_2FA_COOKIE)?.value;
  if (!userId) return null;
  const user = await findUserById(userId);
  return user?.twoFactorEnabled ? user : null;
}

/** Server Actions only. */
export async function clearPendingTwoFactor(): Promise<void> {
  const store = await cookies();
  if (store.has(PENDING_2FA_COOKIE)) store.delete(PENDING_2FA_COOKIE);
}
