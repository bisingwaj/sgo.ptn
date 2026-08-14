import { ApiError } from "@/lib/api";

/**
 * Neutralisation des messages d'échec d'authentification.
 *
 * ---------------------------------------------------------------------------
 * POURQUOI
 *
 * L'API répond aujourd'hui, quand la famille choisie ne correspond pas :
 *
 *   « Ce compte ne détient aucune habilitation dans la famille "Bailleurs".
 *     Il relève de "UGP / Gouvernement". »
 *
 * Le message est utile — et divulgue deux choses à qui n'est pas titulaire du
 * compte : que l'adresse essayée existe, et à quelle institution elle est
 * rattachée. Il suffit alors d'essayer des adresses au hasard pour dresser la
 * carte des agents de l'UGP, des bailleurs et des auditeurs. Sur une
 * plateforme qui porte des habilitations fiduciaires et un canal de
 * signalement de violences sexuelles, cette cartographie est exactement ce
 * qu'un attaquant cherche en premier.
 *
 * Règle appliquée : tout échec d'authentification produit UN SEUL message,
 * identique quelle que soit la cause. Mot de passe erroné, compte inexistant,
 * famille incorrecte — rien ne les distingue de l'extérieur.
 *
 * Le message énumère les trois causes possibles : l'usager légitime sait quoi
 * vérifier, sans que la réponse confirme laquelle était la bonne.
 *
 * ---------------------------------------------------------------------------
 * À CORRIGER CÔTÉ SERVEUR
 *
 * Cette neutralisation est un filet, pas une correction. Le message précis
 * transite toujours sur le réseau : il reste lisible dans l'onglet « Réseau »
 * du navigateur, dans les journaux d'un proxy, dans un cache. Seul le backend
 * peut réellement le supprimer, en renvoyant un 401 uniforme sur /auth/login.
 * ---------------------------------------------------------------------------
 */

/** Message unique de tout échec d'authentification. */
export const GENERIC_AUTH_FAILURE =
  "Adresse électronique, mot de passe ou cadre d'intervention incorrect. Vérifiez les trois, puis réessayez.";

/**
 * Statuts pour lesquels la réponse du serveur ne doit jamais être affichée.
 * 401 identifiants · 403 habilitation · 422 règle métier sur la famille.
 */
const OPAQUE_STATUSES = new Set([401, 403, 404, 422]);

export function loginErrorMessage(error: unknown): string {
  if (!(error instanceof ApiError)) {
    return "Une erreur inattendue est survenue. Réessayez dans un instant.";
  }

  // Panne réseau : l'API est injoignable. Rien de confidentiel à protéger, et
  // l'information est utile — elle distingue « service arrêté » de
  // « identifiants refusés », deux situations aux suites très différentes.
  if (error.status === 0) return error.message;

  if (OPAQUE_STATUSES.has(error.status)) return GENERIC_AUTH_FAILURE;

  // 429 : la limitation de débit se dit, sinon l'usager réessaie en boucle.
  if (error.status === 429) {
    return "Trop de tentatives. Patientez quelques minutes avant de réessayer.";
  }

  if (error.status >= 500) {
    return "Le service d'authentification rencontre un incident. Réessayez dans quelques instants.";
  }

  return GENERIC_AUTH_FAILURE;
}
