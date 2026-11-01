import { CircleCheck, ShieldCheck } from "lucide-react";
import { CardBody } from "@/components/ui/card";
import { LoadingLabel, Skeleton } from "@/components/ui/skeleton";
import { TONE_TEXT } from "@/components/ui/tone";
import { cn } from "@/lib/cn";
import type { DocumentStatus } from "@/lib/types";
import { getPageRequiredDocuments } from "./data";
import { DOCUMENT_STATUS_META, SUMMARY_ORDER } from "./document-meta";

const pieces = (count: number) => `${count} ${count > 1 ? "pièces" : "pièce"}`;

/** "{n} / {total} pièces validées", a progress bar and one counter per status. Render inside a <Card> and <Suspense>. */
export async function DossierProgress() {
  const documents = await getPageRequiredDocuments();
  const total = documents.length;
  const count = (status: DocumentStatus) => documents.filter((d) => d.status === status).length;
  const validated = count("valide");
  const checking = count("en_verification");
  const toSend = count("manquant") + count("refuse");
  const width = (n: number) => `${total === 0 ? 0 : (n / total) * 100}%`;

  // "0 / 0 pièce validée" and four empty counters would say nothing.
  if (total === 0) {
    return (
      <>
        <CardBody>
          <p className="flex items-start gap-2 text-sm text-ink-muted">
            <CircleCheck className="mt-0.5 size-4 shrink-0 text-success" aria-hidden />
            Votre auto-école ne vous demande aucune pièce pour le moment.
          </p>
        </CardBody>
        <SecurityNote />
      </>
    );
  }

  return (
    <>
      <CardBody className="space-y-5">
        <div>
          <p className="flex flex-wrap items-baseline gap-x-2">
            <span className="text-3xl font-bold tracking-tight text-ink tabular-nums">
              {validated} / {total}
            </span>
            <span className="font-medium text-ink-muted">{total > 1 ? "pièces validées" : "pièce validée"}</span>
          </p>
          {/* The counters below say the same thing in text. */}
          <div aria-hidden className="mt-3 flex h-2.5 gap-0.5 overflow-hidden rounded-full bg-subtle">
            {validated > 0 && <div className="h-full rounded-full bg-success" style={{ width: width(validated) }} />}
            {checking > 0 && <div className="h-full rounded-full bg-info/45" style={{ width: width(checking) }} />}
          </div>
        </div>

        {/* Tiles side by side on phones and tablets; rows in the narrow column on desktop. */}
        <dl className="grid grid-cols-2 gap-2.5 lg:grid-cols-1 lg:gap-0 lg:divide-y lg:divide-line">
          {SUMMARY_ORDER.map((status) => {
            const meta = DOCUMENT_STATUS_META[status];
            const Icon = meta.icon;
            const value = count(status);
            return (
              <div
                key={status}
                className="rounded-xl border border-line px-3 py-2.5 lg:flex lg:items-center lg:justify-between lg:gap-3 lg:rounded-none lg:border-0 lg:px-0 lg:py-2"
              >
                <dt className="flex items-center gap-1.5 text-xs font-medium text-ink-muted lg:gap-2 lg:text-sm">
                  <Icon className={cn("size-3.5 shrink-0 lg:size-4", TONE_TEXT[meta.tone])} aria-hidden strokeWidth={2.25} />
                  {meta.plural}
                </dt>
                <dd
                  className={cn(
                    "mt-0.5 text-xl font-bold tabular-nums lg:mt-0 lg:text-base",
                    value > 0 ? "text-ink" : "text-ink-subtle",
                  )}
                >
                  {value}
                </dd>
              </div>
            );
          })}
        </dl>

        {toSend > 0 ? (
          <p className="text-sm text-ink-muted">
            Il vous reste <strong className="font-semibold text-ink">{pieces(toSend)} à envoyer</strong> pour que
            votre auto-école puisse déposer votre demande de permis.
          </p>
        ) : checking > 0 ? (
          <p className="text-sm text-ink-muted">
            Toutes vos pièces sont envoyées. Votre auto-école les vérifie et vous prévient en cas de problème.
          </p>
        ) : (
          <p className="flex items-start gap-2 text-sm font-semibold text-success">
            <CircleCheck className="mt-0.5 size-4 shrink-0" aria-hidden />
            Dossier complet&nbsp;: toutes vos pièces sont validées.
          </p>
        )}
      </CardBody>

      <SecurityNote />
    </>
  );
}

function SecurityNote() {
  return (
    <div className="flex items-start gap-3 border-t border-line px-5 py-4 text-sm text-ink-muted sm:px-6">
      <ShieldCheck className="mt-0.5 size-4 shrink-0 text-ink-subtle" aria-hidden />
      <p>
        Chaque fichier est analysé par un antivirus. Vos pièces d&apos;identité ne sont visibles que par le gérant et
        le secrétariat de votre auto-école.
      </p>
    </div>
  );
}

export function DossierProgressSkeleton() {
  return (
    <>
      <CardBody className="space-y-5">
        <LoadingLabel>Chargement de votre dossier…</LoadingLabel>
        <div>
          <div className="flex items-baseline gap-2">
            <Skeleton className="h-9 w-20" />
            <Skeleton className="h-5 w-28" />
          </div>
          <Skeleton className="mt-3 h-2.5 w-full rounded-full" />
        </div>
        <div className="grid grid-cols-2 gap-2.5 lg:grid-cols-1">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-17 rounded-xl lg:h-7" />
          ))}
        </div>
        <Skeleton className="h-10 w-full" />
      </CardBody>
      <div className="border-t border-line px-5 py-4 sm:px-6">
        <Skeleton className="h-15 w-full" />
      </div>
    </>
  );
}
