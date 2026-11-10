/* Service worker of the instructor PWA (scope /moniteur).
 *
 * - /_next/static assets: cache first (content-hashed in production; network first in development,
 *   registered with ?mode=dev, so edits are not hidden by the cache).
 * - /moniteur pages: network first, the last copy is kept so the day stays visible offline. The
 *   page also asks for a copy of every screen it shows ("cache-page"), since the router moves
 *   between screens with RSC requests. Those RSC requests are never cached: offline they fail and
 *   the router falls back to a document navigation, served from the saved copies.
 * - Never cached: other spaces, server actions and every non-GET request, documents, API calls.
 * - Pages are kept only when they carry the session marker (data-moniteur-session="<instructor
 *   id>"), rendered by the shell once the instructor's session has been checked. A page without it
 *   means the session is gone (a redirect to /connexion, also when it is streamed inside a 200
 *   page): every saved page is deleted. A page of another instructor deletes the earlier copies
 *   before it is kept. Signing out ("logout") and the /connexion page delete them too.
 * - Navigations get the network response as it streams (the shell and skeletons show at once);
 *   the copy is saved in the background.
 */

const VERSION = "v2";
const PAGES = `moniteur-pages-${VERSION}`;
const STATIC = `moniteur-static-${VERSION}`;
const MAX_PAGES = 40;
/** Header added to the saved copies: the instructor they belong to. */
const OWNER_HEADER = "x-moniteur-session";
const SESSION_MARKER = /data-moniteur-session="([^"]+)"/;
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

/** Instructor the saved copies belong to, or null when nothing is saved. */
async function savedOwner(cache) {
  const [first] = await cache.keys();
  if (!first) return null;
  const response = await cache.match(first);
  return response ? response.headers.get(OWNER_HEADER) : null;
}

/**
 * Keeps a full HTML page of the instructor space. Reads it to the end: call it in the background
 * (event.waitUntil), never before handing the response to the page.
 */
async function savePage(url, response) {
  if (response.type === "opaqueredirect" || response.redirected) {
    await clearPages();
    return;
  }
  const type = response.headers.get("content-type") || "";
  if (!response.ok || response.type !== "basic" || !type.includes("text/html")) return;
  const html = await response.text();
  const owner = SESSION_MARKER.exec(html)?.[1];
  if (!owner) {
    // Rendered without a session (e.g. the redirect to /connexion streamed in a 200 page).
    await clearPages();
    return;
  }
  let cache = await caches.open(PAGES);
  const previous = await savedOwner(cache);
  if (previous && previous !== owner) {
    await clearPages();
    cache = await caches.open(PAGES);
  }
  const headers = new Headers(response.headers);
  // The body is stored decoded.
  for (const name of ["content-encoding", "content-length", "transfer-encoding"]) headers.delete(name);
  headers.set(OWNER_HEADER, owner);
  await cache.put(url, new Response(html, { status: response.status, statusText: response.statusText, headers }));
  recentlySaved.set(url, Date.now());
  await trim(cache);
}

const OFFLINE_PAGE = `<!doctype html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Hors connexion · Espace moniteur</title>
<style>body{margin:0;font-family:system-ui,sans-serif;background:#f3f7f6;color:#11211e;display:grid;place-items:center;min-height:100dvh;padding:16px;box-sizing:border-box}main{max-width:26rem;text-align:center}h1{font-size:1.5rem;margin:0 0 .5rem}p{color:#4a5c58;margin:0 0 1.5rem}a{display:inline-flex;align-items:center;justify-content:center;min-height:48px;padding:0 20px;border-radius:12px;background:#0f766e;color:#fff;font-weight:600;text-decoration:none}</style></head>
<body><main><h1>Vous êtes hors connexion</h1><p>Cette page n'a pas été enregistrée sur ce téléphone. Votre journée enregistrée reste disponible.</p><a href="/moniteur">Ouvrir ma journée</a></main></body></html>`;

async function networkFirstPage(event) {
  const { request } = event;
  const url = request.url;
  try {
    const response = await fetch(request);
    // Saved in the background: waiting here would hold the page until its last Suspense boundary.
    event.waitUntil(savePage(url, response.clone()).catch(() => undefined));
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
    event.respondWith(networkFirstPage(event));
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
