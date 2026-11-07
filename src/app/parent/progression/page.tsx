import type { Metadata } from "next";
import { Suspense } from "react";
import { PageHeader } from "@/components/ui/page-header";
import { Skeleton } from "@/components/ui/skeleton";
import { ProgressContent, ProgressContentSkeleton, ProgressTitle } from "@/features/parent/progress";
import { childParam } from "@/features/parent/query";

export const metadata: Metadata = {
  title: "Progression",
};

type SearchParams = PageProps<"/parent/progression">["searchParams"];

async function Title({ searchParams }: { searchParams: SearchParams }) {
  return <ProgressTitle child={childParam(await searchParams)} />;
}

async function Content({ searchParams }: { searchParams: SearchParams }) {
  return <ProgressContent child={childParam(await searchParams)} />;
}

/** The child's livret (REMC competences) and the comments after lessons, read-only. */
export default function ParentProgressPage({ searchParams }: PageProps<"/parent/progression">) {
  return (
    <>
      <PageHeader
        eyebrow="Mon enfant"
        title={
          <Suspense fallback={<Skeleton inline className="h-[1em] w-80 max-w-full rounded-lg" />}>
            <Title searchParams={searchParams} />
          </Suspense>
        }
        description="Son livret d'apprentissage et les retours de ses moniteurs."
      />
      <Suspense fallback={<ProgressContentSkeleton />}>
        <Content searchParams={searchParams} />
      </Suspense>
    </>
  );
}
