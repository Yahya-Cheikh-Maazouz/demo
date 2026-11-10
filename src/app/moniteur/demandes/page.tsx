import type { Metadata } from "next";
import { Suspense } from "react";
import { PageHeader } from "@/components/ui/page-header";
import { InstructorFeedbackProvider, InstructorFeedbackRegion } from "@/features/moniteur/feedback";
import { PlanningAccess } from "@/features/moniteur/planning-access";
import { RequestsList, RequestsListSkeleton } from "@/features/moniteur/requests-list";

export const metadata: Metadata = {
  title: "Demandes",
};

/** Requests of the students (client feedback of 1 Nov: "le moniteur confirme"). */
export default function InstructorRequestsPage() {
  return (
    <>
      <PageHeader
        eyebrow="Demandes"
        title="Demandes à confirmer"
        description="Vos élèves demandent un créneau dans votre semaine : confirmez-le, ou refusez-le pour le libérer."
      />
      <InstructorFeedbackProvider>
        <InstructorFeedbackRegion />
        <Suspense fallback={<RequestsListSkeleton />}>
          <PlanningAccess>
            <RequestsList />
          </PlanningAccess>
        </Suspense>
      </InstructorFeedbackProvider>
    </>
  );
}
