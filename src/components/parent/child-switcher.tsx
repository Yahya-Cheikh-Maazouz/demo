"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { useState } from "react";
import { ArrowLeftRight, Check, ChevronDown, UserRoundSearch } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { Dialog } from "@/components/ui/dialog";
import { CHILD_PARAM, withChild } from "@/features/parent/query";
import { cn } from "@/lib/cn";
import { initials } from "@/lib/format";
import type { GuardianChild } from "@/lib/types";

type Variant = "sidebar" | "header";

const describe = (child: GuardianChild) => `${child.age} ans · ${child.licence}`;

/**
 * The child whose file is shown ("Vous suivez"), and a way to change child when the parent has
 * several. The child comes from ?enfant=; the server checks the link again on every request.
 * Reads the URL: render inside <Suspense> with <FollowedChildCard> as fallback.
 */
export function FollowedChild({ linked, variant }: { linked: GuardianChild[]; variant: Variant }) {
  const pathname = usePathname();
  const asked = useSearchParams().get(CHILD_PARAM) || null;
  const selected = asked === null ? linked[0] : linked.find((c) => c.id === asked);
  const [open, setOpen] = useState(false);
  const several = linked.length > 1;

  // Several children, or a child id that is not one of them: offer to choose.
  const switchable = several || !selected;
  // The header only shows the switcher; the sidebar always shows who is followed.
  if (variant === "header" && !switchable) return null;

  return (
    <>
      <FollowedChildCard
        child={selected ?? null}
        variant={variant}
        onSwitch={switchable ? () => setOpen(true) : undefined}
      />
      {switchable && (
        <Dialog
          open={open}
          onClose={() => setOpen(false)}
          title="Changer d'enfant"
          description="Choisissez le dossier à afficher."
        >
          <ul className="space-y-2">
            {linked.map((child) => {
              const current = child.id === selected?.id;
              return (
                <li key={child.id}>
                  <Link
                    href={withChild(pathname, child.id)}
                    onClick={() => setOpen(false)}
                    aria-current={current ? "true" : undefined}
                    className={cn(
                      "flex min-h-14 items-center gap-3 rounded-2xl border p-3 transition-colors",
                      current ? "border-brand/30 bg-brand-soft/60" : "border-line hover:bg-subtle",
                    )}
                  >
                    <Avatar initials={initials(child.firstName, child.lastName)} size="md" />
                    <span className="min-w-0 flex-1">
                      <span className="block font-semibold text-ink">
                        {child.firstName} {child.lastName}
                      </span>
                      <span className="block text-sm text-ink-muted">{describe(child)}</span>
                    </span>
                    {current && (
                      <span className="flex items-center gap-1 text-sm font-semibold text-brand">
                        <Check className="size-4" aria-hidden />
                        Affiché
                      </span>
                    )}
                  </Link>
                </li>
              );
            })}
          </ul>
        </Dialog>
      )}
    </>
  );
}

/** Card of the followed child; `onSwitch` adds the "Changer" button. Also the Suspense fallback. */
export function FollowedChildCard({
  child,
  variant,
  onSwitch,
}: {
  child: GuardianChild | null;
  variant: Variant;
  onSwitch?: () => void;
}) {
  if (variant === "header") {
    if (!onSwitch) return null;
    return (
      <button
        type="button"
        onClick={onSwitch}
        aria-haspopup="dialog"
        className="flex h-11 items-center gap-2 rounded-full border border-line bg-surface py-1 pr-3 pl-1 text-sm font-semibold text-ink shadow-card transition-colors hover:bg-subtle"
      >
        {child ? (
          <Avatar initials={initials(child.firstName, child.lastName)} size="sm" />
        ) : (
          <UserRoundSearch className="ml-2 size-4 text-ink-subtle" aria-hidden />
        )}
        <span className="max-w-28 truncate">{child ? child.firstName : "Choisir"}</span>
        <span className="sr-only"> : changer d&apos;enfant</span>
        <ChevronDown className="size-4 text-ink-subtle" aria-hidden />
      </button>
    );
  }

  return (
    <div className="rounded-2xl bg-sidebar-raised p-3">
      <p className="text-[10px] font-bold tracking-[0.16em] text-white/45 uppercase">Vous suivez</p>
      <div className="mt-2 flex items-center gap-3">
        {child ? (
          <Avatar initials={initials(child.firstName, child.lastName)} size="md" solid />
        ) : (
          <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-white/10 text-white/70">
            <UserRoundSearch className="size-5" aria-hidden />
          </span>
        )}
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-white">
            {child ? `${child.firstName} ${child.lastName}` : "Aucun dossier choisi"}
          </p>
          <p className="line-clamp-2 text-xs text-white/65">{child ? describe(child) : "Choisissez un enfant"}</p>
        </div>
      </div>
      {onSwitch && (
        <button
          type="button"
          onClick={onSwitch}
          aria-haspopup="dialog"
          className="mt-3 flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-white/[0.08] text-sm font-semibold text-white transition-colors hover:bg-white/[0.14] focus-visible:outline-brand-bright"
        >
          <ArrowLeftRight className="size-4" aria-hidden />
          Changer d&apos;enfant
        </button>
      )}
    </div>
  );
}
