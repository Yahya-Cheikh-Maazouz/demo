import Link from "next/link";
import { ArrowRight, CalendarPlus, ChevronRight, CreditCard, FileUp, type LucideIcon } from "lucide-react";
import { PURCHASE_HREF } from "./links";

const ACTIONS: Array<{ href: string; label: string; hint: string; icon: LucideIcon }> = [
  {
    href: "/eleve/planning/reserver",
    label: "Réserver une leçon",
    hint: "Choisissez un créneau libre",
    icon: CalendarPlus,
  },
  {
    href: PURCHASE_HREF,
    label: "Acheter des heures",
    hint: "Par carte ou en plusieurs fois",
    icon: CreditCard,
  },
  {
    href: "/eleve/documents",
    label: "Déposer un document",
    hint: "Complétez votre dossier",
    icon: FileUp,
  },
];

/**
 * The student's three main tasks as large tappable tiles: full-width rows on mobile
 * (easy one-handed reach), three columns from `sm`. Static: no data, so no Suspense.
 */
export function QuickActions() {
  return (
    <ul className="grid gap-3 sm:grid-cols-3">
      {ACTIONS.map(({ href, label, hint, icon: Icon }) => (
        <li key={href}>
          <Link
            href={href}
            className="group relative flex h-full min-h-19 items-center gap-4 rounded-2xl border border-line bg-surface p-4 shadow-card transition-[border-color,box-shadow,transform] duration-150 ease-out hover:border-brand/40 hover:shadow-raised active:scale-[0.99] sm:flex-col sm:items-start sm:gap-4 sm:p-5"
          >
            <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-brand-soft text-brand transition-colors duration-150 group-hover:bg-brand group-hover:text-on-brand">
              <Icon className="size-5" aria-hidden />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block font-semibold text-ink">{label}</span>
              <span className="mt-0.5 block text-sm text-ink-muted">{hint}</span>
            </span>
            <ChevronRight className="size-5 shrink-0 text-ink-subtle sm:hidden" aria-hidden />
            <ArrowRight
              className="absolute top-5 right-5 hidden size-5 text-ink-subtle transition-[color,transform] duration-150 group-hover:translate-x-0.5 group-hover:text-brand sm:block"
              aria-hidden
            />
          </Link>
        </li>
      ))}
    </ul>
  );
}
