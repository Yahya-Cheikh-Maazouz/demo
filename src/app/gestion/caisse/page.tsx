import type { Metadata } from "next";
import { Suspense } from "react";
import { Clock, HandCoins, ListChecks } from "lucide-react";
import { AccessDenied } from "@/components/gestion/access-denied";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { LoadingLabel, Skeleton } from "@/components/ui/skeleton";
import { CashEntries } from "@/features/caisse/cash-entries";
import { CashForm } from "@/features/caisse/cash-form";
import { PAYMENT_METHOD_META } from "@/features/paiements/payment-meta";
import { getCashDay, getStaffUser, getStudentChoices } from "@/lib/api/gestion";
import { formatCurrency, formatDateLong } from "@/lib/format";
import { can } from "@/lib/permissions";
import type { CashMethod } from "@/lib/types";

export const metadata: Metadata = { title: "Caisse du jour" };

const METHODS: CashMethod[] = ["especes", "cheque", "carte", "virement"];
const ID = /^[\w-]{1,64}$/;

async function CashContent({ searchParams }: { searchParams: PageProps<"/gestion/caisse">["searchParams"] }) {
  const user = await getStaffUser();
  if (!can(user, "caisse.encaisser")) return <AccessDenied what="à la caisse" />;
  const [day, students, params] = await Promise.all([getCashDay(), getStudentChoices(), searchParams]);
  const preselected = typeof params.eleve === "string" && ID.test(params.eleve) ? params.eleve : undefined;

  const validated = day.entries.filter((e) => e.status === "valide");
  const pending = day.entries.filter((e) => e.status === "a_valider");
  const total = validated.reduce((sum, e) => sum + e.amount, 0);
  const byMethod = (method: CashMethod) => validated.filter((e) => e.method === method).reduce((sum, e) => sum + e.amount, 0);

  return (
    <div className="space-y-6">
      <p className="-mt-4 text-base text-ink-muted sm:-mt-6">{formatDateLong(day.now)}</p>

      <dl className="grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
        <div className="rounded-2xl bg-brand p-4 text-on-brand shadow-card sm:col-span-2 xl:col-span-2">
          <dt className="text-sm font-medium opacity-90">Total encaissé aujourd&apos;hui</dt>
          <dd className="mt-1 text-3xl font-bold tabular-nums">{formatCurrency(total)}</dd>
          <dd className="text-sm opacity-90">
            {validated.length} {validated.length > 1 ? "encaissements validés" : "encaissement validé"}
          </dd>
        </div>
        {METHODS.map((method) => {
          const meta = PAYMENT_METHOD_META[method];
          return (
            <div key={method} className="rounded-2xl border border-line bg-surface p-4 shadow-card">
              <dt className="flex items-center gap-1.5 text-sm text-ink-muted">
                <meta.icon className="size-4" aria-hidden />
                {meta.label}
              </dt>
              <dd className="mt-1 text-xl font-bold text-ink tabular-nums">{formatCurrency(byMethod(method))}</dd>
            </div>
          );
        })}
      </dl>

      <div className="grid gap-6 xl:grid-cols-5">
        <Card className="xl:col-span-2 xl:self-start">
          <CardHeader
            title="Nouvel encaissement"
            description="Paiement reçu à l'agence : la facture est générée et envoyée à l'élève."
            icon={<HandCoins className="size-5" aria-hidden />}
          />
          <CardBody>
            <CashForm
              students={students}
              defaultStudentId={students.some((s) => s.id === preselected) ? preselected : undefined}
              hourlyRate={day.hourlyRate}
              threshold={day.threshold}
              needsValidationAbove={!can(user, "caisse.valider")}
            />
          </CardBody>
        </Card>

        <Card className="xl:col-span-3">
          <CardHeader
            title="Encaissements du jour"
            description={
              pending.length > 0
                ? `${pending.length} en attente de validation (${formatCurrency(pending.reduce((s, e) => s + e.amount, 0))})`
                : "Tous les encaissements sont validés."
            }
            icon={pending.length > 0 ? <Clock className="size-5" aria-hidden /> : <ListChecks className="size-5" aria-hidden />}
          />
          <CardBody>
            <CashEntries entries={day.entries} canValidate={can(user, "caisse.valider")} />
          </CardBody>
        </Card>
      </div>
    </div>
  );
}

function CashSkeleton() {
  return (
    <div className="space-y-6">
      <LoadingLabel>Chargement de la caisse…</LoadingLabel>
      <Skeleton className="h-5 w-48" />
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
        <Skeleton className="h-28 rounded-2xl sm:col-span-2" />
        {METHODS.map((m) => (
          <Skeleton key={m} className="h-24 rounded-2xl" />
        ))}
      </div>
      <div className="grid gap-6 xl:grid-cols-5">
        <Skeleton className="h-[34rem] rounded-2xl xl:col-span-2" />
        <Skeleton className="h-96 rounded-2xl xl:col-span-3" />
      </div>
    </div>
  );
}

export default function GestionCashPage({ searchParams }: PageProps<"/gestion/caisse">) {
  return (
    <>
      <PageHeader title="Caisse du jour" />
      <Suspense fallback={<CashSkeleton />}>
        <CashContent searchParams={searchParams} />
      </Suspense>
    </>
  );
}
