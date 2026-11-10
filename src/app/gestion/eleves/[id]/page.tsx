import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { Banknote, CalendarDays, ChevronLeft, FileCheck, ReceiptText, WalletCards } from "lucide-react";
import { AccessDenied } from "@/components/gestion/access-denied";
import { ButtonLink } from "@/components/ui/button";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { LoadingLabel, Skeleton } from "@/components/ui/skeleton";
import { DocumentReview } from "@/features/eleves/document-review";
import { GeneralInfo } from "@/features/eleves/general-info";
import { StudentLessons, StudentPayments, StudentStats } from "@/features/eleves/student-activity";
import { GuardianDecisionsCard, GuardianDecisionsSkeleton } from "@/features/parent/guardian-decisions";
import { BalanceSummary } from "@/features/solde/balance-summary";
import { getStaffUser, getStudentFile } from "@/lib/api/gestion";
import { formatDate } from "@/lib/format";
import { can } from "@/lib/permissions";

export const metadata: Metadata = { title: "Fiche élève" };

const ID = /^[\w-]{1,64}$/;

async function StudentFileContent({ params }: { params: PageProps<"/gestion/eleves/[id]">["params"] }) {
  const { id } = await params;
  const user = await getStaffUser();
  if (!can(user, "eleves.voir")) return <AccessDenied what="aux dossiers élèves" />;
  if (!ID.test(id)) notFound();
  const file = await getStudentFile(id);
  if (!file) notFound();

  const { profile } = file;
  const toReview = file.documents.filter((d) => d.status === "en_verification").length;

  return (
    <>
      <PageHeader
        title={`${profile.firstName} ${profile.lastName}`}
        description={`Inscrit·e le ${formatDate(profile.enrolledAt)} · ${profile.office} · ${profile.licence}`}
        actions={
          <>
            {can(user, "planning.voir") && (
              <ButtonLink href="/gestion/planning" variant="secondary" icon={<CalendarDays className="size-4" aria-hidden />}>
                Planning
              </ButtonLink>
            )}
            {can(user, "caisse.encaisser") && !profile.archived && (
              <ButtonLink href={`/gestion/caisse?eleve=${profile.id}`} icon={<Banknote className="size-4" aria-hidden />}>
                Encaisser
              </ButtonLink>
            )}
          </>
        }
      />

      <div className="grid gap-6 xl:grid-cols-3">
        <div className="min-w-0 space-y-6 xl:col-span-2">
          <StudentStats stats={file.stats} now={file.now} />

          {/* Minor: the legal guardian's authorisations, given in the parent space. */}
          {profile.isMinor && (
            <Suspense fallback={<GuardianDecisionsSkeleton />}>
              <GuardianDecisionsCard studentId={profile.id} />
            </Suspense>
          )}

          <Card>
            <CardHeader
              title="Solde d'heures"
              description={`${file.balance.packageName} · calculé à partir des paiements et des leçons`}
              icon={<WalletCards className="size-5" aria-hidden />}
            />
            <CardBody>
              <BalanceSummary balance={file.balance} />
            </CardBody>
          </Card>

          <Card>
            <CardHeader
              title="Pièces du dossier"
              description={toReview > 0 ? `${toReview} ${toReview > 1 ? "pièces à vérifier" : "pièce à vérifier"}` : "Aucune pièce à vérifier"}
              icon={<FileCheck className="size-5" aria-hidden />}
            />
            <CardBody>
              <DocumentReview studentId={profile.id} documents={file.documents} canValidate={can(user, "documents.valider")} />
            </CardBody>
          </Card>

          <Card>
            <CardHeader title="Leçons" description="À venir, puis les plus récentes" icon={<CalendarDays className="size-5" aria-hidden />} />
            <CardBody>
              <StudentLessons upcoming={file.upcoming} history={file.history} />
            </CardBody>
          </Card>

          <Card>
            <CardHeader title="Paiements" icon={<ReceiptText className="size-5" aria-hidden />} />
            <CardBody>
              <StudentPayments payments={file.payments} />
            </CardBody>
          </Card>
        </div>

        <aside aria-label="Informations générales" className="min-w-0 xl:sticky xl:top-8 xl:self-start">
          <GeneralInfo profile={profile} now={file.now} canManage={can(user, "eleves.gerer")} />
        </aside>
      </div>
    </>
  );
}

function StudentFileSkeleton() {
  return (
    <div>
      <LoadingLabel>Chargement de la fiche…</LoadingLabel>
      <Skeleton className="mb-2 h-9 w-72" />
      <Skeleton className="mb-8 h-5 w-96 max-w-full" />
      <div className="grid gap-6 xl:grid-cols-3">
        <div className="space-y-6 xl:col-span-2">
          <div className="grid gap-3 sm:grid-cols-3">
            <Skeleton className="h-20 rounded-2xl" />
            <Skeleton className="h-20 rounded-2xl" />
            <Skeleton className="h-20 rounded-2xl" />
          </div>
          <Skeleton className="h-80 rounded-2xl" />
          <Skeleton className="h-96 rounded-2xl" />
        </div>
        <Skeleton className="h-[48rem] rounded-2xl" />
      </div>
    </div>
  );
}

export default function GestionStudentFilePage({ params }: PageProps<"/gestion/eleves/[id]">) {
  return (
    <>
      <Link
        href="/gestion/eleves"
        className="-ml-2 mb-3 inline-flex h-11 items-center gap-1 rounded-xl px-2 text-sm font-semibold text-ink-muted hover:bg-subtle hover:text-ink"
      >
        <ChevronLeft className="size-4" aria-hidden />
        Élèves
      </Link>
      <Suspense fallback={<StudentFileSkeleton />}>
        <StudentFileContent params={params} />
      </Suspense>
    </>
  );
}
