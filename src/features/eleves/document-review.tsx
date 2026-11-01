"use client";

import { useActionState, useId, useState } from "react";
import { Check, LockKeyhole, Paperclip, X } from "lucide-react";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { inputStyles } from "@/components/ui/field";
import { SubmitButton } from "@/components/ui/submit-button";
import { DOCUMENT_STATUS_META } from "@/features/documents/document-meta";
import { cn } from "@/lib/cn";
import { formatDate } from "@/lib/format";
import type { DocumentStatus, RequiredDocument } from "@/lib/types";
import { INITIAL_STUDENT_FILE_STATE } from "./action-state";
import { reviewDocumentAction } from "./actions";

function DocumentRow({ studentId, document, canValidate }: { studentId: string; document: RequiredDocument; canValidate: boolean }) {
  const [state, formAction] = useActionState(reviewDocumentAction, INITIAL_STUDENT_FILE_STATE);
  const [refusing, setRefusing] = useState(false);
  const reasonId = useId();
  const meta = DOCUMENT_STATUS_META[document.status];
  const toReview = document.status === "en_verification";

  return (
    <li className="space-y-3 py-4 first:pt-0 last:pb-0">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="font-semibold text-ink">{document.label}</p>
          {document.fileName ? (
            <p className="mt-0.5 flex items-center gap-1.5 text-sm text-ink-muted">
              <Paperclip className="size-3.5 shrink-0" aria-hidden />
              <span className="truncate">{document.fileName}</span>
              {document.uploadedAt && <span className="shrink-0">· {formatDate(document.uploadedAt)}</span>}
            </p>
          ) : (
            <p className="mt-0.5 text-sm text-ink-subtle">Pas encore envoyée par l&apos;élève.</p>
          )}
          {document.sensitive && (
            <p className="mt-1 flex items-center gap-1.5 text-xs text-ink-subtle">
              <LockKeyhole className="size-3.5" aria-hidden />
              Visible uniquement par le gérant et l&apos;assistante
            </p>
          )}
        </div>
        <Badge tone={meta.tone} icon={meta.icon}>
          {meta.label}
        </Badge>
      </div>

      {document.status === "refuse" && document.rejectionReason && (
        <p className="rounded-xl bg-danger-soft px-3 py-2 text-sm text-ink-muted">Motif : {document.rejectionReason}</p>
      )}

      {state.status === "success" && state.message && (
        <p role="status" className="text-sm font-medium text-success">
          {state.message}
        </p>
      )}

      {toReview && canValidate && (
        <form action={formAction} className="space-y-3">
          <input type="hidden" name="studentId" value={studentId} />
          <input type="hidden" name="documentId" value={document.id} />
          {refusing && (
            <div className="space-y-1.5">
              <label htmlFor={reasonId} className="text-sm font-semibold text-ink">
                Motif du refus <span className="font-normal text-ink-subtle">(visible par l&apos;élève)</span>
              </label>
              <textarea
                id={reasonId}
                name="reason"
                required
                minLength={5}
                maxLength={300}
                rows={2}
                autoFocus
                placeholder="Par exemple : document illisible, merci d'envoyer une photo plus nette."
                className={cn(inputStyles, "h-auto py-2.5")}
              />
            </div>
          )}
          {state.status === "error" && state.message && (
            <Alert tone="danger" role="alert">
              {state.message}
            </Alert>
          )}
          <div className="flex flex-wrap gap-2">
            {refusing ? (
              <>
                <SubmitButton name="decision" value="refuse" variant="danger" size="sm" pendingLabel="Envoi…">
                  Confirmer le refus
                </SubmitButton>
                <Button variant="ghost" size="sm" onClick={() => setRefusing(false)}>
                  Annuler
                </Button>
              </>
            ) : (
              <>
                <SubmitButton name="decision" value="valide" size="sm" icon={<Check className="size-4" aria-hidden />}>
                  Valider
                </SubmitButton>
                <Button variant="secondary" size="sm" icon={<X className="size-4" aria-hidden />} onClick={() => setRefusing(true)}>
                  Refuser
                </Button>
              </>
            )}
          </div>
        </form>
      )}
    </li>
  );
}

/** For the staff, the pieces waiting for a check come first. */
const STAFF_ORDER: Record<DocumentStatus, number> = { en_verification: 0, refuse: 1, manquant: 2, valide: 3 };

/** Pieces of the student's file, those to check first, with validate / refuse actions. */
export function DocumentReview({
  studentId,
  documents,
  canValidate,
}: {
  studentId: string;
  documents: RequiredDocument[];
  canValidate: boolean;
}) {
  return (
    <ul className="divide-y divide-line">
      {[...documents].sort((a, b) => STAFF_ORDER[a.status] - STAFF_ORDER[b.status]).map((document) => (
        <DocumentRow key={document.id} studentId={studentId} document={document} canValidate={canValidate} />
      ))}
    </ul>
  );
}
