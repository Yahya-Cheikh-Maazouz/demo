import Link from "next/link";
import { Suspense, type ReactNode } from "react";
import { ChevronRight, CircleHelp, LogOut } from "lucide-react";
import { SubscriptionBanner } from "@/components/subscription-banner";
import { TenantBrand, TenantBrandSkeleton } from "@/components/tenant-brand";
import { Avatar } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { logout } from "@/features/auth/logout";
import { getPageAccount } from "@/features/parent/data";
import { initials } from "@/lib/format";
import { getTenant } from "@/lib/tenant";
import { FollowedChild, FollowedChildCard } from "./child-switcher";
import { ParentMobileMenu } from "./mobile-menu";
import { ParentNav, ParentNavFallback, ParentTabBar, ParentTabBarFallback } from "./parent-nav";

/** "Vous suivez": the child shown in the space, with the switcher when there are several. */
async function SidebarChild() {
  const { children } = await getPageAccount();
  if (children.length === 0) return null;
  return (
    <Suspense fallback={<FollowedChildCard child={children[0]} variant="sidebar" />}>
      <FollowedChild linked={children} variant="sidebar" />
    </Suspense>
  );
}

/** Child switcher of the top bar, only for parents of several children. */
async function HeaderChild() {
  const { children } = await getPageAccount();
  if (children.length < 2) return null;
  return (
    <Suspense fallback={<Skeleton className="h-11 w-28 rounded-full" />}>
      <FollowedChild linked={children} variant="header" />
    </Suspense>
  );
}

/** "Besoin d'aide ?" with the agency's phone number, at the bottom of the sidebar. */
async function HelpLine() {
  const tenant = await getTenant();
  if (!tenant) return null;
  return (
    <a
      href={`tel:${tenant.phone.replace(/\s/g, "")}`}
      className="flex items-center gap-3 rounded-2xl bg-sidebar-raised p-3 text-white/80 transition-colors hover:text-white focus-visible:outline-brand-bright"
    >
      <CircleHelp className="size-5 shrink-0 text-brand-bright" aria-hidden />
      <span className="min-w-0">
        <span className="block text-sm font-semibold text-white">Besoin d&apos;aide ?</span>
        <span className="block text-xs tabular-nums">{tenant.phone}</span>
      </span>
    </a>
  );
}

/** Avatar and name of the parent; links to the profile. */
async function UserChip() {
  const account = await getPageAccount();
  return (
    <div className="flex items-center gap-1">
      <Link
        href="/parent/profil"
        className="flex items-center gap-3 rounded-full border border-line bg-surface py-1 pr-3 pl-1 shadow-card transition-colors hover:bg-subtle sm:rounded-2xl sm:pr-4"
        aria-label={`Mon profil (${account.firstName} ${account.lastName})`}
      >
        <Avatar initials={initials(account.firstName, account.lastName)} size="sm" solid />
        <span className="hidden min-w-0 sm:block">
          <span className="block truncate text-sm font-semibold text-ink">
            {account.firstName} {account.lastName}
          </span>
          <span className="block truncate text-xs text-ink-subtle">Représentant légal</span>
        </span>
        <ChevronRight className="hidden size-4 text-ink-subtle sm:block" aria-hidden />
      </Link>
      <form action={logout} className="hidden lg:block">
        <button
          type="submit"
          className="flex size-11 items-center justify-center rounded-full text-ink-subtle hover:bg-danger-soft hover:text-danger"
          aria-label="Se déconnecter"
          title="Se déconnecter"
        >
          <LogOut className="size-5" aria-hidden />
        </button>
      </form>
    </div>
  );
}

/**
 * Layout of the parent space, after the student space: dark grouped sidebar from `lg` (with the
 * followed child), a top bar with the profile, and a bottom tab bar + "Menu" on mobile.
 */
export function ParentShell({ children }: { children: ReactNode }) {
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
            <TenantBrand subtitle="Espace parent" href="/parent" tone="dark" />
          </Suspense>
        </div>
        <div className="shrink-0 px-3 pb-3">
          <Suspense fallback={<div className="h-[5.5rem] rounded-2xl bg-sidebar-raised" />}>
            <SidebarChild />
          </Suspense>
        </div>
        <nav aria-label="Navigation principale" className="flex-1 overflow-y-auto px-3 pt-2 pb-4">
          <Suspense fallback={<ParentNavFallback variant="sidebar" />}>
            <ParentNav variant="sidebar" />
          </Suspense>
        </nav>
        <div className="shrink-0 p-3">
          <Suspense fallback={<div className="h-16 rounded-2xl bg-sidebar-raised" />}>
            <HelpLine />
          </Suspense>
        </div>
      </aside>

      <div className="lg:pl-68">
        <header className="sticky top-0 z-20 border-b border-line/70 bg-canvas/85 pt-[env(safe-area-inset-top)] backdrop-blur-md lg:border-transparent lg:bg-transparent lg:backdrop-blur-none">
          <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-3 px-4 sm:px-6 lg:h-20 lg:justify-end lg:px-10">
            <div className="min-w-0 lg:hidden">
              <Suspense fallback={<TenantBrandSkeleton />}>
                <TenantBrand href="/parent" />
              </Suspense>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <Suspense fallback={null}>
                <HeaderChild />
              </Suspense>
              <Suspense fallback={<Skeleton className="h-11 w-11 rounded-full sm:w-52 sm:rounded-2xl" />}>
                <UserChip />
              </Suspense>
            </div>
          </div>
        </header>

        <main
          id="contenu"
          tabIndex={-1}
          className="mx-auto w-full max-w-6xl px-4 pt-4 pb-[calc(6rem+env(safe-area-inset-bottom))] outline-none sm:px-6 lg:px-10 lg:pt-2 lg:pb-14"
        >
          <Suspense fallback={null}>
            <SubscriptionBanner />
          </Suspense>
          {children}
        </main>
      </div>

      <nav
        aria-label="Navigation principale"
        className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-surface/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-md lg:hidden"
      >
        <Suspense fallback={<ParentTabBarFallback menu={<ParentMobileMenu />} />}>
          <ParentTabBar menu={<ParentMobileMenu />} />
        </Suspense>
      </nav>
    </div>
  );
}
