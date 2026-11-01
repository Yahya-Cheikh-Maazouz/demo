"use client";

import { useEffect, useId, useLayoutEffect, useRef, type ReactNode } from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/cn";

type DialogProps = {
  open: boolean;
  onClose: () => void;
  title: ReactNode;
  description?: ReactNode;
  children?: ReactNode;
  /** Action buttons. Stacked full-width on mobile, right-aligned on desktop. */
  footer?: ReactNode;
  /** "drawer": full-height panel on the right from `lg` (details next to a calendar). */
  variant?: "modal" | "drawer";
  className?: string;
};

/**
 * Modal built on the native <dialog>: focus trap, Escape and inert background come for free.
 * Bottom sheet on mobile, centered panel from `sm` (or a right-hand drawer from `lg`).
 */
export function Dialog({ open, onClose, title, description, children, footer, variant = "modal", className }: DialogProps) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const descriptionId = useId();

  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  });

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  // Next.js keeps the previous page mounted but hidden (<Activity>) after a navigation. A modal
  // left open there would stay in the top layer and make the new page inert. The layout cleanup
  // runs synchronously while the page is hidden or unmounted: close it right away, and reset the
  // caller's state a tick later. React's StrictMode (dev) also runs this cleanup and remounts at
  // once: the remount cancels the reset, and the [open] effect above opens the dialog again.
  const pendingReset = useRef<ReturnType<typeof setTimeout> | null>(null);
  useLayoutEffect(() => {
    if (pendingReset.current) {
      clearTimeout(pendingReset.current);
      pendingReset.current = null;
    }
    const dialog = ref.current;
    return () => {
      if (!dialog?.open) return;
      dialog.close();
      pendingReset.current = setTimeout(() => {
        pendingReset.current = null;
        onCloseRef.current();
      }, 0);
    };
  }, []);

  return (
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      aria-describedby={description ? descriptionId : undefined}
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
      className={cn(
        "m-0 mt-auto w-full max-w-none rounded-t-3xl bg-surface p-0 text-ink shadow-raised",
        variant === "modal"
          ? "sm:m-auto sm:max-w-lg sm:rounded-3xl"
          : "sm:m-auto sm:max-w-lg sm:rounded-3xl lg:my-0 lg:mr-0 lg:ml-auto lg:h-dvh lg:max-h-dvh lg:w-[28rem] lg:max-w-none lg:rounded-r-none",
        "backdrop:bg-ink/50 backdrop:backdrop-blur-[2px]",
        "open:animate-[dialog-in_200ms_ease-out]",
        className,
      )}
    >
      <div
        className={cn(
          "max-h-[85dvh] overflow-y-auto px-5 pt-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] sm:p-6",
          variant === "drawer" && "lg:h-full lg:max-h-none",
        )}
      >
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <h2 id={titleId} className="text-lg font-bold text-ink">
              {title}
            </h2>
            {description && (
              <p id={descriptionId} className="mt-1 text-sm text-ink-muted">
                {description}
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="-mt-1 -mr-2 flex size-11 shrink-0 items-center justify-center rounded-full text-ink-subtle hover:bg-subtle hover:text-ink"
            aria-label="Fermer"
          >
            <X className="size-5" aria-hidden />
          </button>
        </div>
        {children && <div className="mt-4">{children}</div>}
        {footer && <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">{footer}</div>}
      </div>
    </dialog>
  );
}
