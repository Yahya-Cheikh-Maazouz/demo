"use client";

import { useActionState, useEffect, useId, useRef, useState } from "react";
import { Building2, Check, CircleCheck, Copy, ExternalLink, KeyRound, Mail, RotateCcw } from "lucide-react";
import { Alert } from "@/components/ui/alert";
import { Button, ButtonLink } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Field, TextField, inputStyles } from "@/components/ui/field";
import { SubmitButton } from "@/components/ui/submit-button";
import { useFocusAfterError } from "@/components/ui/use-focus-after-error";
import { RadioCard } from "@/features/paiements/radio-card";
import { cn } from "@/lib/cn";
import { formatCurrency } from "@/lib/format";
import type { CreatedSchool, PlatformPlan } from "@/lib/types";
import { INITIAL_CREATE_SCHOOL_STATE, type CreateSchoolState } from "./action-state";
import { createSchoolAction } from "./actions";

const TRIALS = [
  { value: "0", label: "Sans essai", text: "Premier paiement à la création." },
  { value: "14", label: "14 jours", text: "Essai gratuit, puis paiement." },
  { value: "30", label: "30 jours", text: "Essai gratuit, puis paiement." },
];

/** "Auto-école Les Lilas" → "les-lilas": generic words dropped, accents removed, 30 characters max. */
function suggestSlug(name: string): string {
  return name
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/\bauto[\s-]*ecole\b/g, " ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 30)
    .replace(/-+$/g, "");
}

const plural = (count: number, one: string, many: string) => `${count} ${count > 1 ? many : one}`;

/**
 * Creation of an auto-école in one step (spec, section 2): name, SIRET, gérant's e-mail, plan,
 * subdomain and trial. On success, shows the school's address and the gérant's provisional
 * password once (the mock sends no e-mail).
 */
export function CreateSchoolForm({ plans, domain }: { plans: PlatformPlan[]; domain: string }) {
  const [state, formAction] = useActionState(createSchoolAction, INITIAL_CREATE_SCHOOL_STATE);
  const [dismissed, setDismissed] = useState<number | null>(null);

  if (state.status === "success" && state.created && dismissed !== state.attempt) {
    return <CreatedPanel school={state.created} onCreateAnother={() => setDismissed(state.attempt ?? 0)} />;
  }
  // After "Créer une autre auto-école", start again from an empty form.
  const fresh = state.status === "success";
  return (
    <SchoolForm
      key={fresh ? `new-${state.attempt}` : "form"}
      state={fresh ? INITIAL_CREATE_SCHOOL_STATE : state}
      formAction={formAction}
      plans={plans}
      domain={domain}
    />
  );
}

function SchoolForm({
  state,
  formAction,
  plans,
  domain,
}: {
  state: CreateSchoolState;
  formAction: (formData: FormData) => void;
  plans: PlatformPlan[];
  domain: string;
}) {
  const formRef = useRef<HTMLFormElement>(null);
  const alertRef = useRef<HTMLDivElement>(null);
  useFocusAfterError(formRef, state, undefined, alertRef);
  // The subdomain follows the name until it is edited by hand.
  const [slug, setSlug] = useState(state.values?.slug ?? "");
  const [slugEdited, setSlugEdited] = useState(Boolean(state.values?.slug));
  const planErrorId = useId();
  const trialErrorId = useId();
  const errors = state.fieldErrors ?? {};
  const values = state.values ?? {};

  return (
    <form ref={formRef} key={state.attempt ?? 0} action={formAction} noValidate className="space-y-6">
      {state.status === "error" && state.message && (
        <div ref={alertRef} tabIndex={-1} className="rounded-2xl outline-none">
          <Alert tone="danger" role="alert" title="L'auto-école n'a pas été créée">
            {state.message}
          </Alert>
        </div>
      )}

      <Card className="space-y-5 p-5 sm:p-6">
        <h2 className="text-base font-bold tracking-[-0.01em] text-ink">Identité de l&apos;auto-école</h2>
        <TextField
          label="Nom de l'auto-école"
          name="name"
          autoComplete="organization"
          required
          maxLength={80}
          defaultValue={values.name}
          error={errors.name}
          onChange={(event) => {
            if (!slugEdited) setSlug(suggestSlug(event.currentTarget.value));
          }}
        />
        <TextField
          label="SIRET"
          name="siret"
          inputMode="numeric"
          autoComplete="off"
          required
          maxLength={17}
          defaultValue={values.siret}
          error={errors.siret}
          hint="14 chiffres, sur l'extrait Kbis ou l'avis de situation INSEE."
          className="max-w-xs"
        />
        <TextField
          label="E-mail du gérant"
          name="gerantEmail"
          type="email"
          inputMode="email"
          autoComplete="off"
          autoCapitalize="none"
          spellCheck={false}
          required
          defaultValue={values.gerantEmail}
          error={errors.gerantEmail}
          hint="Le gérant reçoit une invitation avec un mot de passe provisoire. C'est le seul compte de l'auto-école au départ."
        />
        <Field
          label="Sous-domaine"
          required
          error={errors.slug}
          hint={
            <>
              Lettres minuscules sans accent, chiffres et tirets, de 3 à 30 caractères. «&nbsp;admin&nbsp;», «&nbsp;www&nbsp;»,
              «&nbsp;api&nbsp;», «&nbsp;app&nbsp;» et «&nbsp;static&nbsp;» sont réservés.
            </>
          }
        >
          {({ id, describedBy, invalid }) => (
            <div
              className={cn(
                "flex h-12 w-full items-stretch overflow-hidden rounded-xl border bg-surface transition-[border-color,box-shadow] duration-150",
                "focus-within:border-brand focus-within:ring-4 focus-within:ring-brand/15",
                invalid ? "border-danger focus-within:ring-danger/15" : "border-line-strong",
              )}
            >
              <input
                id={id}
                name="slug"
                required
                aria-describedby={describedBy}
                aria-invalid={invalid || undefined}
                autoCapitalize="none"
                autoCorrect="off"
                autoComplete="off"
                spellCheck={false}
                maxLength={30}
                value={slug}
                onChange={(event) => {
                  setSlugEdited(true);
                  setSlug(event.currentTarget.value.toLowerCase());
                }}
                className="min-w-0 flex-1 bg-transparent px-3.5 text-base text-ink placeholder:text-ink-subtle focus:outline-none"
                placeholder="mon-auto-ecole"
              />
              <span className="flex max-w-[55%] items-center truncate border-l border-line bg-subtle px-3 text-sm text-ink-muted">
                .{domain}
              </span>
            </div>
          )}
        </Field>
      </Card>

      <Card className="p-5 sm:p-6">
        <fieldset aria-describedby={errors.planId ? planErrorId : undefined}>
          <legend className="text-base font-bold tracking-[-0.01em] text-ink">
            Formule d&apos;abonnement <span className="text-danger" aria-hidden>*</span>
          </legend>
          <p className="mt-0.5 text-sm text-ink-muted">Limites d&apos;usage : avertissement à 80 %, création bloquée à 100 %.</p>
          {errors.planId && (
            <p id={planErrorId} className="mt-2 text-sm font-medium text-danger">
              {errors.planId}
            </p>
          )}
          <div className="mt-4 grid gap-3 md:grid-cols-3">
            {plans.map((plan, index) => {
              const titleId = `plan-${plan.id}`;
              return (
                <RadioCard
                  key={plan.id}
                  name="planId"
                  value={plan.id}
                  defaultChecked={values.planId ? values.planId === plan.id : index === 0}
                  aria-labelledby={titleId}
                  invalid={Boolean(errors.planId)}
                >
                  <span className="min-w-0">
                    <span id={titleId} className="block font-bold text-ink">
                      {plan.name} · {formatCurrency(plan.monthlyPrice, { round: true })} / mois
                    </span>
                    <span className="mt-1 block text-sm text-ink-muted">
                      {plural(plan.limits.students, "élève actif", "élèves actifs")} · {plural(plan.limits.instructors, "moniteur", "moniteurs")} ·{" "}
                      {plural(plan.limits.offices, "site", "sites")}
                    </span>
                  </span>
                </RadioCard>
              );
            })}
          </div>
        </fieldset>

        <fieldset className="mt-6" aria-describedby={errors.trialDays ? trialErrorId : undefined}>
          <legend className="text-base font-bold tracking-[-0.01em] text-ink">
            Période d&apos;essai <span className="text-danger" aria-hidden>*</span>
          </legend>
          {errors.trialDays && (
            <p id={trialErrorId} className="mt-2 text-sm font-medium text-danger">
              {errors.trialDays}
            </p>
          )}
          <div className="mt-3 grid gap-3 sm:grid-cols-3">
            {TRIALS.map((trial) => (
              <RadioCard
                key={trial.value}
                name="trialDays"
                value={trial.value}
                defaultChecked={(values.trialDays ?? "14") === trial.value}
                aria-labelledby={`essai-${trial.value}`}
                invalid={Boolean(errors.trialDays)}
              >
                <span className="min-w-0">
                  <span id={`essai-${trial.value}`} className="block font-bold text-ink">
                    {trial.label}
                  </span>
                  <span className="mt-0.5 block text-sm text-ink-muted">{trial.text}</span>
                </span>
              </RadioCard>
            ))}
          </div>
        </fieldset>
      </Card>

      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-end">
        <ButtonLink href="/admin" variant="ghost" size="lg">
          Annuler
        </ButtonLink>
        <SubmitButton size="lg" pendingLabel="Création…" icon={<Building2 className="size-5" aria-hidden />}>
          Créer l&apos;auto-école
        </SubmitButton>
      </div>
    </form>
  );
}

function CreatedPanel({ school, onCreateAnother }: { school: CreatedSchool; onCreateAnother: () => void }) {
  const headingRef = useRef<HTMLHeadingElement>(null);
  useEffect(() => headingRef.current?.focus(), []);

  return (
    <Card className="overflow-hidden">
      <div role="status" className="border-b border-success/20 bg-success-soft px-5 py-5 sm:px-6">
        <p className="flex items-center gap-2 text-sm font-semibold text-success">
          <CircleCheck className="size-5" aria-hidden />
          Auto-école créée
        </p>
        <h2 ref={headingRef} tabIndex={-1} className="mt-2 text-2xl font-extrabold tracking-[-0.02em] text-ink outline-none">
          {school.name} est prête
        </h2>
        <p className="mt-1 text-sm text-ink-muted">Réglages par défaut appliqués. Le gérant est le seul compte de l&apos;auto-école.</p>
      </div>

      <dl className="divide-y divide-line px-5 sm:px-6">
        <div className="py-4">
          <dt className="text-sm font-semibold text-ink-muted">Adresse de l&apos;espace</dt>
          <dd className="mt-1">
            <a
              href={school.url}
              target="_blank"
              rel="noreferrer"
              className="inline-flex min-h-11 items-center gap-1.5 font-semibold break-all text-brand hover:underline"
            >
              {school.url.replace(/^https?:\/\//, "")}
              <ExternalLink className="size-4 shrink-0" aria-hidden />
              <span className="sr-only">(nouvel onglet)</span>
            </a>
          </dd>
        </div>
        <div className="py-4">
          <dt className="flex items-center gap-1.5 text-sm font-semibold text-ink-muted">
            <Mail className="size-4" aria-hidden />
            Identifiant du gérant
          </dt>
          <dd className="mt-1 font-semibold break-all text-ink">{school.gerantEmail}</dd>
        </div>
        <div className="py-4">
          <dt className="flex items-center gap-1.5 text-sm font-semibold text-ink-muted">
            <KeyRound className="size-4" aria-hidden />
            Mot de passe provisoire
          </dt>
          <dd className="mt-2">
            <CopyValue value={school.provisionalPassword} label="le mot de passe provisoire" />
          </dd>
        </div>
      </dl>

      <div className="space-y-4 px-5 pb-5 sm:px-6 sm:pb-6">
        <Alert tone="warning" title="Affiché une seule fois">
          Notez-le maintenant : il ne sera plus visible. En démonstration, aucun e-mail n&apos;est envoyé : transmettez-le au
          gérant par un canal sûr. À sa première connexion, il devra le remplacer et activer la double authentification
          (écrans à venir).
        </Alert>
        <div className="flex flex-col gap-2 sm:flex-row">
          <ButtonLink href={`/admin/auto-ecoles/${school.slug}`} size="lg">
            Voir la fiche de l&apos;auto-école
          </ButtonLink>
          <Button variant="secondary" size="lg" onClick={onCreateAnother} icon={<RotateCcw className="size-4" aria-hidden />}>
            Créer une autre auto-école
          </Button>
        </div>
      </div>
    </Card>
  );
}

/** Read-only value with a copy button (falls back to selecting the text). */
function CopyValue({ value, label }: { value: string; label: string }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!copied) return;
    const timer = setTimeout(() => setCopied(false), 4000);
    return () => clearTimeout(timer);
  }, [copied]);

  async function copy() {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
    } catch {
      inputRef.current?.focus();
      inputRef.current?.select();
    }
  }

  return (
    <div className="flex flex-col gap-2 sm:flex-row">
      <input
        ref={inputRef}
        type="text"
        readOnly
        value={value}
        aria-label={label.charAt(0).toUpperCase() + label.slice(1)}
        spellCheck={false}
        onFocus={(event) => event.currentTarget.select()}
        className={cn(inputStyles, "bg-subtle font-mono text-lg font-bold tracking-wider text-ink sm:max-w-xs")}
        data-testid="mot-de-passe-provisoire"
      />
      <Button
        variant="secondary"
        size="lg"
        onClick={copy}
        className={cn(copied && "border-success/40 text-success")}
        icon={copied ? <Check className="size-4" aria-hidden /> : <Copy className="size-4" aria-hidden />}
      >
        {copied ? "Copié" : "Copier"}
      </Button>
      <p aria-live="polite" className="sr-only">
        {copied ? "Mot de passe copié dans le presse-papiers." : ""}
      </p>
    </div>
  );
}
