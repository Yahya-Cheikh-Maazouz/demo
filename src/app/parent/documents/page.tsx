import type { Metadata } from "next";
import { Suspense } from "react";
import { PageHeader } from "@/components/ui/page-header";
import { Skeleton } from "@/components/ui/skeleton";
import { DocumentsContent, DocumentsContentSkeleton, DocumentsTitle } from "@/features/parent/documents";
import { childParam } from "@/features/parent/query";

export const metadata: Metadata = {
  title: "Documents",
};

type SearchParams = PageProps<"/parent/documents">["searchParams"];

async function Title({ searchParams }: { searchParams: SearchParams }) {
  return <DocumentsTitle child={childParam(await searchParams)} />;
}

async function Content({ searchParams }: { searchParams: SearchParams }) {
  return <DocumentsContent child={childParam(await searchParams)} />;
}

/** The child's required documents and their status (identity pieces: status only). */
export default function ParentDocumentsPage({ searchParams }: PageProps<"/parent/documents">) {
  return (
    <>
      <PageHeader
        eyebrow="Dossier"
        title={
          <Suspense fallback={<Skeleton inline className="h-[1em] w-72 max-w-full rounded-lg" />}>
            <Title searchParams={searchParams} />
          </Suspense>
        }
        description="Où en sont les pièces demandées par l'auto-école."
      />
      <Suspense fallback={<DocumentsContentSkeleton />}>
        <Content searchParams={searchParams} />
      </Suspense>
    </>
  );
}
