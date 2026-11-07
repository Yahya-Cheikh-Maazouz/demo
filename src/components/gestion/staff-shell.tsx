import { Suspense, type ReactNode } from "react";
import { CreditCard, LogOut } from "lucide-react";
import { SubscriptionBanner } from "@/components/subscription-banner";
import { TenantBrand, TenantBrandSkeleton } from "@/components/tenant-brand";
import { Avatar } from "@/components/ui/avatar";
import { ButtonLink } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { logout } from "@/features/auth/logout";
import { getStaffUser } from "@/lib/api/gestion";
import { getSubscriptionStatus } from "@/lib/api/subscription-status";
import { initials } from "@/lib/format";
import { can } from "@/lib/permissions";
import type { Permission, Role, SubscriptionStatus, User } from "@/lib/types";
import { StaffNav, type StaffSection } from "./staff-nav";

const ROLE_LABELS: Partial<Record<Role, string>> = { gerant: "Gérant", assistante: "Assistante" };

/** Any of these opens the Réglages section (each tab then checks its own right). */
export const SETTINGS_PERMISSIONS: Permission[] = ["tarifs.gerer", "regles.gerer", "equipe.gerer", "abonnement.gerer"];

/**
 * Sections the person may open, in navigation order. While the school is suspended, only the
 * subscription page is left (to settle it).
 */
export function staffSections(user: User, status?: SubscriptionStatus | null): StaffSection[] {
  const sections: StaffSection[] = [];
  const suspended = status === "suspendu";
  if (!suspended && can(user, "planning.voir")) sections.push("planning");
  if (!suspended && can(user, "eleves.voir")) sections.push("eleves");
  if (!suspended && can(user, "caisse.encaisser")) sections.push("caisse");
  // "Réglages" (SETTINGS_PERMISSIONS) joins once its pages exist.
  if (can(user, "abonnement.gerer")) sections.push("abonnement");
  return sections;
}

async function SidebarNav() {
  const [user, status] = await Promise.all([getStaffUser(), getSubscriptionStatus()]);
  return <StaffNav sections={staffSections(user, status)} variant="sidebar" />;
}

async function TabbarNav() {
  const [user, status] = await Promise.all([getStaffUser(), getSubscriptionStatus()]);
  return <StaffNav sections={staffSections(user, status)} variant="tabbar" />;
}

/** The subscription banner, with a link to settle it for the people who manage the subscription. */
async function StaffSubscriptionBanner() {
  const user = await getStaffUser();
  return (
    <SubscriptionBanner
      action={
        can(user, "abonnement.gerer") ? (
          <ButtonLink href="/gestion/abonnement" variant="secondary" icon={<CreditCard className="size-4" aria-hidden />}>
            Gérer l&apos;abonnement
          </ButtonLink>
        ) : undefined
      }
    />
  );
}

function NavSkeleton() {
  return (
    <div className="space-y-2 px-1">
      <div className="h-11 rounded-xl bg-white/5" />
      <div className="h-11 rounded-xl bg-white/5" />
      <div className="h-11 rounded-xl bg-white/5" />
    </div>
  );
}

/** `light`: on the light top bar of a phone (the white icon of the sidebar would be invisible there). */
function LogoutButton({ tone = "dark" }: { tone?: "dark" | "light" }) {
  return (
    <form action={logout}>
      <button
        type="submit"
        className={
          tone === "dark"
            ? "flex size-11 items-center justify-center rounded-xl text-white/60 hover:bg-white/10 hover:text-white focus-visible:outline-brand-bright"
            : "flex size-11 items-center justify-center rounded-full text-ink-subtle hover:bg-danger-soft hover:text-danger"
        }
        aria-label="Se déconnecter"
        title="Se déconnecter"
      >
        <LogOut className="size-5" aria-hidden />
      </button>
    </form>
  );
}

async function SidebarUser() {
  const user = await getStaffUser();
  return (
    <div className="flex items-center gap-3">
      <div className="flex min-w-0 flex-1 items-center gap-3 p-1.5">
        <Avatar initials={initials(user.firstName, user.lastName)} solid />
        <span className="min-w-0">
          <span className="block truncate text-sm font-semibold text-white">
            {user.firstName} {user.lastName}
          </span>
          <span className="block truncate text-xs text-white/60">{ROLE_LABELS[user.role] ?? user.email}</span>
        </span>
      </div>
      <LogoutButton />
    </div>
  );
}

async function HeaderUser() {
  const user = await getStaffUser();
  return (
    <div className="flex items-center gap-1">
      <span className="hidden text-right sm:block">
        <span className="block text-sm font-semibold text-ink">
          {user.firstName} {user.lastName}
        </span>
        <span className="block text-xs text-ink-subtle">{ROLE_LABELS[user.role]}</span>
      </span>
      <Avatar initials={initials(user.firstName, user.lastName)} size="sm" className="ml-2" />
      <LogoutButton tone="light" />
    </div>
  );
}

/**
 * Layout of the gérant / assistante space: sidebar from `lg`, top bar + bottom tab bar below.
 * Desktop first (the planning needs width), but every page stays usable on a phone.
 */
export function StaffShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-dvh">
      <a
        href="#contenu"
        className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-50 focus:rounded-lg focus:bg-surface focus:px-4 focus:py-2 focus:font-semibold focus:shadow-raised"
      >
        Aller au contenu
      </a>

      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col bg-sidebar lg:flex">
        <div className="flex h-20 items-center px-5">
          <Suspense fallback={<TenantBrandSkeleton />}>
            <TenantBrand subtitle="Espace gestion" href="/gestion" tone="dark" />
          </Suspense>
        </div>
        <nav aria-label="Navigation principale" className="flex-1 overflow-y-auto px-3 py-2">
          <Suspense fallback={<NavSkeleton />}>
            <SidebarNav />
          </Suspense>
        </nav>
        <div className="border-t border-white/10 p-3">
          <Suspense fallback={<div className="h-13 w-full rounded-xl bg-white/5" />}>
            <SidebarUser />
          </Suspense>
        </div>
      </aside>

      <div className="lg:pl-64">
        <header className="sticky top-0 z-30 border-b border-line bg-surface/90 pt-[env(safe-area-inset-top)] backdrop-blur-md lg:hidden">
          <div className="flex h-14 items-center justify-between gap-3 px-4 sm:px-6">
            <Suspense fallback={<TenantBrandSkeleton />}>
              <TenantBrand href="/gestion" />
            </Suspense>
            <Suspense fallback={<Skeleton className="size-8 rounded-full" />}>
              <HeaderUser />
            </Suspense>
          </div>
        </header>

        <main
          id="contenu"
          tabIndex={-1}
          className="mx-auto w-full max-w-7xl px-4 pt-6 pb-[calc(6rem+env(safe-area-inset-bottom))] outline-none sm:px-6 lg:px-8 lg:pt-8 lg:pb-12"
        >
          <Suspense fallback={null}>
            <StaffSubscriptionBanner />
          </Suspense>
          {children}
        </main>
      </div>

      <nav
        aria-label="Navigation principale"
        className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-surface/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-md lg:hidden"
      >
        <Suspense fallback={<div className="h-15" />}>
          <TabbarNav />
        </Suspense>
      </nav>
    </div>
  );
}
