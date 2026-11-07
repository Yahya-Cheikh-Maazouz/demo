import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { CardBody } from "@/components/ui/card";
import { RevealValue } from "@/components/ui/reveal-value";
import { LoadingLabel, Skeleton } from "@/components/ui/skeleton";
import { initials, maskEmail } from "@/lib/format";
import { getPageAccount } from "./data";
import { ParentAccountDeletion } from "./privacy";
import { withChild } from "./query";

/** Name and e-mail of the parent (e-mail masked by default). Render inside a <Card> and <Suspense>. */
export async function ParentIdentity() {
  const account = await getPageAccount();
  return (
    <CardBody>
      <div className="flex items-center gap-4">
        <Avatar initials={initials(account.firstName, account.lastName)} size="lg" solid />
        <div className="min-w-0">
          <p className="text-xl font-extrabold tracking-[-0.02em] text-ink">
            {account.firstName} {account.lastName}
          </p>
          <p className="text-sm text-ink-muted">Représentant légal</p>
        </div>
      </div>
      <dl className="mt-5 divide-y divide-line rounded-2xl border border-line">
        <div className="flex flex-col gap-1 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
          <dt className="text-sm text-ink-muted">Adresse e-mail</dt>
          <dd className="min-w-0">
            <RevealValue
              value={<span className="wrap-anywhere">{account.email}</span>}
              masked={maskEmail(account.email)}
              maskedLabel={`masquée, domaine ${account.email.split("@")[1] ?? ""}`}
              noun="l'adresse e-mail"
            />
          </dd>
        </div>
        <div className="flex flex-col gap-1 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
          <dt className="text-sm text-ink-muted">Rôle</dt>
          <dd className="font-semibold text-ink">Parent · représentant légal</dd>
        </div>
      </dl>
    </CardBody>
  );
}

export function ParentIdentitySkeleton() {
  return (
    <CardBody>
      <LoadingLabel>Chargement de vos informations…</LoadingLabel>
      <div className="flex items-center gap-4">
        <Skeleton className="size-16 rounded-full" />
        <div className="space-y-2">
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-32" />
        </div>
      </div>
      <Skeleton className="mt-5 h-[7.5rem] rounded-2xl sm:h-[6.5rem]" />
    </CardBody>
  );
}

/** Children linked to the account in this school. Render inside a <Card> and <Suspense>. */
export async function LinkedChildren() {
  const { children } = await getPageAccount();
  if (children.length === 0) {
    return (
      <CardBody>
        <p className="text-sm text-ink-muted">Aucun élève n&apos;est rattaché à votre compte. Contactez l&apos;auto-école.</p>
      </CardBody>
    );
  }
  const several = children.length > 1;
  return (
    <ul className="mt-3 divide-y divide-line border-t border-line">
      {children.map((child) => (
        <li key={child.id}>
          <Link
            href={several ? withChild("/parent", child.id) : "/parent"}
            className="flex items-center gap-4 px-5 py-4 transition-colors hover:bg-subtle/60 sm:px-6"
          >
            <Avatar initials={initials(child.firstName, child.lastName)} />
            <span className="min-w-0 flex-1">
              <span className="block font-semibold text-ink">
                {child.firstName} {child.lastName}
              </span>
              <span className="block text-sm text-ink-muted">
                {child.age} ans · {child.licence}
              </span>
              <span className="block text-xs text-ink-subtle">
                {child.office} · moniteur·rice référent·e : {child.referentInstructor.firstName}{" "}
                {child.referentInstructor.lastName}
              </span>
            </span>
            <span className="hidden text-sm font-semibold text-brand sm:inline">Voir son parcours</span>
            <ChevronRight className="size-5 shrink-0 text-ink-subtle" aria-hidden />
          </Link>
        </li>
      ))}
    </ul>
  );
}

export function LinkedChildrenSkeleton() {
  return (
    <div className="mt-3 border-t border-line px-5 py-4 sm:px-6">
      <div className="flex items-center gap-4">
        <Skeleton className="size-10 rounded-full" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-4 w-40" />
          <Skeleton className="h-4 w-64 max-w-full" />
          <Skeleton className="h-3 w-56 max-w-full" />
        </div>
      </div>
    </div>
  );
}

/** Account deletion, with the date of a pending request. Render inside <Suspense>. */
export async function ParentDeletionSection() {
  const account = await getPageAccount();
  return <ParentAccountDeletion requestedAt={account.deletionRequestedAt} />;
}

/** "Connecté·e en tant que …". Render inside <Suspense>. */
export async function SignedInAs() {
  const account = await getPageAccount();
  return (
    <p className="min-w-0 text-sm text-ink-muted">
      Connecté·e en tant que <span className="font-semibold wrap-anywhere text-ink">{maskEmail(account.email)}</span>
    </p>
  );
}
