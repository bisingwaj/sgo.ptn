/**
 * La langue de l'interface.
 *
 * DEUX LANGUES, ET DEUX SEULEMENT. Le français est la langue officielle de
 * la République Démocratique du Congo et celle du MEP ; l'anglais est celle
 * de la Banque mondiale, dont le TTL lit les dossiers. Le sélecteur en
 * proposait quatre — Lingala et Kiswahili en plus — sans en traduire
 * aucune. Les six langues du corpus concernent le SITE PUBLIC, qui est hors
 * de ce dépôt.
 *
 * LA LANGUE VIT DANS UN COOKIE, PAS DANS L'ADRESSE. Un préfixe `/en/…`
 * obligerait à réécrire les soixante-neuf routes, casserait les liens déjà
 * partagés, et compliquerait le parcours de rédaction qui navigue entre
 * dix-huit étapes. Le cookie coûte une chose en retour : un lien partagé ne
 * porte pas sa langue, et s'ouvre dans celle du destinataire. C'est
 * acceptable pour une plateforme interne où chacun garde la sienne.
 */

export const LANGUES = ['fr', 'en'] as const;
export type Langue = (typeof LANGUES)[number];

/** Le français fait foi : c'est la langue du MEP et des pièces produites. */
export const LANGUE_PAR_DEFAUT: Langue = 'fr';

/**
 * Nom du cookie.
 *
 * Préfixé comme le reste du stockage du projet, pour qu'on sache d'où il
 * vient en inspectant un navigateur.
 */
export const COOKIE_LANGUE = 'ptn-langue';

/** Un an : la langue est un réglage de poste, pas de session. */
export const COOKIE_LANGUE_DUREE = 60 * 60 * 24 * 365;

export function estLangue(valeur: unknown): valeur is Langue {
  return typeof valeur === 'string' && (LANGUES as readonly string[]).includes(valeur);
}

/** Ce que le sélecteur affiche. */
export const LIBELLES_LANGUE: Record<Langue, { nom: string; sigle: string; note: string }> = {
  fr: { nom: 'Français', sigle: 'FR', note: 'Langue officielle · fait foi' },
  en: { nom: 'English', sigle: 'EN', note: 'World Bank · TTL' },
};
