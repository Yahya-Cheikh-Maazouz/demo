import type { Metadata } from "next";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { Suspense } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { DOCUMENT_ID_PATTERN } from "@/features/documents/document-meta";
import {
  loadSchoolDocument,
  SchoolDocumentPrintAction,
  SchoolDocumentView,
  SchoolDocumentViewSkeleton,
} from "@/features/documents/school-document-view";

type Props = PageProps<"/eleve/documents/[id]">;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  if (!DOCUMENT_ID_PATTERN.test(id)) return { title: "Document" };
  return { title: (await loadSchoolDocument(id)).label };
}

// The student shell (side bar, top bar, tab bar) is outside this route: hide it when printing,
// only while this page is displayed. The print-only rules of the document itself are utilities.
const PRINT_CSS = `@media print{
@page{size:A4;margin:16mm}
body:has([data-school-document]){background:none}
body:has([data-school-document]) :is(aside,header,nav){display:none!important}
body:has([data-school-document]) main{max-width:none!important;padding:0!important}
}`;

export default function SchoolDocumentPage({ params }: Props) {
  const id = params.then((p) => p.id);

  return (
    <div data-school-document className="mx-auto w-full max-w-3xl">
      <style>{PRINT_CSS}</style>

      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between print:hidden">
        <Link
          href="/eleve/documents"
          className="-ml-2 inline-flex h-11 items-center gap-1.5 self-start rounded-lg px-2 text-sm font-semibold text-ink-muted transition-colors hover:bg-subtle hover:text-ink"
        >
          <ArrowLeft className="size-4" aria-hidden />
          Mes documents
        </Link>
        <Suspense fallback={<Skeleton className="h-11 w-full rounded-xl sm:w-48" />}>
          <SchoolDocumentPrintAction id={id} />
        </Suspense>
      </div>

      <Suspense fallback={<SchoolDocumentViewSkeleton />}>
        <SchoolDocumentView id={id} />
      </Suspense>
    </div>
  );
}
