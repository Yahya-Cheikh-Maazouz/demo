import { CircleDashed, Info, ShieldCheck, ShieldOff } from "lucide-react";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader } from "@/components/ui/card";
import { LoadingLabel, Skeleton } from "@/components/ui/skeleton";
import { getStudentGuardianDecisions } from "@/lib/api/gestion";
import { formatDate } from "@/lib/format";
import type { Consent } from "@/lib/types";
import { CONSENT_META, VALIDATION_STATUS_META, consentStatusMeta } from "./consent-meta";

/** Staff wording: "À donner" speaks to the parent; the team reads that nobody answered yet. */
function staffStatus(consent: Consent) {
  const meta = consentStatusMeta(consent);
  return consent.decidedAt ? meta : { ...meta, label: "Sans réponse", icon: CircleDashed };
}

/**
 * The legal guardian's decisions in a minor's file (gestion): each authorisation with its date and
 * author, what the team must respect while one is not given, and the answers to the school's
 * proposals. Nothing for an adult student. Render inside <Suspense> (GuardianDecisionsSkeleton).
 */
export async function GuardianDecisionsCard({ studentId }: { studentId: string }) {
  const data = await getStudentGuardianDecisions(studentId);
  if (!data) return null;
  const { firstName, guardianName, parentAccount, consents, validations } = data;
  const withdrawn = consents.find((c) => c.required && !c.granted && c.decidedAt !== null);

  return (
    <Card id="autorisations-representant" className="overflow-hidden">
      <CardHeader
        title="Autorisations du représentant légal"
        description={
          parentAccount
            ? `Données par ${guardianName ?? "le représentant légal"} depuis l'espace parent.`
            : "Aucun espace parent n'est ouvert pour ce dossier : rien n'a été donné dans l'application."
        }
        icon={<ShieldCheck className="size-5" aria-hidden />}
      />

      {withdrawn && (
        <div className="px-5 pt-4 sm:px-6">
          <Alert tone="danger" icon={ShieldOff} title="Formation suspendue">
            {withdrawn.decidedBy ?? "Le représentant légal"} a retiré le consentement RGPD le{" "}
            <time dateTime={withdrawn.decidedAt ?? undefined}>{withdrawn.decidedAt && formatDate(withdrawn.decidedAt)}</time>{" "}
            : aucune nouvelle leçon ne peut être planifiée pour {firstName}.
          </Alert>
        </div>
      )}

      <ul className="mt-4 divide-y divide-line border-t border-line" aria-label="Autorisations">
        {consents.map((consent) => {
          const meta = CONSENT_META[consent.key];
          const status = staffStatus(consent);
          // A required one only blocks once it is withdrawn (the alert above says it).
          const note = !consent.granted && !consent.required ? meta.withoutIt(firstName) : null;
          return (
            <li key={consent.key} className="px-5 py-3.5 sm:px-6" data-consent={consent.key}>
              <div className="flex flex-wrap items-start justify-between gap-x-3 gap-y-1.5">
                <p className="min-w-0 text-sm font-semibold text-ink">{meta.label}</p>
                <Badge tone={status.tone} icon={status.icon}>
                  {status.label}
                </Badge>
              </div>
              <p className="mt-1 text-xs text-ink-subtle">
                {consent.decidedAt ? (
                  <>
                    Le <time dateTime={consent.decidedAt}>{formatDate(consent.decidedAt)}</time> par {consent.decidedBy}
                  </>
                ) : (
                  "Pas encore de réponse : l'autorisation n'est pas donnée."
                )}
              </p>
              {note && (
                <p className="mt-1.5 flex items-start gap-1.5 text-sm text-ink-muted">
                  <Info className="mt-0.5 size-4 shrink-0 text-ink-subtle" aria-hidden />
                  {note}
                </p>
              )}
            </li>
          );
        })}
      </ul>

      {validations.length > 0 && (
        <section aria-labelledby="propositions-representant" className="border-t border-line px-5 py-4 sm:px-6">
          <h3 id="propositions-representant" className="text-xs font-bold tracking-wide text-ink-subtle uppercase">
            Propositions envoyées
          </h3>
          <ul className="mt-2 space-y-3">
            {validations.map((v) => {
              const status = VALIDATION_STATUS_META[v.status];
              return (
                <li key={v.id}>
                  <div className="flex flex-wrap items-start justify-between gap-x-3 gap-y-1.5">
                    <p className="min-w-0 text-sm font-semibold text-ink">{v.title}</p>
                    <Badge tone={status.tone} icon={status.icon}>
                      {status.label}
                    </Badge>
                  </div>
                  <p className="mt-1 text-xs text-ink-subtle">
                    {v.decidedAt ? (
                      <>
                        {v.status === "acceptee" ? "Acceptée" : "Refusée"} le{" "}
                        <time dateTime={v.decidedAt}>{formatDate(v.decidedAt)}</time> par {v.decidedBy}
                      </>
                    ) : (
                      <>
                        Proposée le <time dateTime={v.proposedAt}>{formatDate(v.proposedAt)}</time> par {v.proposedBy}
                      </>
                    )}
                  </p>
                </li>
              );
            })}
          </ul>
        </section>
      )}
    </Card>
  );
}

export function GuardianDecisionsSkeleton() {
  return (
    <Card className="p-5 sm:p-6">
      <LoadingLabel>Chargement des autorisations…</LoadingLabel>
      <div className="flex gap-3">
        <Skeleton className="size-9 shrink-0 rounded-xl" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-5 w-56 max-w-full" />
          <Skeleton className="h-4 w-full" />
        </div>
      </div>
      <div className="mt-6 space-y-5">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="space-y-2">
            <div className="flex justify-between gap-3">
              <Skeleton className="h-4 w-48 max-w-full" />
              <Skeleton className="h-6 w-20 rounded-full" />
            </div>
            <Skeleton className="h-3 w-40" />
          </div>
        ))}
      </div>
    </Card>
  );
}
