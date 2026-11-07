import type { Metadata } from "next";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { Suspense } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import {
  InvoiceDocument,
  InvoiceDocumentSkeleton,
  InvoicePrintAction,
} from "@/features/paiements/invoice-document";
import { INVOICE_NUMBER_PATTERN } from "@/features/paiements/payment-meta";

type Props = PageProps<"/eleve/paiements/factures/[numero]">;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { numero } = await params;
  return { title: INVOICE_NUMBER_PATTERN.test(numero) ? `Facture ${numero}` : "Facture" };
}

// The student shell (side bar, top bar, tab bar) is outside this route: hide it when printing,
// only while this page is displayed. The print-only rules of the invoice itself are utilities.
const PRINT_CSS = `@media print{
@page{size:A4;margin:16mm}
body:has([data-invoice-page]){background:none}
body:has([data-invoice-page]) :is(aside,header,nav){display:none!important}
body:has([data-invoice-page]) main{max-width:none!important;padding:0!important}
}`;

export default function InvoicePage({ params }: Props) {
  const number = params.then((p) => p.numero);

  return (
    <div data-invoice-page className="mx-auto w-full max-w-3xl">
      <style>{PRINT_CSS}</style>

      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between print:hidden">
        <Link
          href="/eleve/paiements/factures"
          className="-ml-2 inline-flex h-11 items-center gap-1.5 self-start rounded-lg px-2 text-sm font-semibold text-ink-muted transition-colors hover:bg-subtle hover:text-ink"
        >
          <ArrowLeft className="size-4" aria-hidden />
          Factures et reçus
        </Link>
        <Suspense fallback={<Skeleton className="h-11 w-full rounded-xl sm:w-48" />}>
          <InvoicePrintAction number={number} />
        </Suspense>
      </div>

      <Suspense fallback={<InvoiceDocumentSkeleton />}>
        <InvoiceDocument number={number} />
      </Suspense>
    </div>
  );
}
