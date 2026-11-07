"use client";

import { useEffect } from "react";
import { usePathname, useSearchParams } from "next/navigation";

const SW_URL = `/moniteur/sw.js${process.env.NODE_ENV === "production" ? "" : "?mode=dev"}`;

function saveCopy(url: string, force: boolean) {
  if (!("serviceWorker" in navigator) || !navigator.onLine) return () => {};
  let cancelled = false;
  void navigator.serviceWorker.ready.then((registration) => {
    if (!cancelled) registration.active?.postMessage({ type: "cache-page", url, force });
  });
  return () => {
    cancelled = true;
  };
}

/** After a change (émargement, livret, demande…), refreshes the saved copy of the current screen. */
export function refreshOfflineCopy() {
  saveCopy(`${window.location.pathname}${window.location.search}`, true);
}

/**
 * Registers the instructor PWA's service worker (scope /moniteur, this space only) and asks it to
 * keep a copy of every screen shown, so the day stays visible offline. Render inside <Suspense>:
 * it reads the pathname and the search params.
 */
export function ServiceWorkerRegistrar() {
  const pathname = usePathname();
  const search = useSearchParams().toString();

  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    navigator.serviceWorker.register(SW_URL, { scope: "/moniteur", updateViaCache: "none" }).catch(() => {
      // Unsupported or blocked (private browsing): the space works online as usual.
    });
  }, []);

  useEffect(() => saveCopy(`${pathname}${search ? `?${search}` : ""}`, false), [pathname, search]);

  return null;
}
