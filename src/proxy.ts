import { NextResponse, type NextRequest } from "next/server";
import {
  PLATFORM_HEADER,
  PLATFORM_SUBDOMAIN,
  PROTECTED_PREFIXES,
  SESSION_COOKIE,
  TENANT_HEADER,
} from "@/lib/auth-constants";

/** Platform domain, e.g. "nomdelaplateforme.fr". Schools live on <slug>.<root domain>. */
const ROOT_DOMAIN = process.env.NEXT_PUBLIC_ROOT_DOMAIN;
/**
 * Tenant used on bare localhost so `npm run dev` works without a subdomain. Development only:
 * elsewhere bare localhost is the server's own internal origin and must never mean a school.
 */
const DEV_DEFAULT_TENANT = process.env.NODE_ENV === "development" ? "dupont" : null;
/** Set by Next.js on a Server Action it forwards to a route that holds it (a request to its own origin). */
const ACTION_FORWARDED_HEADER = "x-action-forwarded";
/** The only pages of the platform host (admin.<domaine>): sign-in with its 2FA step, and the back-office. */
const PLATFORM_PREFIXES = ["/connexion", "/admin"];
/** Back-office routes: they do not exist on an auto-école's host. */
const PLATFORM_ONLY_PREFIXES = ["/admin"];
/** Matches no route: a rewrite there renders the 404 page with a 404 status. */
const NOT_FOUND_PATH = "/_introuvable";

function resolveTenantSlug(host: string): string | null {
  const hostname = host.split(":")[0].toLowerCase();
  if (hostname === "localhost" || hostname === "127.0.0.1") return DEV_DEFAULT_TENANT;
  // ecole-dupont.localhost works out of the box in browsers.
  if (hostname.endsWith(".localhost")) return hostname.slice(0, -".localhost".length) || null;
  if (ROOT_DOMAIN && hostname.endsWith(`.${ROOT_DOMAIN}`)) {
    return hostname.slice(0, -(ROOT_DOMAIN.length + 1)) || null;
  }
  return null;
}

const matches = (prefixes: string[], pathname: string) =>
  prefixes.some((p) => pathname === p || pathname.startsWith(`${p}/`));

export function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  // The public host. Behind a reverse proxy, and when Next.js renders the target of a Server
  // Action redirect or forwards an action to another route (internal requests to its own origin,
  // e.g. localhost:3000), the visited host is in x-forwarded-host: without it, a sign-in on another
  // school would render the default one.
  // Spoofing it gains nothing: sessions are checked against the school (src/lib/session.ts).
  const host = request.headers.get("x-forwarded-host")?.split(",")[0].trim() || request.headers.get("host") || "";
  const subdomain = resolveTenantSlug(host);
  // "admin" is reserved: the super-admin back-office, never an auto-école.
  const isPlatform = subdomain === PLATFORM_SUBDOMAIN;

  // A Server Action posted to a route that does not hold it is forwarded by Next.js to its own
  // origin (Host: localhost). That hop must stay on the school the browser visited: its Origin
  // header was checked against the visited host by Next.js on the first hop. Refuse any mismatch
  // rather than fall back to another school (a session of school A accepted on B's host).
  if (request.headers.has(ACTION_FORWARDED_HEADER)) {
    const origin = request.headers.get("origin");
    const originHost = origin && URL.canParse(origin) ? new URL(origin).host : null;
    if (originHost && resolveTenantSlug(originHost) !== subdomain) {
      return new NextResponse(null, { status: 403 });
    }
  }

  if (isPlatform && !matches(PLATFORM_PREFIXES, pathname)) {
    const url = request.nextUrl.clone();
    url.pathname = "/admin";
    url.search = "";
    return NextResponse.redirect(url);
  }

  // Service worker of the instructor PWA (public/moniteur/sw.js): public file, allowed to control
  // /moniteur itself and not only /moniteur/… (its default scope).
  if (pathname === "/moniteur/sw.js") {
    const response = NextResponse.next();
    response.headers.set("Service-Worker-Allowed", "/moniteur");
    return response;
  }

  const requestHeaders = new Headers(request.headers);
  // Never trust a tenant or platform header sent by the client.
  requestHeaders.delete(TENANT_HEADER);
  requestHeaders.delete(PLATFORM_HEADER);
  if (isPlatform) requestHeaders.set(PLATFORM_HEADER, "1");
  else if (subdomain) requestHeaders.set(TENANT_HEADER, subdomain);

  // The back-office does not exist on a school's host, signed in or not.
  if (!isPlatform && matches(PLATFORM_ONLY_PREFIXES, pathname)) {
    return NextResponse.rewrite(new URL(NOT_FOUND_PATH, request.url), { request: { headers: requestHeaders } });
  }

  // Optimistic check only: the real authorization happens server-side on every data access.
  // Server Action calls are let through: a 307 would hand HTML to the action's fetch, while the
  // action's own requireStudent() redirect reaches the client as a proper router redirect.
  const isProtected = matches(PROTECTED_PREFIXES, pathname);
  const isServerAction = request.method === "POST" && request.headers.has("next-action");
  if (isProtected && !isServerAction && !request.cookies.has(SESSION_COOKIE)) {
    const url = request.nextUrl.clone();
    url.pathname = "/connexion";
    url.search = `?suite=${encodeURIComponent(pathname + search)}`;
    return NextResponse.redirect(url);
  }

  return NextResponse.next({ request: { headers: requestHeaders } });
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|webp|ico|txt|webmanifest)$).*)"],
};
