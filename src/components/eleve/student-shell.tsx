import Link from "next/link";
import { Suspense, type ReactNode } from "react";
import { LogOut } from "lucide-react";
import { TenantBrand, TenantBrandSkeleton } from "@/components/tenant-brand";
import { Avatar } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { logout } from "@/features/auth/logout";
import { initials } from "@/lib/format";
import { getSession } from "@/lib/session";
import { StudentNav, StudentNavFallback } from "./student-nav";

async function SidebarUser() {
  const session = await getSession();
  if (!session) return null;
  const { user } = session;
  return (
    <div className="flex items-center gap-3">
      <Link href="/eleve/profil" className="flex min-w-0 flex-1 items-center gap-3 rounded-xl p-1.5 hover:bg-subtle">
        <Avatar initials={initials(user.firstName, user.lastName)} />
        <span className="min-w-0">
          <span className="block truncate text-sm font-semibold text-ink">
            {user.firstName} {user.lastName}
          </span>
          <span className="block truncate text-xs text-ink-subtle">{user.email}</span>
        </span>
      </Link>
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
    </div>
  );
}

async function HeaderAvatar() {
  const session = await getSession();
  if (!session) return null;
  const { user } = session;
  return (
    <Link
      href="/eleve/profil"
      className="flex size-11 items-center justify-center rounded-full"
      aria-label={`Mon profil (${user.firstName} ${user.lastName})`}
    >
      <Avatar initials={initials(user.firstName, user.lastName)} size="sm" />
    </Link>
  );
}

/** Layout of the student space: sidebar from `lg`, top bar + bottom tab bar below. */
export function StudentShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-dvh">
      <a
        href="#contenu"
        className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-50 focus:rounded-lg focus:bg-surface focus:px-4 focus:py-2 focus:font-semibold focus:shadow-raised"
      >
        Aller au contenu
      </a>

      <aside className="fixed inset-y-0 left-0 z-30 hidden w-68 flex-col border-r border-line bg-surface lg:flex">
        <div className="flex h-20 items-center px-5">
          <Suspense fallback={<TenantBrandSkeleton />}>
            <TenantBrand subtitle="Espace élève" href="/eleve" />
          </Suspense>
        </div>
        <nav aria-label="Navigation principale" className="flex-1 overflow-y-auto px-3 py-2">
          <Suspense fallback={<StudentNavFallback variant="sidebar" />}>
            <StudentNav variant="sidebar" />
          </Suspense>
        </nav>
        <div className="border-t border-line p-3">
          <Suspense fallback={<Skeleton className="h-13 w-full rounded-xl" />}>
            <SidebarUser />
          </Suspense>
        </div>
      </aside>

      <div className="lg:pl-68">
        <header className="sticky top-0 z-30 border-b border-line bg-surface/90 pt-[env(safe-area-inset-top)] backdrop-blur-md lg:hidden">
          <div className="flex h-14 items-center justify-between gap-3 px-4 sm:px-6">
            <Suspense fallback={<TenantBrandSkeleton />}>
              <TenantBrand href="/eleve" />
            </Suspense>
            <Suspense fallback={<Skeleton className="size-8 rounded-full" />}>
              <HeaderAvatar />
            </Suspense>
          </div>
        </header>

        <main
          id="contenu"
          tabIndex={-1}
          className="mx-auto w-full max-w-5xl px-4 pt-6 pb-[calc(6rem+env(safe-area-inset-bottom))] outline-none sm:px-6 lg:px-10 lg:pt-10 lg:pb-14"
        >
          {children}
        </main>
      </div>

      <nav
        aria-label="Navigation principale"
        className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-surface/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-md lg:hidden"
      >
        <Suspense fallback={<StudentNavFallback variant="tabbar" />}>
          <StudentNav variant="tabbar" />
        </Suspense>
      </nav>
    </div>
  );
}
