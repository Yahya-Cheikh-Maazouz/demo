/** "01", "02"… as in the client's prototype. */
export const questionNumber = (n: number) => String(n).padStart(2, "0");

/** "6 questions", "1 question". */
export const questionsLabel = (count: number) => `${count} ${count > 1 ? "questions" : "question"}`;

/** Encouraging sentence under the score: the evaluation is a starting point, never a verdict. */
export function scoreMessage(score: number, total: number): string {
  const ratio = total === 0 ? 0 : score / total;
  if (ratio === 1) return "Parfait ! Vous connaissez déjà très bien les bases : un excellent point de départ.";
  if (ratio >= 2 / 3) return "Très bon départ : vous avez déjà de solides bases. Relisez les corrections pour aller plus loin.";
  if (ratio >= 1 / 2) return "Bon début ! Les corrections ci-dessous vous aideront à revoir les points qui vous ont échappé.";
  return "C'est un premier point utile : vos moniteurs s'appuieront dessus pour adapter votre formation.";
}
