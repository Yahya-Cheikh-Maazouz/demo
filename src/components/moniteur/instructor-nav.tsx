"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { CalendarDays, CalendarOff, Clock3, Inbox, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/cn";

type NavItem = { href: string; label: string; short: string; icon: LucideIcon; showsCount?: boolean };

/** Grouped like the student space: the day's work, then the instructor's own organisation. */
export const NAV_GROUPS: Array<{ label: string; items: NavItem[] }> = [
  {
    label: "Mon planning",
    items: [
      { href: "/moniteur", label: "Ma journée", short: "Ma journée", icon: CalendarDays },
      { href: "/moniteur/demandes", label: "Demandes", short: "Demandes", icon: Inbox, showsCount: true },
    ],
  },
  {
    label: "Mon compte",
    items: [
      { href: "/moniteur/indisponibilites", label: "Indisponibilités", short: "Indispos", icon: CalendarOff },
      { href: "/moniteur/heures", label: "Mes heures", short: "Mes heures", icon: Clock3 },
    ],
  },
];

const ALL_ITEMS = NAV_GROUPS.flatMap((g) => g.items);

/** A lesson sheet belongs to "Ma journée". */
export function activeHrefOf(pathname: string): string | null {
  if (pathname === "/moniteur" || pathname.startsWith("/moniteur/lecons/")) return "/moniteur";
  return ALL_ITEMS.find((i) => i.href !== "/moniteur" && (pathname === i.href || pathname.startsWith(`${i.href}/`)))?.href ?? null;
}

function CountBadge({ count, className }: { count: number; className?: string }) {
  if (count <= 0) return null;
  return (
    <span
      aria-hidden
      className={cn(
        "flex h-5 min-w-5 items-center justify-center rounded-full bg-danger px-1.5 text-[11px] font-bold text-white tabular-nums",
        className,
      )}
    >
      {count > 9 ? "9+" : count}
    </span>
  );
}

const countLabel = (count: number) =>
  count > 0 ? ` (${count} ${count > 1 ? "demandes à confirmer" : "demande à confirmer"})` : "";

type Variant = "sidebar" | "sheet";

/** Grouped navigation: the dark sidebar from `lg`, or the content of the mobile "Plus" sheet. */
export function InstructorNav({ variant, pending, onNavigate }: { variant: Variant; pending: number; onNavigate?: () => void }) {
  const active = activeHrefOf(usePathname());
  return <NavGroups variant={variant} active={active} pending={pending} onNavigate={onNavigate} />;
}

/** Same links without the active state, for the static shell while the pathname resolves. */
export function InstructorNavFallback({ variant }: { variant: Variant }) {
  return <NavGroups variant={variant} active={null} pending={0} />;
}

function NavGroups({
  variant,
  active,
  pending,
  onNavigate,
}: {
  variant: Variant;
  active: string | null;
  pending: number;
  onNavigate?: () => void;
}) {
  const dark = variant === "sidebar";
  return (
    <div className="space-y-5">
      {NAV_GROUPS.map((group) => (
        <div key={group.label}>
          <p className={cn("px-3 pb-2 text-[10px] font-bold tracking-[0.16em] uppercase", dark ? "text-white/45" : "text-ink-subtle")}>
            {group.label}
          </p>
          <ul className="space-y-0.5">
            {group.items.map(({ href, label, icon: Icon, showsCount }) => {
              const current = href === active;
              const count = showsCount ? pending : 0;
              return (
                <li key={href}>
                  <Link
                    href={href}
                    onClick={onNavigate}
                    aria-current={current ? "page" : undefined}
                    aria-label={count > 0 ? `${label}${countLabel(count)}` : undefined}
                    className={cn(
                      "relative flex h-12 items-center gap-3 rounded-xl px-3 text-sm font-semibold transition-colors",
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
                    <Icon className={cn("size-[18px] shrink-0", dark && current && "text-brand-bright")} strokeWidth={current ? 2.4 : 2} aria-hidden />
                    <span className="truncate">{label}</span>
                    <CountBadge count={count} className="ml-auto" />
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

/** Mobile bottom tab bar: the 4 sections, then the "Plus" button passed as `menu`. */
export function InstructorTabBar({ pending, menu }: { pending: number; menu: ReactNode }) {
  const active = activeHrefOf(usePathname());
  return <TabBarItems active={active} pending={pending} menu={menu} />;
}

export function InstructorTabBarFallback({ pending = 0, menu }: { pending?: number; menu: ReactNode }) {
  return <TabBarItems active={null} pending={pending} menu={menu} />;
}

function TabBarItems({ active, pending, menu }: { active: string | null; pending: number; menu: ReactNode }) {
  return (
    <ul className="grid grid-cols-5">
      {ALL_ITEMS.map(({ href, label, short, icon: Icon, showsCount }) => {
        const current = href === active;
        const count = showsCount ? pending : 0;
        return (
          <li key={href}>
            <Link
              href={href}
              aria-current={current ? "page" : undefined}
              aria-label={short !== label || count > 0 ? `${label}${countLabel(count)}` : undefined}
              className={cn(
                "flex min-h-16 flex-col items-center justify-center gap-1 pt-2 pb-1.5 text-[11px] font-semibold transition-colors",
                current ? "text-brand" : "text-ink-subtle hover:text-ink",
              )}
            >
              <span
                className={cn(
                  "relative flex h-8 w-14 items-center justify-center rounded-full transition-colors duration-200",
                  current && "bg-brand-soft",
                )}
              >
                <Icon className="size-[22px]" strokeWidth={current ? 2.4 : 2} aria-hidden />
                <CountBadge count={count} className="absolute -top-1 right-1 h-4 min-w-4 px-1 text-[10px]" />
              </span>
              {short}
            </Link>
          </li>
        );
      })}
      <li>{menu}</li>
    </ul>
  );
}
