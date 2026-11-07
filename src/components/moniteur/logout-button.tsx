"use client";

import type { ReactNode } from "react";
import { logout } from "@/features/auth/logout";

/** Saved pages hold student names and phones: delete them before the session ends. */
function forgetOfflinePages() {
  try {
    navigator.serviceWorker?.controller?.postMessage({ type: "logout" });
    void caches
      ?.keys()
      .then((names) => Promise.all(names.filter((n) => n.startsWith("moniteur-pages-")).map((n) => caches.delete(n))));
  } catch {
    // Cache storage unavailable (private browsing): nothing was saved.
  }
}

/** "Se déconnecter" of the instructor space: signs out and deletes the pages saved for offline use. */
export function LogoutButton({ className, label, children }: { className: string; label?: string; children: ReactNode }) {
  return (
    <form action={logout} onSubmit={forgetOfflinePages}>
      <button type="submit" className={className} aria-label={label} title={label}>
        {children}
      </button>
    </form>
  );
}
