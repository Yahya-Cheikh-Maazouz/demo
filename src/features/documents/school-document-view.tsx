import { Info, Signature } from "lucide-react";
import { notFound } from "next/navigation";
import { cache } from "react";
import { Badge } from "@/components/ui/badge";
import { LoadingLabel, Skeleton } from "@/components/ui/skeleton";
import { PrintButton } from "@/components/ui/print-button";
import { getStudentProfile } from "@/lib/api/eleve";
import { formatDate } from "@/lib/format";
import { getTenant } from "@/lib/tenant";
import type { DownloadableDocument, StudentProfile, Tenant } from "@/lib/types";
import { getPageDownloadables } from "./data";
import { CATEGORY_META, DOCUMENT_ID_PATTERN } from "./document-meta";

/** School document of the signed-in student, or notFound(). The API only returns the student's own documents. */
export const loadSchoolDocument = cache(async (id: string) => {
  if (!DOCUMENT_ID_PATTERN.test(id)) notFound();
  const document = (await getPageDownloadables()).find((d) => d.id === id);
  if (!document) notFound();
  return document;
});

/** "Télécharger en PDF", once the document is known to exist. Render inside <Suspense>. */
export async function SchoolDocumentPrintAction({ id }: { id: Promise<string> }) {
  const document = await loadSchoolDocument(await id);
  return <PrintButton fileName={document.label} className="w-full sm:w-auto" />;
}

/** "B · Boîte manuelle" → "B (boîte manuelle)", to read well inside a sentence. */
function licenceInSentence(licence: string): string {
  const [category, ...details] = licence.split(" · ");
  return details.length > 0 ? `${category} (${details.join(", ").toLowerCase()})` : category;
}

const agreed = (gender: StudentProfile["gender"], masculine: string, feminine: string) =>
  gender === "Femme" ? feminine : gender === "Homme" ? masculine : `${masculine}(e)`;

function Body({ document, tenant, profile }: { document: DownloadableDocument; tenant: Tenant; profile: StudentProfile }) {
  const student = `${profile.firstName} ${profile.lastName}`;
  const licence = licenceInSentence(profile.licence);
  switch (document.category) {
    case "attestation":
      return (
        <p>
          {tenant.name} atteste que <strong className="font-semibold">{student}</strong>,{" "}
          {agreed(profile.gender, "né", "née")} le {formatDate(profile.birthDate)}, est{" "}
          {agreed(profile.gender, "inscrit", "inscrite")} dans l&apos;établissement depuis le{" "}
          {formatDate(profile.enrolledAt)} pour la préparation du permis {licence}, à l&apos;agence{" "}
          {profile.office}.
        </p>
      );
    case "contrat":
      return (
        <p>
          Contrat de formation à la conduite conclu entre {tenant.name} et{" "}
          <strong className="font-semibold">{student}</strong> pour la préparation du permis {licence}. Il
          précise le programme de formation, le nombre d&apos;heures prévu, les tarifs, les modalités de paiement et
          les conditions d&apos;annulation des leçons.
        </p>
      );
    case "devis":
      return (
        <p>
          Devis établi par {tenant.name} pour <strong className="font-semibold">{student}</strong>. Il détaille les
          prestations de la formation au permis {licence} et leur prix TTC.
        </p>
      );
    case "facture":
      return (
        <p>
          Facture émise par {tenant.name} au nom de <strong className="font-semibold">{student}</strong>. Retrouvez le
          détail de vos paiements dans votre espace, rubrique Paiements et factures.
        </p>
      );
  }
}

/**
 * Printable school document. On screen it is a paper-like card; in print the app shell is hidden by
 * the page and the card loses its border, shadow and padding. Render inside <Suspense>.
 */
export async function SchoolDocumentView({ id }: { id: Promise<string> }) {
  const document = await loadSchoolDocument(await id);
  const [tenant, profile] = await Promise.all([getTenant(), getStudentProfile()]);
  if (!tenant) notFound();

  const category = CATEGORY_META[document.category];
  // "Contrat de formation" under "Contrat de formation" says nothing: the category only shows when it adds something.
  const showCategory = !document.label.toLowerCase().startsWith(category.label.toLowerCase());
  const signable = document.category === "contrat" || document.category === "devis";

  return (
    <article
      aria-labelledby="document-titre"
      className="rounded-2xl border border-line bg-surface p-5 text-ink shadow-card sm:p-10 print:rounded-none print:border-0 print:p-0 print:shadow-none"
    >
      <div className="flex flex-col-reverse gap-6 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-3">
          <span
            aria-hidden
            className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-brand text-base font-bold text-on-brand [print-color-adjust:exact]"
          >
            {tenant.logoInitials}
          </span>
          <div className="min-w-0 text-sm leading-6">
            <p className="text-base font-bold">{tenant.name}</p>
            <p className="text-ink-muted">{tenant.city}</p>
            <p className="text-ink-muted tabular-nums">{tenant.phone}</p>
            <p className="break-all text-ink-muted">{tenant.email}</p>
          </div>
        </div>

        <div className="sm:max-w-xs sm:text-right">
          {showCategory && (
            <p className="mb-1 text-xs font-semibold tracking-wide text-ink-subtle uppercase">{category.label}</p>
          )}
          <h1 id="document-titre" className="text-2xl font-bold tracking-tight sm:text-3xl">
            {document.label}
          </h1>
          <p className="mt-2 text-sm text-ink-muted">
            Émis le{" "}
            <time dateTime={document.issuedAt} className="font-semibold text-ink">
              {formatDate(document.issuedAt)}
            </time>
          </p>
          {document.signed && (
            <div className="mt-3">
              <Badge tone="success" icon={Signature}>
                Signé
              </Badge>
            </div>
          )}
        </div>
      </div>

      <div className="mt-8 grid gap-6 border-t border-line pt-6 sm:grid-cols-2">
        <section aria-labelledby="document-eleve">
          <h2 id="document-eleve" className="text-xs font-semibold tracking-wide text-ink-subtle uppercase">
            Élève
          </h2>
          <address className="mt-2 text-sm leading-6 not-italic">
            <span className="font-semibold">
              {profile.firstName} {profile.lastName}
            </span>
            <br />
            {profile.address.line1}
            <br />
            {profile.address.postalCode} {profile.address.city}
            <br />
            <span className="break-all text-ink-muted">{profile.email}</span>
          </address>
        </section>
        <section aria-labelledby="document-formation">
          <h2 id="document-formation" className="text-xs font-semibold tracking-wide text-ink-subtle uppercase">
            Formation
          </h2>
          <p className="mt-2 text-sm leading-6">
            Permis {profile.licence}
            <br />
            <span className="text-ink-muted">Agence {profile.office}</span>
            <br />
            <span className="text-ink-muted">Inscription le {formatDate(profile.enrolledAt)}</span>
          </p>
        </section>
      </div>

      <div className="mt-8 border-t border-line pt-6 text-sm leading-7 sm:text-base sm:leading-7">
        <Body document={document} tenant={tenant} profile={profile} />
      </div>

      <div className="mt-8 grid gap-4 sm:grid-cols-2">
        <p className="text-sm text-ink-muted">
          Fait à {tenant.city}, le <time dateTime={document.issuedAt}>{formatDate(document.issuedAt)}</time>
        </p>
        <p className="text-sm sm:text-right">
          {document.signed ? (
            <span className="font-semibold">
              Signé électroniquement par l&apos;élève et <span className="whitespace-nowrap">l&apos;auto-école</span>
            </span>
          ) : signable ? (
            <span className="text-ink-muted">En attente de signature</span>
          ) : (
            <>
              <span className="font-semibold">{tenant.name}</span>
              <br />
              <span className="text-ink-muted">La direction</span>
            </>
          )}
        </p>
      </div>

      <p className="mt-10 flex items-start gap-2 rounded-xl bg-info-soft p-4 text-sm text-info print:border print:border-line print:bg-transparent print:text-ink-muted">
        <Info className="mt-0.5 size-4 shrink-0" aria-hidden />
        <span>
          <span className="font-semibold">Document de démonstration.</span> Le document officiel vous sera remis au
          format PDF par votre auto-école.
        </span>
      </p>
    </article>
  );
}

export function SchoolDocumentViewSkeleton() {
  return (
    <div className="rounded-2xl border border-line bg-surface p-5 shadow-card sm:p-10">
      <LoadingLabel>Chargement du document…</LoadingLabel>
      <div className="flex flex-col-reverse gap-6 sm:flex-row sm:justify-between">
        <div className="flex gap-3">
          <Skeleton className="size-12 rounded-xl" />
          <div className="space-y-2">
            <Skeleton className="h-5 w-40" />
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-4 w-28" />
            <Skeleton className="h-4 w-44" />
          </div>
        </div>
        <div className="space-y-3 sm:flex sm:flex-col sm:items-end">
          <Skeleton className="h-3 w-20" />
          <Skeleton className="h-9 w-56" />
          <Skeleton className="h-4 w-40" />
        </div>
      </div>
      <div className="mt-8 grid gap-6 border-t border-line pt-6 sm:grid-cols-2">
        <div className="space-y-2">
          <Skeleton className="h-3 w-16" />
          <Skeleton className="h-4 w-36" />
          <Skeleton className="h-4 w-40" />
          <Skeleton className="h-4 w-28" />
        </div>
        <div className="space-y-2">
          <Skeleton className="h-3 w-20" />
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-4 w-32" />
        </div>
      </div>
      <Skeleton className="mt-8 h-24 w-full" />
      <Skeleton className="mt-8 h-5 w-56" />
      <Skeleton className="mt-10 h-14 w-full rounded-xl" />
    </div>
  );
}
