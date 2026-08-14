/**
 * PTN-RDC · Identifiants déterministes pour le seed.
 *
 * Pourquoi : si le seed générait des UUID aléatoires, les deux
 * environnements de développement divergeraient dès la première exécution.
 * Une capture d'écran, un lien `/admin/comptes/<id>`, un test référençant
 * un identifiant — plus rien ne correspondrait d'une machine à l'autre.
 *
 * On dérive donc chaque identifiant de son code métier par UUID v5
 * (RFC 4122) : même code, même identifiant, sur toutes les machines et à
 * chaque réinitialisation. Aucune table de correspondance à maintenir.
 *
 *   deterministicUuid('subrole:UGP_COORDONNATEUR')
 *     → toujours le même UUID, partout.
 */

import { createHash } from 'node:crypto';

/** Espace de noms propre au projet. Ne jamais le modifier : tous les
 *  identifiants déjà semés en dépendent. */
const PTN_NAMESPACE = 'b7e6c4a2-9d13-4f58-a0e7-3c5b8d2f6a91';

export function deterministicUuid(name: string, namespace: string = PTN_NAMESPACE): string {
  const namespaceBytes = Buffer.from(namespace.replace(/-/g, ''), 'hex');
  const digest = createHash('sha1')
    .update(Buffer.concat([namespaceBytes, Buffer.from(name, 'utf8')]))
    .digest();

  const bytes = Buffer.from(digest.subarray(0, 16));
  bytes[6] = (bytes[6] & 0x0f) | 0x50; // version 5
  bytes[8] = (bytes[8] & 0x3f) | 0x80; // variant RFC 4122

  const hex = bytes.toString('hex');
  return [
    hex.slice(0, 8),
    hex.slice(8, 12),
    hex.slice(12, 16),
    hex.slice(16, 20),
    hex.slice(20, 32),
  ].join('-');
}

export const idFor = {
  subrole: (code: string) => deterministicUuid(`subrole:${code}`),
  organisation: (code: string) => deterministicUuid(`organisation:${code}`),
  user: (email: string) => deterministicUuid(`user:${email.toLowerCase()}`),
  assignment: (email: string, subroleCode: string) =>
    deterministicUuid(`assignment:${email.toLowerCase()}:${subroleCode}`),
  /** Clé « exercice:code », l'unicité d'une activité étant celle du couple. */
  ptbaActivity: (yearAndCode: string) => deterministicUuid(`ptba:${yearAndCode}`),
};
