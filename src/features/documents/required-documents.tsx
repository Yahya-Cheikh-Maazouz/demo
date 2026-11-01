import { FolderCheck, Lock, Paperclip } from "lucide-react";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { CardBody } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { LoadingLabel, Skeleton } from "@/components/ui/skeleton";
import { TONE_SOFT } from "@/components/ui/tone";
import { cn } from "@/lib/cn";
import { formatDate } from "@/lib/format";
import type { DocumentStatus, RequiredDocument } from "@/lib/types";
import { getPageRequiredDocuments } from "./data";
import { byUrgency, DOCUMENT_STATUS_META } from "./document-meta";
import { DocumentUploader } from "./document-uploader";

export function DocumentStatusBadge({ status }: { status: DocumentStatus }) {
  const meta = DOCUMENT_STATUS_META[status];
  return (
    <Badge tone={meta.tone} icon={meta.icon}>
      {meta.label}
    </Badge>
  );
}

/**
 * Pieces the school asks for, most urgent first (refused, missing, being checked, validated).
 * Render inside a <Card> and <Suspense>.
 */
export async function RequiredDocumentList() {
  const documents = byUrgency(await getPageRequiredDocuments());

  if (documents.length === 0) {
    return (
      <CardBody>
        <EmptyState
          icon={FolderCheck}
          title="Aucune pièce demandée"
          description="Votre auto-école ne vous demande aucun document pour le moment."
          className="py-6"
        />
      </CardBody>
    );
  }

  return (
    <ul className="mt-5 divide-y divide-line border-t border-line">
      {documents.map((document) => (
        <RequiredDocumentItem key={document.id} document={document} />
      ))}
    </ul>
  );
}

function RequiredDocumentItem({ document }: { document: RequiredDocument }) {
  const meta = DOCUMENT_STATUS_META[document.status];
  const FileIcon = meta.fileIcon;
  const refused = document.status === "refuse";

  return (
    <li className="px-5 py-5 sm:px-6">
      <div className="flex gap-4">
        <span
          aria-hidden
          className={cn("hidden size-11 shrink-0 items-center justify-center rounded-xl sm:flex", TONE_SOFT[meta.tone])}
        >
          <FileIcon className="size-5" />
        </span>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-start justify-between gap-x-3 gap-y-1.5">
            <h3 className="min-w-0 font-semibold text-ink sm:pt-0.5">{document.label}</h3>
            <DocumentStatusBadge status={document.status} />
          </div>
          <p className="mt-1 text-sm text-ink-muted">{document.description}</p>

          {document.sensitive && (
            <p className="mt-2.5 flex items-center gap-1.5 text-sm font-medium text-ink-muted">
              <Lock className="size-4 shrink-0 text-ink-subtle" aria-hidden />
              Visible uniquement par votre auto-école
            </p>
          )}

          {/* Fixed slots: the uploader keeps its place (and its message) when the status changes. */}
          {refused && (
            <Alert tone="danger" title="Pièce refusée par l'auto-école" className="mt-4">
              <p>{document.rejectionReason ?? "Le fichier envoyé ne convient pas. Merci d'en envoyer un nouveau."}</p>
              {/* Inherits ink-muted: ink-subtle on danger-soft falls under 4.5:1. */}
              {document.fileName && (
                <p className="mt-1.5 flex items-start gap-1.5">
                  <Paperclip className="mt-1 size-3.5 shrink-0" aria-hidden />
                  <span className="min-w-0 wrap-break-word">
                    <span className="sr-only">Fichier refusé : </span>
                    {document.fileName}
                    {document.uploadedAt && (
                      <>
                        , envoyé le <time dateTime={document.uploadedAt}>{formatDate(document.uploadedAt)}</time>
                      </>
                    )}
                  </span>
                </p>
              )}
            </Alert>
          )}
          {!refused && document.fileName && (
            <SentFile fileName={document.fileName} uploadedAt={document.uploadedAt} />
          )}
          {document.status !== "valide" && (
            <DocumentUploader
              documentId={document.id}
              documentLabel={document.label}
              variant={document.status === "en_verification" ? "compact" : "full"}
            />
          )}
        </div>
      </div>
    </li>
  );
}

/** File already sent. Never a preview nor a download link: identity documents stay with the school. */
function SentFile({ fileName, uploadedAt }: { fileName: string; uploadedAt?: string }) {
  return (
    <div className="mt-4 flex items-center gap-3 rounded-xl border border-line bg-subtle/60 px-3.5 py-3">
      <Paperclip className="size-4 shrink-0 text-ink-subtle" aria-hidden />
      <p className="min-w-0 flex-1 text-sm">
        <span className="sr-only">Fichier envoyé : </span>
        <span className="block truncate font-medium text-ink" title={fileName}>
          {fileName}
        </span>
        {uploadedAt && (
          <span className="block text-ink-muted">
            Envoyé le <time dateTime={uploadedAt}>{formatDate(uploadedAt)}</time>
          </span>
        )}
      </p>
    </div>
  );
}

export function RequiredDocumentListSkeleton() {
  return (
    <div className="mt-5 divide-y divide-line border-t border-line">
      <LoadingLabel>Chargement des pièces à fournir…</LoadingLabel>
      {[0, 1, 2].map((row) => (
        <div key={row} className="flex gap-4 px-5 py-5 sm:px-6">
          <Skeleton className="hidden size-11 shrink-0 rounded-xl sm:block" />
          <div className="min-w-0 flex-1">
            <div className="flex justify-between gap-3">
              <Skeleton className="h-5 w-44" />
              <Skeleton className="h-6 w-24 rounded-full" />
            </div>
            <Skeleton className="mt-2 h-4 w-full max-w-md" />
            <Skeleton className="mt-4 h-18 w-full rounded-2xl sm:h-20" />
            <Skeleton className="mt-3 h-4 w-72 max-w-full" />
          </div>
        </div>
      ))}
    </div>
  );
}
