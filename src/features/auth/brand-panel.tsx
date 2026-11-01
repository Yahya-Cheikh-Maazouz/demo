import { Suspense } from "react";
import { CalendarCheck, FileUp, Gauge, MapPin, Sparkles } from "lucide-react";
import { getTenant } from "@/lib/tenant";

const BENEFITS = [
  {
    icon: CalendarCheck,
    title: "Réservez vos leçons en ligne",
    text: "Choisissez un créneau libre avec votre moniteur, à toute heure.",
  },
  {
    icon: Gauge,
    title: "Suivez votre solde d'heures",
    text: "Heures payées, effectuées et réservées, toujours à jour.",
  },
  {
    icon: FileUp,
    title: "Déposez vos documents",
    text: "Envoyez les pièces de votre dossier depuis votre téléphone.",
  },
];

/** Brand side of the auth pages (from lg). Colors follow the auto-école through --brand. */
export function BrandPanel() {
  return (
    <aside
      aria-label="Présentation de l'espace en ligne"
      className="relative hidden overflow-hidden bg-brand text-on-brand lg:sticky lg:top-0 lg:flex lg:h-dvh lg:flex-col lg:self-start"
    >
      <Backdrop />
      <div className="relative flex flex-1 flex-col justify-between gap-10 p-12 xl:p-16">
        <Suspense fallback={<PanelSkeleton />}>
          <PanelContent />
        </Suspense>
      </div>
    </aside>
  );
}

/** Gradient, dot grid, a road with its dashed center line and two glows. CSS only. */
function Backdrop() {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0">
      <div className="absolute inset-0 bg-linear-to-br from-brand via-brand to-brand-strong" />
      <div className="absolute inset-0 opacity-20 [background-image:radial-gradient(var(--color-on-brand)_1px,transparent_1.5px)] [background-size:24px_24px] [mask-image:radial-gradient(ellipse_at_top_right,black,transparent_65%)]" />
      <div className="absolute -top-40 -right-40 size-[36rem] rounded-full bg-on-brand/10 blur-3xl" />
      <div className="absolute -bottom-48 -left-24 size-[30rem] rounded-full bg-brand-strong blur-3xl" />
      {/* A road vanishing toward the horizon, bottom right. */}
      <div className="absolute right-[4%] bottom-0 h-[62%] w-80 [perspective:420px]">
        <div className="absolute inset-0 origin-bottom [transform:rotateX(58deg)] border-x-[6px] border-on-brand/15 bg-on-brand/[0.07] [mask-image:linear-gradient(to_top,black_35%,transparent)]">
          <div className="absolute inset-y-0 left-1/2 w-2.5 -translate-x-1/2 opacity-40 [background-image:repeating-linear-gradient(to_top,var(--color-on-brand)_0_56px,transparent_56px_112px)]" />
        </div>
      </div>
    </div>
  );
}

async function PanelContent() {
  const tenant = await getTenant();
  return (
    <>
      <p className="inline-flex w-fit items-center gap-2 rounded-full bg-on-brand/10 px-3.5 py-1.5 text-sm font-semibold ring-1 ring-on-brand/20 backdrop-blur-sm">
        <Sparkles className="size-4" aria-hidden />
        Votre espace en ligne
      </p>

      <div className="max-w-lg">
        <h2 className="text-4xl leading-[1.1] font-bold tracking-tight text-balance xl:text-5xl">
          Votre permis,
          <span className="block">à votre rythme.</span>
        </h2>
        <p className="mt-4 text-lg text-on-brand/90">
          {tenant ? `${tenant.name} vous accompagne` : "Votre auto-école vous accompagne"} jusqu&apos;à
          l&apos;examen. Tout votre parcours au même endroit, sur ordinateur comme sur mobile.
        </p>
        <ul className="mt-10 space-y-3">
          {BENEFITS.map(({ icon: Icon, title, text }) => (
            <li
              key={title}
              className="flex items-center gap-4 rounded-2xl bg-on-brand/10 p-4 ring-1 ring-on-brand/15 backdrop-blur-sm"
            >
              <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-on-brand text-brand shadow-sm">
                <Icon className="size-5" aria-hidden />
              </span>
              <span className="min-w-0">
                <span className="block font-semibold">{title}</span>
                <span className="mt-0.5 block text-sm text-on-brand/90">{text}</span>
              </span>
            </li>
          ))}
        </ul>
      </div>

      {tenant ? (
        <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-on-brand/90">
          <span className="font-semibold text-on-brand">{tenant.name}</span>
          <span aria-hidden>·</span>
          <span className="inline-flex items-center gap-1.5">
            <MapPin className="size-4" aria-hidden />
            {tenant.city}
          </span>
        </p>
      ) : (
        <span />
      )}
    </>
  );
}

/** Translucent blocks on the brand color (the neutral Skeleton would look grey here). */
function Block({ className }: { className: string }) {
  return <div aria-hidden className={`animate-pulse bg-on-brand/15 ${className}`} />;
}

function PanelSkeleton() {
  return (
    <>
      <Block className="h-8 w-48 rounded-full" />
      <div className="max-w-lg space-y-4">
        <Block className="h-24 w-full rounded-lg" />
        <Block className="h-14 w-full rounded-lg" />
        <div className="space-y-3 pt-6">
          {BENEFITS.map(({ title }) => (
            <Block key={title} className="h-19 w-full rounded-2xl" />
          ))}
        </div>
      </div>
      <Block className="h-5 w-56 rounded-lg" />
    </>
  );
}
