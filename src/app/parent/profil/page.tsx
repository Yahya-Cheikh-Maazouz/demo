import type { Metadata } from "next";
import { LogOut, ShieldCheck, UserRound, UsersRound } from "lucide-react";
import { Suspense } from "react";
import { Card, CardHeader } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { Skeleton } from "@/components/ui/skeleton";
import { SubmitButton } from "@/components/ui/submit-button";
import { logout } from "@/features/auth/logout";
import { ParentDataExport } from "@/features/parent/privacy";
import {
  LinkedChildren,
  LinkedChildrenSkeleton,
  ParentDeletionSection,
  ParentIdentity,
  ParentIdentitySkeleton,
  SignedInAs,
} from "@/features/parent/profile";
import { SchoolContactNote } from "@/features/profil/school-contact-note";

export const metadata: Metadata = {
  title: "Mon profil",
};

const icon = "size-5";

/** The parent's own account: identity, linked children and RGPD rights (export, deletion). */
export default function ParentProfilePage() {
  return (
    <>
      <PageHeader eyebrow="Mes informations" title="Mon profil" description="Votre compte, vos enfants rattachés et vos données personnelles." />

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_22rem] xl:items-start">
        <div className="flex min-w-0 flex-col gap-6">
          <Card>
            <CardHeader title="Vos informations" icon={<UserRound className={icon} aria-hidden />} />
            <Suspense fallback={<ParentIdentitySkeleton />}>
              <ParentIdentity />
            </Suspense>
            <SchoolContactNote lead="Pour modifier votre nom ou votre adresse e-mail," />
          </Card>

          <Card>
            <CardHeader
              title="Enfants rattachés"
              description="Les élèves dont vous êtes le représentant légal dans cette auto-école."
              icon={<UsersRound className={icon} aria-hidden />}
            />
            <Suspense fallback={<LinkedChildrenSkeleton />}>
              <LinkedChildren />
            </Suspense>
          </Card>
        </div>

        <Card className="min-w-0">
          <CardHeader
            title="Mes données personnelles"
            description="Vos droits RGPD."
            icon={<ShieldCheck className={icon} aria-hidden />}
          />
          <div className="divide-y divide-line px-5 sm:px-6">
            <div className="py-5">
              <h3 className="font-semibold text-ink">Copie de vos données</h3>
              <p className="mt-1 mb-4 text-sm text-ink-muted">Vos informations et vos décisions, envoyées par e-mail.</p>
              <ParentDataExport />
            </div>
            <div className="py-5">
              <h3 className="font-semibold text-ink">Effacement du compte</h3>
              <p className="mt-1 mb-4 text-sm text-ink-muted">
                L&apos;auto-école traite la demande. Les factures sont conservées 10&nbsp;ans, comme l&apos;exige la loi.
              </p>
              <Suspense fallback={<Skeleton className="h-11 w-full rounded-xl sm:w-72" />}>
                <ParentDeletionSection />
              </Suspense>
            </div>
          </div>
        </Card>
      </div>

      <section
        aria-labelledby="profil-session"
        className="mt-10 flex flex-col gap-4 border-t border-line pt-6 sm:flex-row sm:items-center sm:justify-between"
      >
        <div className="min-w-0">
          <h2 id="profil-session" className="sr-only">
            Session
          </h2>
          <Suspense fallback={<Skeleton className="h-5 w-64 max-w-full" />}>
            <SignedInAs />
          </Suspense>
        </div>
        <form action={logout}>
          <SubmitButton
            variant="secondary"
            size="lg"
            icon={<LogOut className="size-5" aria-hidden />}
            pendingLabel="Déconnexion…"
            className="w-full sm:w-auto"
          >
            Se déconnecter
          </SubmitButton>
        </form>
      </section>
    </>
  );
}
