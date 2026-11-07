import { PenLine } from "lucide-react";
import { CardHeader } from "@/components/ui/card";

// Shared by the page, the loaded view and its skeleton, so they keep the same layout.

export const MESSAGING_PATH = "/eleve/messagerie";

/** Anchors: "Nouveau message" (header, below `xl`) jumps to the form; the send confirmation back to the list. */
export const COMPOSE_ID = "nouveau-message";
export const LIST_ID = "mes-messages";

/** The list on 3/5 and the form on 2/5 from `xl`; below, the form goes under the list. */
export const GRID_CLASS = "grid gap-6 xl:grid-cols-5 xl:items-start";
// Clear the sticky top bar (64px, 80px from `lg`), and the bottom tab bar when the form scrolls up into view.
export const LIST_CARD_CLASS = "min-w-0 scroll-mt-20 lg:scroll-mt-24 xl:col-span-3";
export const COMPOSE_CARD_CLASS = "min-w-0 scroll-mt-20 scroll-mb-24 lg:scroll-mt-24 lg:scroll-mb-6 xl:col-span-2";

export function ComposeHeader() {
  return (
    <CardHeader
      title="Nouveau message"
      description="Écrire à votre équipe"
      icon={<PenLine className="size-5" aria-hidden />}
    />
  );
}
