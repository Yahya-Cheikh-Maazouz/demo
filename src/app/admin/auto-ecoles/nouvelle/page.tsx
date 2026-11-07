import type { Metadata } from "next";
import { Suspense } from "react";
import { ArrowLeft } from "lucide-react";
import { ButtonLink } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";
import { LoadingLabel, Skeleton } from "@/components/ui/skeleton";
import { CreateSchoolForm } from "@/features/admin/create-school-form";
import { getPlatformPlans, getSchoolsDomain } from "@/lib/api/admin";

export const metadata: Metadata = { title: "Nouvelle auto-école · Plateforme" };

async function FormContent() {
  const [plans, domain] = await Promise.all([getPlatformPlans(), getSchoolsDomain()]);
  return <CreateSchoolForm plans={plans} domain={domain} />;
}

function FormSkeleton() {
  return (
    <div className="space-y-6">
      <LoadingLabel>Chargement du formulaire…</LoadingLabel>
      <Skeleton className="h-[30rem] rounded-3xl" />
      <Skeleton className="h-80 rounded-3xl" />
      <Skeleton className="ml-auto h-12 w-56 rounded-xl" />
    </div>
  );
}

export default function NewSchoolPage() {
  return (
    <div className="mx-auto max-w-3xl">
      <ButtonLink href="/admin" variant="ghost" className="-ml-3 mb-2" icon={<ArrowLeft className="size-4" aria-hidden />}>
        Auto-écoles
      </ButtonLink>
      <PageHeader
        eyebrow="Plateforme"
        title="Nouvelle auto-école"
        description="Une seule étape : l'espace est créé avec les réglages par défaut et le compte du gérant."
      />
      <Suspense fallback={<FormSkeleton />}>
        <FormContent />
      </Suspense>
    </div>
  );
}
