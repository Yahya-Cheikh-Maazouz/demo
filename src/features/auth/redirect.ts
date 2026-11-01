// Where to send someone after they sign in. Pure functions: usable from Server Components and actions.

import { homePathFor } from "@/lib/auth-constants";
import type { Role } from "@/lib/types";

const MAX_PATH_LENGTH = 512;
// Browsers drop tabs and newlines inside URLs, which can turn "/\t/evil.fr" into "//evil.fr".
const CONTROL_CHARS = /[\u0000-\u001f\u007f]/;
// Only used to resolve relative paths the way a browser would; never part of the result.
const PLACEHOLDER_ORIGIN = "http://suite.invalid";

/** Reads the "suite" query param (the page the person wanted before being asked to sign in). */
export function readSuiteParam(value: string | string[] | undefined): string | undefined {
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

/**
 * `suite` only if it is a relative path inside the user's own space, otherwise their home.
 * Blocks open redirects ("//site.fr", "/\\site.fr", "https://…") and links to another role's space,
 * including through dot segments ("/eleve/../gestion"): the path is resolved like a browser would.
 */
export function safeNextPath(suite: string | undefined, role: Role): string {
  const home = homePathFor(role);
  if (!suite || suite.length > MAX_PATH_LENGTH || CONTROL_CHARS.test(suite)) return home;
  if (!suite.startsWith("/") || suite.startsWith("//") || suite.startsWith("/\\")) return home;

  let url: URL;
  try {
    url = new URL(suite, PLACEHOLDER_ORIGIN);
  } catch {
    return home;
  }
  if (url.origin !== PLACEHOLDER_ORIGIN) return home;
  if (url.pathname !== home && !url.pathname.startsWith(`${home}/`)) return home;
  return `${url.pathname}${url.search}${url.hash}`;
}

function withParams(path: string, params: Record<string, string | undefined>): string {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) if (value) query.set(key, value);
  const search = query.toString();
  return search ? `${path}?${search}` : path;
}

/** Why the person is sent back to /connexion; the login page shows a matching notice. */
export type LoginMotif = "verification-expiree" | "trop-de-codes";

export const verificationPath = (suite?: string) => withParams("/connexion/verification", { suite });
export const loginPath = (suite?: string, motif?: LoginMotif) => withParams("/connexion", { motif, suite });
