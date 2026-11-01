import { headers } from "next/headers";
import { CalendarSync, ChevronDown } from "lucide-react";
import { CardBody, CardHeader } from "@/components/ui/card";
import { LoadingLabel, Skeleton } from "@/components/ui/skeleton";
import { getStudentProfile } from "@/lib/api/eleve";
import { CopyLinkField } from "./copy-link-field";

const HOST_PATTERN = /^[a-z0-9.-]+(:\d{1,5})?$/i;

/** FNV-1a, 32 bits, as 8 hex characters. Only used to fake an opaque token in the mock. */
function fnv1a(input: string, seed = 0x811c9dc5): string {
  let hash = seed;
  for (let index = 0; index < input.length; index++) {
    hash ^= input.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(16).padStart(8, "0");
}

/**
 * Read-only iCal subscription URL of the student's planning.
 * TODO(API): the backend will issue (and let the student revoke) a random token; until then the
 * mock derives one from the user id. The host is the auto-école's own subdomain.
 */
async function getCalendarFeedUrl(): Promise<string> {
  const [requestHeaders, profile] = await Promise.all([headers(), getStudentProfile()]);
  const forwarded = requestHeaders.get("x-forwarded-host")?.split(",")[0]?.trim();
  const host = [forwarded, requestHeaders.get("host")].find((value) => value && HOST_PATTERN.test(value));
  const token = `${fnv1a(profile.id)}${fnv1a(profile.id, 0x050c5d1f)}`;
  return `webcal://${host ?? "localhost"}/agenda/${token}.ics`;
}

export function CalendarFeedHeader() {
  return (
    <CardHeader
      title="Ajouter à mon agenda"
      description="Google Agenda, Outlook ou Apple Calendrier."
      icon={<CalendarSync className="size-5" aria-hidden />}
    />
  );
}

/** Render inside <Suspense>. */
export async function CalendarFeedBody() {
  const url = await getCalendarFeedUrl();
  return (
    <CardBody className="space-y-4">
      <p className="text-sm text-ink-muted">
        Abonnez votre agenda à ce lien : vos leçons s&apos;y affichent et se mettent à jour toutes seules, en
        lecture seule.
      </p>
      <CopyLinkField url={url} />
      <details className="group rounded-xl border border-line">
        <summary className="flex min-h-11 items-center justify-between gap-2 rounded-xl px-3.5 text-sm font-semibold text-ink marker:content-none hover:bg-subtle [&::-webkit-details-marker]:hidden">
          Comment l&apos;ajouter ?
          <ChevronDown
            className="size-4 text-ink-subtle transition-transform duration-150 group-open:rotate-180"
            aria-hidden
          />
        </summary>
        <ul className="space-y-2 border-t border-line px-3.5 py-3 text-sm text-ink-muted">
          <li>
            <span className="font-semibold text-ink">Google Agenda</span> : Autres agendas, puis « À partir de
            l&apos;URL ».
          </li>
          <li>
            <span className="font-semibold text-ink">Outlook</span> : Ajouter un calendrier, puis « S&apos;abonner à
            partir du web ».
          </li>
          <li>
            <span className="font-semibold text-ink">Apple Calendrier</span> : Fichier, puis « Nouvel abonnement au
            calendrier ».
          </li>
        </ul>
      </details>
      <p className="text-xs text-ink-subtle">Ce lien est personnel : ne le partagez pas.</p>
    </CardBody>
  );
}

export function CalendarFeedSkeleton() {
  return (
    <CardBody className="space-y-4">
      <LoadingLabel>Chargement du lien d&apos;agenda…</LoadingLabel>
      <div className="space-y-1.5">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-2/3" />
      </div>
      <div className="space-y-1.5">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-12 w-full rounded-xl" />
      </div>
      <Skeleton className="h-11 w-full rounded-xl" />
      <Skeleton className="h-11 w-full rounded-xl" />
      <Skeleton className="h-3 w-48" />
    </CardBody>
  );
}
