import { CardBody } from "@/components/ui/card";
import { LoadingLabel, Skeleton } from "@/components/ui/skeleton";
import { ContactForm } from "./contact-form";
import { getPageProfile } from "./data";

/** Editable contact details. Render inside a <Card> and <Suspense>. */
export async function ContactSection() {
  const profile = await getPageProfile();
  return (
    <CardBody>
      <ContactForm
        saved={{
          email: profile.email,
          phone: profile.phone,
          phoneSecondary: profile.phoneSecondary ?? "",
          line1: profile.address.line1,
          postalCode: profile.address.postalCode,
          city: profile.address.city,
        }}
      />
    </CardBody>
  );
}

function FieldSkeleton({ hint }: { hint?: boolean }) {
  return (
    <div className="space-y-1.5">
      <Skeleton className="h-5 w-24" />
      <Skeleton className="h-12 w-full rounded-xl" />
      {hint && <Skeleton className="h-4 w-3/4" />}
    </div>
  );
}

export function ContactSectionSkeleton() {
  return (
    <CardBody>
      <LoadingLabel>Chargement de vos coordonnées…</LoadingLabel>
      <div className="max-w-xl space-y-5">
        <FieldSkeleton hint />
        <div className="grid gap-5 sm:grid-cols-2">
          <FieldSkeleton hint />
          <FieldSkeleton />
        </div>
        <FieldSkeleton hint />
        <div className="grid gap-5 sm:grid-cols-[minmax(0,11rem)_minmax(0,1fr)]">
          <div className="space-y-1.5">
            <Skeleton className="h-5 w-24" />
            <Skeleton className="h-12 w-full max-w-44 rounded-xl sm:max-w-none" />
          </div>
          <FieldSkeleton />
        </div>
        <Skeleton className="h-12 w-full rounded-xl sm:w-36" />
      </div>
    </CardBody>
  );
}
