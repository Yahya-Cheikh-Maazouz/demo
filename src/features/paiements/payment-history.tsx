import { History } from "lucide-react";
import { CardBody } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { LoadingLabel, Skeleton } from "@/components/ui/skeleton";
import { formatCurrency, formatDateShort, formatHours } from "@/lib/format";
import { getPagePayments } from "./data";
import { addedHoursWord, PAYMENT_METHOD_META } from "./payment-meta";

/** Payments received, latest first: online and at the agency. Render inside a <Card> and <Suspense>. */
export async function PaymentHistory() {
  const payments = await getPagePayments();

  if (payments.length === 0) {
    return (
      <CardBody>
        <EmptyState
          icon={History}
          title="Aucun paiement pour le moment"
          description="Vos paiements en ligne et à l'agence apparaîtront ici."
          className="py-6"
        />
      </CardBody>
    );
  }

  return (
    <CardBody className="pt-3">
      <ul className="divide-y divide-line">
        {payments.map((payment) => {
          const method = PAYMENT_METHOD_META[payment.method];
          const Icon = method.icon;
          return (
            <li key={payment.id} className="flex gap-3 py-3.5">
              <span
                aria-hidden
                className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-subtle text-ink-muted"
              >
                <Icon className="size-5" />
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex items-baseline justify-between gap-3">
                  <p className="font-bold text-ink tabular-nums">{formatCurrency(payment.amount)}</p>
                  {payment.hours > 0 && (
                    <p className="shrink-0 text-sm font-semibold text-brand tabular-nums">
                      + {formatHours(payment.hours)}
                      <span className="sr-only"> {addedHoursWord(payment.hours)} à votre solde</span>
                    </p>
                  )}
                </div>
                <p className="mt-0.5 text-sm text-ink-muted">
                  {method.label}
                  <span aria-hidden> · </span>
                  <span className="sr-only">, le </span>
                  <time dateTime={payment.date} className="tabular-nums">
                    {formatDateShort(payment.date)}
                  </time>
                </p>
              </div>
            </li>
          );
        })}
      </ul>
    </CardBody>
  );
}

export function PaymentHistorySkeleton() {
  return (
    <CardBody className="pt-3">
      <LoadingLabel>Chargement de vos paiements…</LoadingLabel>
      <div className="divide-y divide-line">
        {Array.from({ length: 3 }, (_, i) => (
          <div key={i} className="flex gap-3 py-3.5">
            <Skeleton className="size-10 shrink-0 rounded-xl" />
            <div className="flex-1 space-y-2">
              <div className="flex justify-between gap-3">
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-4 w-24" />
              </div>
              <Skeleton className="h-4 w-32" />
            </div>
          </div>
        ))}
      </div>
    </CardBody>
  );
}
