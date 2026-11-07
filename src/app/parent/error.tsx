"use client";

import { RotateCcw } from "lucide-react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";

export default function ParentError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <Alert
      tone="danger"
      role="alert"
      title="Cette page n'a pas pu se charger"
      action={
        <Button variant="secondary" icon={<RotateCcw className="size-4" aria-hidden />} onClick={reset}>
          Réessayer
        </Button>
      }
    >
      Vérifiez votre connexion puis réessayez. Si le problème continue, contactez l&apos;auto-école.
    </Alert>
  );
}
