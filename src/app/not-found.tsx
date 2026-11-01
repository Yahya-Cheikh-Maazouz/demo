import { Compass } from "lucide-react";
import { ButtonLink } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";

export default function NotFound() {
  return (
    <main className="flex min-h-dvh items-center justify-center px-4">
      <EmptyState
        icon={Compass}
        title="Page introuvable"
        description="Le lien est peut-être incorrect, ou la page a été déplacée."
        action={<ButtonLink href="/">Revenir à l&apos;accueil</ButtonLink>}
      />
    </main>
  );
}
