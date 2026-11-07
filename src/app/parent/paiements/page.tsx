import type { Metadata } from "next";
import { Suspense } from "react";
import { PageHeader } from "@/components/ui/page-header";
import { Skeleton } from "@/components/ui/skeleton";
import { PaymentsContent, PaymentsContentSkeleton, PaymentsTitle } from "@/features/parent/payments";
import { childParam } from "@/features/parent/query";

export const metadata: Metadata = {
  title: "Paiements",
};

type SearchParams = PageProps<"/parent/paiements">["searchParams"];

async function Title({ searchParams }: { searchParams: SearchParams }) {
  return <PaymentsTitle child={childParam(await searchParams)} />;
}

async function Content({ searchParams }: { searchParams: SearchParams }) {
  return <PaymentsContent child={childParam(await searchParams)} />;
}

/** The child's balance, payment plan (the parent can pay the next instalment) and invoices. */
export default function ParentPaymentsPage({ searchParams }: PageProps<"/parent/paiements">) {
  return (
    <>
      <PageHeader
        eyebrow="Dossier"
        title={
          <Suspense fallback={<Skeleton inline className="h-[1em] w-80 max-w-full rounded-lg" />}>
            <Title searchParams={searchParams} />
          </Suspense>
        }
        description="Son solde d'heures, l'échéancier de son forfait et ses factures."
      />
      <Suspense fallback={<PaymentsContentSkeleton />}>
        <Content searchParams={searchParams} />
      </Suspense>
    </>
  );
}
