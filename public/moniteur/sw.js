/* Service worker of the instructor PWA (scope /moniteur).
 *
 * - /_next/static assets: cache first (content-hashed in production; network first in development,
 *   registered with ?mode=dev, so edits are not hidden by the cache).
 * - /moniteur pages: network first, the last copy is kept so the day stays visible offline. The
 *   page also asks for a copy of every screen it shows ("cache-page"), since the router moves
 *   between screens with RSC requests. Those RSC requests are never cached: offline they fail and
 *   the router falls back to a document navigation, served from the saved copies.
 * - Never cached: other spaces, server actions and every non-GET request, documents, API calls.
 * - Signing out ("logout") or a lost session deletes the saved pages (student names, phones).
 */

const VERSION = "v1";
const PAGES = `moniteur-pages-${VERSION}`;
const STATIC = `moniteur-static-${VERSION}`;
const MAX_PAGES = 40;
const DEV = new URL(self.location.href).searchParams.get("mode") === "dev";
/** Pages copied a moment ago (by a navigation), so "cache-page" does not fetch them twice. */
const recentlySaved = new Map();

self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keep = [PAGES, STATIC];
      const names = await caches.keys();
      await Promise.all(names.filter((name) => name.startsWith("moniteur-") && !keep.includes(name)).map((name) => caches.delete(name)));
      await self.clients.claim();
    })(),
  );
});

function isInstructorPage(url) {
  return url.origin === self.location.origin && (url.pathname === "/moniteur" || url.pathname.startsWith("/moniteur/")) && !url.pathname.endsWith(".js");
}

function isStaticAsset(url) {
  return url.origin === self.location.origin && url.pathname.startsWith("/_next/static/");
}

async function trim(cache) {
  const keys = await cache.keys();
  await Promise.all(keys.slice(0, Math.max(0, keys.length - MAX_PAGES)).map((request) => cache.delete(request)));
}

async function clearPages() {
  recentlySaved.clear();
  await caches.delete(PAGES);
}

/** Keeps a full HTML page of the instructor space; a redirect means the session is gone. */
async function savePage(url, response) {
  if (response.type === "opaqueredirect" || response.redirected) {
    await clearPages();
    return;
  }
  const type = response.headers.get("content-type") || "";
  if (!response.ok || response.type !== "basic" || !type.includes("text/html")) return;
  const cache = await caches.open(PAGES);
  await cache.put(url, response);
  recentlySaved.set(url, Date.now());
  await trim(cache);
}

const OFFLINE_PAGE = `<!doctype html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Hors connexion · Espace moniteur</title>
<style>body{margin:0;font-family:system-ui,sans-serif;background:#f3f7f6;color:#11211e;display:grid;place-items:center;min-height:100dvh;padding:16px;box-sizing:border-box}main{max-width:26rem;text-align:center}h1{font-size:1.5rem;margin:0 0 .5rem}p{color:#4a5c58;margin:0 0 1.5rem}a{display:inline-flex;align-items:center;justify-content:center;min-height:48px;padding:0 20px;border-radius:12px;background:#0f766e;color:#fff;font-weight:600;text-decoration:none}</style></head>
<body><main><h1>Vous êtes hors connexion</h1><p>Cette page n'a pas été enregistrée sur ce téléphone. Votre journée enregistrée reste disponible.</p><a href="/moniteur">Ouvrir ma journée</a></main></body></html>`;

async function networkFirstPage(request) {
  const url = request.url;
  try {
    const response = await fetch(request);
    await savePage(url, response.clone());
    return response;
  } catch {
    const cached = await caches.match(url, { cacheName: PAGES, ignoreVary: true });
    if (cached) return cached;
    return new Response(OFFLINE_PAGE, { status: 503, headers: { "Content-Type": "text/html; charset=utf-8" } });
  }
}

async function cacheFirstStatic(request) {
  const cache = await caches.open(STATIC);
  const cached = await cache.match(request);
  if (cached && !DEV) return cached;
  try {
    const response = await fetch(request);
    if (response.ok && response.type === "basic") await cache.put(request, response.clone());
    return response;
  } catch (error) {
    if (cached) return cached;
    throw error;
  }
}

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (request.mode === "navigate" && isInstructorPage(url)) {
    event.respondWith(networkFirstPage(request));
    return;
  }
  if (isStaticAsset(url)) {
    event.respondWith(cacheFirstStatic(request));
  }
  // Everything else (RSC requests, other spaces, documents, API calls) goes to the network untouched.
});

self.addEventListener("message", (event) => {
  const data = event.data || {};
  if (data.type === "logout") {
    event.waitUntil(clearPages());
    return;
  }
  if (data.type === "cache-page" && typeof data.url === "string") {
    const url = new URL(data.url, self.location.origin);
    if (!isInstructorPage(url)) return;
    const href = url.href;
    const savedAt = recentlySaved.get(href);
    if (!data.force && savedAt && Date.now() - savedAt < 10_000) return;
    event.waitUntil(
      fetch(href, { credentials: "same-origin", redirect: "manual", headers: { Accept: "text/html" } })
        .then((response) => savePage(href, response))
        .catch(() => undefined),
    );
  }
});
