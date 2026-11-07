import type { Metadata } from "next";
import { Suspense } from "react";
import { DayView, DayViewSkeleton, parseDayParam } from "@/features/moniteur/day-view";

export const metadata: Metadata = {
  title: "Ma journée",
};

async function Day({ searchParams }: { searchParams: PageProps<"/moniteur">["searchParams"] }) {
  return <DayView date={parseDayParam(await searchParams)} />;
}

/** "Ma journée" (?date=YYYY-MM-DD): the instructor's lessons of the day, in big cards. */
export default function InstructorDayPage({ searchParams }: PageProps<"/moniteur">) {
  return (
    <Suspense fallback={<DayViewSkeleton />}>
      <Day searchParams={searchParams} />
    </Suspense>
  );
}
