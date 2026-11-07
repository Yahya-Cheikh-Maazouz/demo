import type { Metadata } from "next";
import { Suspense } from "react";
import { PenLine } from "lucide-react";
import { buttonStyles } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";
import { COMPOSE_ID } from "@/features/messagerie/layout";
import { Messaging, MessagingSkeleton } from "@/features/messagerie/messaging";

export const metadata: Metadata = {
  title: "Messagerie",
};

/**
 * Student messaging (after the client's prototype "Mes échanges"): received and sent messages,
 * read/unread flags, and a form to write to the referent instructor or to the auto-école.
 * Mobile: the list, then the form (the header button jumps to it). From `xl`: list 3/5, form 2/5.
 */
export default function MessagingPage() {
  return (
    <>
      <PageHeader
        eyebrow="Messagerie"
        title="Mes échanges"
        description="Échangez avec votre moniteur ou votre auto-école."
        actions={
          <a href={`#${COMPOSE_ID}`} className={buttonStyles({ size: "lg", className: "xl:hidden" })}>
            <PenLine className="size-5" aria-hidden />
            Nouveau message
          </a>
        }
      />

      <Suspense fallback={<MessagingSkeleton />}>
        <Messaging />
      </Suspense>
    </>
  );
}
