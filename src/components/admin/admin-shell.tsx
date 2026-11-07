import { Suspense, type ReactNode } from "react";
import { LogOut, ShieldCheck } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { logout } from "@/features/auth/logout";
import { getSuperAdmin } from "@/lib/api/admin";
import { initials } from "@/lib/format";
import { AdminNav, AdminNavFallback } from "./admin-nav";
import { PlatformBrand } from "./platform-brand";

function LogoutButton({ tone }: { tone: "dark" | "light" }) {
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
  const user = await getSuperAdmin();
  return (
    <div className="flex items-center gap-2">
      <div className="flex min-w-0 flex-1 items-center gap-3 p-1.5">
        <Avatar initials={initials(user.firstName, user.lastName)} solid />
        <span className="min-w-0">
          <span className="block truncate text-sm font-semibold text-white">
            {user.firstName} {user.lastName}
          </span>
          <span className="block truncate text-xs text-white/60">Super-admin</span>
        </span>
      </div>
      <LogoutButton tone="dark" />
    </div>
  );
}

async function HeaderUser() {
  const user = await getSuperAdmin();
  return (
    <div className="flex items-center gap-1">
      <span className="hidden text-right sm:block">
        <span className="block text-sm font-semibold text-ink">
          {user.firstName} {user.lastName}
        </span>
        <span className="block text-xs text-ink-subtle">Super-admin</span>
      </span>
      <Avatar initials={initials(user.firstName, user.lastName)} size="sm" solid className="ml-2" />
      <LogoutButton tone="light" />
    </div>
  );
}

/**
 * Layout of the platform back-office (super-admin), after the client's reference prototype: dark
 * sidebar labelled "Plateforme" from `lg`, a top bar and a bottom tab bar on a phone. Desktop
 * first (tables), but every page stays usable at 390 px.
 */
export function AdminShell({ children }: { children: ReactNode }) {
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
          <PlatformBrand subtitle="Back-office" href="/admin" tone="dark" />
        </div>
        <nav aria-label="Navigation principale" className="flex-1 overflow-y-auto px-3 pt-2 pb-4">
          <Suspense fallback={<AdminNavFallback variant="sidebar" />}>
            <AdminNav variant="sidebar" />
          </Suspense>
        </nav>
        <div className="shrink-0 space-y-3 p-3">
          <p className="flex gap-3 rounded-2xl bg-sidebar-raised p-3 text-xs text-white/70">
            <ShieldCheck className="size-5 shrink-0 text-brand-bright" aria-hidden />
            <span>
              Chiffres d&apos;usage uniquement : le contenu des auto-écoles (élèves, paiements) n&apos;est jamais
              visible ici.
            </span>
          </p>
          <div className="border-t border-white/10 pt-3">
            <Suspense fallback={<div className="h-13 w-full rounded-xl bg-white/5" />}>
              <SidebarUser />
            </Suspense>
          </div>
        </div>
      </aside>

      <div className="lg:pl-68">
        <header className="sticky top-0 z-20 border-b border-line/70 bg-canvas/85 pt-[env(safe-area-inset-top)] backdrop-blur-md lg:hidden">
          <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-3 px-4 sm:px-6">
            <PlatformBrand href="/admin" subtitle="Back-office" />
            <Suspense fallback={<Skeleton className="size-11 rounded-full sm:w-48 sm:rounded-2xl" />}>
              <HeaderUser />
            </Suspense>
          </div>
        </header>

        <main
          id="contenu"
          tabIndex={-1}
          className="mx-auto w-full max-w-7xl px-4 pt-6 pb-[calc(6rem+env(safe-area-inset-bottom))] outline-none sm:px-6 lg:px-10 lg:pt-10 lg:pb-14"
        >
          {children}
        </main>
      </div>

      <nav
        aria-label="Navigation principale"
        className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-surface/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-md lg:hidden"
      >
        <Suspense fallback={<AdminNavFallback variant="tabbar" />}>
          <AdminNav variant="tabbar" />
        </Suspense>
      </nav>
    </div>
  );
}
