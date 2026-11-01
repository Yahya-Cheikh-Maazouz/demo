import type { Metadata } from "next";
import { Suspense } from "react";
import { AccessDenied } from "@/components/gestion/access-denied";
import { PageHeader } from "@/components/ui/page-header";
import { LoadingLabel, Skeleton } from "@/components/ui/skeleton";
import { parseStudentQuery } from "@/features/eleves/student-filters";
import { StudentList } from "@/features/eleves/student-list";
import { getStaffNow, getStaffUser, getStudentRows } from "@/lib/api/gestion";
import { can } from "@/lib/permissions";

export const metadata: Metadata = { title: "Élèves" };

async function StudentsContent({ searchParams }: { searchParams: PageProps<"/gestion/eleves">["searchParams"] }) {
  const user = await getStaffUser();
  if (!can(user, "eleves.voir")) return <AccessDenied what="aux dossiers élèves" />;
  const [rows, now, params] = await Promise.all([getStudentRows(), getStaffNow(), searchParams]);
  return <StudentList rows={rows} now={now} query={parseStudentQuery(params)} />;
}

function StudentsSkeleton() {
  return (
    <div className="space-y-4">
      <LoadingLabel>Chargement des élèves…</LoadingLabel>
      <Skeleton className="h-12 max-w-xl rounded-xl" />
      <Skeleton className="h-10 w-full max-w-2xl rounded-xl" />
      <Skeleton className="h-5 w-24" />
      <Skeleton className="h-[36rem] rounded-2xl" />
    </div>
  );
}

export default function GestionStudentsPage({ searchParams }: PageProps<"/gestion/eleves">) {
  return (
    <>
      <PageHeader title="Élèves" description="Dossiers, soldes d'heures et pièces de vos élèves." />
      <Suspense fallback={<StudentsSkeleton />}>
        <StudentsContent searchParams={searchParams} />
      </Suspense>
    </>
  );
}
