import type { Metadata } from "next";
import { Suspense } from "react";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { Skeleton } from "@/components/ui/skeleton";
import { BookingConfirmation } from "@/features/planning/booking-confirmation";
import { CalendarFeedBody, CalendarFeedHeader, CalendarFeedSkeleton } from "@/features/planning/calendar-feed";
import {
  Appointments,
  AppointmentsSkeleton,
  BookingCard,
  BookingCardSkeleton,
  HowItWorks,
  HowItWorksSkeleton,
  parsePlanningQuery,
  PlanningStats,
  PlanningStatsSkeleton,
  SecretariatPill,
} from "@/features/planning/planning-sections";
import { PlanningFeedbackProvider, PlanningFeedbackRegion } from "@/features/planning/planning-feedback";
import { getLessons } from "@/lib/api/eleve";
import { formatDateLong, formatTime } from "@/lib/format";

export const metadata: Metadata = {
  title: "Mon planning",
};

type SearchParams = PageProps<"/eleve/planning">["searchParams"];

/** Banner after a request (?demande=<lesson id>), naming the instructor and the slot. */
async function RequestConfirmation({ searchParams }: { searchParams: SearchParams }) {
  const query = parsePlanningQuery(await searchParams);
  if (!query.requestId) return null;
  const { upcoming } = await getLessons();
  const lesson = upcoming.find((l) => l.id === query.requestId && l.status === "a_confirmer");
  if (!lesson) return null;
  const params = new URLSearchParams({ type: query.type });
  if (query.week) params.set("semaine", query.week);
  return (
    <BookingConfirmation
      summary={`à ${lesson.instructor.firstName} ${lesson.instructor.lastName} pour le ${formatDateLong(lesson.start).toLowerCase()} à ${formatTime(lesson.start)}`}
      pendingPayment={false}
      dismissHref={`/eleve/planning?${params.toString()}`}
    />
  );
}

async function Stats({ searchParams }: { searchParams: SearchParams }) {
  return <PlanningStats query={parsePlanningQuery(await searchParams)} />;
}

async function Booking({ searchParams }: { searchParams: SearchParams }) {
  return <BookingCard query={parsePlanningQuery(await searchParams)} />;
}

async function MyAppointments({ searchParams }: { searchParams: SearchParams }) {
  return <Appointments query={parsePlanningQuery(await searchParams)} />;
}

/**
 * Student planning (after the client's reference prototype): credit and quota, the referent's
 * week to send a request, how it works, then every appointment with its status.
 */
export default function StudentPlanningPage({ searchParams }: PageProps<"/eleve/planning">) {
  return (
    <>
      <PageHeader
        eyebrow="Mon planning"
        title="Votre prochaine leçon commence ici."
        description="Choisissez votre créneau, puis suivez la confirmation de votre moniteur."
        actions={
          <Suspense fallback={<Skeleton className="h-15 w-52 rounded-2xl" />}>
            <SecretariatPill />
          </Suspense>
        }
      />

      <Suspense fallback={null}>
        <RequestConfirmation searchParams={searchParams} />
      </Suspense>

      <div className="space-y-6">
        <Suspense fallback={<PlanningStatsSkeleton />}>
          <Stats searchParams={searchParams} />
        </Suspense>

        {/* 2/1 split from `xl` only: next to the sidebar, the 6-day grid needs the width at `lg`. */}
        <div className="grid gap-6 xl:grid-cols-3">
          <div className="min-w-0 xl:col-span-2">
            <Suspense fallback={<BookingCardSkeleton />}>
              <Booking searchParams={searchParams} />
            </Suspense>
          </div>
          <div className="min-w-0 space-y-6">
            <Suspense fallback={<HowItWorksSkeleton />}>
              <HowItWorks />
            </Suspense>
            <Card>
              <CalendarFeedHeader />
              <Suspense fallback={<CalendarFeedSkeleton />}>
                <CalendarFeedBody />
              </Suspense>
            </Card>
          </div>
        </div>

        <PlanningFeedbackProvider>
          <PlanningFeedbackRegion />
          <Suspense fallback={<AppointmentsSkeleton />}>
            <MyAppointments searchParams={searchParams} />
          </Suspense>
        </PlanningFeedbackProvider>
      </div>
    </>
  );
}
