import type { Metadata } from "next";
import { Suspense } from "react";
import { PageHeader } from "@/components/ui/page-header";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AuthorisationsContent,
  AuthorisationsContentSkeleton,
  AuthorisationsTitle,
} from "@/features/parent/authorisations";
import { ChildPageDescription } from "@/features/parent/child-not-found";
import { childParam } from "@/features/parent/query";

export const metadata: Metadata = {
  title: "Autorisations",
};

type SearchParams = PageProps<"/parent/autorisations">["searchParams"];

const DESCRIPTION = "Validations et autorisations données en tant que représentant légal.";

/** The description, or why the child cannot be shown. */
async function Description({ searchParams }: { searchParams: SearchParams }) {
  return <ChildPageDescription child={childParam(await searchParams)} text={DESCRIPTION} />;
}

async function Title({ searchParams }: { searchParams: SearchParams }) {
  return <AuthorisationsTitle child={childParam(await searchParams)} />;
}

async function Content({ searchParams }: { searchParams: SearchParams }) {
  return <AuthorisationsContent child={childParam(await searchParams)} />;
}

/** What the legal guardian validates (proposals of the school) and authorises (photos, contact, RGPD…). */
export default function ParentAuthorisationsPage({ searchParams }: PageProps<"/parent/autorisations">) {
  return (
    <>
      <PageHeader
        eyebrow="Dossier"
        title={
          <Suspense fallback={<Skeleton inline className="h-[1em] w-80 max-w-full rounded-lg" />}>
            <Title searchParams={searchParams} />
          </Suspense>
        }
        description={
          <Suspense fallback={DESCRIPTION}>
            <Description searchParams={searchParams} />
          </Suspense>
        }
      />
      <Suspense fallback={<AuthorisationsContentSkeleton />}>
        <Content searchParams={searchParams} />
      </Suspense>
    </>
  );
}
