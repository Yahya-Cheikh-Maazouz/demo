import { Download, FolderOpen, Signature } from "lucide-react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { CardBody } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { LoadingLabel, Skeleton } from "@/components/ui/skeleton";
import { formatDate } from "@/lib/format";
import { getPageDownloadables } from "./data";
import { CATEGORY_META, schoolDocumentHref } from "./document-meta";

/** Quote, training contract, certificates issued by the school. Render inside a <Card> and <Suspense>. */
export async function SchoolDocuments() {
  const documents = await getPageDownloadables();

  if (documents.length === 0) {
    return (
      <CardBody>
        <EmptyState
          icon={FolderOpen}
          title="Aucun document pour le moment"
          description="Votre devis, votre contrat de formation et vos attestations apparaîtront ici."
          className="py-6"
        />
      </CardBody>
    );
  }

  return (
    <CardBody>
      <ul className="divide-y divide-line">
        {documents.map((document) => {
          const category = CATEGORY_META[document.category];
          const Icon = category.icon;
          return (
            <li key={document.id} className="flex gap-3 py-4 first:pt-0 last:pb-0">
              <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-brand-soft text-brand">
                <Icon className="size-5" aria-hidden />
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                  <h3 className="min-w-0 font-semibold text-ink">{document.label}</h3>
                  {document.signed && (
                    <Badge tone="success" icon={Signature}>
                      Signé
                    </Badge>
                  )}
                </div>
                <p className="mt-0.5 text-sm text-ink-muted">
                  Émis le <time dateTime={document.issuedAt}>{formatDate(document.issuedAt)}</time>
                </p>
                <Link
                  href={schoolDocumentHref(document.id)}
                  className="mt-1 -ml-2 inline-flex h-11 items-center gap-1.5 rounded-lg px-2 text-sm font-semibold text-brand transition-colors hover:bg-brand-soft"
                >
                  <Download className="size-4" aria-hidden />
                  Télécharger
                  <span className="sr-only"> : {document.label}</span>
                </Link>
              </div>
            </li>
          );
        })}
      </ul>
    </CardBody>
  );
}

export function SchoolDocumentsSkeleton() {
  return (
    <CardBody>
      <LoadingLabel>Chargement des documents de l&apos;auto-école…</LoadingLabel>
      <div className="divide-y divide-line">
        {[0, 1, 2].map((row) => (
          <div key={row} className="flex gap-3 py-4 first:pt-0 last:pb-0">
            <Skeleton className="size-10 shrink-0 rounded-xl" />
            <div className="min-w-0 flex-1">
              <Skeleton className="h-5 w-40 max-w-full" />
              <Skeleton className="mt-1.5 h-4 w-36" />
              <Skeleton className="mt-3.5 h-5 w-24" />
            </div>
          </div>
        ))}
      </div>
    </CardBody>
  );
}
