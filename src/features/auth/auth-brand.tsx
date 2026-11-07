import { PlatformBrand } from "@/components/admin/platform-brand";
import { TenantBrand } from "@/components/tenant-brand";
import { isPlatformRequest } from "@/lib/tenant";

/** Brand at the top of the sign-in pages: the auto-école's, or the platform's on the back-office host. Render inside <Suspense>. */
export async function AuthBrand() {
  if (await isPlatformRequest()) return <PlatformBrand size="lg" subtitle="Back-office" />;
  return <TenantBrand size="lg" />;
}
