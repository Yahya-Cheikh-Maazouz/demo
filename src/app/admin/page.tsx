import type { Metadata } from "next";
import { Suspense } from "react";
import { CirclePlus } from "lucide-react";
import { ButtonLink } from "@/components/ui/button";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { LoadingLabel, Skeleton } from "@/components/ui/skeleton";
import { parseSchoolQuery } from "@/features/admin/school-filters";
import { PlatformJournal } from "@/features/admin/platform-journal";
import { PlatformStats } from "@/features/admin/platform-stats";
import { SchoolList } from "@/features/admin/school-list";
import { getPlatformJournal, getPlatformOverview } from "@/lib/api/admin";

export const metadata: Metadata = { title: "Auto-écoles · Plateforme" };

async function SchoolsContent({ searchParams }: { searchParams: PageProps<"/admin">["searchParams"] }) {
  const [overview, params] = await Promise.all([getPlatformOverview(), searchParams]);
  return (
    <div className="space-y-8">
      <PlatformStats overview={overview} />
      <section aria-labelledby="liste-auto-ecoles">
        <h2 id="liste-auto-ecoles" className="mb-4 text-xl font-extrabold tracking-[-0.02em] text-ink">
          Toutes les auto-écoles
        </h2>
        <SchoolList schools={overview.schools} query={parseSchoolQuery(params)} counts={overview.countsByStatus} now={overview.now} />
      </section>
    </div>
  );
}

function SchoolsSkeleton() {
  return (
    <div className="space-y-8">
      <LoadingLabel>Chargement des auto-écoles…</LoadingLabel>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <Skeleton className="h-36 rounded-3xl sm:col-span-2 xl:col-span-1" />
        <Skeleton className="h-36 rounded-3xl" />
        <Skeleton className="h-36 rounded-3xl sm:col-span-2 xl:col-span-3" />
      </div>
      <div className="space-y-4">
        <Skeleton className="h-7 w-56" />
        <Skeleton className="h-12 max-w-xl rounded-xl" />
        <Skeleton className="h-11 w-full max-w-3xl rounded-xl" />
        <Skeleton className="h-5 w-28" />
        <Skeleton className="h-64 rounded-3xl" />
      </div>
    </div>
  );
}

async function RecentJournal() {
  const entries = await getPlatformJournal(8);
  return <PlatformJournal entries={entries} showSchool />;
}

export default function AdminHomePage({ searchParams }: PageProps<"/admin">) {
  return (
    <>
      <PageHeader
        eyebrow="Plateforme"
        title="Auto-écoles"
        description="Formules, état des abonnements et usage de chaque auto-école."
        actions={
          <ButtonLink href="/admin/auto-ecoles/nouvelle" size="lg" icon={<CirclePlus className="size-5" aria-hidden />}>
            Créer une auto-école
          </ButtonLink>
        }
      />
      <Suspense fallback={<SchoolsSkeleton />}>
        <SchoolsContent searchParams={searchParams} />
      </Suspense>

      <Card className="mt-8">
        <CardHeader title="Journal de la plateforme" description="Créations, changements de formule et de statut : qui, quoi, quand." />
        <CardBody>
          <Suspense
            fallback={
              <div className="space-y-3">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
              </div>
            }
          >
            <RecentJournal />
          </Suspense>
        </CardBody>
      </Card>
    </>
  );
}
