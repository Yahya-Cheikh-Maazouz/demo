import { Download, ReceiptText } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";
import { CardBody } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { LoadingLabel, Skeleton } from "@/components/ui/skeleton";
import { formatCurrency, formatDate, formatDateShort } from "@/lib/format";
import type { Invoice } from "@/lib/types";
import { getPageInvoices } from "./data";
import { INVOICE_STATUS_META, invoiceHref } from "./payment-meta";

function InvoiceStatusBadge({ status }: { status: Invoice["status"] }) {
  const meta = INVOICE_STATUS_META[status];
  return (
    <Badge tone={meta.tone} icon={meta.icon}>
      {meta.label}
    </Badge>
  );
}

function DownloadLink({ invoice, size }: { invoice: Invoice; size: "sm" | "md" }) {
  return (
    <ButtonLink
      href={invoiceHref(invoice.number)}
      variant="secondary"
      size={size}
      icon={<Download className="size-4" aria-hidden />}
    >
      Télécharger<span className="sr-only"> la facture {invoice.number}</span>
    </ButtonLink>
  );
}

/**
 * Invoices and receipts, latest first. Stacked rows on mobile, a real table from `lg`.
 * Render inside a <Card> and <Suspense>.
 */
export async function Invoices() {
  const invoices = await getPageInvoices();

  if (invoices.length === 0) {
    return (
      <CardBody>
        <EmptyState
          icon={ReceiptText}
          title="Aucune facture pour le moment"
          description="Une facture est générée automatiquement à chaque paiement et envoyée par e-mail."
          className="py-6"
        />
      </CardBody>
    );
  }

  return (
    <>
      <CardBody className="pt-3 lg:hidden">
        <ul className="divide-y divide-line">
          {invoices.map((invoice) => (
            <li key={invoice.id} className="py-4">
              <div className="flex items-baseline justify-between gap-3">
                <p className="min-w-0 font-semibold text-ink">{invoice.label}</p>
                <p className="shrink-0 font-bold text-ink tabular-nums">{formatCurrency(invoice.amount)}</p>
              </div>
              <p className="mt-0.5 text-sm text-ink-muted">
                <span className="tabular-nums">{invoice.number}</span>
                <span aria-hidden> · </span>
                <span className="sr-only">, émise le </span>
                <time dateTime={invoice.issuedAt}>{formatDate(invoice.issuedAt)}</time>
              </p>
              <div className="mt-3 flex items-center justify-between gap-3">
                <InvoiceStatusBadge status={invoice.status} />
                <DownloadLink invoice={invoice} size="md" />
              </div>
            </li>
          ))}
        </ul>
      </CardBody>

      <div className="hidden px-6 pt-4 pb-6 lg:block">
        <table className="w-full text-left text-sm">
          <caption className="sr-only">Vos factures et reçus, de la plus récente à la plus ancienne</caption>
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
              <th scope="col" className="py-3 pr-4 text-right font-semibold">
                Montant TTC
              </th>
              <th scope="col" className="py-3 text-right font-semibold">
                <span className="sr-only">Actions</span>
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
                <td className="py-3 pr-4 text-right font-semibold text-ink tabular-nums">
                  {formatCurrency(invoice.amount)}
                </td>
                <td className="py-3 text-right">
                  <DownloadLink invoice={invoice} size="sm" />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

export function InvoicesSkeleton() {
  return (
    <>
      <LoadingLabel>Chargement de vos factures…</LoadingLabel>
      <CardBody className="pt-3 lg:hidden">
        <div className="divide-y divide-line">
          {Array.from({ length: 3 }, (_, i) => (
            <div key={i} className="space-y-2 py-4">
              <div className="flex justify-between gap-3">
                <Skeleton className="h-4 w-48" />
                <Skeleton className="h-4 w-16" />
              </div>
              <Skeleton className="h-4 w-40" />
              <div className="flex items-center justify-between pt-1">
                <Skeleton className="h-6 w-16 rounded-full" />
                <Skeleton className="h-11 w-36 rounded-xl" />
              </div>
            </div>
          ))}
        </div>
      </CardBody>
      <div className="hidden px-6 pt-4 pb-6 lg:block">
        <Skeleton className="h-10 w-full" />
        {Array.from({ length: 3 }, (_, i) => (
          <div key={i} className="flex items-center gap-6 border-t border-line py-3">
            <Skeleton className="h-4 w-28" />
            <Skeleton className="h-4 flex-1" />
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-6 w-16 rounded-full" />
            <Skeleton className="h-4 w-16" />
            <Skeleton className="h-10 w-32 rounded-lg" />
          </div>
        ))}
      </div>
    </>
  );
}
