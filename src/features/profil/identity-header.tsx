import { Building2, CalendarCheck, CarFront, CircleCheck, type LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { CardBody } from "@/components/ui/card";
import { LoadingLabel, Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/cn";
import { formatDate, initials } from "@/lib/format";
import { getPageProfile } from "./data";
import { byGender } from "./wording";

function Meta({ icon: Icon, label, children }: { icon: LucideIcon; label: string; children: ReactNode }) {
  return (
    <li className="flex min-w-0 items-center gap-2">
      <Icon className="size-4 shrink-0 text-ink-subtle" aria-hidden />
      <span className="sr-only">{label} : </span>
      <span className="min-w-0">{children}</span>
    </li>
  );
}

// Side by side only when the card itself is wide enough (container query, not the viewport): the
// card's width depends on the page grid, and the name must never be squeezed by the meta list.
const LAYOUT = "flex flex-col gap-5 @xl:flex-row @xl:items-center @xl:gap-6 @xl:py-6";
const META_LIST = "grid gap-2 border-t border-line pt-4 @xl:shrink-0 @xl:border-t-0 @xl:border-l @xl:pt-0 @xl:pl-6";

/** Name, file status and enrolment summary. Render inside a <Card> and <Suspense>. */
export async function IdentityHeader() {
  const profile = await getPageProfile();
  const fullName = `${profile.firstName} ${profile.lastName}`;

  return (
    <div className="@container">
      <CardBody className={LAYOUT}>
        <div className="flex min-w-0 items-center gap-4 @xl:flex-1">
          <Avatar initials={initials(profile.firstName, profile.lastName)} size="lg" />
          <div className="min-w-0">
            <h2 className="text-xl font-bold tracking-tight break-words text-ink">{fullName}</h2>
            <Badge tone="success" icon={CircleCheck} className="mt-1.5">
              Dossier actif
            </Badge>
          </div>
        </div>

        <ul className={cn(META_LIST, "text-sm text-ink-muted")}>
          <Meta icon={CarFront} label="Permis">
            Permis {profile.licence}
          </Meta>
          <Meta icon={Building2} label="Bureau">
            {profile.office}
          </Meta>
          <Meta icon={CalendarCheck} label="Inscription">
            {byGender(profile.gender, { masculine: "Inscrit", feminine: "Inscrite", inclusive: "Inscrit·e" })} depuis
            le {formatDate(profile.enrolledAt)}
          </Meta>
        </ul>
      </CardBody>
    </div>
  );
}

export function IdentityHeaderSkeleton() {
  return (
    <div className="@container">
      <CardBody className={LAYOUT}>
        <LoadingLabel>Chargement de votre profil…</LoadingLabel>
        <div className="flex items-center gap-4 @xl:flex-1">
          <Skeleton className="size-16 rounded-full" />
          <div className="space-y-2.5">
            <Skeleton className="h-6 w-40" />
            <Skeleton className="h-6 w-28 rounded-full" />
          </div>
        </div>
        <div className={META_LIST}>
          <Skeleton className="h-5 w-44" />
          <Skeleton className="h-5 w-36" />
          <Skeleton className="h-5 w-52" />
        </div>
      </CardBody>
    </div>
  );
}
