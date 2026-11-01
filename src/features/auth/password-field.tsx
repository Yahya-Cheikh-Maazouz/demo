"use client";

import { useState, type ComponentProps, type ReactNode } from "react";
import { Eye, EyeOff } from "lucide-react";
import { Field, inputStyles } from "@/components/ui/field";
import { cn } from "@/lib/cn";

type PasswordFieldProps = Omit<ComponentProps<"input">, "type" | "children" | "className"> & {
  label?: ReactNode;
  hint?: ReactNode;
  error?: string;
  labelAside?: ReactNode;
  className?: string;
};

/**
 * Password input with a show/hide toggle. The toggle keeps the same label and exposes its state
 * with aria-pressed (WAI-ARIA toggle button pattern); the icon switches between eye and crossed eye.
 * No `title`: a "Masquer…" tooltip would become the accessible description and contradict the
 * fixed "Afficher…" label while pressed.
 */
export function PasswordField({ label = "Mot de passe", hint, error, labelAside, className, ...props }: PasswordFieldProps) {
  const [visible, setVisible] = useState(false);

  return (
    <Field label={label} hint={hint} error={error} labelAside={labelAside} className={className}>
      {({ id, describedBy, invalid }) => (
        <div className="relative">
          <input
            id={id}
            type={visible ? "text" : "password"}
            aria-describedby={describedBy}
            aria-invalid={invalid || undefined}
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            className={cn(inputStyles, "pr-13")}
            {...props}
          />
          <button
            type="button"
            onClick={() => setVisible((v) => !v)}
            aria-label="Afficher le mot de passe"
            aria-pressed={visible}
            aria-controls={id}
            className="absolute top-0.5 right-0.5 flex size-11 items-center justify-center rounded-[10px] text-ink-subtle transition-colors hover:bg-subtle hover:text-ink"
          >
            {visible ? <EyeOff className="size-5" aria-hidden /> : <Eye className="size-5" aria-hidden />}
          </button>
        </div>
      )}
    </Field>
  );
}
