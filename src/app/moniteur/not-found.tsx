import { CalendarX2 } from "lucide-react";
import { ButtonLink } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";

/** A lesson that does not exist or belongs to another instructor. */
export default function InstructorNotFound() {
  return (
    <Card>
      <EmptyState
        icon={CalendarX2}
        title="Leçon introuvable"
        description="Cette leçon n'existe pas ou n'est pas dans votre planning."
        action={
          <ButtonLink href="/moniteur" size="lg">
            Revenir à ma journée
          </ButtonLink>
        }
      />
    </Card>
  );
}
