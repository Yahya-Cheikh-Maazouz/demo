import type { Metadata } from "next";
import { Suspense } from "react";
import { LessonDetail, LessonDetailSkeleton } from "@/features/moniteur/lesson-detail";
import { PlanningAccess } from "@/features/moniteur/planning-access";

export const metadata: Metadata = {
  title: "Fiche leçon",
};

/** Fiche leçon: student contact, request, émargement, absence, livret. Own lessons only (404 otherwise). */
export default function InstructorLessonPage({ params }: PageProps<"/moniteur/lecons/[id]">) {
  return (
    <Suspense fallback={<LessonDetailSkeleton />}>
      <PlanningAccess>
        <LessonDetail id={params.then((p) => p.id)} />
      </PlanningAccess>
    </Suspense>
  );
}
