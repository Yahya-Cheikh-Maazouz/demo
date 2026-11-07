"use client";

import { WifiOff } from "lucide-react";
import { useOnline } from "./use-online";

/** Shown while the phone is offline: the saved day stays visible, actions wait for the network. */
export function OfflineBanner() {
  const online = useOnline();
  return (
    <div aria-live="polite">
      {!online && (
        <div className="border-t border-warning/30 bg-warning-soft">
          <p className="mx-auto flex max-w-2xl items-start gap-2.5 px-4 py-2.5 text-sm text-ink sm:px-6">
            <WifiOff className="mt-0.5 size-4 shrink-0 text-warning" aria-hidden />
            <span>
              <strong className="font-semibold">Hors connexion.</strong> Votre journée enregistrée reste affichée.
              L&apos;émargement, le livret et les demandes reprendront au retour du réseau.
            </span>
          </p>
        </div>
      )}
    </div>
  );
}
