"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CalendarDays, FileText, House, UserRound, WalletCards } from "lucide-react";
import { cn } from "@/lib/cn";

const ITEMS = [
  { href: "/eleve", label: "Accueil", icon: House },
  { href: "/eleve/planning", label: "Planning", icon: CalendarDays },
  { href: "/eleve/paiements", label: "Paiements", icon: WalletCards },
  { href: "/eleve/documents", label: "Documents", icon: FileText },
  { href: "/eleve/profil", label: "Profil", icon: UserRound },
] as const;

type Variant = "sidebar" | "tabbar";

/** Student navigation: a sidebar list on desktop, a bottom tab bar on mobile. Render inside <Suspense>. */
export function StudentNav({ variant }: { variant: Variant }) {
  const pathname = usePathname();
  const isActive = (href: string) =>
    href === "/eleve" ? pathname === href : pathname === href || pathname.startsWith(`${href}/`);
  return <NavItems variant={variant} isActive={isActive} />;
}

/** Same links without the active state, for the static shell while the pathname resolves. */
export function StudentNavFallback({ variant }: { variant: Variant }) {
  return <NavItems variant={variant} isActive={() => false} />;
}

function NavItems({ variant, isActive }: { variant: Variant; isActive: (href: string) => boolean }) {
  if (variant === "tabbar") {
    return (
      <ul className="grid grid-cols-5">
        {ITEMS.map(({ href, label, icon: Icon }) => {
          const active = isActive(href);
          return (
            <li key={href}>
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
      {ITEMS.map(({ href, label, icon: Icon }) => {
        const active = isActive(href);
        return (
          <li key={href}>
            <Link
              href={href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex h-11 items-center gap-3 rounded-xl px-3 text-sm font-semibold transition-colors",
                active ? "bg-brand-soft text-brand" : "text-ink-muted hover:bg-subtle hover:text-ink",
              )}
            >
              <Icon className="size-5 shrink-0" strokeWidth={active ? 2.4 : 2} aria-hidden />
              {label}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
