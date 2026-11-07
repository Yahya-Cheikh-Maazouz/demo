"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";
import { ArrowRight, CircleCheck, Lightbulb, RotateCcw } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { ProgressRing } from "@/features/suivi/progress-ring";
import { cn } from "@/lib/cn";
import { formatDate } from "@/lib/format";
import type { EvaluationQuestion, EvaluationResult } from "@/lib/types";
import { questionNumber, scoreMessage } from "./wording";

type EvaluationResultViewProps = {
  questions: EvaluationQuestion[];
  result: EvaluationResult;
  /** Right after submitting: move the focus to the score (the form it replaces is gone). */
  focusOnMount?: boolean;
};

/** Score and, for each question, the chosen answer, the correct one and the explanation. */
export function EvaluationResultView({ questions, result, focusOnMount = false }: EvaluationResultViewProps) {
  const headingRef = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    if (focusOnMount) headingRef.current?.focus();
  }, [focusOnMount]);

  const percent = result.total === 0 ? 0 : Math.round((result.score / result.total) * 100);
  const labelOf = (question: EvaluationQuestion | undefined, optionId: string) =>
    question?.options.find((o) => o.id === optionId)?.label ?? "—";

  return (
    <div className="space-y-6">
      <section
        aria-labelledby="evaluation-score"
        className="flex flex-col gap-5 rounded-3xl border border-brand/15 bg-linear-to-br from-brand-soft via-surface to-surface p-5 shadow-card sm:flex-row sm:items-center sm:gap-7 sm:p-7"
      >
        <ProgressRing value={percent} className="size-24 sm:size-28" trackClassName="text-brand/10">
          <span className="text-2xl font-extrabold tracking-tight text-ink tabular-nums" aria-hidden>
            {result.score}/{result.total}
          </span>
        </ProgressRing>
        <div className="min-w-0 flex-1">
          <p className="eyebrow">Votre résultat</p>
          <h2
            id="evaluation-score"
            ref={headingRef}
            tabIndex={-1}
            className="mt-1.5 text-2xl font-extrabold tracking-[-0.02em] text-ink outline-none sm:text-3xl"
          >
            <span className="tabular-nums">
              {result.score} / {result.total}
            </span>{" "}
            {result.score > 1 ? "bonnes réponses" : "bonne réponse"}
          </h2>
          <p className="mt-1.5 text-base text-ink-muted">{scoreMessage(result.score, result.total)}</p>
          <p className="mt-3 text-sm text-ink-subtle">Questionnaire envoyé le {formatDate(result.submittedAt)}.</p>
        </div>
        <Link
          href="/eleve/suivi"
          className="inline-flex h-11 shrink-0 items-center gap-1.5 self-start rounded-lg px-2 text-sm font-semibold text-brand transition-colors hover:bg-brand-soft sm:self-center"
        >
          Voir mon livret
          <ArrowRight className="size-4" aria-hidden />
        </Link>
      </section>

      <section aria-labelledby="evaluation-corrections">
        <h2 id="evaluation-corrections" className="mb-3 px-1 text-lg font-bold tracking-[-0.01em] text-ink">
          Vos réponses et les corrections
        </h2>
        <ol className="space-y-4">
          {result.answers.map((answer) => {
            const index = questions.findIndex((q) => q.id === answer.questionId);
            const question = questions[index];
            const correct = answer.chosen === answer.correct;
            return (
              <li key={answer.questionId}>
                <article className="rounded-3xl border border-line/80 bg-surface p-4 shadow-card sm:p-5">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <h3 className="flex items-start gap-3 text-base font-bold text-ink">
                      <span
                        aria-hidden
                        className="flex h-7 min-w-9 shrink-0 items-center justify-center rounded-lg bg-brand-soft px-2 text-xs font-bold text-brand tabular-nums"
                      >
                        {questionNumber(index + 1)}
                      </span>
                      <span className="pt-0.5">
                        <span className="sr-only">Question {index + 1} : </span>
                        {question?.label}
                      </span>
                    </h3>
                    <Badge tone={correct ? "success" : "warning"} icon={correct ? CircleCheck : RotateCcw} className="self-start">
                      {correct ? "Bonne réponse" : "À revoir"}
                    </Badge>
                  </div>

                  <dl className="mt-4 grid gap-2 sm:grid-cols-2">
                    <div className={cn("rounded-2xl border px-4 py-3", correct ? "border-success/25 bg-success-soft" : "border-line bg-subtle")}>
                      <dt className="text-xs font-semibold text-ink-subtle">Votre réponse</dt>
                      <dd className={cn("font-semibold", correct ? "text-success" : "text-ink")}>
                        {labelOf(question, answer.chosen)}
                      </dd>
                    </div>
                    {!correct && (
                      <div className="rounded-2xl border border-success/25 bg-success-soft px-4 py-3">
                        <dt className="text-xs font-semibold text-ink-subtle">Bonne réponse</dt>
                        <dd className="font-semibold text-success">{labelOf(question, answer.correct)}</dd>
                      </div>
                    )}
                  </dl>

                  <p className="mt-3 flex items-start gap-2 text-sm text-ink-muted">
                    <Lightbulb className="mt-0.5 size-4 shrink-0 text-brand" aria-hidden />
                    {answer.explanation}
                  </p>
                </article>
              </li>
            );
          })}
        </ol>
      </section>
    </div>
  );
}
