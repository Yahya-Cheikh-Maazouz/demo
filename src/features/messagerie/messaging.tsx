import { Card, CardBody } from "@/components/ui/card";
import { LoadingLabel, Skeleton } from "@/components/ui/skeleton";
import { getMailbox } from "@/lib/api/eleve";
import { COMPOSE_CARD_CLASS, ComposeHeader, GRID_CLASS, LIST_CARD_CLASS } from "./layout";
import { MessagingView } from "./messaging-view";

/** Student messaging: received/sent messages and the new-message form. Render inside <Suspense>. */
export async function Messaging() {
  const mailbox = await getMailbox();
  return <MessagingView mailbox={mailbox} />;
}

/** A 14px text line (labels, hints): a 16px bar in a 20px line box. */
function TextLine({ className }: { className: string }) {
  return (
    <div className="flex h-5 items-center">
      <Skeleton className={`h-4 ${className}`} />
    </div>
  );
}

export function MessagingSkeleton() {
  return (
    <div className={GRID_CLASS}>
      <LoadingLabel>Chargement de vos messages…</LoadingLabel>
      <Card className={LIST_CARD_CLASS}>
        <div className="px-5 pt-5 sm:px-6 sm:pt-6">
          <Skeleton className="h-[52px] w-full rounded-2xl sm:w-80" />
        </div>
        <ul className="mt-4 divide-y divide-line border-t border-line">
          {[0, 1, 2].map((i) => (
            <li key={i} className="flex items-start gap-3 px-5 py-4 sm:px-6">
              <Skeleton className="size-10 rounded-full" />
              {/* Same line boxes as a loaded row: 16px eyebrow, 24px subject, 20px preview. */}
              <div className="min-w-0 flex-1">
                <div className="flex h-4 items-center justify-between gap-3">
                  <Skeleton className="h-3 w-32" />
                  <Skeleton className="h-3 w-10" />
                </div>
                <div className="mt-1 flex h-6 items-center">
                  <Skeleton className="h-4 w-3/5" />
                </div>
                <div className="mt-0.5 flex h-5 items-center">
                  <Skeleton className="h-3.5 w-4/5" />
                </div>
              </div>
            </li>
          ))}
        </ul>
      </Card>

      <Card className={COMPOSE_CARD_CLASS}>
        <ComposeHeader />
        <CardBody className="space-y-5">
          <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-1">
            <div className="space-y-1.5">
              <TextLine className="w-24" />
              <Skeleton className="h-12 w-full rounded-xl" />
              <TextLine className="w-56 max-w-full" />
            </div>
            <div className="space-y-1.5">
              <TextLine className="w-14" />
              <Skeleton className="h-12 w-full rounded-xl" />
            </div>
          </div>
          <div className="space-y-1.5">
            <TextLine className="w-28" />
            <Skeleton className="h-40 w-full rounded-xl" />
          </div>
          <Skeleton className="h-12 w-full rounded-xl" />
        </CardBody>
      </Card>
    </div>
  );
}
