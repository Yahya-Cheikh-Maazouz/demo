"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Banknote, CalendarDays, CreditCard, Settings, Users, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/cn";

export type StaffSection = "planning" | "eleves" | "caisse" | "reglages" | "abonnement";

const SECTIONS: Record<StaffSection, { href: string; label: string; icon: LucideIcon }> = {
  planning: { href: "/gestion/planning", label: "Planning", icon: CalendarDays },
  eleves: { href: "/gestion/eleves", label: "Élèves", icon: Users },
  caisse: { href: "/gestion/caisse", label: "Caisse du jour", icon: Banknote },
  reglages: { href: "/gestion/reglages", label: "Réglages", icon: Settings },
  abonnement: { href: "/gestion/abonnement", label: "Abonnement", icon: CreditCard },
};

/** Staff navigation, limited to the sections the person has the right to see. */
export function StaffNav({ sections, variant }: { sections: StaffSection[]; variant: "sidebar" | "tabbar" }) {
  const pathname = usePathname();
  const items = sections.map((key) => ({ key, ...SECTIONS[key] }));
  const isActive = (href: string) => pathname === href || pathname.startsWith(`${href}/`);

  if (variant === "tabbar") {
    return (
      <ul className="grid" style={{ gridTemplateColumns: `repeat(${Math.max(items.length, 1)}, minmax(0, 1fr))` }}>
        {items.map(({ key, href, label, icon: Icon }) => {
          const active = isActive(href);
          return (
            <li key={key}>
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex min-h-15 flex-col items-center justify-center gap-0.5 pt-2 pb-1.5 text-[11px] font-semibold transition-colors",
                  active ? "text-brand" : "text-ink-subtle hover:text-ink",
                )}
              >
                <span
                  className={cn(
                    "flex h-7 w-12 items-center justify-center rounded-full transition-colors duration-200",
                    active && "bg-brand-soft",
                  )}
                >
                  <Icon className="size-5" strokeWidth={active ? 2.4 : 2} aria-hidden />
                </span>
                {label}
              </Link>
            </li>
          );
        })}
      </ul>
    );
  }

  return (
    <ul className="space-y-1">
      {items.map(({ key, href, label, icon: Icon }) => {
        const active = isActive(href);
        return (
          <li key={key}>
            <Link
              href={href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "relative flex h-11 items-center gap-3 rounded-xl px-3 text-sm font-semibold transition-colors focus-visible:outline-brand-bright",
                active
                  ? "bg-white/[0.09] text-white before:absolute before:inset-y-2.5 before:left-0 before:w-[3px] before:rounded-full before:bg-brand-bright"
                  : "text-white/75 hover:bg-white/[0.06] hover:text-white",
              )}
            >
              <Icon className={cn("size-5 shrink-0", active && "text-brand-bright")} strokeWidth={active ? 2.4 : 2} aria-hidden />
              {label}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
