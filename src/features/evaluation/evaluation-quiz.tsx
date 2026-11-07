"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { CircleAlert, Info, Send } from "lucide-react";
import { Alert } from "@/components/ui/alert";
import { SubmitButton } from "@/components/ui/submit-button";
import { cn } from "@/lib/cn";
import type { EvaluationQuestion, StartingEvaluation } from "@/lib/types";
import { ANSWER_PREFIX, INITIAL_EVALUATION_STATE } from "./action-state";
import { submitEvaluationAction } from "./actions";
import { EvaluationResultView } from "./evaluation-result";
import { questionNumber, questionsLabel } from "./wording";

/**
 * The starting evaluation: the questionnaire, then (one attempt) the score and the corrections.
 * Answers are controlled so they survive a failed submit; the form is remounted on every result
 * because React resets a form after an action. After a failed submit, focus goes to the first
 * question left unanswered.
 */
export function EvaluationQuiz({ evaluation }: { evaluation: StartingEvaluation }) {
  const [state, formAction] = useActionState(submitEvaluationAction, INITIAL_EVALUATION_STATE);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const formRef = useRef<HTMLFormElement>(null);
  const errorRef = useRef<HTMLDivElement>(null);
  // After a failed submit (the button was disabled while pending): to the first question left
  // unanswered, or to the error message when the error is not tied to a question.
  useEffect(() => {
    if (state.status !== "error") return;
    const firstUnanswered = formRef.current?.querySelector<HTMLInputElement>('fieldset[data-invalid] input[type="radio"]');
    (firstUnanswered ?? errorRef.current)?.focus();
  }, [state]);

  // The page is refreshed after a submit; the action's own result shows it without waiting.
  const result = evaluation.result ?? (state.status === "success" ? state.result : undefined);
  if (result) {
    return <EvaluationResultView questions={evaluation.questions} result={result} focusOnMount={state.status !== "idle"} />;
  }

  const { questions } = evaluation;
  const total = questions.length;
  const answered = questions.filter((q) => answers[q.id]).length;
  const errorOf = (question: EvaluationQuestion) =>
    state.status === "error" && !answers[question.id] ? state.fieldErrors?.[question.id] : undefined;
  // As at submit time: the alert is a live region, its text must not change while answering.
  const missing = questions.flatMap((q, index) => (state.status === "error" && state.fieldErrors?.[q.id] ? [index + 1] : []));

  return (
    <form key={state.attempt ?? 0} ref={formRef} action={formAction} noValidate className="space-y-4">
      <div className="flex flex-col gap-1 px-1 sm:flex-row sm:items-end sm:justify-between sm:gap-4">
        <div className="min-w-0">
          <h2 className="text-lg font-bold tracking-[-0.01em] text-ink">{evaluation.title}</h2>
          <p className="text-sm font-semibold text-ink-muted">{questionsLabel(total)}</p>
        </div>
        <p className="text-sm text-ink-subtle">Une seule réponse possible par question</p>
      </div>

      <ol className="space-y-4">
        {questions.map((question, index) => (
          <li key={question.id}>
            <QuestionCard
              question={question}
              index={index}
              total={total}
              value={answers[question.id]}
              error={errorOf(question)}
              onChange={(optionId) => setAnswers((current) => ({ ...current, [question.id]: optionId }))}
            />
          </li>
        ))}
      </ol>

      {state.status === "error" && state.message && (
        <div ref={errorRef} tabIndex={-1} className="rounded-2xl outline-none">
          <Alert key={state.attempt} tone="danger" role="alert" title={state.message}>
            {missing.length > 0 &&
              `${missing.length > 1 ? "Questions sans réponse" : "Question sans réponse"} : ${missing.map(questionNumber).join(", ")}.`}
          </Alert>
        </div>
      )}

      <div className="flex flex-col gap-4 rounded-3xl border border-line/80 bg-surface p-4 shadow-card sm:flex-row sm:items-center sm:justify-between sm:px-5">
        <div className="flex items-start gap-3 text-sm">
          <Info className="mt-0.5 size-4 shrink-0 text-ink-subtle" aria-hidden />
          <p className="text-ink-muted">
            <span className="block font-semibold text-ink">Vérifiez vos réponses avant de valider.</span>
            Une seule tentative : vos réponses ne pourront plus être modifiées.
          </p>
        </div>
        <div className="flex flex-col items-stretch gap-2 sm:items-end">
          <p className="text-sm font-medium text-ink-muted tabular-nums sm:text-right">
            {answered} / {total} {total > 1 ? "questions répondues" : "question répondue"}
          </p>
          <SubmitButton
            size="lg"
            icon={<Send className="size-5" aria-hidden />}
            pendingLabel="Envoi…"
            className="w-full sm:w-auto"
          >
            Valider mes réponses
          </SubmitButton>
        </div>
      </div>
    </form>
  );
}

function QuestionCard({
  question,
  index,
  total,
  value,
  error,
  onChange,
}: {
  question: EvaluationQuestion;
  index: number;
  total: number;
  value: string | undefined;
  error: string | undefined;
  onChange: (optionId: string) => void;
}) {
  const errorId = `erreur-${question.id}`;
  return (
    <fieldset
      data-invalid={error ? "" : undefined}
      aria-describedby={error ? errorId : undefined}
      className={cn(
        "min-w-0 rounded-3xl border bg-surface shadow-card transition-colors",
        error ? "border-danger/50 ring-4 ring-danger/10" : "border-line/80",
      )}
    >
      {/* Floated so the legend sits inside the card instead of on its border. */}
      <legend className="float-left flex w-full items-start gap-3 border-b border-line px-4 py-4 sm:px-5">
        <span
          aria-hidden
          className="flex h-7 min-w-9 shrink-0 items-center justify-center rounded-lg bg-brand-soft px-2 text-xs font-bold text-brand tabular-nums"
        >
          {questionNumber(index + 1)}
        </span>
        <span className="pt-0.5 text-base font-bold text-ink">
          <span className="sr-only">
            Question {index + 1} sur {total} :{" "}
          </span>
          {question.label}
        </span>
      </legend>

      <div className="clear-left space-y-3 p-3 sm:p-4">
        <div className="grid gap-2 sm:grid-cols-3">
          {question.options.map((option) => {
            const checked = value === option.id;
            return (
              <label
                key={option.id}
                className={cn(
                  "flex min-h-14 cursor-pointer items-center gap-3 rounded-2xl border px-4 py-3 text-sm font-semibold transition-colors",
                  checked ? "border-brand bg-brand-soft text-ink" : "border-line-strong/70 text-ink hover:bg-subtle",
                )}
              >
                <input
                  type="radio"
                  name={`${ANSWER_PREFIX}${question.id}`}
                  value={option.id}
                  checked={checked}
                  onChange={() => onChange(option.id)}
                  className="size-5 shrink-0 appearance-none rounded-full border-2 border-line-strong bg-surface transition-[border-width,border-color] duration-150 checked:border-[6px] checked:border-brand"
                />
                {option.label}
              </label>
            );
          })}
        </div>
        {error && (
          <p id={errorId} className="flex items-start gap-1.5 px-1 text-sm font-medium text-danger">
            <CircleAlert className="mt-0.5 size-4 shrink-0" aria-hidden />
            {error}
          </p>
        )}
      </div>
    </fieldset>
  );
}
