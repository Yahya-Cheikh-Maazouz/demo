"use client";

import { useState, useSyncExternalStore } from "react";
import { Share, SquarePlus, X } from "lucide-react";

/** UI preference only (never a token): the instructor closed the invitation on this phone. */
const DISMISSED_KEY = "ae.moniteur.invitation-installation";

function readDismissed(): boolean {
  try {
    return localStorage.getItem(DISMISSED_KEY) === "1";
  } catch {
    return false;
  }
}

/** iPhone or iPad Safari, not opened from the home screen yet. */
function shouldInvite(): boolean {
  const ua = navigator.userAgent;
  const ios = /iPad|iPhone|iPod/.test(ua) || (ua.includes("Macintosh") && navigator.maxTouchPoints > 1);
  const safari = /Safari/.test(ua) && !/CriOS|FxiOS|EdgiOS|OPiOS/.test(ua);
  const standalone =
    window.matchMedia("(display-mode: standalone)").matches || (navigator as Navigator & { standalone?: boolean }).standalone === true;
  return ios && safari && !standalone && !readDismissed();
}

const noSubscription = () => () => {};

/**
 * iOS only sends push notifications to web apps added to the home screen: invite the instructor
 * to install it. Hidden on other browsers, once installed, and after "Fermer".
 */
export function InstallInvite() {
  const eligible = useSyncExternalStore(noSubscription, shouldInvite, () => false);
  const [closed, setClosed] = useState(false);
  if (!eligible || closed) return null;

  const close = () => {
    setClosed(true);
    try {
      localStorage.setItem(DISMISSED_KEY, "1");
    } catch {
      // Storage blocked: the invitation comes back next time, nothing else depends on it.
    }
  };

  return (
    <aside aria-label="Installer l'application" className="mb-5 flex items-start gap-3 rounded-3xl border border-brand/20 bg-brand-soft p-4 pr-2">
      <span className="flex size-10 shrink-0 items-center justify-center rounded-2xl bg-brand text-on-brand">
        <SquarePlus className="size-5" aria-hidden />
      </span>
      <div className="min-w-0 flex-1 text-sm">
        <p className="font-semibold text-ink">Installez l&apos;app sur votre iPhone</p>
        <p className="mt-0.5 text-ink-muted">
          Installez l&apos;app : Partager <Share className="inline size-4 align-[-3px] text-brand" aria-label="(icône Partager)" /> puis
          « Sur l&apos;écran d&apos;accueil ». Vous recevrez les notifications et votre journée restera disponible hors connexion.
        </p>
      </div>
      <button
        type="button"
        onClick={close}
        className="-mt-1 flex size-11 shrink-0 items-center justify-center rounded-full text-ink-subtle hover:bg-ink/5 hover:text-ink"
        aria-label="Fermer l'invitation à installer l'app"
      >
        <X className="size-5" aria-hidden />
      </button>
    </aside>
  );
}
