// Session handling. Mock for now: the real API will issue short-lived httpOnly
// session cookies and refresh them in the background. Never store tokens in localStorage.

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { SESSION_COOKIE, homePathFor } from "@/lib/auth-constants";
import { findUserBySessionToken, sessionTokenFor } from "@/lib/mock/store";
import { getTenant } from "@/lib/tenant";
import type { Role, User } from "@/lib/types";

const SESSION_MAX_AGE_SECONDS = 60 * 60 * 8;

/** Current user, or null. A session opened on another auto-école's subdomain is ignored. */
export async function getSession(): Promise<{ user: User } | null> {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const user = findUserBySessionToken(token);
  if (!user) return null;
  const tenant = await getTenant();
  if (!tenant || tenant.slug !== user.tenantSlug) return null;
  return { user };
}

/** Redirects to /connexion without a session, or to the user's own space if they are not a student. */
export async function requireStudent(): Promise<User> {
  const session = await getSession();
  if (!session) redirect("/connexion");
  if (session.user.role !== "eleve") redirect(homePathFor(session.user.role));
  return session.user;
}

const STAFF_ROLES: Role[] = ["gerant", "assistante"];

/** Gérant or assistante of the current auto-école; anyone else goes to /connexion or their own space. */
export async function requireStaff(): Promise<User> {
  const session = await getSession();
  if (!session) redirect("/connexion?suite=%2Fgestion");
  if (!STAFF_ROLES.includes(session.user.role)) redirect(homePathFor(session.user.role));
  return session.user;
}

/** Server Actions only. */
export async function createSession(user: User): Promise<void> {
  (await cookies()).set(SESSION_COOKIE, sessionTokenFor(user), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_MAX_AGE_SECONDS,
  });
}

/** Server Actions only. */
export async function deleteSession(): Promise<void> {
  (await cookies()).delete(SESSION_COOKIE);
}
