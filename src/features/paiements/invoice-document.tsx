import { CircleCheck, Clock } from "lucide-react";
import { notFound } from "next/navigation";
import { cache } from "react";
import { Badge } from "@/components/ui/badge";
import { LoadingLabel, Skeleton } from "@/components/ui/skeleton";
import { getStudentProfile } from "@/lib/api/eleve";
import { cn } from "@/lib/cn";
import { formatCurrency, formatDate, formatHours } from "@/lib/format";
import { getTenant } from "@/lib/tenant";
import { getPageInvoices, getPagePayments } from "./data";
import { INVOICE_NUMBER_PATTERN, INVOICE_STATUS_META, PAYMENT_METHOD_META } from "./payment-meta";
import { PrintButton } from "@/components/ui/print-button";

/** Invoice of the signed-in student, or notFound(). The API only returns the student's own invoices. */
const loadInvoice = cache(async (number: string) => {
  if (!INVOICE_NUMBER_PATTERN.test(number)) notFound();
  const invoice = (await getPageInvoices()).find((i) => i.number === number);
  if (!invoice) notFound();
  return invoice;
});

/** "Télécharger en PDF", once the invoice is known to exist. Render inside <Suspense>. */
export async function InvoicePrintAction({ number }: { number: Promise<string> }) {
  const invoice = await loadInvoice(await number);
  return <PrintButton fileName={`Facture ${invoice.number}`} className="w-full sm:w-auto" />;
}

/**
 * Printable invoice. On screen it is a paper-like card; in print the app shell is hidden by the
 * page and the card loses its border, shadow and padding. Render inside <Suspense>.
 */
export async function InvoiceDocument({ number }: { number: Promise<string> }) {
  const invoice = await loadInvoice(await number);
  const [tenant, profile, payments] = await Promise.all([getTenant(), getStudentProfile(), getPagePayments()]);
  if (!tenant) notFound();

  const payment = payments.find((p) => p.invoiceNumber === invoice.number);
  const status = INVOICE_STATUS_META[invoice.status];
  const paid = invoice.status === "payee";

  return (
    <article
      aria-labelledby="facture-titre"
      className="rounded-2xl border border-line bg-surface p-5 text-ink shadow-card sm:p-10 print:rounded-none print:border-0 print:p-0 print:shadow-none"
    >
      <div className="flex flex-col-reverse gap-6 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-3">
          <span
            aria-hidden
            className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-brand text-base font-bold text-on-brand [print-color-adjust:exact]"
          >
            {tenant.logoInitials}
          </span>
          <div className="min-w-0 text-sm leading-6">
            <p className="text-base font-bold">{tenant.name}</p>
            <p className="text-ink-muted">{tenant.city}</p>
            <p className="text-ink-muted tabular-nums">{tenant.phone}</p>
            <p className="break-all text-ink-muted">{tenant.email}</p>
          </div>
        </div>

        <div className="sm:text-right">
          <h1 id="facture-titre" className="text-3xl font-bold tracking-tight">
            Facture
          </h1>
          <dl className="mt-3 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm sm:inline-grid sm:text-left">
            <dt className="text-ink-muted">Numéro</dt>
            <dd className="font-semibold tabular-nums">{invoice.number}</dd>
            <dt className="text-ink-muted">Date</dt>
            <dd className="font-semibold">
              <time dateTime={invoice.issuedAt}>{formatDate(invoice.issuedAt)}</time>
            </dd>
          </dl>
          <div className="mt-3">
            <Badge tone={status.tone} icon={status.icon}>
              {status.label}
            </Badge>
          </div>
        </div>
      </div>

      <div className="mt-8 grid gap-6 border-t border-line pt-6 sm:grid-cols-2">
        <section aria-labelledby="facture-client">
          <h2 id="facture-client" className="text-xs font-semibold tracking-wide text-ink-subtle uppercase">
            Facturé à
          </h2>
          <address className="mt-2 text-sm leading-6 not-italic">
            <span className="font-semibold">
              {profile.firstName} {profile.lastName}
            </span>
            <br />
            {profile.address.line1}
            <br />
            {profile.address.postalCode} {profile.address.city}
            <br />
            <span className="break-all text-ink-muted">{profile.email}</span>
          </address>
        </section>
        <section aria-labelledby="facture-formation">
          <h2 id="facture-formation" className="text-xs font-semibold tracking-wide text-ink-subtle uppercase">
            Formation
          </h2>
          <p className="mt-2 text-sm leading-6">
            Permis {profile.licence}
            <br />
            <span className="text-ink-muted">Agence {profile.office}</span>
          </p>
        </section>
      </div>

      <table className="mt-8 w-full text-sm">
        <caption className="sr-only">Détail de la facture {invoice.number}</caption>
        <thead>
          <tr className="border-b border-line-strong text-xs tracking-wide text-ink-subtle uppercase">
            <th scope="col" className="py-2.5 pr-4 text-left font-semibold">
              Désignation
            </th>
            <th scope="col" className="py-2.5 text-right font-semibold">
              Montant TTC
            </th>
          </tr>
        </thead>
        <tbody>
          <tr className="border-b border-line">
            <td className="py-4 pr-4 align-top">
              <p className="font-semibold">{invoice.label}</p>
              {payment && payment.hours > 0 && (
                <p className="mt-0.5 text-ink-muted tabular-nums">{formatHours(payment.hours)} de conduite</p>
              )}
            </td>
            <td className="py-4 text-right align-top font-semibold tabular-nums">{formatCurrency(invoice.amount)}</td>
          </tr>
        </tbody>
        <tfoot>
          <tr>
            <th scope="row" className="pt-4 pr-4 text-right font-semibold">
              Total TTC
            </th>
            <td className="pt-4 text-right text-xl font-bold whitespace-nowrap tabular-nums">
              {formatCurrency(invoice.amount)}
            </td>
          </tr>
        </tfoot>
      </table>

      <p
        className={cn(
          "mt-8 flex items-start gap-2 rounded-xl p-4 text-sm font-semibold print:border print:border-line print:bg-transparent",
          paid ? "bg-success-soft text-success" : "bg-warning-soft text-warning",
        )}
      >
        {paid ? (
          <CircleCheck className="mt-0.5 size-4 shrink-0" aria-hidden />
        ) : (
          <Clock className="mt-0.5 size-4 shrink-0" aria-hidden />
        )}
        {paid && payment ? (
          <span>
            Payée le <time dateTime={payment.date}>{formatDate(payment.date)}</time>{" "}
            {PAYMENT_METHOD_META[payment.method].phrase}.
          </span>
        ) : paid ? (
          "Payée."
        ) : (
          "En attente de paiement."
        )}
      </p>

      <p className="mt-10 border-t border-line pt-4 text-xs leading-5 text-ink-subtle">
        Facture émise par {tenant.name} et générée automatiquement à la réception du paiement. Les paiements en
        ligne sont traités par Stripe pour le compte de l&apos;auto-école. Conservez ce document : il peut vous être
        demandé par un financeur ou votre employeur.
      </p>
    </article>
  );
}

export function InvoiceDocumentSkeleton() {
  return (
    <div className="rounded-2xl border border-line bg-surface p-5 shadow-card sm:p-10">
      <LoadingLabel>Chargement de la facture…</LoadingLabel>
      <div className="flex flex-col-reverse gap-6 sm:flex-row sm:justify-between">
        <div className="flex gap-3">
          <Skeleton className="size-12 rounded-xl" />
          <div className="space-y-2">
            <Skeleton className="h-5 w-40" />
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-4 w-28" />
            <Skeleton className="h-4 w-44" />
          </div>
        </div>
        <div className="space-y-3 sm:flex sm:flex-col sm:items-end">
          <Skeleton className="h-9 w-32" />
          <Skeleton className="h-4 w-48" />
          <Skeleton className="h-4 w-44" />
          <Skeleton className="h-6 w-20 rounded-full" />
        </div>
      </div>
      <div className="mt-8 grid gap-6 border-t border-line pt-6 sm:grid-cols-2">
        <div className="space-y-2">
          <Skeleton className="h-3 w-20" />
          <Skeleton className="h-4 w-36" />
          <Skeleton className="h-4 w-40" />
          <Skeleton className="h-4 w-28" />
        </div>
        <div className="space-y-2">
          <Skeleton className="h-3 w-20" />
          <Skeleton className="h-4 w-40" />
          <Skeleton className="h-4 w-32" />
        </div>
      </div>
      <Skeleton className="mt-8 h-9 w-full" />
      <Skeleton className="mt-3 h-14 w-full" />
      <Skeleton className="mt-6 ml-auto h-6 w-40" />
      <Skeleton className="mt-8 h-13 w-full rounded-xl" />
      <Skeleton className="mt-10 h-10 w-full" />
    </div>
  );
}
