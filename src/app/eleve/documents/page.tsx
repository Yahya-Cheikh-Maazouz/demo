import type { Metadata } from "next";
import { FileUp, FolderCheck, FolderOpen } from "lucide-react";
import { Suspense } from "react";
import { Card, CardHeader } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { DossierProgress, DossierProgressSkeleton } from "@/features/documents/dossier-progress";
import { RequiredDocumentList, RequiredDocumentListSkeleton } from "@/features/documents/required-documents";
import { SchoolDocuments, SchoolDocumentsSkeleton } from "@/features/documents/school-documents";

export const metadata: Metadata = {
  title: "Mes documents",
};

const icon = "size-5";

/**
 * Student documents: the pieces of the registration file to send, and the documents issued by the school.
 * Mobile: progress, pieces to send, school documents. Desktop: the pieces on 2/3, and on the right
 * column the progress above the school documents (rows `auto 1fr`, so the long list on the left
 * does not stretch the gap between the two right cards).
 */
export default function DocumentsPage() {
  return (
    <>
      <PageHeader
        title="Mes documents"
        description="Envoyez les pièces de votre dossier et retrouvez les documents de votre auto-école."
      />

      <div className="grid gap-6 lg:grid-cols-3 lg:grid-rows-[auto_1fr]">
        <Card className="min-w-0 lg:col-start-3 lg:row-start-1 lg:self-start">
          <CardHeader
            title="Mon dossier"
            description="Pièces demandées pour votre permis."
            icon={<FolderCheck className={icon} aria-hidden />}
          />
          <Suspense fallback={<DossierProgressSkeleton />}>
            <DossierProgress />
          </Suspense>
        </Card>

        <Card className="min-w-0 lg:col-span-2 lg:col-start-1 lg:row-span-2 lg:row-start-1 lg:self-start">
          <CardHeader
            title="Pièces à fournir"
            description="Votre auto-école les transmet à l'ANTS pour votre demande de permis."
            icon={<FileUp className={icon} aria-hidden />}
          />
          <Suspense fallback={<RequiredDocumentListSkeleton />}>
            <RequiredDocumentList />
          </Suspense>
        </Card>

        <Card className="min-w-0 lg:col-start-3 lg:row-start-2 lg:self-start">
          <CardHeader
            title={
              <>
                Documents de <span className="whitespace-nowrap">l&apos;auto-école</span>
              </>
            }
            description="Devis, contrat et attestations."
            icon={<FolderOpen className={icon} aria-hidden />}
          />
          <Suspense fallback={<SchoolDocumentsSkeleton />}>
            <SchoolDocuments />
          </Suspense>
        </Card>
      </div>
    </>
  );
}
