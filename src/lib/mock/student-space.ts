// Mock of the backend for the student's messaging, availabilities, starting evaluation and skills
// record (livret). Pages go through src/lib/api/eleve.ts, never this file.

import { formatDateLong, formatTime } from "@/lib/format";
import { parisTime } from "@/lib/paris-time";
import type {
  ActionResult,
  Availability,
  Competence,
  CompetenceStatus,
  EvaluationQuestion,
  EvaluationResult,
  Livret,
  Mailbox,
  Message,
  MessageParty,
  StartingEvaluation,
} from "@/lib/types";
import {
  computeBalance,
  findTenantBySlug,
  fullName,
  nextId,
  studentContext,
  tenantState,
  type StudentRecord,
  type TenantState,
} from "./store";
import { cleanText, isValidTime } from "./validators";

// ---------------------------------------------------------------------------
// Messaging

function recipients(t: TenantState, s: StudentRecord): Mailbox["recipients"] {
  return [
    { kind: "moniteur", name: fullName(s.profile.referentInstructor) },
    { kind: "ecole", name: findTenantBySlug(t.slug)?.name ?? "Votre auto-école" },
  ];
}

/** A few messages so the mailbox of a demo student is not empty. */
function ensureMailbox(t: TenantState, s: StudentRecord, now: Date): Message[] {
  if (s.messages) return s.messages;
  const [instructor, school] = recipients(t, s);
  const next = t.lessons
    .filter((l) => l.studentId === s.profile.id && l.status === "confirme" && Date.parse(l.start) > now.getTime())
    .sort((a, b) => a.start.localeCompare(b.start))[0];
  const at = (days: number, hour: number, minute = 0) =>
    new Date(Math.min(parisTime(now, days, hour, minute).getTime(), now.getTime() - 60_000)).toISOString();
  const message = (m: Omit<Message, "id" | "direction">): Message => ({ id: nextId(t, "msg"), direction: "recu", ...m });

  s.messages = [
    message({
      correspondent: instructor,
      subject: "Rappel de votre prochaine leçon",
      body: next
        ? `Bonjour ${s.profile.firstName}, votre leçon est prévue le ${formatDateLong(next.start).toLowerCase()} à ${formatTime(next.start)}. Pensez à prendre votre livret. À bientôt !`
        : `Bonjour ${s.profile.firstName}, pensez à demander vos prochaines leçons dans votre planning. À bientôt !`,
      sentAt: at(0, 9, 15),
      readAt: null,
    }),
    message({
      correspondent: school,
      subject: "Document validé",
      body: "Votre pièce d'identité a été validée par notre équipe. Merci !",
      sentAt: at(-2, 11, 40),
      readAt: at(-2, 12),
    }),
    message({
      correspondent: school,
      subject: "Votre progression",
      body: "Votre livret a été mis à jour après votre dernière leçon. Retrouvez-le dans « Suivi pédagogique ».",
      sentAt: at(-4, 18, 5),
      readAt: null,
    }),
  ];
  return s.messages;
}

export function readMailbox(userId: string, now: Date): Mailbox {
  const { t, s } = studentContext(userId, now);
  const messages = [...ensureMailbox(t, s, now)].sort((a, b) => b.sentAt.localeCompare(a.sentAt));
  return {
    now: now.toISOString(),
    received: messages.filter((m) => m.direction === "recu"),
    sent: messages.filter((m) => m.direction === "envoye"),
    recipients: recipients(t, s),
  };
}

export function readUnreadCount(userId: string, now: Date): number {
  const { t, s } = studentContext(userId, now);
  return ensureMailbox(t, s, now).filter((m) => m.direction === "recu" && !m.readAt).length;
}

/** Subject 1–120 characters, message 1–2000 (code "invalide" with fieldErrors). */
export function writeSendMessage(
  userId: string,
  input: { to: MessageParty; subject: string; body: string },
  now: Date,
): ActionResult<{ message: Message }> {
  const { t, s } = studentContext(userId, now);
  const correspondent = recipients(t, s).find((r) => r.kind === input.to);
  const subject = cleanText(input.subject, 120);
  const body = input.body.trim();
  const fieldErrors: Record<string, string> = {};
  if (!correspondent) fieldErrors.to = "Choisissez le destinataire.";
  if (!subject) fieldErrors.subject = input.subject.trim() ? "120 caractères au maximum." : "Indiquez l'objet du message.";
  if (!body) fieldErrors.body = "Écrivez votre message.";
  else if (body.length > 2000) fieldErrors.body = "2 000 caractères au maximum.";
  if (!correspondent || !subject || Object.keys(fieldErrors).length > 0) {
    return { ok: false, code: "invalide", error: "Vérifiez les champs signalés.", fieldErrors };
  }
  const message: Message = {
    id: nextId(t, "msg"),
    direction: "envoye",
    correspondent,
    subject,
    body,
    sentAt: now.toISOString(),
    readAt: null,
  };
  ensureMailbox(t, s, now).push(message);
  return { ok: true, data: { message } };
}

export function writeMarkMessageRead(userId: string, messageId: string, now: Date): ActionResult {
  const { t, s } = studentContext(userId, now);
  const message = ensureMailbox(t, s, now).find((m) => m.id === messageId && m.direction === "recu");
  if (!message) return { ok: false, code: "introuvable", error: "Ce message est introuvable." };
  message.readAt ??= now.toISOString();
  return { ok: true };
}

// ---------------------------------------------------------------------------
// Availabilities

const DAYS: Availability["day"][] = ["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi"];

/** Replaces the student's weekly availabilities (indicative: the agency plans with them). */
export function writeAvailabilities(userId: string, availabilities: Availability[], now: Date): ActionResult<{ availabilities: Availability[] }> {
  const { s } = studentContext(userId, now);
  const valid =
    availabilities.length <= 18 &&
    availabilities.every((a) => DAYS.includes(a.day) && isValidTime(a.from) && isValidTime(a.to) && a.from < a.to) &&
    new Set(availabilities.map((a) => `${a.day}-${a.from}`)).size === availabilities.length;
  if (!valid) return { ok: false, code: "invalide", error: "Ces disponibilités ne sont pas valides." };
  const sorted = [...availabilities].sort((a, b) => DAYS.indexOf(a.day) - DAYS.indexOf(b.day) || a.from.localeCompare(b.from));
  s.profile = { ...s.profile, availabilities: sorted };
  return { ok: true, data: { availabilities: sorted } };
}

// ---------------------------------------------------------------------------
// Starting evaluation: each auto-école will set its own questionnaire; one default for the demo.

const QUESTIONS: Array<EvaluationQuestion & { correct: string; explanation: string }> = [
  {
    id: "q1",
    label: "Que signifie un panneau octogonal rouge ?",
    options: [
      { id: "a", label: "Cédez le passage" },
      { id: "b", label: "Stop" },
      { id: "c", label: "Sens interdit" },
    ],
    correct: "b",
    explanation: "Le panneau octogonal rouge impose l'arrêt absolu à la limite de la chaussée.",
  },
  {
    id: "q2",
    label: "Quelle distance de sécurité est conseillée avec le véhicule qui vous précède ?",
    options: [
      { id: "a", label: "Deux secondes d'intervalle" },
      { id: "b", label: "Dix mètres fixes" },
      { id: "c", label: "Aucune, si la route est droite" },
    ],
    correct: "a",
    explanation: "Gardez au moins deux secondes d'intervalle, davantage par temps de pluie.",
  },
  {
    id: "q3",
    label: "Quel est le taux d'alcool maximal autorisé pour un permis probatoire ?",
    options: [
      { id: "a", label: "0,5 g/L de sang" },
      { id: "b", label: "0,2 g/L de sang" },
      { id: "c", label: "0,8 g/L de sang" },
    ],
    correct: "b",
    explanation: "En période probatoire, la limite est de 0,2 g/L : en pratique, zéro verre.",
  },
  {
    id: "q4",
    label: "Sur autoroute, par temps sec, un jeune conducteur roule au maximum à :",
    options: [
      { id: "a", label: "110 km/h" },
      { id: "b", label: "130 km/h" },
      { id: "c", label: "90 km/h" },
    ],
    correct: "a",
    explanation: "Pendant la période probatoire, la vitesse est limitée à 110 km/h sur autoroute.",
  },
  {
    id: "q5",
    label: "À une intersection sans signalisation, qui a la priorité ?",
    options: [
      { id: "a", label: "Le véhicule qui arrive par la droite" },
      { id: "b", label: "Le véhicule le plus gros" },
      { id: "c", label: "Le premier arrivé" },
    ],
    correct: "a",
    explanation: "Sans signalisation, la priorité à droite s'applique.",
  },
  {
    id: "q6",
    label: "Un feu orange fixe signifie :",
    options: [
      { id: "a", label: "Accélérer pour passer" },
      { id: "b", label: "S'arrêter, sauf si c'est dangereux" },
      { id: "c", label: "Céder le passage aux piétons seulement" },
    ],
    correct: "b",
    explanation: "Le feu orange fixe impose l'arrêt, sauf si l'arrêt brusque serait dangereux.",
  },
];

function evaluationTitle(t: TenantState): string {
  const name = findTenantBySlug(t.slug)?.name;
  return name ? `Questionnaire · ${name}` : "Questionnaire de votre auto-école";
}

export function readStartingEvaluation(userId: string, now: Date): StartingEvaluation {
  const { t, s } = studentContext(userId, now);
  return {
    title: evaluationTitle(t),
    intro: "Quelques questions pour faire un premier point sur vos connaissances. Une seule réponse par question.",
    questions: QUESTIONS.map(({ id, label, options }) => ({ id, label, options })),
    result: s.evaluationResult ?? null,
  };
}

/** One attempt. Code "incomplet" (fieldErrors keyed by question id), "deja_fait". */
export function writeSubmitEvaluation(userId: string, answers: Record<string, string>, now: Date): ActionResult<{ result: EvaluationResult }> {
  const { s } = studentContext(userId, now);
  if (s.evaluationResult) return { ok: false, code: "deja_fait", error: "Vous avez déjà répondu à ce questionnaire." };
  const fieldErrors: Record<string, string> = {};
  for (const q of QUESTIONS) {
    if (!q.options.some((o) => o.id === answers[q.id])) fieldErrors[q.id] = "Choisissez une réponse.";
  }
  if (Object.keys(fieldErrors).length > 0) {
    return { ok: false, code: "incomplet", error: "Répondez à toutes les questions avant de valider.", fieldErrors };
  }
  const result: EvaluationResult = {
    submittedAt: now.toISOString(),
    score: QUESTIONS.filter((q) => answers[q.id] === q.correct).length,
    total: QUESTIONS.length,
    answers: QUESTIONS.map((q) => ({ questionId: q.id, chosen: answers[q.id], correct: q.correct, explanation: q.explanation })),
  };
  s.evaluationResult = result;
  return { ok: true, data: { result } };
}

// ---------------------------------------------------------------------------
// Skills record (livret REMC), filled in by the instructors

const COMPETENCES: Array<Pick<Competence, "code" | "label" | "description" | "nextGoal">> = [
  {
    code: "C1",
    label: "Maîtriser le véhicule",
    description: "Installation, commandes, trajectoire et précision.",
    nextGoal: "Fluidifier les contrôles avant de démarrer.",
  },
  {
    code: "C2",
    label: "Appréhender la route",
    description: "Signalisation, allure et adaptation aux situations.",
    nextGoal: "Anticiper plus tôt les changements d'allure.",
  },
  {
    code: "C3",
    label: "Partager la route",
    description: "Communication et comportement avec tous les usagers.",
    nextGoal: "Renforcer les contrôles dans les intersections.",
  },
  {
    code: "C4",
    label: "Pratiquer en autonomie",
    description: "Analyse des risques et décisions sans assistance.",
    nextGoal: "Gagner en autonomie sur un parcours complet.",
  },
];

/** Progress of the scripted students; the others get a level that follows their driving hours. */
const PROGRESS: Record<string, [number, number, number, number]> = {
  "u-jules": [78, 64, 58, 46],
  "u-ines": [70, 55, 40, 30],
};

function statusOf(progress: number): CompetenceStatus {
  if (progress >= 75) return "acquis";
  if (progress >= 50) return "en_progression";
  return progress > 0 ? "a_renforcer" : "non_aborde";
}

function headlineOf(progress: number): string {
  if (progress >= 75) return "Vous approchez du niveau de l'examen";
  if (progress >= 50) return "Votre conduite devient plus autonome";
  if (progress > 0) return "Les bases se mettent en place";
  return "Votre formation commence";
}

function ensureLivret(t: TenantState, s: StudentRecord, now: Date): NonNullable<StudentRecord["livret"]> {
  if (s.livret) return s.livret;
  const drivingHours = computeBalance(t, s.profile.id, now).consumedHours;
  const ramp = (start: number) => Math.max(0, Math.min(90, Math.round(start + drivingHours * 3.5)));
  const lastDone = t.lessons
    .filter((l) => l.studentId === s.profile.id && l.status === "effectue")
    .sort((a, b) => b.start.localeCompare(a.start))[0];
  s.livret = {
    progress: PROGRESS[s.profile.id] ?? [ramp(10), ramp(0), ramp(-10), ramp(-20)],
    feedback: lastDone
      ? [
          {
            text: "Bonne progression sur l'observation et l'anticipation. Continuez à verbaliser vos contrôles.",
            author: fullName(lastDone.instructor),
            at: lastDone.end,
          },
        ]
      : [],
  };
  return s.livret;
}

function livretView(t: TenantState, s: StudentRecord, now: Date): Livret {
  const { progress, feedback } = ensureLivret(t, s, now);
  const competences = COMPETENCES.map((c, i) => ({ ...c, progress: progress[i], status: statusOf(progress[i]) }));
  const overallProgress = Math.round(progress.reduce((sum, p) => sum + p, 0) / progress.length);
  const latest = feedback[0];
  return {
    overallProgress,
    headline: headlineOf(overallProgress),
    drivingHours: computeBalance(t, s.profile.id, now).consumedHours,
    competences,
    instructorNote: latest ? { text: latest.text, author: latest.author, updatedAt: latest.at } : null,
    feedback,
  };
}

export function readLivret(userId: string, now: Date): Livret {
  const { t, s } = studentContext(userId, now);
  return livretView(t, s, now);
}

/** Livret of any student of the school (instructor and parent spaces check the link first). */
export function readLivretFor(tenantSlug: string, studentId: string, now: Date): Livret | null {
  const t = tenantState(tenantSlug, now);
  const s = t.students.get(studentId);
  return s ? livretView(t, s, now) : null;
}

/**
 * An instructor updates the 4 competences (0–100, whole numbers) and may add a comment after a
 * lesson. Code "invalide" for out-of-range values or a comment over 1000 characters.
 */
export function writeLivretUpdate(
  tenantSlug: string,
  studentId: string,
  author: string,
  input: { progress: number[]; note: string | null },
  now: Date,
): ActionResult<{ livret: Livret }> {
  const t = tenantState(tenantSlug, now);
  const s = t.students.get(studentId);
  if (!s) return { ok: false, code: "introuvable", error: "Élève introuvable." };
  const valid = input.progress.length === 4 && input.progress.every((p) => Number.isInteger(p) && p >= 0 && p <= 100);
  const note = input.note?.trim() || null;
  if (!valid || (note && note.length > 1000)) {
    return { ok: false, code: "invalide", error: "Les niveaux vont de 0 à 100 % et le commentaire fait 1 000 caractères au plus." };
  }
  const livret = ensureLivret(t, s, now);
  livret.progress = input.progress as [number, number, number, number];
  if (note) livret.feedback.unshift({ text: note, author, at: now.toISOString() });
  return { ok: true, data: { livret: livretView(t, s, now) } };
}
