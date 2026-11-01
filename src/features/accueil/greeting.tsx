import { Skeleton } from "@/components/ui/skeleton";
import { getSession } from "@/lib/session";

/** First name streamed into the static "Bonjour" title. Render inside <Suspense>. */
export async function StudentFirstName() {
  const session = await getSession();
  return session ? <>{session.user.firstName}</> : null;
}

/** Inline placeholder (a <span>, so it stays valid inside the <h1>), shorter than the line box. */
export function StudentFirstNameSkeleton() {
  return <Skeleton inline className="h-[0.8em] w-[3.5em] rounded-md" />;
}
