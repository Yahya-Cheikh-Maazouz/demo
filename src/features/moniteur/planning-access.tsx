import type { ReactNode } from "react";
import { ShieldAlert } from "lucide-react";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { INSTRUCTOR_PERMISSION, getInstructorUser } from "@/lib/api/moniteur";
import { can } from "@/lib/permissions";

/** Shown instead of the data when the gérant closed "planning.voir" for this instructor. */
export function InstructorAccessDenied() {
  return (
    <Card>
      <EmptyState
        icon={ShieldAlert}
        title="Accès à votre planning fermé"
        description="Votre compte n'a plus accès à votre planning. Voyez avec l'accueil ou le gérant pour le rouvrir."
      />
    </Card>
  );
}

/**
 * Renders `children` when the instructor has the right to see their planning (tested on the
 * permission, never on the role), otherwise the access notice, or `denied` (null for a secondary
 * section of a page that already shows it). The API refuses the data anyway. Render inside <Suspense>.
 */
export async function PlanningAccess({ children, denied }: { children: ReactNode; denied?: ReactNode }) {
  const user = await getInstructorUser();
  if (can(user, INSTRUCTOR_PERMISSION)) return children;
  return denied === undefined ? <InstructorAccessDenied /> : denied;
}
