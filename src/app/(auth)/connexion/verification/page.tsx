import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { ArrowLeft, FlaskConical, ShieldCheck } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { PageHeader } from "@/components/ui/page-header";
import { Skeleton } from "@/components/ui/skeleton";
import { SubmitButton } from "@/components/ui/submit-button";
import { cancelTwoFactor } from "@/features/auth/actions";
import { FormSkeleton } from "@/features/auth/auth-skeletons";
import { getPendingTwoFactorUser } from "@/features/auth/pending-2fa";
import { loginPath, readSuiteParam } from "@/features/auth/redirect";
import { RequireTenant } from "@/features/auth/tenant-gate";
import { VerificationForm } from "@/features/auth/verification-form";
import { getDemoAccounts } from "@/lib/api/auth";
import { initials, maskEmail } from "@/lib/format";

export const metadata: Metadata = { title: "Vérification en deux étapes" };

async function VerificationSection({ searchParams }: Pick<PageProps<"/connexion/verification">, "searchParams">) {
  const [user, params, demoAccounts] = await Promise.all([getPendingTwoFactorUser(), searchParams, getDemoAccounts()]);
  const suite = readSuiteParam(params.suite);
  // No password step in progress (or it expired after 5 minutes).
  if (!user) redirect(loginPath(suite));
  const demoCode = demoAccounts.find((account) => account.email === user.email)?.totpCode;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 rounded-2xl border border-line bg-subtle/60 p-3">
        <Avatar initials={initials(user.firstName, user.lastName)} />
        <div className="min-w-0 text-sm">
          <p className="truncate font-semibold text-ink">
            {user.firstName} {user.lastName}
          </p>
          <p className="truncate text-ink-muted">{maskEmail(user.email)}</p>
        </div>
      </div>

      <VerificationForm suite={suite} />

      {demoCode && (
        <p className="flex items-center gap-2 rounded-xl border border-dashed border-line-strong bg-subtle/60 px-3 py-2.5 text-sm text-ink-muted">
          <FlaskConical className="size-4 shrink-0 text-ink-subtle" aria-hidden />
          <span>
            Démonstration&nbsp;: le code est <span className="font-semibold text-ink tabular-nums">{demoCode}</span>
          </span>
        </p>
      )}

      <form action={cancelTwoFactor} className="border-t border-line pt-4">
        {suite && <input type="hidden" name="suite" value={suite} />}
        <SubmitButton
          variant="ghost"
          size="lg"
          fullWidth
          pendingLabel="Retour à la connexion…"
          icon={<ArrowLeft className="size-5" aria-hidden />}
        >
          Revenir à la connexion
        </SubmitButton>
      </form>
    </div>
  );
}

function VerificationSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-16 w-full rounded-2xl" />
      <FormSkeleton fields={1} />
    </div>
  );
}

export default function VerificationPage({ searchParams }: PageProps<"/connexion/verification">) {
  return (
    <RequireTenant fallback={<FormSkeleton heading fields={1} />}>
      <span className="mb-5 flex size-12 items-center justify-center rounded-2xl bg-brand-soft text-brand">
        <ShieldCheck className="size-6" aria-hidden />
      </span>
      <PageHeader
        title="Vérification en deux étapes"
        description="Pour protéger votre compte, saisissez le code affiché dans votre application d'authentification."
      />
      <Suspense fallback={<VerificationSkeleton />}>
        <VerificationSection searchParams={searchParams} />
      </Suspense>
    </RequireTenant>
  );
}
