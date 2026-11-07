import Link from "next/link";
import {
  ArrowRight,
  CalendarDays,
  CalendarPlus,
  ChevronRight,
  ClipboardList,
  Clock3,
  FileText,
  FileUp,
  MessageSquare,
  Sparkles,
  WalletCards,
  type LucideIcon,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { LoadingLabel, Skeleton } from "@/components/ui/skeleton";
import { PURCHASE_HREF } from "@/features/paiements/links";
import { LESSON_TYPE_META, studentStatusMeta } from "@/features/planning/lesson-meta";
import { ReadyButton } from "@/features/planning/ready-button";
import { BALANCE_STATE_META } from "@/features/solde/balance-meta";
import {
  getBalance,
  getBookingWeek,
  getLivret,
  getMailbox,
  getRequiredDocuments,
  getStartingEvaluation,
  getStudentProfile,
} from "@/lib/api/eleve";
import { cn } from "@/lib/cn";
import {
  formatDateLong,
  formatDayOfMonth,
  formatHours,
  formatMonthShort,
  formatRelativeDay,
  formatTime,
} from "@/lib/format";
import { getHomeLessons } from "./data";
import { LessonDetailsButton } from "./lesson-details-button";

const plural = (count: number, one: string, many: string) => `${count} ${count > 1 ? many : one}`;

/** Licence above the greeting ("B · Boîte manuelle"). Render inside <Suspense>. */
export async function LicenceEyebrow() {
  const profile = await getStudentProfile();
  return <>{profile.licence}</>;
}

// ---------------------------------------------------------------------------
// Next lesson

/** The next lesson (or request), with its details, "Je suis prêt(e)" and the planning. */
export async function NextLessonHero() {
  const { upcoming } = await getHomeLessons();
  const lesson = upcoming[0];

  if (!lesson) {
    return (
      <Card className="flex flex-col items-start gap-4 p-6 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="eyebrow">Prochaine leçon</p>
          <p className="mt-2 text-xl font-extrabold tracking-[-0.02em] text-ink">Aucune leçon prévue</p>
          <p className="mt-1 text-sm text-ink-muted">Choisissez un créneau libre dans l&apos;agenda de votre moniteur.</p>
        </div>
        <ButtonLink href="/eleve/planning#reserver" icon={<CalendarPlus className="size-4" aria-hidden />}>
          Demander une leçon
        </ButtonLink>
      </Card>
    );
  }

  const type = LESSON_TYPE_META[lesson.type];
  const status = studentStatusMeta(lesson);
  const instructor = `${lesson.instructor.firstName} ${lesson.instructor.lastName}`;
  const details = [
    { label: "Date", value: `${formatDateLong(lesson.start)} à ${formatTime(lesson.start)}` },
    { label: "Durée", value: formatHours(lesson.durationHours) },
    { label: "Moniteur", value: instructor },
    ...(lesson.vehicle ? [{ label: "Véhicule", value: lesson.vehicle.label }] : []),
    { label: "Point de départ", value: lesson.meetingPoint },
    { label: "Statut", value: status.label },
  ];
  const canSayReady = lesson.status === "confirme" || lesson.status === "attente_paiement";

  return (
    <Card className="relative overflow-hidden border-brand/20 bg-gradient-to-br from-surface via-surface to-brand-soft/70 p-5 shadow-raised sm:p-6">
      <div className="flex items-center justify-between gap-3">
        <p className="eyebrow flex items-center gap-2">
          <span aria-hidden className="size-2 rounded-full bg-brand" />
          Prochaine leçon
        </p>
        <LessonDetailsButton title={type.label} details={details} />
      </div>

      <div className="mt-3 flex items-start gap-4">
        <div className="flex w-16 shrink-0 flex-col items-center rounded-2xl border border-brand/20 bg-brand-soft py-2 text-brand">
          <span className="text-2xl leading-tight font-extrabold tabular-nums">{formatDayOfMonth(lesson.start)}</span>
          <span className="text-[11px] font-bold uppercase">{formatMonthShort(lesson.start)}</span>
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-ink-muted">{formatDateLong(lesson.start)}</p>
          <p className="text-3xl font-extrabold tracking-[-0.03em] text-ink tabular-nums">
            {formatTime(lesson.start)} · {formatHours(lesson.durationHours)}
          </p>
          <p className="mt-1 text-sm text-ink-muted">
            {instructor}
            {lesson.vehicle && <> · {lesson.vehicle.label}</>}
          </p>
        </div>
        <span className="hidden flex-col items-center gap-1 rounded-2xl bg-surface/80 px-3 py-2 text-xs font-semibold text-ink-muted sm:flex">
          <type.icon className="size-5 text-brand" aria-hidden />
          {lesson.type === "conduite" ? "Conduite" : lesson.type === "code" ? "Code" : type.label}
        </span>
      </div>

      <div className="mt-5 flex flex-wrap items-center gap-2">
        {canSayReady ? (
          <ReadyButton lessonId={lesson.id} ready={Boolean(lesson.studentReadyAt)} />
        ) : (
          <Badge tone={status.tone} icon={status.icon}>
            {status.label} par votre moniteur
          </Badge>
        )}
        <ButtonLink href="/eleve/planning#mes-rendez-vous" variant="secondary" icon={<CalendarDays className="size-4" aria-hidden />}>
          Mon planning
        </ButtonLink>
      </div>
    </Card>
  );
}

export function NextLessonHeroSkeleton() {
  return (
    <Card className="p-5 sm:p-6">
      <LoadingLabel>Chargement de votre prochaine leçon…</LoadingLabel>
      <Skeleton className="h-4 w-32" />
      <div className="mt-4 flex gap-4">
        <Skeleton className="h-[4.5rem] w-16 rounded-2xl" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-4 w-40" />
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-4 w-56 max-w-full" />
        </div>
      </div>
      <Skeleton className="mt-5 h-11 w-64 max-w-full rounded-xl" />
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Progress and credit

function ProgressRing({ value, size = 56 }: { value: number; size?: number }) {
  const radius = size / 2 - 5;
  const circumference = 2 * Math.PI * radius;
  return (
    <span className="relative inline-flex shrink-0 items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" strokeWidth={5} className="stroke-subtle" />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          strokeWidth={5}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={circumference * (1 - value / 100)}
          className="stroke-brand"
        />
      </svg>
      <span className="absolute text-xs font-bold text-ink tabular-nums">{value} %</span>
    </span>
  );
}

/** "Ma progression 62 % · Voir mon livret". Render inside <Suspense>. */
export async function ProgressCard() {
  const livret = await getLivret();
  return (
    <Link href="/eleve/suivi" className="group block h-full">
      <Card className="flex h-full items-center gap-4 p-4 transition-colors group-hover:border-brand/30 sm:p-5">
        <ProgressRing value={livret.overallProgress} />
        <div className="min-w-0 flex-1">
          <p className="text-sm text-ink-muted">Ma progression</p>
          <p className="font-bold text-ink">Voir mon livret</p>
        </div>
        <ChevronRight className="size-5 text-ink-subtle transition-transform group-hover:translate-x-0.5" aria-hidden />
      </Card>
    </Link>
  );
}

/** "Mon solde 4 heures · Recharger". Render inside <Suspense>. */
export async function CreditCard() {
  const balance = await getBalance();
  const meta = BALANCE_STATE_META[balance.state];
  const hours = Math.max(0, balance.afterReservationsHours);
  return (
    <Card className="flex h-full flex-wrap items-center gap-4 p-4 sm:p-5">
      <span className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-brand-soft text-brand">
        <WalletCards className="size-5" aria-hidden />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-sm text-ink-muted">Mon solde</p>
        <p className="font-bold text-ink tabular-nums">
          {hours} {hours > 1 ? "heures" : "heure"}
          <span className="sr-only"> après vos leçons demandées</span>
        </p>
        {balance.state !== "ok" && (
          <Badge tone={meta.tone} icon={meta.icon} className="mt-1">
            {meta.label}
          </Badge>
        )}
      </div>
      <ButtonLink href={PURCHASE_HREF} variant="secondary" size="sm" className="text-brand">
        Recharger
      </ButtonLink>
    </Card>
  );
}

export function SummaryCardSkeleton() {
  return <Skeleton className="h-[5.5rem] rounded-3xl sm:h-24" />;
}

// ---------------------------------------------------------------------------
// Shortcuts

/** "Mes raccourcis": every section in one glance, with what is waiting. Render inside <Suspense>. */
export async function Shortcuts() {
  const [{ upcoming }, documents, mailbox, profile, evaluation] = await Promise.all([
    getHomeLessons(),
    getRequiredDocuments(),
    getMailbox(),
    getStudentProfile(),
    getStartingEvaluation(),
  ]);
  const toComplete = documents.filter((d) => d.status === "manquant" || d.status === "refuse").length;
  const unread = mailbox.received.filter((m) => !m.readAt).length;
  const items: Array<{ href: string; label: string; hint: string; icon: LucideIcon; tone: string }> = [
    {
      href: "/eleve/planning#mes-rendez-vous",
      label: "Mes leçons",
      hint: plural(upcoming.length, "à venir", "à venir"),
      icon: CalendarDays,
      tone: "bg-brand-soft text-brand",
    },
    {
      href: "/eleve/documents",
      label: "Documents",
      hint: toComplete > 0 ? plural(toComplete, "à compléter", "à compléter") : "Dossier à jour",
      icon: FileText,
      tone: "bg-info-soft text-info",
    },
    {
      href: "/eleve/messagerie",
      label: "Messages",
      hint: unread > 0 ? plural(unread, "non lu", "non lus") : "Aucun nouveau",
      icon: MessageSquare,
      tone: "bg-warning-soft text-warning",
    },
    {
      href: "/eleve/disponibilites",
      label: "Disponibilités",
      hint: profile.availabilities.length > 0 ? "Les mettre à jour" : "À renseigner",
      icon: Clock3,
      tone: "bg-success-soft text-success",
    },
    {
      href: "/eleve/evaluation",
      label: "Évaluation",
      hint: evaluation.result ? `${evaluation.result.score} / ${evaluation.result.total}` : "Tester mes acquis",
      icon: ClipboardList,
      tone: "bg-subtle text-ink-muted",
    },
  ];

  return (
    <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
      {items.map((item) => (
        <li key={item.href}>
          <Link
            href={item.href}
            className="flex h-full flex-col gap-3 rounded-2xl border border-line bg-surface p-4 transition-colors hover:border-brand/30 hover:bg-brand-soft/30"
          >
            <span className={cn("flex size-9 items-center justify-center rounded-xl", item.tone)}>
              <item.icon className="size-4.5" aria-hidden />
            </span>
            <span>
              <span className="block text-sm font-bold text-ink">{item.label}</span>
              <span className="block text-xs text-ink-muted">{item.hint}</span>
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}

export function ShortcutsSkeleton() {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
      {[0, 1, 2, 3, 4].map((i) => (
        <Skeleton key={i} className="h-[6.75rem] rounded-2xl" />
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Free slot, progress path, news, file

/** The referent's next free hour (this week, else next week), with a link to request it. Render inside <Suspense>. */
export async function FreeSlotBanner() {
  const thisWeek = await getBookingWeek(null, "conduite");
  const firstFree = (week: typeof thisWeek) =>
    week.days.flatMap((d) => d.slots).find((s) => s.state === "libre") ?? null;
  let week = thisWeek;
  let slot = firstFree(week);
  if (!slot && week.weekStart < week.lastWeekStart) {
    const [year, month, day] = week.weekStart.split("-").map(Number);
    const next = new Date(Date.UTC(year, month - 1, day + 7)).toISOString().slice(0, 10);
    week = await getBookingWeek(next, "conduite");
    slot = firstFree(week);
  }
  if (!slot) return null;

  return (
    <Card className="flex flex-col gap-4 border-brand/15 bg-brand-soft/40 p-5 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-start gap-3">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-2xl bg-surface text-brand">
          <Sparkles className="size-5" aria-hidden />
        </span>
        <div>
          <p className="eyebrow">Créneau disponible</p>
          <p className="mt-1 font-bold text-ink">Un créneau est libre avec votre moniteur</p>
          <p className="text-sm text-ink-muted">
            {formatRelativeDay(slot.start, week.now)} · {formatTime(slot.start)} · 1 heure avec {week.instructor.firstName}
          </p>
        </div>
      </div>
      <ButtonLink href={`/eleve/planning?semaine=${week.weekStart}#reserver`} className="shrink-0">
        Réserver
      </ButtonLink>
    </Card>
  );
}

/** "Mon parcours": the 4 competences of the livret as bars. Render inside <Suspense>. */
export async function ParcoursCard() {
  const livret = await getLivret();
  return (
    <Card className="h-full p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="font-bold text-ink">Mon parcours</h2>
          <p className="text-sm text-ink-muted">Compétences pédagogiques</p>
        </div>
        <Link href="/eleve/suivi" className="inline-flex h-11 items-center text-sm font-semibold text-brand hover:underline">
          Voir le livret
        </Link>
      </div>
      <ul className="mt-3 space-y-3">
        {livret.competences.map((c) => (
          <li key={c.code}>
            <div className="flex items-baseline justify-between gap-3 text-sm">
              <span className="font-semibold text-ink">{c.label}</span>
              <span className="text-ink-muted tabular-nums">{c.progress} %</span>
            </div>
            <div aria-hidden className="mt-1.5 h-2 overflow-hidden rounded-full bg-subtle">
              <div className="h-full rounded-full bg-brand" style={{ width: `${c.progress}%` }} />
            </div>
          </li>
        ))}
      </ul>
    </Card>
  );
}

/** "Actualités": the latest messages of the auto-école and the instructor. Render inside <Suspense>. */
export async function NewsCard() {
  const mailbox = await getMailbox();
  const latest = mailbox.received.slice(0, 3);
  return (
    <Card className="h-full p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="font-bold text-ink">Actualités</h2>
          <p className="text-sm text-ink-muted">Informations de votre auto-école</p>
        </div>
        <Link href="/eleve/messagerie" className="inline-flex h-11 items-center text-sm font-semibold text-brand hover:underline">
          Tout voir
        </Link>
      </div>
      {latest.length === 0 ? (
        <p className="mt-3 text-sm text-ink-muted">Aucune actualité pour le moment.</p>
      ) : (
        <ul className="mt-2 divide-y divide-line">
          {latest.map((m) => (
            <li key={m.id} className="py-3">
              <Link href={`/eleve/messagerie?message=${m.id}`} className="block rounded-lg hover:bg-subtle/60">
                <span className="flex items-baseline justify-between gap-3">
                  <span className={cn("text-sm text-ink", m.readAt ? "font-semibold" : "font-bold")}>
                    {!m.readAt && <span aria-hidden className="mr-1.5 inline-block size-2 rounded-full bg-danger" />}
                    {m.subject}
                    {!m.readAt && <span className="sr-only"> (non lu)</span>}
                  </span>
                  <span className="shrink-0 text-xs text-ink-subtle">{formatRelativeDay(m.sentAt, mailbox.now)}</span>
                </span>
                <span className="mt-0.5 line-clamp-1 block text-sm text-ink-muted">{m.body}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

export function HalfCardSkeleton() {
  return <Skeleton className="h-64 rounded-3xl" />;
}

/** "Dossier d'inscription": validated documents and the next one to send. Render inside <Suspense>. */
export async function DossierBanner() {
  const documents = await getRequiredDocuments();
  const total = documents.length;
  if (total === 0) return null;
  const validated = documents.filter((d) => d.status === "valide").length;
  const next = documents.find((d) => d.status === "refuse") ?? documents.find((d) => d.status === "manquant");
  const reviewing = documents.filter((d) => d.status === "en_verification").length;
  const complete = validated === total;

  return (
    <Card className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center">
      <span className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-brand-soft text-brand">
        <FileText className="size-5" aria-hidden />
      </span>
      <div className="min-w-0 flex-1">
        <p className="eyebrow">Dossier d&apos;inscription</p>
        <p className="mt-1 font-bold text-ink">
          {complete
            ? "Votre dossier est complet"
            : next
              ? next.status === "refuse"
                ? `${next.label} : pièce refusée, à renvoyer`
                : `Ajoutez : ${next.label}`
              : `${plural(reviewing, "pièce", "pièces")} en cours de vérification`}
        </p>
        <div aria-hidden className="mt-2 h-2 max-w-md overflow-hidden rounded-full bg-subtle">
          <div className="h-full rounded-full bg-success" style={{ width: `${(validated / total) * 100}%` }} />
        </div>
        <p className="mt-1.5 text-sm text-ink-muted">
          {validated} {validated > 1 ? "documents validés" : "document validé"} sur {total}
        </p>
      </div>
      {!complete && (
        <ButtonLink href="/eleve/documents" className="shrink-0" icon={<FileUp className="size-4" aria-hidden />}>
          Finaliser
        </ButtonLink>
      )}
      {complete && (
        <Link href="/eleve/documents" className="inline-flex h-11 shrink-0 items-center gap-1.5 text-sm font-semibold text-brand hover:underline">
          Voir mes documents
          <ArrowRight className="size-4" aria-hidden />
        </Link>
      )}
    </Card>
  );
}

export function BannerSkeleton() {
  return <Skeleton className="h-32 rounded-3xl sm:h-28" />;
}
