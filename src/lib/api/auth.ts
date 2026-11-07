// Authentication API. Today it reads the in-memory mock; tomorrow each function becomes an
// HTTP call to the backend. The auto-école is never chosen by the user: it comes from the
// request host (resolved by proxy.ts), exactly like the real API will do.
//
// Server-side only (Server Components and Server Actions). This is the only auth file allowed
// to import the mock store.

import { connection } from "next/server";
import { PLATFORM_TENANT_SLUG } from "@/lib/auth-constants";
import * as store from "@/lib/mock/store";
import { getTenant, isPlatformRequest } from "@/lib/tenant";
import type { ActionResult, User } from "@/lib/types";

const LATENCY_MS = 250;
const settle = () => new Promise((resolve) => setTimeout(resolve, LATENCY_MS));

/**
 * Checks the credentials on the current auto-école, or of a platform account (super-admin) on
 * the platform host. Error codes: "identifiants_invalides", "compte_bloque" (5 failures → 15 min),
 * "compte_desactive", "suspendu" (school suspended: only its gérant signs in),
 * "auto_ecole_introuvable" (unknown subdomain). `error` is a French message ready to display.
 */
export async function authenticate(email: string, password: string): Promise<ActionResult<{ user: User }>> {
  const [tenant, platform] = await Promise.all([getTenant(), isPlatformRequest()]);
  // "now" must be a request-time value (see api/eleve.ts context()).
  await connection();
  const now = new Date();
  await settle();
  if (platform) return store.authenticate(PLATFORM_TENANT_SLUG, email, password, now);
  if (!tenant) {
    return { ok: false, code: "auto_ecole_introuvable", error: "Cette adresse ne correspond à aucune auto-école." };
  }
  return store.authenticate(tenant.slug, email, password, now);
}

const MAX_TOTP_FAILURES = 5;
// Mock of the API's server-side limit on 2FA attempts (kept on globalThis to survive hot reloads).
const g = globalThis as unknown as { __aeTotpFailures?: Map<string, number> };
const totpFailures = (g.__aeTotpFailures ??= new Map<string, number>());

/**
 * Checks a TOTP code (application d'authentification) for a user waiting for their second step.
 * Error codes: "code_incorrect", "trop_de_tentatives" (5 wrong codes: the half-finished sign-in
 * is cancelled and the person must start again from the password).
 */
export async function verifyTotp(userId: string, code: string): Promise<ActionResult> {
  await settle();
  if (store.verifyTotp(userId, code)) {
    totpFailures.delete(userId);
    return { ok: true };
  }
  const failures = (totpFailures.get(userId) ?? 0) + 1;
  if (failures >= MAX_TOTP_FAILURES) {
    totpFailures.delete(userId);
    return {
      ok: false,
      code: "trop_de_tentatives",
      error: "Trop de codes incorrects. Pour votre sécurité, reconnectez-vous avec votre mot de passe.",
    };
  }
  totpFailures.set(userId, failures);
  return {
    ok: false,
    code: "code_incorrect",
    error: "Code incorrect. Saisissez le nouveau code affiché dans votre application.",
  };
}

/**
 * User of the current auto-école (or platform account on the platform host), or null (unknown id
 * or account of another school).
 */
export async function findUserById(id: string): Promise<User | null> {
  const [tenant, platform] = await Promise.all([getTenant(), isPlatformRequest()]);
  const user = store.findUserById(id);
  if (!user) return null;
  if (platform) return user.tenantSlug === PLATFORM_TENANT_SLUG ? user : null;
  if (!tenant || user.tenantSlug !== tenant.slug) return null;
  return user;
}

/**
 * Asks the backend to e-mail a reset link. Always succeeds, whether or not an account exists,
 * so the answer never reveals which addresses are registered.
 */
export async function requestPasswordReset(email: string): Promise<ActionResult> {
  void email;
  await settle();
  return { ok: true };
}

export type DemoAccount = {
  label: string;
  email: string;
  password: string;
  /** Code to type on the 2FA step, for accounts that have it. */
  totpCode?: string;
};

const DEMO_ACCOUNTS: Record<string, DemoAccount[]> = {
  dupont: [
    { label: "Élève", email: "jules.durand@exemple.fr", password: "demo1234" },
    { label: "Gérant", email: "gerant@ecole-dupont.fr", password: "demo1234", totpCode: "123456" },
    { label: "Assistante", email: "assistante@ecole-dupont.fr", password: "demo1234", totpCode: "123456" },
    { label: "Moniteur", email: "sophie.laurent@ecole-dupont.fr", password: "demo1234" },
    { label: "Parent", email: "n.fontaine@exemple.fr", password: "demo1234" },
  ],
  "conduite-plus": [
    { label: "Élève", email: "ines.martin@exemple.fr", password: "demo1234" },
    { label: "Gérant", email: "gerant@conduite-plus.fr", password: "demo1234", totpCode: "123456" },
    { label: "Moniteur", email: "lucas.moreau@conduite-plus.fr", password: "demo1234" },
  ],
};

/** Platform back-office (admin.<domaine>). */
const PLATFORM_DEMO_ACCOUNTS: DemoAccount[] = [
  { label: "Super-admin", email: "support@plateforme-autoecole.fr", password: "demo1234", totpCode: "123456" },
];

/** Demo accounts of the current auto-école (or of the platform host). Always empty in production. */
export async function getDemoAccounts(): Promise<DemoAccount[]> {
  if (process.env.NODE_ENV === "production") return [];
  if (await isPlatformRequest()) return PLATFORM_DEMO_ACCOUNTS;
  const tenant = await getTenant();
  return tenant ? (DEMO_ACCOUNTS[tenant.slug] ?? []) : [];
}
