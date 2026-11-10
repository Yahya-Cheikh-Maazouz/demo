import type { Metadata } from "next";
import { Suspense } from "react";
import { DayView, DayViewSkeleton, parseDayParam } from "@/features/moniteur/day-view";
import { PlanningAccess } from "@/features/moniteur/planning-access";

export const metadata: Metadata = {
  // A layout's title template only applies to its child segments, not to its own page.
  title: { absolute: "Ma journée · Espace moniteur" },
};

async function Day({ searchParams }: { searchParams: PageProps<"/moniteur">["searchParams"] }) {
  return <DayView date={parseDayParam(await searchParams)} />;
}

/** "Ma journée" (?date=YYYY-MM-DD): the instructor's lessons of the day, in big cards. */
export default function InstructorDayPage({ searchParams }: PageProps<"/moniteur">) {
  return (
    <Suspense fallback={<DayViewSkeleton />}>
      <PlanningAccess>
        <Day searchParams={searchParams} />
      </PlanningAccess>
    </Suspense>
  );
}
