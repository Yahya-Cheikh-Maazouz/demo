import { House, UserRoundX } from "lucide-react";
import { ButtonLink } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

/**
 * Shown instead of a page's content when ?enfant= names a student who is not linked to the
 * signed-in parent: nothing of that student is ever displayed.
 */
export function ChildNotFound() {
  return (
    <Card role="alert" className="flex flex-col items-start gap-4 p-6 sm:flex-row sm:items-center">
      <span className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-danger-soft text-danger">
        <UserRoundX className="size-6" aria-hidden />
      </span>
      <div className="min-w-0 flex-1">
        <p className="font-bold text-ink">Ce dossier n&apos;est pas rattaché à votre compte</p>
        <p className="mt-1 text-sm text-ink-muted">
          Vous ne pouvez suivre que les enfants dont vous êtes le représentant légal auprès de cette auto-école. Si un
          enfant manque, contactez l&apos;auto-école.
        </p>
      </div>
      <ButtonLink href="/parent" variant="secondary" icon={<House className="size-4" aria-hidden />} className="shrink-0">
        Revenir à l&apos;accueil
      </ButtonLink>
    </Card>
  );
}

/** Title of a page for an unknown child. */
export const NOT_FOUND_TITLE = "Dossier introuvable";
