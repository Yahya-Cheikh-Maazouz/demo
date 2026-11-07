"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Building2, CirclePlus, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/cn";

type NavItem = { href: string; label: string; short: string; icon: LucideIcon };

const ITEMS: NavItem[] = [
  { href: "/admin", label: "Auto-écoles", short: "Auto-écoles", icon: Building2 },
  { href: "/admin/auto-ecoles/nouvelle", label: "Nouvelle auto-école", short: "Créer", icon: CirclePlus },
];

/** The deepest item whose href matches ("/admin/auto-ecoles/nouvelle" beats "/admin"). */
function activeHrefOf(pathname: string): string | null {
  const matches = ITEMS.filter((i) => pathname === i.href || pathname.startsWith(`${i.href}/`));
  return matches.sort((a, b) => b.href.length - a.href.length)[0]?.href ?? null;
}

type Variant = "sidebar" | "tabbar";

/** Back-office navigation. Render inside <Suspense> with <AdminNavFallback> (it reads the pathname). */
export function AdminNav({ variant }: { variant: Variant }) {
  const active = activeHrefOf(usePathname());
  return variant === "sidebar" ? <SidebarItems active={active} /> : <TabBarItems active={active} />;
}

/** Same links without the active state, for the static shell. */
export function AdminNavFallback({ variant }: { variant: Variant }) {
  return variant === "sidebar" ? <SidebarItems active={null} /> : <TabBarItems active={null} />;
}

function SidebarItems({ active }: { active: string | null }) {
  return (
    <div>
      <p className="px-3 pb-2 text-[10px] font-bold tracking-[0.16em] text-white/45 uppercase">Plateforme</p>
      <ul className="space-y-0.5">
        {ITEMS.map(({ href, label, icon: Icon }) => {
          const current = href === active;
          return (
            <li key={href}>
              <Link
                href={href}
                aria-current={current ? "page" : undefined}
                className={cn(
                  "relative flex h-11 items-center gap-3 rounded-xl px-3 text-sm font-semibold transition-colors focus-visible:outline-brand-bright",
                  current
                    ? "bg-white/[0.09] text-white before:absolute before:inset-y-2.5 before:left-0 before:w-[3px] before:rounded-full before:bg-brand-bright"
                    : "text-white/75 hover:bg-white/[0.06] hover:text-white",
                )}
              >
                <Icon className={cn("size-[18px] shrink-0", current && "text-brand-bright")} strokeWidth={current ? 2.4 : 2} aria-hidden />
                <span className="truncate">{label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function TabBarItems({ active }: { active: string | null }) {
  return (
    <ul className="grid grid-cols-2">
      {ITEMS.map(({ href, label, short, icon: Icon }) => {
        const current = href === active;
        return (
          <li key={href}>
            <Link
              href={href}
              aria-current={current ? "page" : undefined}
              aria-label={short === label ? undefined : label}
              className={cn(
                "flex min-h-15 flex-col items-center justify-center gap-0.5 pt-2 pb-1.5 text-[11px] font-semibold transition-colors",
                current ? "text-brand" : "text-ink-subtle hover:text-ink",
              )}
            >
              <span className={cn("flex h-7 w-12 items-center justify-center rounded-full transition-colors duration-200", current && "bg-brand-soft")}>
                <Icon className="size-5" strokeWidth={current ? 2.4 : 2} aria-hidden />
              </span>
              {short}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
