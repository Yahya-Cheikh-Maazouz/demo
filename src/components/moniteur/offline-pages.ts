/** Prefix of the caches where the instructor's service worker keeps the saved pages (public/moniteur/sw.js). */
const PAGES_CACHE_PREFIX = "moniteur-pages-";

/**
 * Deletes the instructor pages saved for offline use (student names, phones, NEPH). Cache Storage
 * belongs to the origin, so any page of the school can do it, not only the worker's scope.
 */
export async function forgetOfflinePages(): Promise<void> {
  try {
    navigator.serviceWorker?.controller?.postMessage({ type: "logout" });
    if (typeof caches === "undefined") return;
    const names = await caches.keys();
    await Promise.all(names.filter((name) => name.startsWith(PAGES_CACHE_PREFIX)).map((name) => caches.delete(name)));
  } catch {
    // Cache storage unavailable (private browsing): nothing was saved.
  }
}
