import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { PageHeader } from "@/components/ui/page-header";
import { FormSkeleton } from "@/features/auth/auth-skeletons";
import { LoginForm, type LoginNotice } from "@/features/auth/login-form";
import { readSuiteParam, safeNextPath, type LoginMotif } from "@/features/auth/redirect";
import { RequireTenant } from "@/features/auth/tenant-gate";
import { getDemoAccounts } from "@/lib/api/auth";
import { getSession } from "@/lib/session";
import { isPlatformRequest } from "@/lib/tenant";

export const metadata: Metadata = { title: "Connexion" };

const NOTICES: Record<LoginMotif, LoginNotice> = {
  "verification-expiree": {
    tone: "info",
    text: "Le délai pour saisir le code est dépassé. Reconnectez-vous pour recommencer la vérification.",
  },
  "trop-de-codes": {
    tone: "warning",
    title: "Vérification annulée",
    text: "Trop de codes incorrects. Pour votre sécurité, reconnectez-vous avec votre mot de passe.",
  },
};

async function LoginSection({ searchParams }: Pick<PageProps<"/connexion">, "searchParams">) {
  const [session, params, demoAccounts, platform] = await Promise.all([
    getSession(),
    searchParams,
    getDemoAccounts(),
    isPlatformRequest(),
  ]);
  const suite = readSuiteParam(params.suite);
  // Already signed in: go straight to the requested page or the user's space.
  if (session) redirect(safeNextPath(suite, session.user.role));

  const motif = readSuiteParam(params.motif);
  const notice = motif && Object.hasOwn(NOTICES, motif) ? NOTICES[motif as LoginMotif] : undefined;

  return <LoginForm suite={suite} notice={notice} demoAccounts={demoAccounts} platform={platform} />;
}

export default function LoginPage({ searchParams }: PageProps<"/connexion">) {
  return (
    <RequireTenant>
      <PageHeader title="Connexion" description="Connectez-vous pour accéder à votre espace." />
      <Suspense fallback={<FormSkeleton />}>
        <LoginSection searchParams={searchParams} />
      </Suspense>
    </RequireTenant>
  );
}
