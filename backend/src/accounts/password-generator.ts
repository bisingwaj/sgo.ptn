import { randomInt } from 'node:crypto';

// Jeux de caractères sans ambiguïté visuelle : ni O/0, ni l/1/I. Le mot
// de passe temporaire est souvent dicté de vive voix ou recopié depuis
// un écran — une confusion de caractère coûte un appel à l'assistance.
const LOWER = 'abcdefghijkmnpqrstuvwxyz';
const UPPER = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
const DIGITS = '23456789';
const SPECIALS = '!@#$%&*+=?';

function pick(pool: string): string {
  return pool[randomInt(pool.length)];
}

function shuffle(chars: string[]): string[] {
  const result = [...chars];
  for (let i = result.length - 1; i > 0; i -= 1) {
    const j = randomInt(i + 1);
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

/**
 * Mot de passe temporaire conforme à la politique de la plateforme :
 * 12 caractères minimum, quatre classes représentées.
 *
 * Rendu en trois groupes séparés par des tirets (`Kmqx-7Rzt-9pW!`) pour
 * rester lisible à l'écran comme à l'oral. Les tirets comptent dans la
 * longueur et satisfont déjà la classe « caractère spécial », mais un
 * spécial explicite est ajouté pour ne pas dépendre du format.
 */
export function generateTemporaryPassword(): string {
  const required = [pick(UPPER), pick(LOWER), pick(DIGITS), pick(SPECIALS)];

  const filler: string[] = [];
  const pool = LOWER + UPPER + DIGITS;
  for (let i = 0; i < 8; i += 1) filler.push(pick(pool));

  const chars = shuffle([...required, ...filler]);

  return [chars.slice(0, 4).join(''), chars.slice(4, 8).join(''), chars.slice(8, 12).join('')].join(
    '-',
  );
}
