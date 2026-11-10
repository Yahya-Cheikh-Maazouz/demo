"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import {
  BookOpenCheck,
  CalendarDays,
  ClipboardList,
  Clock3,
  FileText,
  House,
  MessageSquare,
  ReceiptText,
  UserRound,
  WalletCards,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/cn";

type NavItem = { href: string; label: string; icon: LucideIcon; showsUnread?: boolean };

/** Grouped like the client's reference prototype: my space, my file, my information. */
export const NAV_GROUPS: Array<{ label: string; items: NavItem[] }> = [
  {
    label: "Mon espace",
    items: [
      { href: "/eleve", label: "Accueil", icon: House },
      { href: "/eleve/planning", label: "Planning", icon: CalendarDays },
      { href: "/eleve/messagerie", label: "Messagerie", icon: MessageSquare, showsUnread: true },
      { href: "/eleve/suivi", label: "Suivi pédagogique", icon: BookOpenCheck },
      { href: "/eleve/evaluation", label: "Évaluation de départ", icon: ClipboardList },
    ],
  },
  {
    label: "Mon dossier",
    items: [
      { href: "/eleve/documents", label: "Documents", icon: FileText },
      { href: "/eleve/paiements", label: "Achats et paiements", icon: WalletCards },
      { href: "/eleve/paiements/factures", label: "Factures et reçus", icon: ReceiptText },
    ],
  },
  {
    label: "Mes informations",
    items: [
      { href: "/eleve/profil", label: "Profil", icon: UserRound },
      { href: "/eleve/disponibilites", label: "Disponibilités", icon: Clock3 },
    ],
  },
];

const ALL_ITEMS = NAV_GROUPS.flatMap((g) => g.items);

/** Bottom tab bar on mobile: the daily destinations; everything else is in the "Menu" sheet. */
const TAB_ITEMS = ["/eleve", "/eleve/planning", "/eleve/messagerie", "/eleve/documents"].map(
  (href) => ALL_ITEMS.find((i) => i.href === href)!,
);

/** The deepest item whose href matches the path ("/eleve/paiements/factures" beats "/eleve/paiements"). */
export function activeHrefOf(pathname: string): string | null {
  const matches = ALL_ITEMS.filter((i) =>
    i.href === "/eleve" ? pathname === "/eleve" : pathname === i.href || pathname.startsWith(`${i.href}/`),
  );
  return matches.sort((a, b) => b.href.length - a.href.length)[0]?.href ?? null;
}

function UnreadBadge({ count, className }: { count: number; className?: string }) {
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

const unreadLabel = (count: number) => (count > 0 ? ` (${count} ${count > 1 ? "messages non lus" : "message non lu"})` : "");

type Variant = "sidebar" | "sheet";

/** Grouped navigation: the dark sidebar on desktop, or the content of the mobile "Menu" sheet. */
export function StudentNav({ variant, unread, onNavigate }: { variant: Variant; unread: number; onNavigate?: () => void }) {
  const active = activeHrefOf(usePathname());
  return <NavGroups variant={variant} active={active} unread={unread} onNavigate={onNavigate} />;
}

/** Same links without the active state, for the static shell while the pathname resolves. */
export function StudentNavFallback({ variant }: { variant: Variant }) {
  return <NavGroups variant={variant} active={null} unread={0} />;
}

function NavGroups({
  variant,
  active,
  unread,
  onNavigate,
}: {
  variant: Variant;
  active: string | null;
  unread: number;
  onNavigate?: () => void;
}) {
  const dark = variant === "sidebar";
  return (
    <div className="space-y-5">
      {NAV_GROUPS.map((group) => (
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
            {group.items.map(({ href, label, icon: Icon, showsUnread }) => {
              const current = href === active;
              const count = showsUnread ? unread : 0;
              return (
                <li key={href}>
                  <Link
                    href={href}
                    onClick={onNavigate}
                    aria-current={current ? "page" : undefined}
                    aria-label={count > 0 ? `${label}${unreadLabel(count)}` : undefined}
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
                    <UnreadBadge count={count} className="ml-auto" />
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
export function StudentTabBar({ unread, menu }: { unread: number; menu: ReactNode }) {
  const active = activeHrefOf(usePathname());
  return <TabBarItems active={active} unread={unread} menu={menu} />;
}

export function StudentTabBarFallback({ menu }: { menu: ReactNode }) {
  return <TabBarItems active={null} unread={0} menu={menu} />;
}

function TabBarItems({ active, unread, menu }: { active: string | null; unread: number; menu: ReactNode }) {
  return (
    <ul className="grid grid-cols-5">
      {TAB_ITEMS.map(({ href, label, icon: Icon, showsUnread }) => {
        const current = href === active;
        const count = showsUnread ? unread : 0;
        const short = label === "Messagerie" ? "Messages" : label;
        return (
          <li key={href}>
            <Link
              href={href}
              aria-current={current ? "page" : undefined}
              aria-label={count > 0 ? `${label}${unreadLabel(count)}` : undefined}
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
                <UnreadBadge count={count} className="absolute -top-1 right-0.5 h-4 min-w-4 px-1 text-[10px]" />
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
