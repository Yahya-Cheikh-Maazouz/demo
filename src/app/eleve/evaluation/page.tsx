import type { Metadata } from "next";
import { Suspense } from "react";
import { PageHeader } from "@/components/ui/page-header";
import { NextLessonReminder, NextLessonReminderSkeleton } from "@/features/disponibilites/next-lesson-reminder";
import { EvaluationSection, EvaluationSectionSkeleton } from "@/features/evaluation/evaluation-section";

export const metadata: Metadata = {
  title: "Évaluation de départ",
};

/**
 * Starting evaluation: the questionnaire set by the auto-école, answered online before the first
 * lessons (one attempt), then the score and the corrections.
 */
export default function EvaluationPage() {
  return (
    <div className="max-w-4xl">
      <PageHeader
        eyebrow="Évaluation de départ"
        title="Évaluation de départ"
        description="Répondez aux questions pour faire un premier point sur vos connaissances."
      />

      <div className="flex flex-col gap-6">
        <Suspense fallback={<NextLessonReminderSkeleton />}>
          <NextLessonReminder />
        </Suspense>

        <Suspense fallback={<EvaluationSectionSkeleton />}>
          <EvaluationSection />
        </Suspense>
      </div>
    </div>
  );
}
