/**
 * Lecture des variables d'environnement de l'interface.
 *
 * Next remplace `process.env.NEXT_PUBLIC_*` par sa valeur AU MOMENT DE LA
 * COMPILATION, littéralement, à l'endroit où on l'écrit. La référence doit
 * donc rester en clair chez l'appelant — ces fonctions reçoivent la valeur
 * déjà substituée, jamais le nom de la variable.
 *
 * Pourquoi ne pas se contenter de `??` :
 *
 * `process.env.X ?? defaut` ne rattrape que l'ABSENCE. Une variable
 * présente mais VIDE traverse. Or c'est le cas le plus courant en
 * pratique — un `ARG` Docker non fourni, un réglage laissé vide dans une
 * console d'hébergement, une substitution shell sur une variable non
 * définie. Les deux dégâts observés :
 *
 *   - adresse d'API vide : les appels partent en relatif, contre le
 *     serveur de l'interface, qui répond 404 sur chaque route ;
 *   - `Number("")` vaut `0`, non `NaN` : le délai d'inactivité tombe à
 *     zéro et la session se ferme à la première vérification.
 *
 * Aucun des deux ne se voit au typecheck ni à la construction.
 */

/** Une chaîne, à condition qu'elle porte autre chose que des espaces. */
export function texteEnv(valeur: string | undefined, defaut: string): string {
  const nettoye = valeur?.trim();
  return nettoye ? nettoye : defaut;
}

/** Un nombre fini et strictement positif, sinon la valeur de repli. */
export function nombreEnv(valeur: string | undefined, defaut: number): number {
  const nettoye = valeur?.trim();
  if (!nettoye) return defaut;
  const nombre = Number(nettoye);
  return Number.isFinite(nombre) && nombre > 0 ? nombre : defaut;
}
