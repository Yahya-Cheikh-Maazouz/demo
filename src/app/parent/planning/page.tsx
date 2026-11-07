import type { Metadata } from "next";
import { Suspense } from "react";
import { PageHeader } from "@/components/ui/page-header";
import { Skeleton } from "@/components/ui/skeleton";
import { PlanningContent, PlanningContentSkeleton, PlanningTitle, SchoolPhonePill } from "@/features/parent/lessons";
import { childParam } from "@/features/parent/query";

export const metadata: Metadata = {
  title: "Planning",
};

type SearchParams = PageProps<"/parent/planning">["searchParams"];

async function Title({ searchParams }: { searchParams: SearchParams }) {
  return <PlanningTitle child={childParam(await searchParams)} />;
}

async function Content({ searchParams }: { searchParams: SearchParams }) {
  return <PlanningContent child={childParam(await searchParams)} />;
}

/** The child's lessons, read-only: parents follow the planning but do not book (spec, section 1). */
export default function ParentPlanningPage({ searchParams }: PageProps<"/parent/planning">) {
  return (
    <>
      <PageHeader
        eyebrow="Mon enfant"
        title={
          <Suspense fallback={<Skeleton inline className="h-[1em] w-72 max-w-full rounded-lg" />}>
            <Title searchParams={searchParams} />
          </Suspense>
        }
        description="Ses leçons à venir et son historique."
        actions={
          <Suspense fallback={<Skeleton className="h-15 w-52 rounded-2xl" />}>
            <SchoolPhonePill />
          </Suspense>
        }
      />
      <Suspense fallback={<PlanningContentSkeleton />}>
        <Content searchParams={searchParams} />
      </Suspense>
    </>
  );
}
