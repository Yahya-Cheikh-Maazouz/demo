import type { Metadata } from "next";
import { Suspense } from "react";
import { ChevronLeft } from "lucide-react";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { BookingBalance, BookingBalanceSkeleton } from "@/features/planning/booking-balance";
import { BookingRulesBody, BookingRulesHeader, BookingRulesSkeleton } from "@/features/planning/booking-rules-card";
import { SlotPickerSection, SlotPickerSkeleton } from "@/features/planning/slot-picker-section";

export const metadata: Metadata = {
  title: "Réserver une leçon",
};

/**
 * Booking: balance first (it decides whether the booking is confirmed or waits for payment),
 * then instructor, day and slot. Wide screens: picker on 2/3, booking rules on the side.
 */
export default function BookLessonPage() {
  return (
    <>
      <Link
        href="/eleve/planning"
        className="-mt-2 mb-2 -ml-2 inline-flex h-11 items-center gap-1 rounded-lg px-2 text-sm font-semibold text-ink-muted transition-colors hover:bg-subtle hover:text-ink lg:-mt-4"
      >
        <ChevronLeft className="size-4" aria-hidden />
        Mon planning
      </Link>
      <PageHeader
        title="Réserver une leçon"
        description="Choisissez un jour, puis un créneau libre."
      />

      <Suspense fallback={<BookingBalanceSkeleton />}>
        <BookingBalance />
      </Suspense>

      {/* 2/1 split from `xl` only: at `lg` the 7-column day grid would be too narrow next to the sidebar. */}
      <div className="mt-6 grid gap-6 lg:mt-8 xl:grid-cols-3 xl:gap-8">
        <div className="min-w-0 xl:col-span-2">
          <Suspense fallback={<SlotPickerSkeleton />}>
            <SlotPickerSection />
          </Suspense>
        </div>
        <div className="min-w-0">
          <Card className="xl:sticky xl:top-8">
            <BookingRulesHeader />
            <Suspense fallback={<BookingRulesSkeleton />}>
              <BookingRulesBody />
            </Suspense>
          </Card>
        </div>
      </div>
    </>
  );
}
