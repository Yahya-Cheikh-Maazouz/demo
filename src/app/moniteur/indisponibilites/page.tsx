import type { Metadata } from "next";
import { Suspense } from "react";
import { PageHeader } from "@/components/ui/page-header";
import { InstructorFeedbackProvider, InstructorFeedbackRegion } from "@/features/moniteur/feedback";
import {
  LeaveFormCard,
  LeaveFormSection,
  LeaveFormSkeleton,
  LeavesList,
  LeavesListSkeleton,
} from "@/features/moniteur/leaves-section";
import { PlanningAccess } from "@/features/moniteur/planning-access";

export const metadata: Metadata = {
  title: "Indisponibilités",
};

/** Leaves of the instructor: declare one (refused over planned lessons), delete the ones declared here. */
export default function InstructorLeavesPage() {
  return (
    <>
      <PageHeader
        eyebrow="Indisponibilités"
        title="Mes indisponibilités"
        description="Congés, maladie, formation : les élèves ne peuvent plus demander ces créneaux."
      />
      <div className="space-y-8">
        <LeaveFormCard>
          <Suspense fallback={<LeaveFormSkeleton />}>
            <PlanningAccess>
              <LeaveFormSection />
            </PlanningAccess>
          </Suspense>
        </LeaveFormCard>

        <section aria-labelledby="indispos-a-venir">
          <h2 id="indispos-a-venir" className="mb-3 text-lg font-extrabold tracking-[-0.02em] text-ink">
            À venir
          </h2>
          <InstructorFeedbackProvider>
            <InstructorFeedbackRegion />
            <Suspense fallback={<LeavesListSkeleton />}>
              <PlanningAccess denied={null}>
                <LeavesList />
              </PlanningAccess>
            </Suspense>
          </InstructorFeedbackProvider>
        </section>
      </div>
    </>
  );
}
