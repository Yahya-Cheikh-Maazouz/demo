import type { Metadata } from "next";
import { Suspense } from "react";
import { PageHeader } from "@/components/ui/page-header";
import { LivretOverview, LivretOverviewSkeleton } from "@/features/suivi/livret-overview";

export const metadata: Metadata = {
  title: "Suivi pédagogique",
};

/**
 * "Mon livret de compétences": overall progress, the 4 REMC competences with their next goal,
 * and the last note of the instructor. Read-only: the instructors fill it in.
 */
export default function SuiviPage() {
  return (
    <div className="max-w-5xl">
      <PageHeader
        eyebrow="Suivi pédagogique"
        title="Mon livret de compétences"
        description="Comprenez votre niveau actuel et le prochain objectif à travailler."
      />
      <Suspense fallback={<LivretOverviewSkeleton />}>
        <LivretOverview />
      </Suspense>
    </div>
  );
}
