// Kept free of server-only imports so proxy.ts and client components can use them.

import type { Role } from "@/lib/types";

export const SESSION_COOKIE = "ae_session";
/** Set between the password step and the 2FA step. */
export const PENDING_2FA_COOKIE = "ae_2fa";
/** Set by proxy.ts from the request host. Never read it from the client. */
export const TENANT_HEADER = "x-tenant-slug";

/** Routes that need a session; proxy.ts redirects to /connexion without one. */
export const PROTECTED_PREFIXES = ["/eleve", "/gestion", "/moniteur", "/parent", "/admin"];

/** Landing page of each role's space. */
export function homePathFor(role: Role): string {
  switch (role) {
    case "eleve":
      return "/eleve";
    case "parent":
      return "/parent";
    case "moniteur":
      return "/moniteur";
    case "gerant":
    case "assistante":
      return "/gestion";
    case "super_admin":
      return "/admin";
  }
}
