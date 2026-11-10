"use client";

import { useActionState, type ReactNode } from "react";
import { unstable_rethrow } from "next/navigation";
import { logout } from "@/features/auth/logout";
import { cn } from "@/lib/cn";
import { forgetOfflinePages } from "./offline-pages";
import { useOnline } from "./use-online";

type LogoutState = { failed: boolean };

/**
 * "Se déconnecter" of the instructor space. Disabled offline: the session could not end, and the
 * saved day must stay available. The pages saved for offline use (student names, phones) are
 * deleted once the sign-out went through, just before the redirect to /connexion (which deletes
 * them too). A network failure leaves both the session and the saved copies in place.
 */
export function LogoutButton({
  className,
  label,
  tone = "light",
  children,
}: {
  className: string;
  label?: string;
  /** "dark": in the sidebar. */
  tone?: "light" | "dark";
  children: ReactNode;
}) {
  const online = useOnline();
  const [state, action, pending] = useActionState<LogoutState>(async () => {
    try {
      await logout();
    } catch (error) {
      try {
        // The sign-out answers with a redirect (rethrown below): the session is over.
        unstable_rethrow(error);
      } catch (redirect) {
        await forgetOfflinePages();
        throw redirect;
      }
      return { failed: true };
    }
    return { failed: false };
  }, { failed: false });

  return (
    <form action={action} className="relative">
      <button
        type="submit"
        className={cn(className, "disabled:cursor-not-allowed disabled:opacity-40")}
        aria-label={label}
        title={online ? label : "Indisponible hors connexion"}
        disabled={!online || pending}
        aria-busy={pending || undefined}
      >
        {children}
      </button>
      {state.failed && (
        <p
          role="alert"
          className={cn(
            "text-xs font-medium text-danger",
            tone === "dark" ? "absolute right-0 bottom-full mb-2 w-56 rounded-xl bg-danger-soft p-2.5 shadow-raised" : "px-3 pt-1",
          )}
        >
          La déconnexion n&apos;a pas abouti : réessayez avec du réseau.
        </p>
      )}
    </form>
  );
}
