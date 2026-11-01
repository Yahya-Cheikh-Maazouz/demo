import type { Metadata } from "next";
import { PageHeader } from "@/components/ui/page-header";
import { FormSkeleton } from "@/features/auth/auth-skeletons";
import { ForgotPasswordForm } from "@/features/auth/forgot-password-form";
import { RequireTenant } from "@/features/auth/tenant-gate";

export const metadata: Metadata = { title: "Mot de passe oublié" };

export default function ForgotPasswordPage() {
  return (
    <RequireTenant fallback={<FormSkeleton heading fields={1} />}>
      <PageHeader
        title="Mot de passe oublié"
        description="Recevez par e-mail un lien pour choisir un nouveau mot de passe."
      />
      <ForgotPasswordForm />
    </RequireTenant>
  );
}
