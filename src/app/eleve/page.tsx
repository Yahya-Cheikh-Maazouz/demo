import type { Metadata } from "next";
import { Suspense } from "react";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { BalanceCardBody, BalanceCardSkeleton } from "@/features/accueil/balance-card";
import { DossierCardBody, DossierCardSkeleton } from "@/features/accueil/dossier-card";
import { StudentFirstName, StudentFirstNameSkeleton } from "@/features/accueil/greeting";
import { HomeSection, TextLink } from "@/features/accueil/home-section";
import { InstallmentCardBody, InstallmentCardSkeleton } from "@/features/accueil/installment-card";
import {
  NextLesson,
  NextLessonSkeleton,
  UpcomingLessons,
  UpcomingLessonsSkeleton,
} from "@/features/accueil/lesson-sections";
import { QuickActions } from "@/features/accueil/quick-actions";
import { SchoolCardBody, SchoolCardSkeleton } from "@/features/accueil/school-card";

export const metadata: Metadata = {
  title: "Accueil",
};

/**
 * Student home: "where am I". Every data section streams in its own Suspense boundary.
 * Mobile and tablet: one column in priority order (next lesson, quick actions, balance, then the
 * rest); from `sm`, the two small cards at the end sit side by side.
 * From `xl` (not `lg`: next to the 272px sidebar, a 1/3 column would be ~200px wide at 1024px):
 * two rows of a 2/3 + 1/3 grid; the balance card stretches to the height of the next lesson +
 * quick actions block, so both columns end on the same line.
 */
export default function StudentHomePage() {
  return (
    <>
      <PageHeader
        title={
          <>
            Bonjour{" "}
            <Suspense fallback={<StudentFirstNameSkeleton />}>
              <StudentFirstName />
            </Suspense>
          </>
        }
        description="Voici où vous en êtes dans votre formation."
      />

      <div className="grid gap-6 xl:grid-cols-3">
        <div className="flex min-w-0 flex-col gap-6 xl:col-span-2">
          <HomeSection id="accueil-prochaine-lecon" title="Prochaine leçon">
            <Suspense fallback={<NextLessonSkeleton />}>
              <NextLesson />
            </Suspense>
          </HomeSection>

          <HomeSection id="accueil-actions" title="Actions rapides">
            <QuickActions />
          </HomeSection>
        </div>

        <HomeSection id="accueil-solde" title="Mon solde d'heures" className="flex min-w-0 flex-col">
          <Card className="flex flex-1 flex-col">
            <Suspense fallback={<BalanceCardSkeleton />}>
              <BalanceCardBody />
            </Suspense>
          </Card>
        </HomeSection>

        <div className="flex min-w-0 flex-col gap-6 xl:col-span-2">
          <HomeSection
            id="accueil-a-venir"
            title="À venir"
            action={
              <TextLink href="/eleve/planning" srLabel="dans mon planning" className="-mr-2">
                Tout voir
              </TextLink>
            }
          >
            <Suspense fallback={<UpcomingLessonsSkeleton />}>
              <UpcomingLessons />
            </Suspense>
          </HomeSection>

          <HomeSection id="accueil-dossier" title="Mon dossier">
            <Card>
              <Suspense fallback={<DossierCardSkeleton />}>
                <DossierCardBody />
              </Suspense>
            </Card>
          </HomeSection>
        </div>

        <div className="grid min-w-0 gap-6 sm:grid-cols-2 xl:flex xl:flex-col">
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
