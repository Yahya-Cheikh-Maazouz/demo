"use client";

import { useState } from "react";
import { Ellipsis, LogOut, Phone } from "lucide-react";
import { Dialog } from "@/components/ui/dialog";
import { InstructorNav } from "./instructor-nav";
import { LogoutButton } from "./logout-button";

/** "Plus" cell of the mobile tab bar: every section, the agency's phone and the logout. */
export function MoreMenu({ pending, agencyPhone }: { pending: number; agencyPhone: string | null }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-haspopup="dialog"
        className="flex min-h-16 w-full flex-col items-center justify-center gap-1 pt-2 pb-1.5 text-[11px] font-semibold text-ink-subtle transition-colors hover:text-ink"
      >
        <span className="flex h-8 w-14 items-center justify-center rounded-full">
          <Ellipsis className="size-[22px]" aria-hidden />
        </span>
        Plus
      </button>
      <Dialog open={open} onClose={() => setOpen(false)} title="Plus">
        {/* Mounted only while open: the closed menu is part of the static shell, where the path is unknown. */}
        {open && (
          <nav aria-label="Toutes les rubriques">
            <InstructorNav variant="sheet" pending={pending} onNavigate={() => setOpen(false)} />
          </nav>
        )}
        <div className="mt-5 space-y-1 border-t border-line pt-4">
          {agencyPhone && (
            <a
              href={`tel:${agencyPhone.replace(/\s/g, "")}`}
              className="flex h-12 items-center gap-3 rounded-xl px-3 text-sm font-semibold text-ink hover:bg-subtle"
            >
              <Phone className="size-[18px] text-brand" aria-hidden />
              Appeler l&apos;accueil
              <span className="ml-auto text-ink-muted tabular-nums">{agencyPhone}</span>
            </a>
          )}
          <LogoutButton className="flex h-12 w-full items-center gap-3 rounded-xl px-3 text-sm font-semibold text-danger hover:bg-danger-soft">
            <LogOut className="size-[18px]" aria-hidden />
            Se déconnecter
          </LogoutButton>
        </div>
      </Dialog>
    </>
  );
}
