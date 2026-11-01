import { NextResponse, type NextRequest } from "next/server";
import { PROTECTED_PREFIXES, SESSION_COOKIE, TENANT_HEADER } from "@/lib/auth-constants";

/** Platform domain, e.g. "nomdelaplateforme.fr". Schools live on <slug>.<root domain>. */
const ROOT_DOMAIN = process.env.NEXT_PUBLIC_ROOT_DOMAIN;
/** Tenant used on bare localhost so local development works without a subdomain. */
const DEV_DEFAULT_TENANT = "dupont";

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

export function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;

  // Optimistic check only: the real authorization happens server-side on every data access.
  // Server Action calls are let through: a 307 would hand HTML to the action's fetch, while the
  // action's own requireStudent() redirect reaches the client as a proper router redirect.
  const isProtected = PROTECTED_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`));
  const isServerAction = request.method === "POST" && request.headers.has("next-action");
  if (isProtected && !isServerAction && !request.cookies.has(SESSION_COOKIE)) {
    const url = request.nextUrl.clone();
    url.pathname = "/connexion";
    url.search = `?suite=${encodeURIComponent(pathname + search)}`;
    return NextResponse.redirect(url);
  }

  const requestHeaders = new Headers(request.headers);
  // Never trust a tenant header sent by the client.
  requestHeaders.delete(TENANT_HEADER);
  const slug = resolveTenantSlug(request.headers.get("host") ?? "");
  if (slug) requestHeaders.set(TENANT_HEADER, slug);

  return NextResponse.next({ request: { headers: requestHeaders } });
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|webp|ico|txt|webmanifest)$).*)"],
};
