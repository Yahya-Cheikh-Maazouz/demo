import { ClipboardCheck } from "lucide-react";
import { LoadingLabel, Skeleton } from "@/components/ui/skeleton";
import { getStartingEvaluation } from "@/lib/api/eleve";
import { EvaluationQuiz } from "./evaluation-quiz";

/** The questionnaire, or the result once answered. Render inside <Suspense>. */
export async function EvaluationSection() {
  const evaluation = await getStartingEvaluation();
  if (evaluation.questions.length === 0 && !evaluation.result) return <NoEvaluation />;
  return <EvaluationQuiz evaluation={evaluation} />;
}

/** When the school has not published its questionnaire yet. */
function NoEvaluation() {
  return (
    <div className="flex flex-col items-center rounded-3xl border border-line/80 bg-surface px-6 py-10 text-center shadow-card">
      <span className="flex size-12 items-center justify-center rounded-2xl bg-subtle text-ink-subtle">
        <ClipboardCheck className="size-6" aria-hidden />
      </span>
      <h2 className="mt-4 font-semibold text-ink">Pas encore de questionnaire</h2>
      <p className="mt-1 max-w-sm text-sm text-ink-muted">
        Votre auto-école n&apos;a pas encore mis en ligne son évaluation de départ. Elle vous préviendra dès qu&apos;elle sera
        disponible.
      </p>
    </div>
  );
}

function QuestionSkeleton() {
  return (
    <div className="rounded-3xl border border-line/80 bg-surface shadow-card">
      <div className="flex items-center gap-3 border-b border-line px-4 py-4 sm:px-5">
        <Skeleton className="h-7 w-9 shrink-0" />
        <Skeleton className="h-5 w-80 max-w-full" />
      </div>
      <div className="grid gap-2 p-3 sm:grid-cols-3 sm:p-4">
        {[0, 1, 2].map((i) => (
          <Skeleton key={i} className="h-14 rounded-2xl" />
        ))}
      </div>
    </div>
  );
}

/** The questionnaire's footprint (first visit, the most common case): title, 3 questions, footer. */
export function EvaluationSectionSkeleton() {
  return (
    <div className="space-y-4">
      <LoadingLabel>Chargement du questionnaire…</LoadingLabel>
      <div className="flex flex-col gap-1.5 px-1 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-1.5">
          <Skeleton className="h-6 w-72 max-w-full" />
          <Skeleton className="h-4 w-24" />
        </div>
        <Skeleton className="h-4 w-64 max-w-full" />
      </div>
      <QuestionSkeleton />
      <QuestionSkeleton />
      <QuestionSkeleton />
    </div>
  );
}
