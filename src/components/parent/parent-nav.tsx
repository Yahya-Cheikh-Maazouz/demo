"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import type { ReactNode } from "react";
import {
  BookOpenCheck,
  CalendarDays,
  FileText,
  House,
  ShieldCheck,
  UserRound,
  WalletCards,
  type LucideIcon,
} from "lucide-react";
import { CHILD_PARAM, withChild } from "@/features/parent/query";
import { cn } from "@/lib/cn";

type NavItem = { href: string; label: string; icon: LucideIcon };

/** Grouped like the student space: the child's training, the child's file, the parent's account. */
export const PARENT_NAV_GROUPS: Array<{ label: string; items: NavItem[] }> = [
  {
    label: "Mon enfant",
    items: [
      { href: "/parent", label: "Accueil", icon: House },
      { href: "/parent/planning", label: "Planning", icon: CalendarDays },
      { href: "/parent/progression", label: "Progression", icon: BookOpenCheck },
    ],
  },
  {
    label: "Dossier",
    items: [
      { href: "/parent/paiements", label: "Paiements", icon: WalletCards },
      { href: "/parent/documents", label: "Documents", icon: FileText },
      { href: "/parent/autorisations", label: "Autorisations", icon: ShieldCheck },
    ],
  },
  {
    label: "Mes informations",
    items: [{ href: "/parent/profil", label: "Profil", icon: UserRound }],
  },
];

const ALL_ITEMS = PARENT_NAV_GROUPS.flatMap((g) => g.items);

/** Bottom tab bar on mobile: the daily destinations; everything else is in the "Menu" sheet. */
const TAB_ITEMS = ["/parent", "/parent/planning", "/parent/progression", "/parent/paiements"].map(
  (href) => ALL_ITEMS.find((i) => i.href === href)!,
);

function activeHrefOf(pathname: string): string | null {
  const match = ALL_ITEMS.find((i) =>
    i.href === "/parent" ? pathname === "/parent" : pathname === i.href || pathname.startsWith(`${i.href}/`),
  );
  return match?.href ?? null;
}

/**
 * Path and child of the current URL. The child is kept in the links only when it is one of the
 * parent's children (`linked`): a stale or forged ?enfant= is not spread to every section.
 * Only call it inside <Suspense> (or after an interaction).
 */
function useLocation(linked: string[]) {
  const pathname = usePathname();
  const asked = useSearchParams().get(CHILD_PARAM);
  return { active: activeHrefOf(pathname), child: asked && linked.includes(asked) ? asked : null };
}

type Variant = "sidebar" | "sheet";

/** Grouped navigation: the dark sidebar on desktop, or the content of the mobile "Menu" sheet. */
export function ParentNav({
  variant,
  linked,
  onNavigate,
}: {
  variant: Variant;
  /** Ids of the children linked to the account. */
  linked: string[];
  onNavigate?: () => void;
}) {
  const { active, child } = useLocation(linked);
  return <NavGroups variant={variant} active={active} child={child} onNavigate={onNavigate} />;
}

/** Same links without the active state, for the static shell while the URL resolves. */
export function ParentNavFallback({ variant }: { variant: Variant }) {
  return <NavGroups variant={variant} active={null} child={null} />;
}

function NavGroups({
  variant,
  active,
  child,
  onNavigate,
}: {
  variant: Variant;
  active: string | null;
  child: string | null;
  onNavigate?: () => void;
}) {
  const dark = variant === "sidebar";
  return (
    <div className="space-y-5">
      {PARENT_NAV_GROUPS.map((group) => (
        <div key={group.label}>
          <p
            className={cn(
              "px-3 pb-2 text-[10px] font-bold tracking-[0.16em] uppercase",
              dark ? "text-white/60" : "text-ink-subtle",
            )}
          >
            {group.label}
          </p>
          <ul className="space-y-0.5">
            {group.items.map(({ href, label, icon: Icon }) => {
              const current = href === active;
              return (
                <li key={href}>
                  <Link
                    href={withChild(href, child)}
                    onClick={onNavigate}
                    aria-current={current ? "page" : undefined}
                    className={cn(
                      "relative flex h-11 items-center gap-3 rounded-xl px-3 text-sm font-semibold transition-colors",
                      dark && "focus-visible:outline-brand-bright",
                      dark
                        ? current
                          ? "bg-white/[0.09] text-white before:absolute before:inset-y-2.5 before:left-0 before:w-[3px] before:rounded-full before:bg-brand-bright"
                          : "text-white/75 hover:bg-white/[0.06] hover:text-white"
                        : current
                          ? "bg-brand-soft text-brand"
                          : "text-ink-muted hover:bg-subtle hover:text-ink",
                    )}
                  >
                    <Icon
                      className={cn("size-[18px] shrink-0", dark && current && "text-brand-bright")}
                      strokeWidth={current ? 2.4 : 2}
                      aria-hidden
                    />
                    <span className="truncate">{label}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </div>
  );
}

/** Mobile bottom tab bar (4 destinations); the 5th cell is the "Menu" button passed as `menu`. */
export function ParentTabBar({ menu, linked }: { menu: ReactNode; linked: string[] }) {
  const { active, child } = useLocation(linked);
  return <TabBarItems active={active} child={child} menu={menu} />;
}

export function ParentTabBarFallback({ menu }: { menu: ReactNode }) {
  return <TabBarItems active={null} child={null} menu={menu} />;
}

function TabBarItems({ active, child, menu }: { active: string | null; child: string | null; menu: ReactNode }) {
  return (
    <ul className="grid grid-cols-5">
      {TAB_ITEMS.map(({ href, label, icon: Icon }) => {
        const current = href === active;
        return (
          <li key={href}>
            <Link
              href={withChild(href, child)}
              aria-current={current ? "page" : undefined}
              className={cn(
                "flex min-h-15 flex-col items-center justify-center gap-0.5 pt-2 pb-1.5 text-[11px] font-semibold transition-colors",
                current ? "text-brand" : "text-ink-subtle hover:text-ink",
              )}
            >
              <span
                className={cn(
                  "relative flex h-7 w-12 items-center justify-center rounded-full transition-colors duration-200",
                  current && "bg-brand-soft",
                )}
              >
                <Icon className="size-5" strokeWidth={current ? 2.4 : 2} aria-hidden />
              </span>
              {label}
            </Link>
          </li>
        );
      })}
      <li>{menu}</li>
    </ul>
  );
}
