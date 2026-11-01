import { Suspense } from "react";
import { redirect } from "next/navigation";
import { homePathFor } from "@/lib/auth-constants";
import { getSession } from "@/lib/session";

async function RedirectToHome(): Promise<null> {
  const session = await getSession();
  redirect(session ? homePathFor(session.user.role) : "/connexion");
}

/** "/" only sends people to their space, or to the login page. */
export default function RootPage() {
  return (
    <Suspense fallback={null}>
      <RedirectToHome />
    </Suspense>
  );
}
