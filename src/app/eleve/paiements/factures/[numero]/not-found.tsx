import { ArrowLeft, FileQuestion } from "lucide-react";
import { ButtonLink } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export default function InvoiceNotFound() {
  return (
    <Card className="mx-auto flex max-w-xl flex-col items-center px-6 py-12 text-center">
      <span className="flex size-12 items-center justify-center rounded-2xl bg-subtle text-ink-subtle">
        <FileQuestion className="size-6" aria-hidden />
      </span>
      <h1 className="mt-4 text-xl font-bold text-ink">Facture introuvable</h1>
      <p className="mt-1 max-w-sm text-sm text-ink-muted">
        Ce numéro ne correspond à aucune de vos factures. Retrouvez-les toutes dans vos paiements.
      </p>
      <ButtonLink
        href="/eleve/paiements"
        variant="secondary"
        className="mt-6"
        icon={<ArrowLeft className="size-4" aria-hidden />}
      >
        Paiements et factures
      </ButtonLink>
    </Card>
  );
}
