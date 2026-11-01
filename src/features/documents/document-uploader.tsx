"use client";

import { useActionState, useEffect, useId, useRef, useState, type DragEvent } from "react";
import { unstable_rethrow } from "next/navigation";
import {
  CircleAlert,
  CircleCheck,
  CloudUpload,
  FileImage,
  FileText,
  RefreshCw,
  Send,
  ShieldCheck,
  Upload,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { SubmitButton } from "@/components/ui/submit-button";
import { cn } from "@/lib/cn";
import { formatFileSize } from "@/lib/format";
import { uploadDocumentAction } from "./actions";
import {
  ACCEPT_ATTRIBUTE,
  checkFile,
  FILE_KIND_LABEL,
  fileKind,
  MAX_FILE_LABEL,
} from "./file-rules";
import { INITIAL_UPLOAD_STATE, type UploadState } from "./upload-state";

const SEND_FAILED = "L'envoi n'a pas abouti. Vérifiez votre connexion puis réessayez.";

type DocumentUploaderProps = {
  documentId: string;
  /** Completes the accessible names of the buttons ("Choisir un fichier : ASSR 2 ou ASR"). */
  documentLabel: string;
  /** "full": drop zone, for a missing or refused piece. "compact": "Remplacer le fichier", for a piece being checked. */
  variant: "full" | "compact";
};

type FocusRequest = {
  target: "trigger" | "submit";
  /** Wait until the piece is shown with this variant (the refreshed status) before moving focus. */
  variant?: DocumentUploaderProps["variant"];
};

/** First visible button that opens the file picker (the mobile and desktop ones are toggled by CSS). */
function focusVisible(root: HTMLElement | null, selector: string) {
  const candidates = root?.querySelectorAll<HTMLElement>(selector) ?? [];
  Array.from(candidates)
    .find((element) => element.offsetParent !== null)
    ?.focus();
}

const hasFiles = (event: DragEvent) => Array.from(event.dataTransfer.types).includes("Files");

/**
 * Sends one required document. Everything works with the keyboard through the buttons; dragging a
 * file onto the zone is an enhancement for desktop. The file is checked here for instant feedback,
 * then again by the Server Action.
 *
 * Keep it mounted at the same place when the piece's status changes: the success message survives
 * the refresh that moves the piece from "Manquant" to "En vérification".
 */
export function DocumentUploader({ documentId, documentLabel, variant }: DocumentUploaderProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  // The chosen file lives here rather than in the input: a dropped file never reaches the input,
  // and React resets the form after each submit.
  const fileRef = useRef<File | null>(null);
  const focusNext = useRef<FocusRequest | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [clientError, setClientError] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  // Results up to this attempt are no longer shown (a new file was chosen since).
  const [dismissedAttempt, setDismissedAttempt] = useState(0);
  const hintId = useId();
  const errorId = useId();

  function select(next: File | null) {
    fileRef.current = next;
    setFile(next);
  }

  const [state, formAction, pending] = useActionState(async (prev: UploadState, formData: FormData) => {
    if (fileRef.current) formData.set("file", fileRef.current);
    let next: UploadState;
    try {
      next = await uploadDocumentAction(prev, formData);
    } catch (error) {
      // Lets a redirect through (expired session); anything else is a transport failure.
      unstable_rethrow(error);
      next = { status: "error", code: "reseau", message: SEND_FAILED, attempt: (prev.attempt ?? 0) + 1 };
    }
    if (next.status === "success") {
      select(null);
      // The piece is now being checked: focus "Remplacer le fichier" once the refreshed status is shown.
      focusNext.current = { target: "trigger", variant: "compact" };
    } else if (next.code === "fichier") {
      select(null);
      focusNext.current = { target: "trigger" };
    } else {
      focusNext.current = { target: "submit" };
    }
    return next;
  }, INITIAL_UPLOAD_STATE);

  // A file dropped just next to the zone would make the browser open it in place of the app.
  // The zones cancel their own events first, so only the drops they did not take are blocked here.
  useEffect(() => {
    if (variant !== "full") return;
    const guard = (event: globalThis.DragEvent) => {
      if (event.defaultPrevented || !event.dataTransfer?.types.includes("Files")) return;
      event.preventDefault();
      if (event.type === "dragover") event.dataTransfer.dropEffect = "none";
    };
    window.addEventListener("dragover", guard);
    window.addEventListener("drop", guard);
    return () => {
      window.removeEventListener("dragover", guard);
      window.removeEventListener("drop", guard);
    };
  }, [variant]);

  // Focus moves only after a deliberate action (submit, removal), once the new UI is committed.
  useEffect(() => {
    const request = focusNext.current;
    if (!request || (request.variant && request.variant !== variant)) return;
    focusNext.current = null;
    focusVisible(rootRef.current, request.target === "trigger" ? "[data-file-trigger]" : "[data-file-submit]");
  });

  const result = (state.attempt ?? 0) > dismissedAttempt ? state : null;
  const error = clientError ?? (result?.status === "error" ? result.message : null);
  const success = result?.status === "success" ? result.message : null;

  function choose(files: FileList | null | undefined) {
    if (!files || files.length === 0 || pending) return;
    setDismissedAttempt(state.attempt ?? 0);
    if (files.length > 1) {
      setClientError("Déposez un seul fichier à la fois.");
      select(null);
      return;
    }
    const problem = checkFile(files[0]);
    setClientError(problem);
    select(problem ? null : files[0]);
  }

  function openPicker() {
    inputRef.current?.click();
  }

  function remove() {
    select(null);
    setClientError(null);
    focusNext.current = { target: "trigger" };
  }

  const describedBy = [error ? errorId : null, hintId].filter(Boolean).join(" ");
  const showHint = variant === "full" || file !== null;
  const forDocument = <span className="sr-only"> : {documentLabel}</span>;

  return (
    <div ref={rootRef} className="mt-4">
      <form action={formAction}>
        <input type="hidden" name="documentId" value={documentId} />
        {/* No name: the chosen file is added to the form data by the action. */}
        <input
          ref={inputRef}
          type="file"
          accept={ACCEPT_ATTRIBUTE}
          className="hidden"
          tabIndex={-1}
          aria-hidden
          onChange={(event) => {
            choose(event.target.files);
            // Lets the student pick the same file again after removing it.
            event.target.value = "";
          }}
        />

        {file ? (
          <SelectedFile file={file} pending={pending} onRemove={remove} onChange={openPicker} describedBy={describedBy} />
        ) : variant === "full" ? (
          <div
            onDragEnter={(event) => {
              if (!hasFiles(event)) return;
              event.preventDefault();
              setDragging(true);
            }}
            onDragOver={(event) => {
              if (!hasFiles(event)) return;
              event.preventDefault();
              event.dataTransfer.dropEffect = "copy";
            }}
            onDragLeave={(event) => {
              if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setDragging(false);
            }}
            onDrop={(event) => {
              event.preventDefault();
              setDragging(false);
              choose(event.dataTransfer.files);
            }}
            className={cn(
              "rounded-2xl border-2 border-dashed transition-colors duration-150",
              dragging
                ? "border-brand bg-brand-soft"
                : error
                  ? "border-danger/50 bg-subtle/60"
                  : "border-line-strong bg-subtle/60 sm:hover:border-brand/50",
            )}
          >
            {/* Phone: one big target. The OS offers the camera, the photos and the files. */}
            <button
              type="button"
              data-file-trigger
              onClick={openPicker}
              aria-describedby={describedBy}
              className="flex min-h-18 w-full items-center gap-3.5 rounded-2xl px-4 py-3 text-left sm:hidden"
            >
              <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-brand text-on-brand shadow-sm">
                <Upload className="size-5" aria-hidden />
              </span>
              <span className="min-w-0">
                <span className="block font-semibold text-ink">
                  Ajouter un fichier
                  {forDocument}
                </span>
                <span className="block text-sm text-ink-muted">Photo, scan ou PDF</span>
              </span>
            </button>

            <div className="hidden items-center gap-4 px-5 py-4 sm:flex">
              <span
                className={cn(
                  "flex size-11 shrink-0 items-center justify-center rounded-xl shadow-card transition-colors",
                  dragging ? "bg-brand text-on-brand" : "bg-surface text-brand",
                )}
              >
                <CloudUpload className="size-5" aria-hidden />
              </span>
              <div className="min-w-0 flex-1">
                <p className="font-semibold text-ink">
                  {dragging ? "Déposez le fichier ici" : "Glissez votre fichier ici"}
                </p>
                <p className="text-sm text-ink-muted">ou parcourez vos fichiers.</p>
              </div>
              <Button
                variant="secondary"
                data-file-trigger
                onClick={openPicker}
                aria-describedby={describedBy}
                icon={<Upload className="size-4" aria-hidden />}
                className="shrink-0"
              >
                Choisir un fichier
                {forDocument}
              </Button>
            </div>
          </div>
        ) : (
          <Button
            variant="secondary"
            data-file-trigger
            onClick={openPicker}
            aria-describedby={describedBy}
            icon={<RefreshCw className="size-4" aria-hidden />}
            className="w-full sm:w-auto"
          >
            Remplacer le fichier
            {forDocument}
          </Button>
        )}

        {error && (
          <p id={errorId} role="alert" className="mt-3 flex items-start gap-1.5 text-sm font-medium text-danger">
            <CircleAlert className="mt-0.5 size-4 shrink-0" aria-hidden />
            {error}
          </p>
        )}

        <p id={hintId} className={cn("mt-3 flex items-start gap-1.5 text-sm text-ink-subtle", !showHint && "sr-only")}>
          <ShieldCheck className="mt-0.5 size-4 shrink-0" aria-hidden />
          <span>
            Formats acceptés&nbsp;: PDF, JPG, PNG · {MAX_FILE_LABEL} maximum. Chaque fichier est analysé par un antivirus.
          </span>
        </p>
      </form>

      {/* Always in the DOM so that screen readers announce the message when it appears. */}
      <div role="status" aria-live="polite">
        {success && (
          <p className="mt-3 flex items-start gap-2 rounded-xl bg-success-soft px-3.5 py-3 text-sm font-semibold text-success">
            <CircleCheck className="mt-0.5 size-4 shrink-0" aria-hidden />
            {success}
          </p>
        )}
      </div>
    </div>
  );
}

function SelectedFile({
  file,
  pending,
  onRemove,
  onChange,
  describedBy,
}: {
  file: File;
  pending: boolean;
  onRemove: () => void;
  onChange: () => void;
  describedBy: string;
}) {
  const kind = fileKind(file) ?? "pdf";
  const Icon = kind === "pdf" ? FileText : FileImage;

  return (
    <div className="rounded-2xl border border-brand/25 bg-brand-soft p-3 sm:p-4">
      <div className="flex items-center gap-3">
        <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-surface text-brand shadow-card">
          <Icon className="size-5" aria-hidden />
        </span>
        <p className="min-w-0 flex-1 text-sm">
          <span className="sr-only">Fichier choisi : </span>
          <span className="block truncate font-semibold text-ink" title={file.name}>
            {file.name}
          </span>
          <span className="block text-ink-muted tabular-nums">
            {FILE_KIND_LABEL[kind]} · {formatFileSize(file.size)}
          </span>
        </p>
        <button
          type="button"
          onClick={onRemove}
          disabled={pending}
          aria-label={`Retirer le fichier ${file.name}`}
          className="flex size-11 shrink-0 items-center justify-center rounded-full text-ink-subtle transition-colors hover:bg-surface hover:text-ink disabled:opacity-50"
        >
          <X className="size-5" aria-hidden />
        </button>
      </div>

      <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center">
        <SubmitButton
          data-file-submit
          aria-describedby={describedBy}
          icon={<Send className="size-4" aria-hidden />}
          pendingLabel="Envoi en cours…"
          className="w-full sm:w-auto"
        >
          Envoyer le fichier
        </SubmitButton>
        <Button
          variant="ghost"
          data-file-trigger
          onClick={onChange}
          disabled={pending}
          className="w-full sm:w-auto"
        >
          Choisir un autre fichier
        </Button>
      </div>
    </div>
  );
}
