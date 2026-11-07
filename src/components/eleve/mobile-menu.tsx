"use client";

import { useState } from "react";
import { LogOut, Menu } from "lucide-react";
import { Dialog } from "@/components/ui/dialog";
import { logout } from "@/features/auth/logout";
import { StudentNav } from "./student-nav";

/** "Menu" cell of the mobile tab bar: opens every section of the student space in a bottom sheet. */
export function MobileMenu({ unread }: { unread: number }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-haspopup="dialog"
        className="flex min-h-15 w-full flex-col items-center justify-center gap-0.5 pt-2 pb-1.5 text-[11px] font-semibold text-ink-subtle transition-colors hover:text-ink"
      >
        <span className="flex h-7 w-12 items-center justify-center rounded-full">
          <Menu className="size-5" aria-hidden />
        </span>
        Menu
      </button>
      <Dialog open={open} onClose={() => setOpen(false)} title="Menu">
        {/* Mounted only while open: the closed menu is part of the static shell, where the path is unknown. */}
        {open && (
          <nav aria-label="Toutes les rubriques">
            <StudentNav variant="sheet" unread={unread} onNavigate={() => setOpen(false)} />
          </nav>
        )}
        <form action={logout} className="mt-5 border-t border-line pt-4">
          <button
            type="submit"
            className="flex h-11 w-full items-center gap-3 rounded-xl px-3 text-sm font-semibold text-danger hover:bg-danger-soft"
          >
            <LogOut className="size-[18px]" aria-hidden />
            Se déconnecter
          </button>
        </form>
      </Dialog>
    </>
  );
}
