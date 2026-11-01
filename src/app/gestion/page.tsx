import { Suspense } from "react";
import { redirect } from "next/navigation";
import { AccessDenied } from "@/components/gestion/access-denied";
import { staffSections } from "@/components/gestion/staff-shell";
import type { StaffSection } from "@/components/gestion/staff-nav";
import { getStaffUser } from "@/lib/api/gestion";

const SECTION_PATHS: Record<StaffSection, string> = {
  planning: "/gestion/planning",
  eleves: "/gestion/eleves",
  caisse: "/gestion/caisse",
  reglages: "/gestion/reglages",
};

/** "/gestion" opens the first section the person may see (the planning for most people). */
async function OpenFirstSection() {
  const user = await getStaffUser();
  const [first] = staffSections(user);
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
