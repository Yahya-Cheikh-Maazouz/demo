import { LogOut } from "lucide-react";
import { Suspense } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { SubmitButton } from "@/components/ui/submit-button";
import { logout } from "@/features/auth/logout";
import { getPageProfile } from "./data";
import { byGender } from "./wording";

async function SignedInAs() {
  const profile = await getPageProfile();
  const word = byGender(profile.gender, { masculine: "Connecté", feminine: "Connectée", inclusive: "Connecté·e" });
  return (
    <p className="min-w-0 text-sm text-ink-muted">
      {word} en tant que <span className="font-semibold wrap-anywhere text-ink">{profile.email}</span>
    </p>
  );
}

/**
 * Sign-out, set apart at the bottom of the page. On mobile it is the only visible one
 * (the sidebar and its sign-out button only exist from `lg`).
 */
export function SignOutSection() {
  return (
    <section
      aria-labelledby="profil-session"
      className="mt-10 flex flex-col gap-4 border-t border-line pt-6 sm:flex-row sm:items-center sm:justify-between"
    >
      <div className="min-w-0">
        <h2 id="profil-session" className="sr-only">
          Session
        </h2>
        <Suspense fallback={<Skeleton className="h-5 w-64 max-w-full" />}>
          <SignedInAs />
        </Suspense>
      </div>
      <form action={logout}>
        <SubmitButton
          variant="secondary"
          size="lg"
          icon={<LogOut className="size-5" aria-hidden />}
          pendingLabel="Déconnexion…"
          className="w-full sm:w-auto"
        >
          Se déconnecter
        </SubmitButton>
      </form>
    </section>
  );
}
