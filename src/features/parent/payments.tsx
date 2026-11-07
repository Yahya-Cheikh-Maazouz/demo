import { CalendarCheck, CalendarClock, Hourglass, ReceiptText, Store } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { LoadingLabel, Skeleton } from "@/components/ui/skeleton";
import { INVOICE_STATUS_META } from "@/features/paiements/payment-meta";
import { BalanceSummary } from "@/features/solde/balance-summary";
import { formatCurrency, formatDate, formatDateShort } from "@/lib/format";
import type { Invoice } from "@/lib/types";
import { ChildNotFound, NOT_FOUND_TITLE } from "./child-not-found";
import { getPagePayments } from "./data";
import { InstallmentPlan } from "./installment-plan";

const icon = "size-5";

/** "Les paiements de Léa". Render inside <Suspense>. */
export async function PaymentsTitle({ child }: { child: string | null }) {
  const data = await getPagePayments(child);
  return <>{data ? `Les paiements de ${data.child.firstName}` : NOT_FOUND_TITLE}</>;
}

function InvoiceStatusBadge({ status }: { status: Invoice["status"] }) {
  const meta = INVOICE_STATUS_META[status];
  return (
    <Badge tone={meta.tone} icon={meta.icon}>
      {meta.label}
    </Badge>
  );
}

/** Balance of hours, payment plan and invoices of the child. Render inside <Suspense>. */
export async function PaymentsContent({ child }: { child: string | null }) {
  const data = await getPagePayments(child);
  if (!data) return <ChildNotFound />;
  const { balance, installments, invoices, child: kid } = data;

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      <Card className="flex min-w-0 flex-col lg:col-span-2">
        <CardHeader
          title={`Solde d'heures de ${kid.firstName}`}
          description={`${balance.packageName} · ${formatCurrency(balance.packagePrice, { round: true })}`}
          icon={<Hourglass className={icon} aria-hidden />}
        />
        <CardBody>
          <BalanceSummary balance={balance} headline="Heures restantes après ses réservations" />
        </CardBody>
        <div className="mt-auto flex items-start gap-3 border-t border-line px-5 py-4 text-sm text-ink-muted sm:px-6">
          <Store className="mt-0.5 size-4 shrink-0 text-ink-subtle" aria-hidden />
          <p>
            <span className="font-semibold text-ink">Vous préférez payer à l&apos;agence ?</span> Espèces, chèque, carte ou
            virement : réglez à l&apos;accueil de l&apos;auto-école, les heures sont ajoutées de la même façon.
          </p>
        </div>
      </Card>

      <Card className="flex min-w-0 flex-col">
        <CardHeader
          title="Échéancier"
          description="Le forfait réglé en plusieurs fois."
          icon={<CalendarClock className={icon} aria-hidden />}
        />
        {installments.length === 0 ? (
          <CardBody>
            <EmptyState
              icon={CalendarCheck}
              title="Pas d'échéancier"
              description="Les heures sont réglées au fur et à mesure, sans paiement programmé."
              className="py-6"
            />
          </CardBody>
        ) : (
          <InstallmentPlan childId={kid.id} firstName={kid.firstName} installments={installments} />
        )}
      </Card>

      <Card id="factures" className="min-w-0 scroll-mt-24 lg:col-span-3">
        <CardHeader
          title="Factures"
          description="Une facture est émise à chaque paiement, en ligne ou à l'agence."
          icon={<ReceiptText className={icon} aria-hidden />}
        />
        {invoices.length === 0 ? (
          <CardBody>
            <EmptyState icon={ReceiptText} title="Aucune facture pour le moment" className="py-6" />
          </CardBody>
        ) : (
          <InvoiceList invoices={invoices} />
        )}
      </Card>
    </div>
  );
}

/** Stacked rows on mobile, a table from `lg`. */
function InvoiceList({ invoices }: { invoices: Invoice[] }) {
  return (
    <>
      <CardBody className="pt-3 lg:hidden">
        <ul className="divide-y divide-line" aria-label="Factures, de la plus récente à la plus ancienne">
          {invoices.map((invoice) => (
            <li key={invoice.id} className="py-4">
              <div className="flex items-baseline justify-between gap-3">
                <p className="min-w-0 font-semibold text-ink">{invoice.label}</p>
                <p className="shrink-0 font-bold text-ink tabular-nums">{formatCurrency(invoice.amount)}</p>
              </div>
              <div className="mt-1 flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm text-ink-muted">
                  <span className="tabular-nums">{invoice.number}</span>
                  <span aria-hidden> · </span>
                  <span className="sr-only">, émise le </span>
                  <time dateTime={invoice.issuedAt}>{formatDate(invoice.issuedAt)}</time>
                </p>
                <InvoiceStatusBadge status={invoice.status} />
              </div>
            </li>
          ))}
        </ul>
      </CardBody>

      <div className="hidden px-6 pt-4 pb-6 lg:block">
        <table className="w-full text-left text-sm">
          <caption className="sr-only">Factures, de la plus récente à la plus ancienne</caption>
          <thead>
            <tr className="border-b border-line text-xs font-semibold tracking-wide text-ink-subtle uppercase">
              <th scope="col" className="py-3 pr-4 font-semibold">
                Numéro
              </th>
              <th scope="col" className="py-3 pr-4 font-semibold">
                Libellé
              </th>
              <th scope="col" className="py-3 pr-4 font-semibold">
                Date
              </th>
              <th scope="col" className="py-3 pr-4 font-semibold">
                Statut
              </th>
              <th scope="col" className="py-3 text-right font-semibold">
                Montant TTC
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {invoices.map((invoice) => (
              <tr key={invoice.id} className="transition-colors hover:bg-subtle/60">
                <th scope="row" className="py-3 pr-4 font-semibold text-ink tabular-nums">
                  {invoice.number}
                </th>
                <td className="py-3 pr-4 text-ink">{invoice.label}</td>
                <td className="py-3 pr-4 text-ink-muted tabular-nums">
                  <time dateTime={invoice.issuedAt}>{formatDateShort(invoice.issuedAt)}</time>
                </td>
                <td className="py-3 pr-4">
                  <InvoiceStatusBadge status={invoice.status} />
                </td>
                <td className="py-3 text-right font-semibold text-ink tabular-nums">{formatCurrency(invoice.amount)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

export function PaymentsContentSkeleton() {
  return (
    <div className="grid gap-6 lg:grid-cols-3">
      <LoadingLabel>Chargement des paiements…</LoadingLabel>
      <Card className="p-5 sm:p-6 lg:col-span-2">
        <Skeleton className="h-6 w-56" />
        <Skeleton className="mt-2 h-4 w-48" />
        <Skeleton className="mt-6 h-12 w-40" />
        <Skeleton className="mt-4 h-3 w-full rounded-full" />
        <Skeleton className="mt-4 h-32 w-full rounded-xl" />
      </Card>
      <Card className="p-5 sm:p-6">
        <Skeleton className="h-6 w-32" />
        <div className="mt-6 space-y-5">
          {[0, 1, 2].map((i) => (
            <div key={i} className="flex gap-3">
              <Skeleton className="size-9 shrink-0 rounded-full" />
              <div className="flex-1 space-y-2 pt-1">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-6 w-24 rounded-full" />
              </div>
            </div>
          ))}
        </div>
        <Skeleton className="mt-5 h-11 w-full rounded-xl" />
      </Card>
      <Card className="p-5 sm:p-6 lg:col-span-3">
        <Skeleton className="h-6 w-32" />
        <div className="mt-6 space-y-4">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-10 w-full" />
          ))}
        </div>
      </Card>
    </div>
  );
}
