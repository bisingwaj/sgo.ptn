/**
 * Ce qu'un refus d'habilitation dit à la personne qui le lit.
 *
 * Le message était « Habilitation insuffisante. Permission requise :
 * ptba:read. » Un code de permission ne veut rien dire pour un agent : il
 * ne lui apprend ni ce qu'il essayait d'atteindre, ni qui détient ce droit,
 * ni quoi faire ensuite. Il le renvoie chercher, et le plus souvent
 * appeler l'administrateur pour poser la question à laquelle le message
 * aurait dû répondre.
 *
 * Trois choses, donc, et dans cet ordre : LE MODULE en clair, QUI le
 * détient, et la seule suite possible — demander l'habilitation à un
 * administrateur. Le code technique ne disparaît pas pour autant : il part
 * au journal, où l'exploitant le cherchera.
 */

interface Domaine {
  /**
   * Le module, nommé comme il l'est à l'écran, ARTICLE DÉJÀ CONTRACTÉ.
   *
   * « aux termes de référence », non « les termes de référence » : la
   * phrase le fait suivre d'« accès », et un « accès à les » est une faute
   * qui décrédibilise tout le message. Le français ne se recompose pas par
   * concaténation.
   */
  module: string;
  /** Les fonctions qui détiennent ce droit, en clair */
  detenteurs: string;
}

/**
 * Une entrée par famille de permissions, non par permission.
 *
 * `ptba:read` et `ptba:write` désignent le même module ; les distinguer
 * n'apprendrait rien de plus à qui n'a ni l'un ni l'autre.
 */
const DOMAINES: Record<string, Domaine> = {
  ptba: {
    module: 'au Plan de Travail et Budget Annuel',
    detenteurs: 'les responsables de composante, le RPM et la coordination',
  },
  ppm: {
    module: 'au Plan de Passation des Marchés',
    detenteurs: 'le RPM, les chargés de passation et la coordination',
  },
  tdr: {
    module: 'aux termes de référence',
    detenteurs: 'les responsables de composante, le RPM et la coordination',
  },
  ano: {
    module: 'aux avis de non-objection',
    detenteurs:
      'la coordination pour les demandes, les bailleurs pour les décisions',
  },
  dao: {
    module: 'aux dossiers d’appel d’offres',
    detenteurs: 'le RPM et les chargés de passation',
  },
  marketplace: {
    module: 'aux avis publiés',
    detenteurs: 'les entreprises candidates',
  },
  soumission: {
    module: 'au dépôt d’offres',
    detenteurs: 'les entreprises candidates',
  },
  commission: {
    module: 'aux commissions d’évaluation',
    detenteurs:
      'la coordination pour la constitution, les membres désignés pour y siéger',
  },
  contrat: {
    module: 'aux contrats',
    detenteurs: 'le RPM, le RAF et la coordination pour la signature',
  },
  fiduciaire: {
    module: 'à la gestion fiduciaire',
    detenteurs: 'le RAF, le comptable et la coordination',
  },
  comptabilite: {
    module: 'à la comptabilité',
    detenteurs: 'le comptable et le RAF',
  },
  caisse: { module: 'à la caisse', detenteurs: 'le caissier et le RAF' },
  es: {
    module: 'aux sauvegardes environnementales et sociales',
    detenteurs: 'les spécialistes E&S et développement social',
  },
  mgp: {
    module: 'au mécanisme de gestion des plaintes',
    detenteurs: 'les gestionnaires du MGP',
  },
  easHs: {
    module: 'au canal confidentiel EAS/HS',
    detenteurs: 'le pool VBG habilité, et personne d’autre',
  },
  audit: {
    module: 'à l’audit',
    detenteurs: 'l’auditeur interne et les cabinets d’audit externe',
  },
  admin: {
    module: 'à l’administration de la plateforme',
    detenteurs: 'les administrateurs',
  },
  referentiel: {
    module: 'au référentiel',
    detenteurs: 'le RPM et les spécialistes, selon la bibliothèque',
  },
  indicateur: {
    module: 'aux indicateurs de résultats',
    detenteurs: 'le spécialiste suivi-évaluation',
  },
  sbp: {
    module: 'aux subventions basées sur la performance',
    detenteurs:
      'les gestionnaires SBP et les bénéficiaires pour leurs propres données',
  },
  gouvernance: {
    module: 'aux instances de gouvernance',
    detenteurs: 'le COPIL et le CTP',
  },
  rfi: { module: 'aux rapports financiers intérimaires', detenteurs: 'le RAF' },
  kyc: {
    module: 'à la connaissance du candidat',
    detenteurs: 'les entreprises candidates',
  },
  communication: {
    module: 'à la communication',
    detenteurs: 'le chargé de communication',
  },
};

/**
 * Compose le refus.
 *
 * Une seule famille est nommée, même si plusieurs permissions manquent :
 * énumérer trois modules à qui n'a accès à aucun n'aide pas, et la
 * première suffit à expliquer le blocage.
 */
export function messageHabilitation(manquantes: string[]): string {
  const famille = manquantes[0]?.split(':')[0] ?? '';
  const domaine = DOMAINES[famille];

  if (!domaine) {
    return (
      'Vous n’avez pas l’habilitation nécessaire pour cette action. ' +
      'Demandez-la à un administrateur de la plateforme, en lui indiquant l’écran concerné.'
    );
  }

  return (
    `Votre habilitation actuelle ne donne pas accès ${domaine.module}. ` +
    `Ce droit est détenu par ${domaine.detenteurs}. ` +
    'Si vos fonctions le justifient, demandez-le à un administrateur de la plateforme.'
  );
}
