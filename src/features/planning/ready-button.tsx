"use client";

import { useActionState } from "react";
import { Check } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { SubmitButton } from "@/components/ui/submit-button";
import { INITIAL_PLANNING_STATE } from "./action-state";
import { readyForLessonAction } from "./actions";

/** "Je suis prêt(e)": the student tells the instructor they will attend. Once sent, a badge. */
export function ReadyButton({ lessonId, ready, size = "md" }: { lessonId: string; ready: boolean; size?: "sm" | "md" }) {
  const [state, formAction] = useActionState(readyForLessonAction, INITIAL_PLANNING_STATE);
  if (ready) {
    return (
      <Badge tone="success" icon={Check}>
        Présence confirmée
      </Badge>
    );
  }
  return (
    <form action={formAction} className="contents">
      <input type="hidden" name="lessonId" value={lessonId} />
      <SubmitButton size={size} icon={<Check className="size-4" aria-hidden />} pendingLabel="Envoi…">
        Je suis prêt(e)
      </SubmitButton>
      {state.status === "error" && (
        <p role="alert" className="w-full text-sm text-danger">
          {state.message}
        </p>
      )}
    </form>
  );
}
