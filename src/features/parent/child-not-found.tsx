import { House, Phone, UserRoundX, UsersRound } from "lucide-react";
import { ButtonLink } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { getTenant } from "@/lib/tenant";
import { getPageAccount } from "./data";

/** Title of a page for an unknown child. */
export const NOT_FOUND_TITLE = "Dossier introuvable";
/** Title of a page when no child is linked to the account (or no longer). */
export const NO_CHILD_TITLE = "Aucun enfant rattaché";

/** No child linked to the account at all, versus an id that is not one of them. */
async function hasNoChild(): Promise<boolean> {
  const { children } = await getPageAccount();
  return children.length === 0;
}

/** Title shown instead of the child's first name. Render inside <Suspense>. */
export async function missingChildTitle(): Promise<string> {
  return (await hasNoChild()) ? NO_CHILD_TITLE : NOT_FOUND_TITLE;
}

/**
 * Shown instead of a page's content when the child cannot be shown: nothing of another student is
 * ever displayed. Render inside <Suspense>.
 */
export async function MissingChild() {
  return (await hasNoChild()) ? <NoChildLinked /> : <ChildNotFound />;
}

/**
 * Page description for the child asked for in the URL, or the reason it cannot be shown (so the
 * header never describes a file the page does not show). Render inside <Suspense>.
 */
export async function ChildPageDescription({ child, text }: { child: string | null; text: string }) {
  const { children } = await getPageAccount();
  const shown = child === null ? children.length > 0 : children.some((c) => c.id === child);
  if (shown) return <>{text}</>;
  return <>{children.length === 0 ? "Aucun dossier d'élève n'est rattaché à votre compte." : "Ce lien ne correspond à aucun de vos enfants."}</>;
}

/** ?enfant= names a student who is not linked to the signed-in parent. */
function ChildNotFound() {
  return (
    <Card role="alert" className="flex flex-col items-start gap-4 p-6 sm:flex-row sm:items-center">
      <span className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-danger-soft text-danger">
        <UserRoundX className="size-6" aria-hidden />
      </span>
      <div className="min-w-0 flex-1">
        <p className="font-bold text-ink">Ce dossier n&apos;est pas rattaché à votre compte</p>
        <p className="mt-1 text-sm text-ink-muted">
          Vous ne pouvez suivre que les enfants dont vous êtes le représentant légal auprès de cette auto-école. Si un
          enfant manque, contactez l&apos;auto-école.
        </p>
      </div>
      <ButtonLink href="/parent" variant="secondary" icon={<House className="size-4" aria-hidden />} className="shrink-0">
        Revenir à l&apos;accueil
      </ButtonLink>
    </Card>
  );
}

/**
 * No child linked: never linked yet, or the school's file changed (archived file, child of age,
 * another legal guardian). Only the school can link a child: give its phone number.
 */
async function NoChildLinked() {
  const tenant = await getTenant();
  return (
    <Card className="flex flex-col items-start gap-4 p-6 sm:flex-row sm:items-center">
      <span className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-brand-soft text-brand">
        <UsersRound className="size-6" aria-hidden />
      </span>
      <div className="min-w-0 flex-1">
        <p className="font-bold text-ink">Aucun enfant n&apos;est rattaché à votre compte</p>
        <p className="mt-1 text-sm text-ink-muted">
          L&apos;auto-école rattache à votre compte les élèves mineurs dont vous êtes le représentant légal. Si votre
          enfant devrait apparaître ici, contactez-la.
        </p>
      </div>
      {tenant && (
        <ButtonLink
          href={`tel:${tenant.phone.replace(/\s/g, "")}`}
          variant="secondary"
          icon={<Phone className="size-4" aria-hidden />}
          className="shrink-0"
        >
          <span>
            Appeler l&apos;auto-école<span className="sr-only"> au </span>
            <span className="ml-1 tabular-nums">{tenant.phone}</span>
          </span>
        </ButtonLink>
      )}
    </Card>
  );
}
