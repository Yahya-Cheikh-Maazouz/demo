import type { ReactNode } from "react";
import { CardBody } from "@/components/ui/card";
import { LoadingLabel, Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/cn";
import { ageAt, formatDate } from "@/lib/format";
import { getPageNow, getPageProfile } from "./data";
import { NephValue } from "./neph-value";

function Item({ label, children, className }: { label: string; children: ReactNode; className?: string }) {
  return (
    <div className={cn("min-w-0", className)}>
      <dt className="text-sm text-ink-muted">{label}</dt>
      <dd className="mt-0.5 font-semibold wrap-anywhere text-ink">{children}</dd>
    </div>
  );
}

function Missing() {
  return <span className="font-normal text-ink-subtle italic">À renseigner</span>;
}

const GRID = "grid grid-cols-2 gap-x-4 gap-y-5 sm:grid-cols-3 sm:gap-x-6";

/** Read-only identity and enrolment data, set by the school. Render inside a <Card> and <Suspense>. */
export async function IdentityDetails() {
  const [profile, now] = await Promise.all([getPageProfile(), getPageNow()]);
  const age = ageAt(profile.birthDate, now);

  return (
    <CardBody>
      <dl className={GRID}>
        <Item label="Numéro NEPH" className="col-span-2 sm:col-span-3">
          <NephValue neph={profile.neph} />
        </Item>
        <Item label="Date de naissance">
          <span className="tabular-nums">{formatDate(profile.birthDate)}</span>
          <span className="block text-sm font-normal text-ink-muted tabular-nums">{age} ans</span>
        </Item>
        <Item label="Lieu de naissance">{profile.birthPlace ?? <Missing />}</Item>
        <Item label="Genre">{profile.gender}</Item>
        <Item label="Permis">{profile.licence}</Item>
        <Item label="Formation accélérée">{profile.accelerated ? "Oui" : "Non"}</Item>
        <Item label="Bureau">{profile.office}</Item>
        <Item label="Type d'élève">{profile.studentType}</Item>
        <Item label="Financeur">{profile.financer}</Item>
      </dl>
    </CardBody>
  );
}

export function IdentityDetailsSkeleton() {
  return (
    <CardBody>
      <LoadingLabel>Chargement de vos informations…</LoadingLabel>
      <div className={GRID}>
        <div className="col-span-2 space-y-1.5 sm:col-span-3">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-7 w-52" />
        </div>
        {Array.from({ length: 8 }, (_, i) => (
          <div key={i} className="space-y-1.5">
            <Skeleton className="h-4 w-20" />
            <Skeleton className={i === 0 ? "h-10 w-28" : "h-5 w-24"} />
          </div>
        ))}
      </div>
    </CardBody>
  );
}
