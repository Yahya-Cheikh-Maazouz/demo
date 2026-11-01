import type { Metadata } from "next";
import { Suspense } from "react";
import { CalendarPlus } from "lucide-react";
import { ButtonLink } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { BookingConfirmation } from "@/features/planning/booking-confirmation";
import { BookingRulesBody, BookingRulesHeader, BookingRulesSkeleton } from "@/features/planning/booking-rules-card";
import { CalendarFeedBody, CalendarFeedHeader, CalendarFeedSkeleton } from "@/features/planning/calendar-feed";
import { LessonsPanel, LessonsPanelSkeleton } from "@/features/planning/lesson-list";
import { PlanningFeedbackProvider, PlanningFeedbackRegion } from "@/features/planning/planning-feedback";

export const metadata: Metadata = {
  title: "Mon planning",
};

type SearchParams = PageProps<"/eleve/planning">["searchParams"];

/** Confirmation banner after a booking (?reservee=1, &attente=1 when it waits for payment). */
async function BookingConfirmationSection({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  if (params.reservee !== "1") return null;
  return (
    <BookingConfirmation
      pendingPayment={params.attente === "1"}
      dismissHref={params.vue === "historique" ? "/eleve/planning?vue=historique" : "/eleve/planning"}
    />
  );
}

/**
 * Student planning: upcoming lessons grouped by day (with cancellation) or the history.
 * Wide screens: lessons on 2/3, booking rules and calendar subscription on the side.
 */
export default function StudentPlanningPage({ searchParams }: PageProps<"/eleve/planning">) {
  return (
    <>
      <PageHeader
        title="Mon planning"
        description="Vos leçons à venir et passées."
        actions={
          <ButtonLink href="/eleve/planning/reserver" size="lg" icon={<CalendarPlus className="size-5" aria-hidden />}>
            Réserver une leçon
          </ButtonLink>
        }
      />

      <Suspense fallback={null}>
        <BookingConfirmationSection searchParams={searchParams} />
      </Suspense>

      <PlanningFeedbackProvider>
        {/* 2/1 split from `xl` only: next to the sidebar, a third of the content is too narrow at `lg`. */}
        <div className="grid gap-6 xl:grid-cols-3 xl:gap-8">
          <section aria-label="Mes leçons" className="min-w-0 xl:col-span-2">
            <PlanningFeedbackRegion />
            <Suspense fallback={<LessonsPanelSkeleton />}>
              <LessonsPanel searchParams={searchParams} />
            </Suspense>
          </section>

          <div className="grid min-w-0 content-start gap-6 md:grid-cols-2 md:items-start xl:grid-cols-1">
            <Card>
              <BookingRulesHeader />
              <Suspense fallback={<BookingRulesSkeleton />}>
                <BookingRulesBody />
              </Suspense>
            </Card>
            <Card>
              <CalendarFeedHeader />
              <Suspense fallback={<CalendarFeedSkeleton />}>
                <CalendarFeedBody />
              </Suspense>
            </Card>
          </div>
        </div>
      </PlanningFeedbackProvider>
    </>
  );
}
