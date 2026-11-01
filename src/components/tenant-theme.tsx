import { getTenant, safeBrandColor } from "@/lib/tenant";

/** Injects the auto-école brand color. Render inside <Suspense>: it reads request headers. */
export async function TenantTheme() {
  const tenant = await getTenant();
  const color = tenant && safeBrandColor(tenant.brandColor);
  if (!color) return null;
  return <style>{`:root{--brand:${color}}`}</style>;
}
