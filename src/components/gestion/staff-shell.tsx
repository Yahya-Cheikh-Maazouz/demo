import { Suspense, type ReactNode } from "react";
import { LogOut } from "lucide-react";
import { TenantBrand, TenantBrandSkeleton } from "@/components/tenant-brand";
import { Avatar } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { logout } from "@/features/auth/logout";
import { getStaffUser } from "@/lib/api/gestion";
import { initials } from "@/lib/format";
import { can } from "@/lib/permissions";
import type { Permission, Role, User } from "@/lib/types";
import { StaffNav, type StaffSection } from "./staff-nav";

const ROLE_LABELS: Partial<Record<Role, string>> = { gerant: "Gérant", assistante: "Assistante" };

/** Any of these opens the Réglages section (each tab then checks its own right). */
export const SETTINGS_PERMISSIONS: Permission[] = ["tarifs.gerer", "regles.gerer", "equipe.gerer", "abonnement.gerer"];

/** Sections the person may open, in navigation order. */
export function staffSections(user: User): StaffSection[] {
  const sections: StaffSection[] = [];
  if (can(user, "planning.voir")) sections.push("planning");
  if (can(user, "eleves.voir")) sections.push("eleves");
  if (can(user, "caisse.encaisser")) sections.push("caisse");
  if (SETTINGS_PERMISSIONS.some((p) => can(user, p))) sections.push("reglages");
  return sections;
}

async function SidebarNav() {
  const user = await getStaffUser();
  return <StaffNav sections={staffSections(user)} variant="sidebar" />;
}

async function TabbarNav() {
  const user = await getStaffUser();
  return <StaffNav sections={staffSections(user)} variant="tabbar" />;
}

function NavSkeleton() {
  return (
    <div className="space-y-2 px-1">
      <Skeleton className="h-11 rounded-xl" />
      <Skeleton className="h-11 rounded-xl" />
      <Skeleton className="h-11 rounded-xl" />
    </div>
  );
}

function LogoutButton() {
  return (
    <form action={logout}>
      <button
        type="submit"
        className="flex size-11 items-center justify-center rounded-xl text-ink-subtle hover:bg-danger-soft hover:text-danger"
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
        <Avatar initials={initials(user.firstName, user.lastName)} />
        <span className="min-w-0">
          <span className="block truncate text-sm font-semibold text-ink">
            {user.firstName} {user.lastName}
          </span>
          <span className="block truncate text-xs text-ink-subtle">{ROLE_LABELS[user.role] ?? user.email}</span>
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
      <LogoutButton />
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

      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col border-r border-line bg-surface lg:flex">
        <div className="flex h-20 items-center px-5">
          <Suspense fallback={<TenantBrandSkeleton />}>
            <TenantBrand subtitle="Espace gestion" href="/gestion" />
          </Suspense>
        </div>
        <nav aria-label="Navigation principale" className="flex-1 overflow-y-auto px-3 py-2">
          <Suspense fallback={<NavSkeleton />}>
            <SidebarNav />
          </Suspense>
        </nav>
        <div className="border-t border-line p-3">
          <Suspense fallback={<Skeleton className="h-13 w-full rounded-xl" />}>
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
