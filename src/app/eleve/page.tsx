import type { Metadata } from "next";
import { Suspense } from "react";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { Skeleton } from "@/components/ui/skeleton";
import { StudentFirstName, StudentFirstNameSkeleton } from "@/features/accueil/greeting";
import {
  BannerSkeleton,
  CreditCard,
  DossierBanner,
  FreeSlotBanner,
  HalfCardSkeleton,
  LicenceEyebrow,
  NewsCard,
  NextLessonHero,
  NextLessonHeroSkeleton,
  ParcoursCard,
  ProgressCard,
  Shortcuts,
  ShortcutsSkeleton,
  SummaryCardSkeleton,
} from "@/features/accueil/home-blocks";
import { HomeSection } from "@/features/accueil/home-section";
import { InstallmentCardBody, InstallmentCardSkeleton } from "@/features/accueil/installment-card";
import { SchoolCardBody, SchoolCardSkeleton } from "@/features/accueil/school-card";

export const metadata: Metadata = {
  title: "Accueil",
};

/**
 * Student home (after the client's reference prototype): the next lesson first, then progress and
 * credit, shortcuts to every section, a free slot, the progress path and the news, the file.
 * Every data block streams in its own Suspense boundary.
 */
export default function StudentHomePage() {
  return (
    <>
      <PageHeader
        eyebrow={
          <Suspense fallback={<Skeleton inline className="h-[0.8em] w-32 rounded-md" />}>
            <LicenceEyebrow />
          </Suspense>
        }
        title={
          <>
            Bonjour{" "}
            <Suspense fallback={<StudentFirstNameSkeleton />}>
              <StudentFirstName />
            </Suspense>{" "}
            <span aria-hidden>👋</span>
          </>
        }
        description="Prêt(e) pour la prochaine étape ?"
      />

      <div className="space-y-6">
        <section aria-label="Prochaine leçon">
          <Suspense fallback={<NextLessonHeroSkeleton />}>
            <NextLessonHero />
          </Suspense>
        </section>

        <div className="grid gap-4 sm:grid-cols-2">
          <Suspense fallback={<SummaryCardSkeleton />}>
            <ProgressCard />
          </Suspense>
          <Suspense fallback={<SummaryCardSkeleton />}>
            <CreditCard />
          </Suspense>
        </div>

        <Card className="p-5 sm:p-6">
          <h2 className="font-bold text-ink">Mes raccourcis</h2>
          <p className="mb-4 text-sm text-ink-muted">Tout mon espace en un coup d&apos;œil.</p>
          <Suspense fallback={<ShortcutsSkeleton />}>
            <Shortcuts />
          </Suspense>
        </Card>

        <Suspense fallback={<BannerSkeleton />}>
          <FreeSlotBanner />
        </Suspense>

        <div className="grid gap-6 lg:grid-cols-2">
          <Suspense fallback={<HalfCardSkeleton />}>
            <ParcoursCard />
          </Suspense>
          <Suspense fallback={<HalfCardSkeleton />}>
            <NewsCard />
          </Suspense>
        </div>

        <Suspense fallback={<BannerSkeleton />}>
          <DossierBanner />
        </Suspense>

        <div className="grid gap-6 sm:grid-cols-2">
          <HomeSection id="accueil-echeance" title="Prochaine échéance" className="flex min-w-0 flex-col">
            <Card className="flex-1">
              <Suspense fallback={<InstallmentCardSkeleton />}>
                <InstallmentCardBody />
              </Suspense>
            </Card>
          </HomeSection>
          <HomeSection id="accueil-auto-ecole" title="Votre auto-école" className="flex min-w-0 flex-col">
            <Card className="flex-1">
              <Suspense fallback={<SchoolCardSkeleton />}>
                <SchoolCardBody />
              </Suspense>
            </Card>
          </HomeSection>
        </div>
      </div>
    </>
  );
}
