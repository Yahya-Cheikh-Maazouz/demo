"use client";

import type { RefObject } from "react";
import { FlaskConical } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { DemoAccount } from "@/lib/api/auth";

/** Development helper: lists the demo accounts of the current auto-école and fills the form. */
export function DemoAccounts({
  accounts,
  formRef,
}: {
  accounts: DemoAccount[];
  formRef: RefObject<HTMLFormElement | null>;
}) {
  function fill(account: DemoAccount) {
    const form = formRef.current;
    if (!form) return;
    const email = form.elements.namedItem("email");
    const password = form.elements.namedItem("password");
    if (email instanceof HTMLInputElement) email.value = account.email;
    if (password instanceof HTMLInputElement) password.value = account.password;
    form.querySelector<HTMLButtonElement>('button[type="submit"]')?.focus();
  }

  return (
    <section
      aria-labelledby="demo-accounts-title"
      className="rounded-2xl border border-dashed border-line-strong bg-subtle/60 p-4"
    >
      <div className="flex items-start gap-2.5">
        <FlaskConical className="mt-0.5 size-4 shrink-0 text-ink-subtle" aria-hidden />
        <div>
          <h2 id="demo-accounts-title" className="text-sm font-semibold text-ink">
            Comptes de démonstration
          </h2>
          <p className="text-xs text-ink-subtle">Visible en développement uniquement.</p>
        </div>
      </div>
      <ul className="mt-2 divide-y divide-line">
        {accounts.map((account) => (
          <li key={account.email} className="flex items-center justify-between gap-3 py-3 last:pb-0">
            <div className="min-w-0 text-sm">
              <p className="font-semibold text-ink">
                {account.label}
                {account.totpCode && <span className="font-normal text-ink-muted"> · double authentification</span>}
              </p>
              <p className="truncate text-ink-muted">{account.email}</p>
              {/* Wraps as whole items: no separator left dangling at the start of a line on mobile. */}
              <p className="flex flex-wrap gap-x-3 text-ink-subtle">
                <span className="whitespace-nowrap">
                  Mot de passe <span className="font-medium text-ink-muted tabular-nums">{account.password}</span>
                </span>
                {account.totpCode && (
                  <span className="whitespace-nowrap">
                    Code <span className="font-medium text-ink-muted tabular-nums">{account.totpCode}</span>
                  </span>
                )}
              </p>
            </div>
            <Button
              variant="secondary"
              onClick={() => fill(account)}
              aria-label={`Utiliser le compte ${account.label.toLowerCase()} ${account.email}`}
            >
              Utiliser
            </Button>
          </li>
        ))}
      </ul>
    </section>
  );
}
