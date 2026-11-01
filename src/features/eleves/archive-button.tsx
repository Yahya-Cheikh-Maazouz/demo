"use client";

import { useActionState, useState } from "react";
import { Archive, ArchiveRestore } from "lucide-react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { SubmitButton } from "@/components/ui/submit-button";
import { INITIAL_STUDENT_FILE_STATE } from "./action-state";
import { archiveStudentAction } from "./actions";

/**
 * Archives a student (confirmation first), or restores an archived one. Once archived, the page
 * re-renders with the restore button and the dialog unmounts, which closes it.
 */
export function ArchiveButton({ studentId, archived, name }: { studentId: string; archived: boolean; name: string }) {
  const [open, setOpen] = useState(false);
  const [state, formAction] = useActionState(archiveStudentAction, INITIAL_STUDENT_FILE_STATE);

  if (archived) {
    return (
      <form action={formAction}>
        <input type="hidden" name="studentId" value={studentId} />
        <input type="hidden" name="archived" value="0" />
        <SubmitButton variant="ghost" icon={<ArchiveRestore className="size-4" aria-hidden />}>
          Réactiver l&apos;élève
        </SubmitButton>
      </form>
    );
  }

  return (
    <>
      <Button variant="danger-ghost" icon={<Archive className="size-4" aria-hidden />} onClick={() => setOpen(true)} aria-haspopup="dialog">
        Archiver l&apos;élève
      </Button>
      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        title={`Archiver ${name} ?`}
        description="L'élève n'apparaîtra plus dans les listes ni dans les choix du planning. Son dossier, ses factures et son historique sont conservés : vous pourrez le réactiver."
      >
        <form action={formAction} className="space-y-4">
          <input type="hidden" name="studentId" value={studentId} />
          <input type="hidden" name="archived" value="1" />
          {state.status === "error" && state.message && (
            <Alert tone="danger" role="alert">
              {state.message}
            </Alert>
          )}
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button variant="secondary" onClick={() => setOpen(false)}>
              Garder actif
            </Button>
            <SubmitButton variant="danger" pendingLabel="Archivage…">
              Archiver
            </SubmitButton>
          </div>
        </form>
      </Dialog>
    </>
  );
}
