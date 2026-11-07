import { Suspense, type ReactNode } from "react";
import { CircleHelp, LogOut } from "lucide-react";
import { SubscriptionBanner } from "@/components/subscription-banner";
import { TenantBrand, TenantBrandSkeleton } from "@/components/tenant-brand";
import { Avatar } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { getInstructorUser, getNow, getPendingRequestsCount } from "@/lib/api/moniteur";
import { formatDateLong, initials } from "@/lib/format";
import { getTenant } from "@/lib/tenant";
import { InstallInvite } from "./install-invite";
import { InstructorNav, InstructorNavFallback, InstructorTabBar, InstructorTabBarFallback } from "./instructor-nav";
import { LogoutButton } from "./logout-button";
import { MoreMenu } from "./more-menu";
import { OfflineBanner } from "./offline-banner";
import { ServiceWorkerRegistrar } from "./service-worker";

async function SidebarNav() {
  const pending = await getPendingRequestsCount();
  return <InstructorNav variant="sidebar" pending={pending} />;
}

async function TabBar() {
  const [pending, tenant] = await Promise.all([getPendingRequestsCount(), getTenant()]);
  return <InstructorTabBar pending={pending} menu={<MoreMenu pending={pending} agencyPhone={tenant?.phone ?? null} />} />;
}

/** Instructor's name and today's date, at the top right. */
async function Identity() {
  const [user, now] = await Promise.all([getInstructorUser(), getNow()]);
  return (
    <div className="flex min-w-0 items-center gap-2.5">
      <span className="min-w-0 text-right">
        <span className="block truncate text-sm font-bold text-ink">
          {user.firstName} {user.lastName}
        </span>
        <span className="block truncate text-xs text-ink-subtle">{formatDateLong(now)}</span>
      </span>
      <Avatar initials={initials(user.firstName, user.lastName)} size="md" solid />
    </div>
  );
}

function IdentitySkeleton() {
  return (
    <div className="flex items-center gap-2.5">
      <span className="space-y-1.5">
        <Skeleton className="ml-auto h-3.5 w-24" />
        <Skeleton className="h-3 w-28" />
      </span>
      <Skeleton className="size-10 rounded-full" />
    </div>
  );
}

/** Instructor and logout, at the bottom of the sidebar. */
async function SidebarUser() {
  const user = await getInstructorUser();
  return (
    <div className="flex items-center gap-2">
      <div className="flex min-w-0 flex-1 items-center gap-3 p-1.5">
        <Avatar initials={initials(user.firstName, user.lastName)} solid />
        <span className="min-w-0">
          <span className="block truncate text-sm font-semibold text-white">
            {user.firstName} {user.lastName}
          </span>
          <span className="block truncate text-xs text-white/60">Moniteur</span>
        </span>
      </div>
      <LogoutButton
        label="Se déconnecter"
        className="flex size-11 items-center justify-center rounded-xl text-white/60 hover:bg-white/10 hover:text-white focus-visible:outline-brand-bright"
      >
        <LogOut className="size-5" aria-hidden />
      </LogoutButton>
    </div>
  );
}

/** "Besoin de l'accueil ?" with the agency's phone number. */
async function AgencyLine() {
  const tenant = await getTenant();
  if (!tenant) return null;
  return (
    <a
      href={`tel:${tenant.phone.replace(/\s/g, "")}`}
      className="flex items-center gap-3 rounded-2xl bg-sidebar-raised p-3 text-white/80 transition-colors hover:text-white focus-visible:outline-brand-bright"
    >
      <CircleHelp className="size-5 shrink-0 text-brand-bright" aria-hidden />
      <span className="min-w-0">
        <span className="block text-sm font-semibold text-white">Appeler l&apos;accueil</span>
        <span className="block text-xs tabular-nums">{tenant.phone}</span>
      </span>
    </a>
  );
}

/**
 * Layout of the instructor PWA, phone first (used in the car): top bar with the school, the
 * instructor and the date, a bottom tab bar with big targets and a "Plus" sheet; a dark grouped
 * sidebar from `lg`. Content stays in one comfortable column. Registers the service worker.
 */
export function InstructorShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-dvh">
      <a
        href="#contenu"
        className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-50 focus:rounded-lg focus:bg-surface focus:px-4 focus:py-2 focus:font-semibold focus:shadow-raised"
      >
        Aller au contenu
      </a>

      <aside className="fixed inset-y-0 left-0 z-30 hidden w-68 flex-col bg-sidebar lg:flex">
        <div className="flex h-20 shrink-0 items-center px-5">
          <Suspense fallback={<TenantBrandSkeleton />}>
            <TenantBrand subtitle="Espace moniteur" href="/moniteur" tone="dark" />
          </Suspense>
        </div>
        <nav aria-label="Navigation principale" className="flex-1 overflow-y-auto px-3 pt-2 pb-4">
          <Suspense fallback={<InstructorNavFallback variant="sidebar" />}>
            <SidebarNav />
          </Suspense>
        </nav>
        <div className="shrink-0 space-y-2 p-3">
          <Suspense fallback={<div className="h-16 rounded-2xl bg-sidebar-raised" />}>
            <AgencyLine />
          </Suspense>
          <Suspense fallback={<div className="h-14" />}>
            <SidebarUser />
          </Suspense>
        </div>
      </aside>

      <div className="lg:pl-68">
        <header className="sticky top-0 z-20 border-b border-line/70 bg-canvas/90 pt-[env(safe-area-inset-top)] backdrop-blur-md">
          <div className="mx-auto flex h-16 max-w-2xl items-center justify-between gap-3 px-4 sm:px-6 lg:h-20 lg:max-w-none lg:px-10">
            <div className="min-w-0 lg:hidden">
              <Suspense fallback={<TenantBrandSkeleton />}>
                <TenantBrand href="/moniteur" />
              </Suspense>
            </div>
            <p className="eyebrow hidden lg:block">Espace moniteur</p>
            <Suspense fallback={<IdentitySkeleton />}>
              <Identity />
            </Suspense>
          </div>
          <OfflineBanner />
        </header>

        <main
          id="contenu"
          tabIndex={-1}
          className="mx-auto w-full max-w-2xl px-4 pt-5 pb-[calc(6.5rem+env(safe-area-inset-bottom))] outline-none sm:px-6 lg:pt-6 lg:pb-14"
        >
          <Suspense fallback={null}>
            <SubscriptionBanner />
          </Suspense>
          <InstallInvite />
          {children}
        </main>
      </div>

      <nav
        aria-label="Navigation principale"
        className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-surface/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-md lg:hidden"
      >
        <Suspense fallback={<InstructorTabBarFallback menu={<MoreMenu pending={0} agencyPhone={null} />} />}>
          <TabBar />
        </Suspense>
      </nav>

      <Suspense fallback={null}>
        <ServiceWorkerRegistrar />
      </Suspense>
    </div>
  );
}
