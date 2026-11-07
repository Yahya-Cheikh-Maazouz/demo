import type { Metadata } from "next";
import { Suspense } from "react";
import { ReceiptText } from "lucide-react";
import { Card, CardHeader } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { Invoices, InvoicesSkeleton } from "@/features/paiements/invoices";

export const metadata: Metadata = {
  title: "Factures et reçus",
};

/** Every invoice and receipt of the student, generated at each payment. */
export default function InvoicesPage() {
  return (
    <>
      <PageHeader
        eyebrow="Mon dossier"
        title="Factures et reçus"
        description="Générés automatiquement à chaque paiement et envoyés par e-mail."
      />
      <Card>
        <CardHeader
          title="Mes factures"
          description="Numérotées sans interruption par votre auto-école."
          icon={<ReceiptText className="size-5" aria-hidden />}
        />
        <Suspense fallback={<InvoicesSkeleton />}>
          <Invoices />
        </Suspense>
      </Card>
    </>
  );
}
