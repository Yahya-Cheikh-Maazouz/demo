"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { X } from "lucide-react";
import { Alert } from "@/components/ui/alert";
import type { Tone } from "@/components/ui/tone";

type Feedback = { id: number; tone: Extract<Tone, "success" | "warning" | "danger">; message: string };

type FeedbackContextValue = {
  feedback: Feedback | null;
  announce: (message: string, tone?: Feedback["tone"]) => void;
  dismiss: () => void;
};

const FeedbackContext = createContext<FeedbackContextValue | null>(null);

/**
 * Holds the confirmation of an action whose trigger disappears with it: a confirmed request leaves
 * the list, a signed lesson loses its "Faire émarger" button after the refresh. The message lives
 * here, above the content, so it survives that re-render.
 */
export function InstructorFeedbackProvider({ children }: { children: ReactNode }) {
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const announce = useCallback((message: string, tone: Feedback["tone"] = "success") => {
    setFeedback((current) => ({ id: (current?.id ?? 0) + 1, tone, message }));
  }, []);
  const dismiss = useCallback(() => setFeedback(null), []);
  // Next.js keeps this page mounted but hidden (<Activity>) after a navigation. Without this reset,
  // coming back to the page would show the old confirmation again and move the focus to it.
  useLayoutEffect(() => () => setFeedback(null), []);
  const value = useMemo(() => ({ feedback, announce, dismiss }), [feedback, announce, dismiss]);
  return <FeedbackContext value={value}>{children}</FeedbackContext>;
}

export function useInstructorFeedback() {
  const value = useContext(FeedbackContext);
  if (!value) throw new Error("useInstructorFeedback must be used inside <InstructorFeedbackProvider>");
  return value;
}

/**
 * Polite live region showing the last confirmation. It takes the focus when a message arrives,
 * because the button that triggered the action no longer exists.
 */
export function InstructorFeedbackRegion() {
  const { feedback, dismiss } = useInstructorFeedback();
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!feedback) return;
    // After the dialog has closed (it gives the focus back to its now-removed trigger).
    const timer = setTimeout(() => ref.current?.focus(), 50);
    return () => clearTimeout(timer);
  }, [feedback]);

  return (
    <div aria-live="polite" aria-atomic="true">
      {feedback && (
        <div ref={ref} tabIndex={-1} className="mb-4 scroll-mt-24 rounded-2xl outline-none">
          <Alert
            key={feedback.id}
            tone={feedback.tone}
            className="animate-[dialog-in_200ms_ease-out] pr-2"
            title={
              <span className="flex items-start justify-between gap-2">
                <span className="pt-0.5">{feedback.message}</span>
                <button
                  type="button"
                  onClick={dismiss}
                  className="-mt-2.5 -mb-2 flex size-11 shrink-0 items-center justify-center rounded-full text-ink-subtle hover:bg-ink/5 hover:text-ink"
                  aria-label="Masquer ce message"
                >
                  <X className="size-5" aria-hidden />
                </button>
              </span>
            }
          />
        </div>
      )}
    </div>
  );
}
