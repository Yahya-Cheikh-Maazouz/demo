import { FileText, FolderCheck, Lock } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { LoadingLabel, Skeleton } from "@/components/ui/skeleton";
import { TONE_SOFT } from "@/components/ui/tone";
import { byUrgency, DOCUMENT_STATUS_META } from "@/features/documents/document-meta";
import { SchoolContactNote } from "@/features/profil/school-contact-note";
import { cn } from "@/lib/cn";
import { formatDate } from "@/lib/format";
import type { RequiredDocument } from "@/lib/types";
import { MissingChild, missingChildTitle } from "./child-not-found";
import { getPageDocuments } from "./data";

/** "Le dossier de Léa". Render inside <Suspense>. */
export async function DocumentsTitle({ child }: { child: string | null }) {
  const data = await getPageDocuments(child);
  return <>{data ? `Le dossier de ${data.child.firstName}` : await missingChildTitle()}</>;
}

/** The pieces the school asks for, with their status. Read-only for the parent. Render inside <Suspense>. */
export async function DocumentsContent({ child }: { child: string | null }) {
  const data = await getPageDocuments(child);
  if (!data) return <MissingChild />;
  const documents = byUrgency(data.documents);
  const total = documents.length;
  const validated = documents.filter((d) => d.status === "valide").length;

  return (
    <Card>
      <CardHeader
        title="Pièces du dossier d'inscription"
        description={`Demandées par l'auto-école pour l'inscription de ${data.child.firstName} au permis.`}
        icon={<FileText className="size-5" aria-hidden />}
      />
      {total === 0 ? (
        <CardBody>
          <EmptyState icon={FolderCheck} title="Aucune pièce demandée" className="py-6" />
        </CardBody>
      ) : (
        <>
          <CardBody>
            <p className="flex flex-wrap items-baseline gap-x-2">
              <span className="text-3xl font-bold tracking-tight text-ink tabular-nums">
                {validated} / {total}
              </span>
              <span className="font-medium text-ink-muted">{total > 1 ? "pièces validées" : "pièce validée"}</span>
            </p>
            {/* The count above says the same thing in text. */}
            <div aria-hidden className="mt-3 h-2.5 overflow-hidden rounded-full bg-subtle">
              <div className="h-full rounded-full bg-success" style={{ width: `${(validated / total) * 100}%` }} />
            </div>
          </CardBody>
          <ul className="divide-y divide-line border-t border-line">
            {documents.map((document) => (
              <DocumentItem key={document.id} document={document} />
            ))}
          </ul>
        </>
      )}
      <SchoolContactNote lead={`Pour ajouter ou remplacer une pièce, ${data.child.firstName} peut la déposer depuis son espace élève, ou`} />
    </Card>
  );
}

function DocumentItem({ document }: { document: RequiredDocument }) {
  const meta = DOCUMENT_STATUS_META[document.status];
  const FileIcon = meta.fileIcon;
  return (
    <li className="px-5 py-5 sm:px-6">
      <div className="flex gap-4">
        <span aria-hidden className={cn("hidden size-11 shrink-0 items-center justify-center rounded-xl sm:flex", TONE_SOFT[meta.tone])}>
          <FileIcon className="size-5" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-start justify-between gap-x-3 gap-y-1.5">
            <h3 className="min-w-0 font-semibold text-ink sm:pt-0.5">{document.label}</h3>
            <Badge tone={meta.tone} icon={meta.icon}>
              <span className="sr-only">Statut : </span>
              {meta.label}
            </Badge>
          </div>
          <p className="mt-1 text-sm text-ink-muted">{document.description}</p>
          {document.sensitive ? (
            <p className="mt-2.5 flex items-center gap-1.5 text-sm font-medium text-ink-muted">
              <Lock className="size-4 shrink-0 text-ink-subtle" aria-hidden />
              Pièce confidentielle : seule l&apos;auto-école consulte le fichier.
            </p>
          ) : (
            document.uploadedAt && (
              <p className="mt-2.5 text-sm text-ink-muted">
                {document.fileName && <span className="font-medium text-ink">{document.fileName}</span>}
                {document.fileName && " · "}
                Déposée le <time dateTime={document.uploadedAt}>{formatDate(document.uploadedAt)}</time>
              </p>
            )
          )}
          {document.status === "refuse" && document.rejectionReason && (
            <p className="mt-2.5 rounded-xl bg-danger-soft px-3 py-2 text-sm text-danger">
              <span className="font-semibold">Motif du refus : </span>
              {document.rejectionReason}
            </p>
          )}
        </div>
      </div>
    </li>
  );
}

export function DocumentsContentSkeleton() {
  return (
    <Card>
      <LoadingLabel>Chargement du dossier…</LoadingLabel>
      <div className="p-5 sm:p-6">
        <Skeleton className="h-6 w-64 max-w-full" />
        <Skeleton className="mt-2 h-4 w-80 max-w-full" />
        <Skeleton className="mt-6 h-9 w-48" />
        <Skeleton className="mt-3 h-2.5 w-full rounded-full" />
      </div>
      <div className="divide-y divide-line border-t border-line">
        {[0, 1, 2, 3, 4].map((i) => (
          <div key={i} className="space-y-2 px-5 py-5 sm:px-6">
            <div className="flex justify-between gap-3">
              <Skeleton className="h-5 w-48" />
              <Skeleton className="h-6 w-24 rounded-full" />
            </div>
            <Skeleton className="h-4 w-72 max-w-full" />
          </div>
        ))}
      </div>
    </Card>
  );
}
