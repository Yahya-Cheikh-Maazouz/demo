import type { Metadata } from "next";
import { Suspense } from "react";
import { AccessDenied } from "@/components/gestion/access-denied";
import { PageHeader } from "@/components/ui/page-header";
import { LoadingLabel, Skeleton } from "@/components/ui/skeleton";
import { AgendaBoard } from "@/features/planning/agenda/agenda-board";
import { agendaRange, parseAgendaQuery } from "@/features/planning/agenda/agenda-range";
import { getPlanning, getStaffNow, getStaffUser, getStudentChoices } from "@/lib/api/gestion";
import { dayKey } from "@/lib/format";
import { can } from "@/lib/permissions";

export const metadata: Metadata = { title: "Planning" };

async function PlanningContent({ searchParams }: { searchParams: PageProps<"/gestion/planning">["searchParams"] }) {
  const user = await getStaffUser();
  if (!can(user, "planning.voir")) return <AccessDenied what="au planning" />;

  const todayKey = dayKey(await getStaffNow());
  const query = parseAgendaQuery(await searchParams, todayKey);
  const range = agendaRange(query);
  const canSeeStudents = can(user, "eleves.voir");
  const [planning, students] = await Promise.all([
    getPlanning(range.from, range.to),
    canSeeStudents ? getStudentChoices() : Promise.resolve([]),
  ]);

  return (
    <AgendaBoard
      query={query}
      todayKey={todayKey}
      planning={planning}
      students={students}
      permissions={{
        canManage: can(user, "planning.gerer") && canSeeStudents,
        canForce: can(user, "planning.forcer"),
        canSeeStudents,
      }}
    />
  );
}

function PlanningSkeleton() {
  return (
    <div>
      <LoadingLabel>Chargement du planning…</LoadingLabel>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <Skeleton className="h-10 w-80 rounded-xl" />
        <Skeleton className="h-11 w-72 rounded-xl" />
      </div>
      <Skeleton className="mb-4 h-10 w-96 max-w-full rounded-xl" />
      <Skeleton className="h-[52rem] rounded-2xl" />
    </div>
  );
}

export default function GestionPlanningPage({ searchParams }: PageProps<"/gestion/planning">) {
  return (
    <>
      <PageHeader title="Planning" description="Leçons, examens et disponibilités des moniteurs." />
      <Suspense fallback={<PlanningSkeleton />}>
        <PlanningContent searchParams={searchParams} />
      </Suspense>
    </>
  );
}
