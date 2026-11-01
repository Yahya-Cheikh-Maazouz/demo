import { Suspense } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { AccountDeletion } from "./account-deletion";
import { getPageDeletionRequest } from "./data";
import { DataExport } from "./data-export";

async function AccountDeletionSection() {
  return <AccountDeletion requestedAt={await getPageDeletionRequest()} />;
}

/** RGPD rights: data export and account deletion. Render inside a <Card>. */
export function PrivacySettings() {
  return (
    <div className="divide-y divide-line px-5 sm:px-6">
      <div className="py-5">
        <h3 className="font-semibold text-ink">Copie de vos données</h3>
        <p className="mt-1 mb-4 text-sm text-ink-muted">
          Vos informations, leçons, paiements et documents, envoyés par e-mail.
        </p>
        <DataExport />
      </div>

      <div className="py-5">
        <h3 className="font-semibold text-ink">Suppression du compte</h3>
        <p className="mt-1 mb-4 text-sm text-ink-muted">
          Votre auto-école traite la demande. Vos factures sont conservées 10&nbsp;ans, comme l&apos;exige la loi.
        </p>
        <Suspense fallback={<Skeleton className="h-11 w-full rounded-xl sm:w-52 xl:w-full" />}>
          <AccountDeletionSection />
        </Suspense>
      </div>
    </div>
  );
}
