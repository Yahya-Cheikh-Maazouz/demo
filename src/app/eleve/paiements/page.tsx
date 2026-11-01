import type { Metadata } from "next";
import { CalendarClock, Hourglass, ReceiptText, ShoppingBag, Store, WalletCards } from "lucide-react";
import { Suspense } from "react";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import {
  BalancePanel,
  BalancePanelSkeleton,
  PackageLine,
  PackageLineSkeleton,
  PURCHASE_ANCHOR,
} from "@/features/paiements/balance-panel";
import { Installments, InstallmentsSkeleton } from "@/features/paiements/installments";
import { Invoices, InvoicesSkeleton } from "@/features/paiements/invoices";
import { PaymentHistory, PaymentHistorySkeleton } from "@/features/paiements/payment-history";
import { Purchase, PurchaseSkeleton } from "@/features/paiements/purchase";

export const metadata: Metadata = {
  title: "Paiements et factures",
};

const icon = "size-5";

/**
 * Student payments. Each card streams in its own Suspense boundary.
 * Mobile: one column in priority order (balance, payment plan, purchase, history, invoices).
 * Desktop: 2/3 + 1/3 rows, then the invoices table on the full width.
 */
export default function PaymentsPage() {
  return (
    <>
      <PageHeader
        title="Paiements et factures"
        description="Votre solde d'heures, vos échéances, vos achats et vos factures."
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="flex min-w-0 flex-col lg:col-span-2">
          <CardHeader
            title="Mon solde d'heures"
            description={
              <Suspense fallback={<PackageLineSkeleton />}>
                <PackageLine />
              </Suspense>
            }
            icon={<Hourglass className={icon} aria-hidden />}
          />
          <Suspense fallback={<BalancePanelSkeleton />}>
            <BalancePanel />
          </Suspense>
        </Card>

        <Card className="flex min-w-0 flex-col">
          <CardHeader
            title="Échéancier"
            description="Votre forfait réglé en plusieurs fois."
            icon={<CalendarClock className={icon} aria-hidden />}
          />
          <Suspense fallback={<InstallmentsSkeleton />}>
            <Installments />
          </Suspense>
        </Card>

        <Card id={PURCHASE_ANCHOR} className="min-w-0 scroll-mt-20 lg:col-span-2 lg:scroll-mt-10">
          <CardHeader
            title="Acheter des heures"
            description="Les heures sont ajoutées à votre solde dès le paiement validé."
            icon={<ShoppingBag className={icon} aria-hidden />}
          />
          <CardBody>
            <Suspense fallback={<PurchaseSkeleton />}>
              <Purchase />
            </Suspense>
          </CardBody>
          <div className="flex items-start gap-3 border-t border-line px-5 py-4 text-sm text-ink-muted sm:px-6">
            <Store className="mt-0.5 size-4 shrink-0 text-ink-subtle" aria-hidden />
            <p>
              <span className="font-semibold text-ink">Vous préférez payer à l&apos;agence ?</span> Espèces, chèque,
              carte ou virement : réglez à l&apos;accueil de votre auto-école, vos heures sont ajoutées de la même
              façon.
            </p>
          </div>
        </Card>

        <Card className="min-w-0 lg:self-start">
          <CardHeader
            title="Historique des paiements"
            description="En ligne et à l'agence."
            icon={<WalletCards className={icon} aria-hidden />}
          />
          <Suspense fallback={<PaymentHistorySkeleton />}>
            <PaymentHistory />
          </Suspense>
        </Card>

        <Card className="min-w-0 lg:col-span-3">
          <CardHeader
            title="Factures et reçus"
            description="Générés automatiquement à chaque paiement et envoyés par e-mail."
            icon={<ReceiptText className={icon} aria-hidden />}
          />
          <Suspense fallback={<InvoicesSkeleton />}>
            <Invoices />
          </Suspense>
        </Card>
      </div>
    </>
  );
}
