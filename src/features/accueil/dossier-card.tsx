import { CircleCheck, Clock, FileUp } from "lucide-react";
import { Alert } from "@/components/ui/alert";
import { ButtonLink } from "@/components/ui/button";
import { CardBody } from "@/components/ui/card";
import { LoadingLabel, Skeleton } from "@/components/ui/skeleton";
import { getRequiredDocuments } from "@/lib/api/eleve";
import type { DocumentStatus, RequiredDocument } from "@/lib/types";
import { TextLink } from "./home-section";

const plural = (count: number, one: string, many: string) => `${count} ${count > 1 ? many : one}`;

/** Render inside a <Card> and <Suspense>. */
export async function DossierCardBody() {
  return <DossierCardView documents={await getRequiredDocuments()} />;
}

/** Required documents progress: what is validated, and what the student still has to send. */
export function DossierCardView({ documents }: { documents: RequiredDocument[] }) {
  const count = (status: DocumentStatus) => documents.filter((d) => d.status === status).length;

  const total = documents.length;
  const validated = count("valide");
  const pending = count("en_verification");
  const missing = count("manquant");
  const refused = count("refuse");

  if (total === 0) {
    return (
      <CardBody>
        <p className="text-sm text-ink-muted">Aucune pièce ne vous est demandée pour le moment.</p>
      </CardBody>
    );
  }

  // "2 pièces manquantes · 1 refusée", but "1 pièce refusée" when nothing is missing.
  const toSend = [
    missing > 0 && plural(missing, "pièce manquante", "pièces manquantes"),
    refused > 0 &&
      (missing > 0 ? plural(refused, "refusée", "refusées") : plural(refused, "pièce refusée", "pièces refusées")),
  ].filter(Boolean);

  return (
    <CardBody className="space-y-4">
      <div>
        <div className="flex items-baseline justify-between gap-3 text-sm">
          <p className="font-medium text-ink-muted">Pièces validées</p>
          <p className="font-bold text-ink tabular-nums">
            {validated} sur {total}
          </p>
        </div>
        <div aria-hidden className="mt-2 h-2 overflow-hidden rounded-full bg-subtle">
          <div className="h-full rounded-full bg-success" style={{ width: `${(validated / total) * 100}%` }} />
        </div>
      </div>

      {toSend.length > 0 ? (
        <Alert
          tone="warning"
          title={toSend.join(" · ")}
          action={
            <ButtonLink
              href="/eleve/documents"
              variant="secondary"
              icon={<FileUp className="size-4" aria-hidden />}
            >
              Compléter mon dossier
            </ButtonLink>
          }
        >
          Déposez-{missing + refused > 1 ? "les" : "la"} pour que l&apos;auto-école puisse finaliser votre
          inscription.
        </Alert>
      ) : (
        <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1">
          <p className="flex items-start gap-2 text-sm font-semibold text-success">
            <CircleCheck className="mt-0.5 size-4 shrink-0" aria-hidden />
            {validated === total ? "Dossier complet : toutes vos pièces sont validées." : "Toutes vos pièces ont été envoyées."}
          </p>
          <TextLink href="/eleve/documents" className="-ml-2">
            Mes documents
          </TextLink>
        </div>
      )}

      {pending > 0 && (
        <p className="flex items-center gap-2 text-sm text-ink-muted">
          <Clock className="size-4 shrink-0 text-info" aria-hidden />
          {plural(pending, "pièce en cours de vérification", "pièces en cours de vérification")}
        </p>
      )}
    </CardBody>
  );
}

export function DossierCardSkeleton() {
  return (
    <CardBody className="space-y-4">
      <LoadingLabel>Chargement de votre dossier…</LoadingLabel>
      <div>
        <div className="flex h-5 items-center justify-between gap-3">
          <Skeleton className="h-3.5 w-28" />
          <Skeleton className="h-3.5 w-12" />
        </div>
        <Skeleton className="mt-2 h-2 w-full rounded-full" />
      </div>
      {/* The warning alert: its text takes two lines on a phone, one from `sm`. */}
      <Skeleton className="h-39.5 w-full rounded-2xl sm:h-34.5" />
      <div className="flex h-5 items-center">
        <Skeleton className="h-3.5 w-60 max-w-full" />
      </div>
    </CardBody>
  );
}
