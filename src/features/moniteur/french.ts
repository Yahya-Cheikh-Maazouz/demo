// Small French typography helpers of the instructor space.

/** First letters that take an elision ("d'Inès", "d'Émile"), "h" left out on purpose (h aspiré). */
const ELIDES = /^[aeiouyàâäéèêëîïôöùûüœæ]/i;

/** "de Jules Durand", "d'Inès Martin". */
export function deName(name: string): string {
  return ELIDES.test(name) ? `d'${name}` : `de ${name}`;
}

/** « text » with no-break spaces inside the guillemets, so a line never breaks inside them. */
export function guillemets(text: string): string {
  return `« ${text} »`;
}
