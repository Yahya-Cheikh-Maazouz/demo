"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";

export type LessonDetail = { label: string; value: string };

/** "Voir les détails": date, duration, instructor, vehicle and meeting point in a dialog. */
export function LessonDetailsButton({ title, details }: { title: string; details: LessonDetail[] }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-haspopup="dialog"
        className="inline-flex h-11 items-center rounded-xl px-2 text-sm font-semibold text-brand hover:underline"
      >
        Voir les détails
      </button>
      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        title={title}
        footer={<Button onClick={() => setOpen(false)}>J&apos;ai compris</Button>}
      >
        <p className="eyebrow mb-3">Prochaine leçon</p>
        <dl className="divide-y divide-line rounded-2xl border border-line">
          {details.map((d) => (
            <div key={d.label} className="flex items-start justify-between gap-4 px-4 py-3 text-sm">
              <dt className="font-semibold text-ink">{d.label}</dt>
              <dd className="text-right text-ink-muted">{d.value}</dd>
            </div>
          ))}
        </dl>
      </Dialog>
    </>
  );
}
