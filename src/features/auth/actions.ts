"use server";

import { redirect } from "next/navigation";
import { authenticate, requestPasswordReset, verifyTotp } from "@/lib/api/auth";
import { createSession } from "@/lib/session";
import type { ForgotPasswordState, LoginState, VerificationState } from "./form-state";
import { clearPendingTwoFactor, getPendingTwoFactorUser, startPendingTwoFactor } from "./pending-2fa";
import { loginPath, readSuiteParam, safeNextPath, verificationPath } from "./redirect";

// Deliberately loose: the API does the real check. This only catches obvious typos.
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const TOTP_PATTERN = /^\d{6}$/;

function readText(formData: FormData, name: string): string {
  const value = formData.get(name);
  return typeof value === "string" ? value : "";
}

function emailError(email: string): string | undefined {
  if (!email) return "Saisissez votre adresse e-mail.";
  if (!EMAIL_PATTERN.test(email)) return "Saisissez une adresse e-mail valide, par exemple nom@exemple.fr.";
  return undefined;
}

export async function login(prev: LoginState, formData: FormData): Promise<LoginState> {
  const email = readText(formData, "email").trim();
  const password = readText(formData, "password");
  const suite = readSuiteParam(readText(formData, "suite"));
  const attempt = (prev.attempt ?? 0) + 1;

  const fieldErrors: LoginState["fieldErrors"] = {
    email: emailError(email),
    password: password ? undefined : "Saisissez votre mot de passe.",
  };
  if (fieldErrors.email || fieldErrors.password) {
    return { status: "error", fieldErrors, values: { email }, attempt };
  }

  const result = await authenticate(email, password);
  if (!result.ok) {
    return { status: "error", code: result.code, message: result.error, values: { email }, attempt };
  }

  const { user } = result.data;
  if (user.twoFactorEnabled) {
    await startPendingTwoFactor(user);
    redirect(verificationPath(suite));
  }
  await clearPendingTwoFactor();
  await createSession(user);
  redirect(safeNextPath(suite, user.role));
}

export async function verifyTwoFactor(prev: VerificationState, formData: FormData): Promise<VerificationState> {
  const suite = readSuiteParam(readText(formData, "suite"));
  const user = await getPendingTwoFactorUser();
  if (!user) redirect(loginPath(suite, "verification-expiree"));

  const code = readText(formData, "code").replace(/\s/g, "");
  const attempt = (prev.attempt ?? 0) + 1;

  if (!code) {
    return { status: "error", fieldErrors: { code: "Saisissez le code à 6 chiffres affiché dans votre application." }, attempt };
  }
  if (!TOTP_PATTERN.test(code)) {
    return { status: "error", fieldErrors: { code: "Le code doit contenir exactement 6 chiffres." }, attempt };
  }
  const result = await verifyTotp(user.id, code);
  if (!result.ok) {
    if (result.code === "trop_de_tentatives") {
      await clearPendingTwoFactor();
      redirect(loginPath(suite, "trop-de-codes"));
    }
    return { status: "error", code: result.code, fieldErrors: { code: result.error }, attempt };
  }

  await clearPendingTwoFactor();
  await createSession(user);
  redirect(safeNextPath(suite, user.role));
}

/** "Revenir à la connexion" from the 2FA step: forgets the half-finished sign-in. */
export async function cancelTwoFactor(formData: FormData): Promise<void> {
  await clearPendingTwoFactor();
  redirect(loginPath(readSuiteParam(readText(formData, "suite"))));
}

/** Always answers the same way once the address is well-formed: no account enumeration. */
export async function forgotPassword(prev: ForgotPasswordState, formData: FormData): Promise<ForgotPasswordState> {
  const email = readText(formData, "email").trim();
  const attempt = (prev.attempt ?? 0) + 1;

  const error = emailError(email);
  if (error) return { status: "error", fieldErrors: { email: error }, values: { email }, attempt };

  await requestPasswordReset(email);
  return { status: "success", attempt };
}
