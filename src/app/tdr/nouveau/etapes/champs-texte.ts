/**
 * Les six sections rédigées du TDR, une par écran.
 *
 * Le libellé d'un champ ne dit pas quoi écrire — « Contexte » n'apprend
 * rien à qui hésite. La question, si. Et les repères disent surtout ce
 * qu'il ne faut PAS mettre là : c'est ce qui empêche les six sections de
 * se répéter, défaut le plus courant des dossiers reçus.
 *
 * Les clés sont celles du registre du serveur : `src/ai/field-registry.ts`.
 * Un champ absent de ce registre n'a pas d'assistance.
 */

import type { ChampTexte } from "./EtapeTexte";

export const CHAMPS_TEXTE: Record<string, ChampTexte> = {
  context: {
    cle: "context",
    question: "Qu’est-ce qui motive ce marché, et dans quel cadre s’inscrit-il ?",
    aide: "Situez le besoin dans le projet, puis venez à l’objet du présent marché. L’activité du plan le dépasse : c’est le marché qu’il faut décrire ici.",
    annonceIa:
      "Le modèle reçoit l’activité du plan, la composante, le type de marché et la couverture géographique de ce dossier. Aucune donnée personnelle. Il ne produit ni montant ni référence réglementaire qui ne lui ait été fournie.",
    placeholder:
      "Le projet PTN-RDC vise à…\n\nLe présent marché porte sur…",
    reperes: [
      "Deux à trois paragraphes, 180 à 260 mots",
      "Le premier situe le besoin, les suivants traitent de l’objet du marché",
      "Ni objectifs ni livrables : ils ont leurs propres sections",
      "Pas de formule d’ouverture en conclusion",
    ],
  },

  justification: {
    cle: "justification",
    question: "Pourquoi ce marché maintenant, et que coûterait son report ?",
    aide: "La justification n’est pas un second contexte. Elle répond à l’urgence : ce qui se dégrade, se bloque ou se perd si l’on attend.",
    annonceIa:
      "Si le champ est vide, le modèle rédige. S’il contient déjà un texte, il en reprend la forme sans y introduire de fait nouveau — améliorer ne doit pas servir à ajouter des affirmations que vous n’avez pas écrites.",
    placeholder: "Sans cette intervention…",
    lignes: 8,
    reperes: [
      "Un à deux paragraphes",
      "Ce que le report coûte, concrètement",
      "Ne pas redire le contexte",
    ],
  },

  beneficiaries: {
    cle: "beneficiaries",
    question: "Qui bénéficie de ce marché ?",
    aide: "Les populations servies — pas l’institution maître d’ouvrage. C’est la confusion la plus fréquente sur ce champ, et elle fausse la lecture du dossier par le bailleur.",
    annonceIa:
      "Le modèle distingue bénéficiaires directs et indirects, et quantifie seulement si le dossier porte un chiffre. À défaut, il laisse « [nombre à préciser] » plutôt que d’avancer une estimation.",
    placeholder: "Les habitants de…",
    lignes: 8,
    reperes: [
      "Un paragraphe, 60 à 110 mots",
      "Des populations, jamais une administration",
      "Chiffrer si le dossier porte un chiffre, sinon laisser entre crochets",
      "Distinguer direct et indirect quand la distinction a un sens",
    ],
  },

  expectedResults: {
    cle: "expectedResults",
    question: "Qu’est-ce qui sera constaté à l’issue ?",
    aide: "Un résultat n’est ni une action ni un livrable. « Le centre traite les incidents 24 h/24 » est un résultat ; « installer les serveurs » n’en est pas un.",
    annonceIa:
      "Le modèle propose trois à six résultats, un par ligne, avec leur horizon. Les valeurs cibles absentes du dossier restent entre crochets — elles ne s’inventent pas.",
    placeholder: "Un résultat par ligne…",
    lignes: 10,
    reperes: [
      "Trois à six résultats, un par ligne",
      "Ce qui sera constaté, avec son horizon",
      "Ni action, ni livrable",
    ],
  },

  approach: {
    cle: "approach",
    question: "Par quelle voie le prestataire doit-il s’y prendre ?",
    aide: "L’approche générale, et pourquoi elle convient à cet objet. Les étapes viennent après, dans la méthodologie.",
    annonceIa:
      "Le modèle reste sur la voie choisie et n’entre pas dans le détail des phases. Il ne nomme ni outil ni fournisseur : la mise en concurrence ouverte est la règle du projet.",
    placeholder: "L’approche retenue repose sur…",
    lignes: 10,
    reperes: [
      "Deux paragraphes, 120 à 200 mots",
      "La voie, pas les étapes",
      "Aucun outil ni fournisseur nommé",
    ],
  },

  methodology: {
    cle: "methodology",
    question: "Quelles étapes le prestataire doit-il suivre ?",
    aide: "Chaque ligne nomme une phase et ce qu’elle produit. Restez sur ce que le prestataire fait — pas sur ce que l’administration fera de son côté.",
    annonceIa:
      "Le modèle propose les phases dans l’ordre, avec leur production. Il ne fixe aucune date : le calendrier est une section distincte, et une date engage contractuellement.",
    placeholder: "Une phase par ligne…",
    lignes: 12,
    reperes: [
      "Une phase par ligne, dans l’ordre",
      "Ce que chaque phase produit",
      "Aucune date : le calendrier a sa section",
    ],
  },

  constraints: {
    cle: "constraints",
    question: "Qu’est-ce qui borne l’exécution ?",
    aide: "Accès aux sites, disponibilité des données, saisonnalité, interopérabilité, sécurité. Une contrainte qui n’en est pas une affaiblit celles qui en sont.",
    annonceIa:
      "Le modèle s’en tient aux contraintes que le dossier porte. Il n’invente aucune contrainte réglementaire ni aucun texte de loi qui ne lui aurait été fourni.",
    placeholder: "Une contrainte par ligne…",
    lignes: 10,
    reperes: [
      "Une contrainte par ligne",
      "Réelles et vérifiables",
      "Aucun texte réglementaire non fourni",
    ],
  },

  expertise: {
    cle: "expertise",
    question: "Quelle expertise le marché exige-t-il ?",
    aide: "Les profils-clés, avec pour chacun le domaine et l’expérience minimale. Des qualifications vérifiables, jamais des noms.",
    annonceIa:
      "Le modèle propose des profils avec leur domaine et leur expérience minimale. Il ne nomme aucune personne, aucun cabinet, aucune certification propriétaire — cela restreindrait la concurrence.",
    placeholder: "Un profil par ligne…",
    lignes: 10,
    reperes: [
      "Un profil par ligne",
      "Domaine et expérience minimale",
      "Aucun nom, aucune certification propriétaire",
    ],
  },
};

/**
 * Ce que le rail des étapes affiche.
 *
 * Court dans le rail, la question restant au corps de l'écran : un rail
 * qui pose les questions en entier cesse d'être un repère de position.
 */
export const LIBELLES_ETAPE: Record<string, { label: string; sub: string }> = {
  context: { label: "Contexte", sub: "Ce qui motive ce marché" },
  justification: { label: "Justification", sub: "Pourquoi maintenant" },
  beneficiaries: { label: "Bénéficiaires", sub: "Les populations servies" },
  expectedResults: { label: "Résultats attendus", sub: "Ce qui sera constaté" },
  approach: { label: "Approche", sub: "Par quelle voie" },
  methodology: { label: "Méthodologie", sub: "Les étapes attendues" },
  constraints: { label: "Contraintes", sub: "Ce qui borne l’exécution" },
  expertise: { label: "Expertise", sub: "Les profils-clés requis" },
};
