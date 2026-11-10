"use client";

import { useActionState, useCallback, useEffect, useId, useRef, useState, type PointerEvent } from "react";
import { Eraser, PenLine, X } from "lucide-react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { refreshOfflineCopy } from "@/components/moniteur/service-worker";
import { useOnline } from "@/components/moniteur/use-online";
import { INITIAL_INSTRUCTOR_STATE, type InstructorActionState } from "./action-state";
import { signLessonAction } from "./actions";
import { useInstructorFeedback } from "./feedback";
import { bigButton } from "./lesson-card";
import { guardNetwork } from "./network-guard";
import { OnlineSubmitButton } from "./online-submit-button";

/** Width of the stored image: enough to read a signature, far below the 200 Ko limit. */
const EXPORT_WIDTH = 720;
const SIGNATURE_MAX_BYTES = 200 * 1024;
/** Total length of the strokes (CSS px) under which the pad counts as empty (a tap, a slip). */
const MIN_INK = 40;

type SignatureSheetProps = {
  lessonId: string;
  studentName: string;
  /** "Leçon de conduite · jeudi 5 novembre, 12:00 – 13:00" */
  summary: string;
};

/**
 * "Faire émarger l'élève": a full-screen pad where the student signs with a finger, under the line
 * "Je confirme avoir suivi cette leçon". "Valider la leçon" stores the signature (PNG) and marks
 * the lesson done.
 */
export function SignatureSheet({ lessonId, studentName, summary }: SignatureSheetProps) {
  const [open, setOpen] = useState(false);
  const [session, setSession] = useState(0);
  const online = useOnline();
  const triggerRef = useRef<HTMLButtonElement>(null);
  /**
   * The dialog is unmounted rather than closed, so the browser does not give the focus back:
   * do it here, unless the lesson was validated (the confirmation above the content takes it).
   */
  const close = (validated: boolean) => {
    setOpen(false);
    if (!validated) requestAnimationFrame(() => triggerRef.current?.focus());
  };
  return (
    <>
      <Button
        ref={triggerRef}
        size="lg"
        fullWidth
        className={bigButton}
        icon={<PenLine className="size-5" aria-hidden />}
        aria-haspopup="dialog"
        disabled={!online}
        onClick={() => {
          setSession((s) => s + 1);
          setOpen(true);
        }}
      >
        Faire émarger l&apos;élève
      </Button>
      {open && (
        <SignatureDialog
          key={session}
          lessonId={lessonId}
          studentName={studentName}
          summary={summary}
          onClose={close}
        />
      )}
    </>
  );
}

function SignatureDialog({ lessonId, studentName, summary, onClose }: SignatureSheetProps & { onClose: (validated: boolean) => void }) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawing = useRef<{ x: number; y: number } | null>(null);
  const ink = useRef(0);
  const [signature, setSignature] = useState("");
  const [tooHeavy, setTooHeavy] = useState(false);
  const titleId = useId();
  const statementId = useId();
  const hintId = useId();
  const errorRef = useRef<HTMLDivElement>(null);
  const { announce } = useInstructorFeedback();

  // A network failure keeps the dialog open with the drawn signature: the student does not sign again.
  const [state, formAction] = useActionState(
    guardNetwork(async (prev: InstructorActionState, formData: FormData) => {
      const next = await signLessonAction(prev, formData);
      if (next.status === "success") {
        onClose(true);
        announce(next.message ?? "Leçon validée.");
        refreshOfflineCopy();
      }
      return next;
    }),
    INITIAL_INSTRUCTOR_STATE,
  );

  useEffect(() => {
    if (state.status === "error") errorRef.current?.focus();
  }, [state]);

  /** Sizes the bitmap to the element (sharp on high-density screens); clears the drawing. */
  const setup = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const ratio = window.devicePixelRatio || 1;
    canvas.width = Math.max(1, Math.round(rect.width * ratio));
    canvas.height = Math.max(1, Math.round(rect.height * ratio));
    const context = canvas.getContext("2d");
    if (!context) return;
    context.setTransform(ratio, 0, 0, ratio, 0, 0);
    context.lineWidth = 3;
    context.lineCap = "round";
    context.lineJoin = "round";
    context.strokeStyle = getComputedStyle(canvas).color;
    context.fillStyle = context.strokeStyle;
    ink.current = 0;
    setSignature("");
    setTooHeavy(false);
  }, []);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (dialog && !dialog.open) dialog.showModal();
    setup();
    // A rotation or a resize changes the pad: the student signs again on a clean pad.
    window.addEventListener("resize", setup);
    return () => {
      window.removeEventListener("resize", setup);
      if (dialog?.open) dialog.close();
    };
  }, [setup]);

  const point = (event: PointerEvent<HTMLCanvasElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    return { x: event.clientX - rect.left, y: event.clientY - rect.top };
  };

  const onPointerDown = (event: PointerEvent<HTMLCanvasElement>) => {
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    const p = point(event);
    drawing.current = p;
    const context = event.currentTarget.getContext("2d");
    context?.beginPath();
    context?.arc(p.x, p.y, 1.5, 0, Math.PI * 2);
    context?.fill();
  };

  const onPointerMove = (event: PointerEvent<HTMLCanvasElement>) => {
    const last = drawing.current;
    if (!last) return;
    const p = point(event);
    const context = event.currentTarget.getContext("2d");
    if (!context) return;
    context.beginPath();
    context.moveTo(last.x, last.y);
    context.lineTo(p.x, p.y);
    context.stroke();
    ink.current += Math.hypot(p.x - last.x, p.y - last.y);
    drawing.current = p;
  };

  /** End of a stroke: exports a downscaled PNG for the form, once there is enough ink. */
  const onPointerUp = () => {
    if (!drawing.current) return;
    drawing.current = null;
    const canvas = canvasRef.current;
    if (!canvas || ink.current < MIN_INK) return;
    const scale = Math.min(1, EXPORT_WIDTH / canvas.width);
    const out = document.createElement("canvas");
    out.width = Math.round(canvas.width * scale);
    out.height = Math.round(canvas.height * scale);
    out.getContext("2d")?.drawImage(canvas, 0, 0, out.width, out.height);
    const dataUrl = out.toDataURL("image/png");
    const bytes = Math.floor(((dataUrl.length - dataUrl.indexOf(",") - 1) * 3) / 4);
    setTooHeavy(bytes > SIGNATURE_MAX_BYTES);
    setSignature(bytes > SIGNATURE_MAX_BYTES ? "" : dataUrl);
  };

  const signed = signature !== "";

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby={titleId}
      aria-describedby={statementId}
      onCancel={(event) => {
        event.preventDefault();
        onClose(false);
      }}
      className="m-0 h-dvh max-h-none w-full max-w-none bg-surface p-0 text-ink backdrop:bg-ink/60 open:animate-[dialog-in_200ms_ease-out] sm:m-auto sm:h-[min(44rem,92dvh)] sm:max-w-2xl sm:rounded-3xl sm:shadow-raised"
    >
      <form action={formAction} className="flex h-full flex-col">
        <input type="hidden" name="lessonId" value={lessonId} />
        <input type="hidden" name="signature" value={signature} />

        <div className="flex items-start justify-between gap-3 border-b border-line px-4 pt-[calc(0.75rem+env(safe-area-inset-top))] pb-3 sm:px-6 sm:pt-5">
          <div className="min-w-0">
            <p className="eyebrow">Émargement</p>
            <h2 id={titleId} className="mt-1 text-xl font-extrabold tracking-[-0.02em] text-ink">
              Signature de l&apos;élève
            </h2>
            <p className="mt-0.5 text-sm text-ink-muted">{summary}</p>
          </div>
          <button
            type="button"
            onClick={() => onClose(false)}
            className="-mr-2 flex size-12 shrink-0 items-center justify-center rounded-full text-ink-subtle hover:bg-subtle hover:text-ink"
            aria-label="Fermer sans valider"
          >
            <X className="size-6" aria-hidden />
          </button>
        </div>

        <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto px-4 py-4 sm:px-6">
          <p id={statementId} className="text-base font-semibold text-ink">
            Je confirme avoir suivi cette leçon.
            <span className="mt-0.5 block text-sm font-medium text-ink-muted">{studentName}</span>
          </p>
          <div className="relative min-h-60 flex-1 overflow-hidden rounded-3xl border-2 border-dashed border-line-strong bg-subtle/50">
            <canvas
              ref={canvasRef}
              role="img"
              aria-label={`Zone de signature de ${studentName}`}
              aria-describedby={hintId}
              onPointerDown={onPointerDown}
              onPointerMove={onPointerMove}
              onPointerUp={onPointerUp}
              onPointerCancel={onPointerUp}
              className="absolute inset-0 size-full cursor-crosshair touch-none text-ink"
            />
            {/* Signature line, under the drawing. */}
            <span aria-hidden className="pointer-events-none absolute inset-x-6 bottom-12 border-b border-line-strong" />
            {!signed && (
              <span aria-hidden className="pointer-events-none absolute inset-x-0 bottom-4 text-center text-sm text-ink-subtle">
                Signez ici avec le doigt
              </span>
            )}
          </div>
          <p id={hintId} className="text-sm text-ink-muted">
            L&apos;élève signe dans le cadre. « Effacer » pour recommencer.
          </p>
          {tooHeavy && (
            <Alert tone="warning" role="alert">
              La signature est trop lourde. Effacez-la et recommencez plus simplement.
            </Alert>
          )}
          {state.status === "error" && (
            <div ref={errorRef} tabIndex={-1} className="rounded-2xl outline-none">
              <Alert key={state.attempt} tone="danger" role="alert" title="La leçon n'a pas été validée">
                {state.message}
              </Alert>
            </div>
          )}
        </div>

        <div className="grid grid-cols-[auto_1fr] gap-2 border-t border-line px-4 pt-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] sm:px-6 sm:pb-5">
          <Button variant="secondary" size="lg" className={bigButton} icon={<Eraser className="size-5" aria-hidden />} onClick={setup}>
            Effacer
          </Button>
          <OnlineSubmitButton size="lg" className={bigButton} disabled={!signed} pendingLabel="Validation…">
            Valider la leçon
          </OnlineSubmitButton>
        </div>
      </form>
    </dialog>
  );
}
