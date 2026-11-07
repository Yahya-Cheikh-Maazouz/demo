import type { Metadata } from "next";
import { Suspense } from "react";
import { PageHeader } from "@/components/ui/page-header";
import { Skeleton } from "@/components/ui/skeleton";
import { HomeContent, HomeContentSkeleton, HomeEyebrow, HomeTitle } from "@/features/parent/home-blocks";
import { childParam } from "@/features/parent/query";

export const metadata: Metadata = {
  title: "Accueil",
};

type SearchParams = PageProps<"/parent">["searchParams"];

async function Eyebrow({ searchParams }: { searchParams: SearchParams }) {
  return <HomeEyebrow child={childParam(await searchParams)} />;
}

async function Title({ searchParams }: { searchParams: SearchParams }) {
  return <HomeTitle child={childParam(await searchParams)} />;
}

async function Content({ searchParams }: { searchParams: SearchParams }) {
  return <HomeContent child={childParam(await searchParams)} />;
}

/**
 * Home of the parent space: the child's next lesson, progress and balance, then what the school
 * is waiting for from the parent (validations, authorisations, documents).
 */
export default function ParentHomePage({ searchParams }: PageProps<"/parent">) {
  return (
    <>
      <PageHeader
        eyebrow={
          <Suspense fallback={<Skeleton inline className="h-[0.8em] w-40 rounded-md" />}>
            <Eyebrow searchParams={searchParams} />
          </Suspense>
        }
        title={
          <Suspense fallback={<Skeleton inline className="h-[1em] w-72 max-w-full rounded-lg" />}>
            <Title searchParams={searchParams} />
          </Suspense>
        }
        description="Suivez sa formation et validez ce qui vous concerne."
      />
      <Suspense fallback={<HomeContentSkeleton />}>
        <Content searchParams={searchParams} />
      </Suspense>
    </>
  );
}
