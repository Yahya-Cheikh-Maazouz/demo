import { Suspense, type ReactNode } from "react";
import { TenantBrandSkeleton } from "@/components/tenant-brand";
import { AuthBrand } from "@/features/auth/auth-brand";
import { AuthHelp, AuthHelpSkeleton } from "@/features/auth/auth-help";
import { BrandPanel } from "@/features/auth/brand-panel";

/**
 * Sign-in pages. Mobile: one column, school brand on top, form below.
 * From lg: split screen, form on the left and the auto-école's brand panel on the right.
 * Each page wraps its content in <RequireTenant> for unknown subdomains.
 */
export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-dvh bg-surface lg:grid lg:grid-cols-2">
      <div className="flex min-h-dvh flex-col px-4 pt-[calc(env(safe-area-inset-top)+1rem)] pb-[calc(env(safe-area-inset-bottom)+1rem)] sm:px-8 lg:px-12 xl:px-20">
        <header className="mx-auto flex min-h-16 w-full max-w-md items-center">
          <Suspense fallback={<TenantBrandSkeleton size="lg" />}>
            <AuthBrand />
          </Suspense>
        </header>

        <main id="contenu" className="flex flex-1 flex-col pt-8 pb-10 sm:justify-center sm:py-12">
          <div className="mx-auto w-full max-w-md">{children}</div>
        </main>

        <footer className="mx-auto w-full max-w-md">
          <Suspense fallback={<AuthHelpSkeleton />}>
            <AuthHelp />
          </Suspense>
        </footer>
      </div>

      <BrandPanel />
    </div>
  );
}
