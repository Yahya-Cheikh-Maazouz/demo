"use client";

import { useEffect, useRef, useState } from "react";
import { Check, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Field, inputStyles } from "@/components/ui/field";
import { cn } from "@/lib/cn";

type CopyStatus = "idle" | "copied" | "manual";

/** Read-only link with a "Copier le lien" button. Falls back to selecting the text. */
export function CopyLinkField({ url, label = "Lien d'abonnement" }: { url: string; label?: string }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [status, setStatus] = useState<CopyStatus>("idle");

  useEffect(() => {
    if (status !== "copied") return;
    const timer = setTimeout(() => setStatus("idle"), 4000);
    return () => clearTimeout(timer);
  }, [status]);

  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
      setStatus("copied");
    } catch {
      // Clipboard API unavailable (insecure context, permission refused): let the user copy by hand.
      inputRef.current?.focus();
      inputRef.current?.select();
      setStatus("manual");
    }
  }

  return (
    <div className="space-y-3">
      <Field
        label={label}
        hint={
          status === "manual" ? "Le lien est sélectionné : copiez-le avec Ctrl + C, ou par un appui long." : undefined
        }
      >
        {({ id, describedBy }) => (
          <input
            ref={inputRef}
            id={id}
            type="text"
            readOnly
            value={url}
            aria-describedby={describedBy}
            spellCheck={false}
            onFocus={(event) => event.currentTarget.select()}
            className={cn(inputStyles, "bg-subtle text-ink-muted")}
          />
        )}
      </Field>
      <Button
        variant="secondary"
        fullWidth
        onClick={copy}
        className={cn(status === "copied" && "border-success/40 text-success")}
        icon={
          status === "copied" ? <Check className="size-4" aria-hidden /> : <Copy className="size-4" aria-hidden />
        }
      >
        {status === "copied" ? "Lien copié" : "Copier le lien"}
      </Button>
      <p aria-live="polite" className="sr-only">
        {status === "copied" ? "Lien copié dans le presse-papiers." : ""}
      </p>
    </div>
  );
}
