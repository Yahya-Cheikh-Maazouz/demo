import { ShieldAlert } from "lucide-react";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";

/** Shown instead of a page the person has no right to open. The API refuses the data anyway. */
export function AccessDenied({ what }: { what: string }) {
  return (
    <Card>
      <EmptyState
        icon={ShieldAlert}
        title="Accès non autorisé"
        description={`Votre compte n'a pas accès ${what}. Si vous en avez besoin, demandez au gérant d'ouvrir ce droit pour vous.`}
      />
    </Card>
  );
}
