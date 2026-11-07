import type { Metadata } from "next";
import { Suspense } from "react";
import { PageHeader } from "@/components/ui/page-header";
import { HoursSummary, HoursSummarySkeleton } from "@/features/moniteur/hours-summary";

export const metadata: Metadata = {
  title: "Mes heures",
};

/** Hours given this week and this month (lessons signed), and what is left this week. */
export default function InstructorHoursPage() {
  return (
    <>
      <PageHeader eyebrow="Mes heures" title="Mon activité" description="Vos heures de leçons effectuées et celles qui restent cette semaine." />
      <Suspense fallback={<HoursSummarySkeleton />}>
        <HoursSummary />
      </Suspense>
    </>
  );
}
