import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, MessageSquare } from "lucide-react";
import { Suspense } from "react";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { AvailabilitySection, AvailabilitySectionSkeleton } from "@/features/disponibilites/availability-section";
import { NextLessonReminder, NextLessonReminderSkeleton } from "@/features/disponibilites/next-lesson-reminder";

export const metadata: Metadata = {
  title: "Mes disponibilités",
};

/**
 * Weekly availabilities, after the client's prototype: next lesson reminder, then the grid of
 * preferred periods. Students who would rather not fill it in can ask the agency by message.
 * One column, 56rem wide at most so the grid keeps compact cells on large screens.
 */
export default function AvailabilitiesPage() {
  return (
    <div className="max-w-4xl">
      <PageHeader
        eyebrow="Mes informations"
        title="Mes disponibilités"
        description="Indiquez les moments où vous préférez planifier vos leçons de conduite."
      />

      <div className="flex flex-col gap-5 sm:gap-6">
        <Suspense fallback={<NextLessonReminderSkeleton />}>
          <NextLessonReminder />
        </Suspense>

        <Card>
          <Suspense fallback={<AvailabilitySectionSkeleton />}>
            <AvailabilitySection />
          </Suspense>
        </Card>

        <div className="flex flex-col gap-3 rounded-3xl border border-line/80 bg-surface/70 p-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
          <p className="flex items-start gap-3 text-sm text-ink-muted">
            <MessageSquare className="mt-0.5 size-4 shrink-0 text-brand" aria-hidden />
            <span>
              <span className="block font-semibold text-ink">Vous préférez que l&apos;auto-école s&apos;en charge ?</span>
              Envoyez-nous vos disponibilités par message, nous les saisirons pour vous.
            </span>
          </p>
          <Link
            href="/eleve/messagerie"
            className="inline-flex h-11 shrink-0 items-center gap-1.5 self-start rounded-lg px-2 text-sm font-semibold text-brand transition-colors hover:bg-brand-soft sm:self-auto"
          >
            Écrivez-nous
            <ArrowRight className="size-4" aria-hidden />
          </Link>
        </div>
      </div>
    </div>
  );
}
