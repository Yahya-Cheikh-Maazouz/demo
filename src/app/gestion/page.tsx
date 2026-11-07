import { Suspense } from "react";
import { redirect } from "next/navigation";
import { AccessDenied } from "@/components/gestion/access-denied";
import { staffSections } from "@/components/gestion/staff-shell";
import type { StaffSection } from "@/components/gestion/staff-nav";
import { getStaffUser } from "@/lib/api/gestion";
import { getSubscriptionStatus } from "@/lib/api/subscription-status";

const SECTION_PATHS: Record<StaffSection, string> = {
  planning: "/gestion/planning",
  eleves: "/gestion/eleves",
  caisse: "/gestion/caisse",
  reglages: "/gestion/reglages",
  abonnement: "/gestion/abonnement",
};

/** "/gestion" opens the first section the person may see (the planning for most people). */
async function OpenFirstSection() {
  const [user, status] = await Promise.all([getStaffUser(), getSubscriptionStatus()]);
  // Suspended school: straight to the subscription page.
  const [first] = staffSections(user, status);
  if (!first) return <AccessDenied what="à l'espace gestion" />;
  redirect(SECTION_PATHS[first]);
}

export default function GestionPage() {
  return (
    <Suspense fallback={null}>
      <OpenFirstSection />
    </Suspense>
  );
}
