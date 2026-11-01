import type { Metadata } from "next";
import { CalendarClock, ContactRound, IdCard, Lock, ShieldCheck, UserRoundCheck, UsersRound } from "lucide-react";
import { Suspense } from "react";
import { Card, CardHeader } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { Availabilities, AvailabilitiesSkeleton } from "@/features/profil/availabilities";
import { ContactSection, ContactSectionSkeleton } from "@/features/profil/contact-section";
import { IdentityDetails, IdentityDetailsSkeleton } from "@/features/profil/identity-details";
import { IdentityHeader, IdentityHeaderSkeleton } from "@/features/profil/identity-header";
import {
  LegalGuardian,
  LegalGuardianSkeleton,
  ReferentInstructor,
  ReferentInstructorSkeleton,
} from "@/features/profil/people";
import { PrivacySettings } from "@/features/profil/privacy";
import { SchoolContactNote } from "@/features/profil/school-contact-note";
import { SecuritySettings } from "@/features/profil/security";
import { SignOutSection } from "@/features/profil/sign-out";

export const metadata: Metadata = {
  title: "Mon profil",
};

const icon = "size-5";

/**
 * Student profile. Each card streams in its own Suspense boundary.
 * Up to `xl`: one column (identity, contact details, legal guardian, then the side cards, sign-out
 * at the bottom). The sidebar takes 17rem from `lg`, so at 1024px a 2/1 split would leave the side
 * column ~200px wide. From `xl`: main column for identity, contact form and legal guardian; a 20rem
 * side column for the referent, availabilities, security and personal data.
 */
export default function ProfilePage() {
  return (
    <>
      <PageHeader title="Mon profil" description="Vos informations, vos coordonnées et vos données personnelles." />

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_20rem] xl:items-start">
        <div className="flex min-w-0 flex-col gap-6">
          <Card>
            <Suspense fallback={<IdentityHeaderSkeleton />}>
              <IdentityHeader />
            </Suspense>
          </Card>

          <Card>
            <CardHeader
              title="Identité et inscription"
              description="Renseignées par votre auto-école."
              icon={<IdCard className={icon} aria-hidden />}
            />
            <Suspense fallback={<IdentityDetailsSkeleton />}>
              <IdentityDetails />
            </Suspense>
            <SchoolContactNote lead="Pour corriger ces informations," />
          </Card>

          <Card>
            <CardHeader
              title="Coordonnées"
              description="Votre auto-école les utilise pour vous joindre et vous envoyer vos factures."
              icon={<ContactRound className={icon} aria-hidden />}
            />
            <Suspense fallback={<ContactSectionSkeleton />}>
              <ContactSection />
            </Suspense>
          </Card>

          <Card>
            <CardHeader title="Représentant légal" icon={<UsersRound className={icon} aria-hidden />} />
            <Suspense fallback={<LegalGuardianSkeleton />}>
              <LegalGuardian />
            </Suspense>
          </Card>
        </div>

        <div className="flex min-w-0 flex-col gap-6">
          <Card>
            <CardHeader title="Moniteur·rice référent·e" icon={<UserRoundCheck className={icon} aria-hidden />} />
            <Suspense fallback={<ReferentInstructorSkeleton />}>
              <ReferentInstructor />
            </Suspense>
          </Card>

          <Card>
            <CardHeader
              title="Mes disponibilités"
              icon={<CalendarClock className={icon} aria-hidden />}
            />
            <Suspense fallback={<AvailabilitiesSkeleton />}>
              <Availabilities />
            </Suspense>
            <SchoolContactNote lead="Pour les modifier," />
          </Card>

          <Card>
            <CardHeader title="Sécurité" icon={<Lock className={icon} aria-hidden />} />
            <SecuritySettings />
          </Card>

          <Card>
            <CardHeader
              title="Mes données personnelles"
              description="Vos droits RGPD."
              icon={<ShieldCheck className={icon} aria-hidden />}
            />
            <PrivacySettings />
          </Card>
        </div>
      </div>

      <SignOutSection />
    </>
  );
}
