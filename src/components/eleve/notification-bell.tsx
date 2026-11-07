"use client";

import Link from "next/link";
import { useState } from "react";
import { Bell, CheckCheck, MessageSquare } from "lucide-react";
import { Dialog } from "@/components/ui/dialog";
import { formatRelativeDay, formatTime } from "@/lib/format";

export type NotificationItem = { id: string; title: string; from: string; at: string; href: string };

/** Bell of the top bar: a dot when something is new, and the list in a dialog ("À ne pas manquer"). */
export function NotificationBell({ items, now }: { items: NotificationItem[]; now: string }) {
  const [open, setOpen] = useState(false);
  const count = items.length;
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-haspopup="dialog"
        aria-label={count > 0 ? `Notifications (${count} ${count > 1 ? "nouvelles" : "nouvelle"})` : "Notifications"}
        className="relative flex size-11 items-center justify-center rounded-full border border-line bg-surface text-ink-muted shadow-card transition-colors hover:text-ink"
      >
        <Bell className="size-5" aria-hidden />
        {count > 0 && <span aria-hidden className="absolute top-2.5 right-2.5 size-2.5 rounded-full bg-danger ring-2 ring-surface" />}
      </button>
      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        title="À ne pas manquer"
        description={count > 0 ? "Les nouveautés de votre espace." : undefined}
      >
        {count === 0 ? (
          <p className="flex items-center gap-2 rounded-2xl bg-subtle px-4 py-3 text-sm font-medium text-ink-muted">
            <CheckCheck className="size-4 text-success" aria-hidden />
            Vous êtes à jour.
          </p>
        ) : (
          <ul className="space-y-2">
            {items.map((item) => (
              <li key={item.id}>
                <Link
                  href={item.href}
                  onClick={() => setOpen(false)}
                  className="flex items-start gap-3 rounded-2xl border border-line p-3 transition-colors hover:bg-subtle"
                >
                  <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-brand-soft text-brand">
                    <MessageSquare className="size-4" aria-hidden />
                  </span>
                  <span className="min-w-0">
                    <span className="block font-semibold text-ink">{item.title}</span>
                    <span className="block text-sm text-ink-muted">
                      {item.from} · {formatRelativeDay(item.at, now)} à {formatTime(item.at)}
                    </span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Dialog>
    </>
  );
}
