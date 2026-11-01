import { Mail, Phone, type LucideIcon } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { CardBody } from "@/components/ui/card";
import { LoadingLabel, Skeleton } from "@/components/ui/skeleton";
import { initials } from "@/lib/format";
import { getPageProfile } from "./data";

function ContactLink({ href, icon: Icon, label, value }: { href: string; icon: LucideIcon; label: string; value: string }) {
  return (
    <a
      href={href}
      className="-mx-2 flex min-h-12 items-center gap-3 rounded-xl px-2 py-1.5 transition-colors hover:bg-subtle"
    >
      <Icon className="size-4 shrink-0 text-ink-subtle" aria-hidden />
      <span className="sr-only">{label} : </span>
      <span className="min-w-0 text-sm font-semibold wrap-anywhere text-brand tabular-nums">{value}</span>
    </a>
  );
}

/** Legal guardian of a minor student. Render inside a <Card> and <Suspense>. */
export async function LegalGuardian() {
  const profile = await getPageProfile();
  const guardian = profile.legalGuardian;

  if (!guardian) {
    return (
      <CardBody>
        <p className="text-sm text-ink-muted">
          {profile.isMinor
            ? "Aucun représentant légal n'est enregistré. Votre auto-école doit le renseigner."
            : "Non concerné · élève majeur"}
        </p>
      </CardBody>
    );
  }

  return (
    <CardBody className="space-y-2">
      <p className="font-semibold text-ink">{guardian.name}</p>
      <div>
        <ContactLink href={`tel:${guardian.phone.replace(/[^\d+]/g, "")}`} icon={Phone} label="Téléphone" value={guardian.phone} />
        <ContactLink href={`mailto:${guardian.email}`} icon={Mail} label="E-mail" value={guardian.email} />
      </div>
    </CardBody>
  );
}

export function LegalGuardianSkeleton() {
  return (
    <CardBody>
      <LoadingLabel>Chargement du représentant légal…</LoadingLabel>
      <Skeleton className="h-5 w-48" />
    </CardBody>
  );
}

/** The student's referent instructor. Render inside a <Card> and <Suspense>. */
export async function ReferentInstructor() {
  const { referentInstructor: instructor } = await getPageProfile();
  return (
    <CardBody className="flex items-center gap-3">
      <Avatar initials={initials(instructor.firstName, instructor.lastName)} />
      <div className="min-w-0">
        <p className="font-semibold wrap-anywhere text-ink">
          {instructor.firstName} {instructor.lastName}
        </p>
        <p className="text-sm text-ink-muted">Référent·e pédagogique</p>
      </div>
    </CardBody>
  );
}

export function ReferentInstructorSkeleton() {
  return (
    <CardBody className="flex items-center gap-3">
      <LoadingLabel>Chargement de votre moniteur·rice référent·e…</LoadingLabel>
      <Skeleton className="size-10 rounded-full" />
      <div className="space-y-1.5">
        <Skeleton className="h-5 w-32" />
        <Skeleton className="h-4 w-36" />
      </div>
    </CardBody>
  );
}
