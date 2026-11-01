"use client";

import { useId, useState, type ReactNode } from "react";
import { Eye, EyeOff } from "lucide-react";

type RevealValueProps = {
  /** Full value, shown after "Afficher". */
  value: ReactNode;
  /** Masked rendering shown by default. */
  masked: string;
  /** Read by screen readers instead of the masked dots, e.g. "masqué, se termine par 76". */
  maskedLabel: string;
  /** What the value is, for the button name: "le NEPH", "le téléphone"… */
  noun: string;
};

/**
 * Sensitive value masked by default (shoulder surfing), with a button to show or hide it.
 * The visible text says what the button will do and the accessible name contains it (WCAG 2.5.3).
 * The value is a polite live region, so the revealed value is read out after the click.
 */
export function RevealValue({ value, masked, maskedLabel, noun }: RevealValueProps) {
  const [revealed, setRevealed] = useState(false);
  const valueId = useId();
  const Icon = revealed ? EyeOff : Eye;

  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
      <span id={valueId} aria-live="polite" className="font-semibold text-ink tabular-nums">
        {revealed ? (
          value
        ) : (
          <>
            <span aria-hidden className="tracking-wider">
              {masked}
            </span>
            <span className="sr-only">{maskedLabel}</span>
          </>
        )}
      </span>
      <button
        type="button"
        aria-controls={valueId}
        aria-label={revealed ? `Masquer ${noun}` : `Afficher ${noun}`}
        onClick={() => setRevealed((r) => !r)}
        className="-my-2 inline-flex h-11 items-center gap-1.5 rounded-xl px-3 text-sm font-semibold text-brand transition-colors hover:bg-brand-soft"
      >
        <Icon className="size-4" aria-hidden />
        {revealed ? "Masquer" : "Afficher"}
      </button>
    </div>
  );
}
