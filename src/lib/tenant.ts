import { headers } from "next/headers";
import { PLATFORM_HEADER, TENANT_HEADER } from "@/lib/auth-constants";
import { findTenantBySlug } from "@/lib/mock/store";
import type { Tenant } from "@/lib/types";

/** Auto-école of the current request, resolved by proxy.ts from the host. Null if unknown. */
export async function getTenant(): Promise<Tenant | null> {
  const slug = (await headers()).get(TENANT_HEADER);
  return slug ? findTenantBySlug(slug) : null;
}

/** True on the platform back-office host (admin.<domaine>), where there is no auto-école. */
export async function isPlatformRequest(): Promise<boolean> {
  return (await headers()).get(PLATFORM_HEADER) === "1";
}

const HEX_COLOR = /^#[0-9a-f]{6}$/i;

export function safeBrandColor(color: string): string | null {
  return HEX_COLOR.test(color) ? color : null;
}
