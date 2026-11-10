import { CalendarX2 } from "lucide-react";
import { ButtonLink } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";

/**
 * A lesson that does not exist or belongs to another instructor. The lesson is looked up inside
 * the streamed page (cacheComponents: its data waits in <Suspense>), so the status stays 200:
 * the page is noindex and says it plainly.
 */
export default function InstructorNotFound() {
  return (
    <>
      <PageHeader eyebrow="Ma journée" title="Leçon introuvable" />
      <Card>
        <EmptyState
          icon={CalendarX2}
          title="Cette leçon n'est pas dans votre planning"
          description="Elle n'existe pas, ou elle est donnée par un autre moniteur."
          action={
            <ButtonLink href="/moniteur" size="lg">
              Revenir à ma journée
            </ButtonLink>
          }
        />
      </Card>
    </>
  );
}
