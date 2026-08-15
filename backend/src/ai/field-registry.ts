/**
 * Registre des champs du TDR ouverts à l'agent.
 *
 * C'est la seule autorité : il engendre à la fois l'énumération transmise au
 * modèle et le contrôle exercé au retour. Un champ absent d'ici n'existe pas
 * dans le monde de l'agent, et une écriture qui le viserait est rejetée —
 * non parce que le modèle a mal fait, mais parce qu'il n'avait pas à le
 * savoir.
 *
 * TRANSCRIRE N'EST PAS INVENTER
 *
 * L'agent écrit les montants, les dates et les institutions qu'on lui donne
 * ou qu'il lit dans le dossier. Il ne les invente pas. La distinction n'est
 * pas de degré : « mets le budget à 3 millions » est une dictée, « propose
 * un budget » est une fabrication, et le socle proscrit la seconde.
 *
 * Une réserve tenue par le corpus, et non par précaution : les montants,
 * dates et structures repris des documents officiels du projet — dotations
 * des composantes, enveloppes du plan, cibles d'indicateurs — ne s'altèrent
 * jamais. L'agent peut les citer ; il ne les recalcule pas.
 *
 * CE QUI RESTE FERMÉ, ET POURQUOI
 *
 * Le type de TDR et l'activité de rattachement. Ils ne décrivent pas le
 * dossier, ils le CONSTITUENT : ils commandent les bibliothèques chargées,
 * la table de seuils applicable, l'exigence de PGES et le parcours lui-même.
 * Les changer en cours de rédaction ne modifierait pas un champ, cela
 * changerait de dossier.
 *
 * Les engagements. Les deux attestations de conformité sont des actes
 * personnels : elles ne se délèguent pas, et leur horodatage vaut preuve.
 *
 * La catégorie environnementale et sociale. Elle se constate par un
 * screening, elle ne se rédige pas — et c'est elle qui déclenche l'exigence
 * d'un PGES.
 *
 * Le canal MGP-EAS/HS n'apparaît nulle part dans le TDR, et c'est voulu :
 * c'est le seul endroit où le corpus interdit formellement l'IA générative,
 * deux fois plutôt qu'une.
 */

export type FieldKind =
  | 'texte'
  | 'liste_objectifs'
  | 'liste_livrables'
  | 'montant'
  | 'date'
  | 'entier'
  | 'organisation';

export interface FieldSpec {
  /** Nom exposé au modèle, et colonne du dossier */
  cle: string;
  kind: FieldKind;
  /** Ce que le champ contient, dit au modèle */
  description: string;
  /** Étape du parcours qui le porte, pour situer l'écriture à l'écran */
  etape: string;
  /** Longueur maximale acceptée, en caractères */
  max?: number;
}

export const FIELDS: FieldSpec[] = [
  {
    cle: 'context',
    kind: 'texte',
    etape: 'Cadrage',
    max: 6000,
    description:
      "Contexte du dossier : ce qui motive l'activité, son rattachement à la composante et au plan annuel. Deux à trois paragraphes.",
  },
  {
    cle: 'justification',
    kind: 'texte',
    etape: 'Cadrage',
    max: 4000,
    description:
      "Justification : pourquoi ce marché maintenant, et ce que son report coûterait. Un à deux paragraphes.",
  },
  {
    cle: 'beneficiaries',
    kind: 'texte',
    etape: 'Cadrage',
    max: 2000,
    description:
      "Bénéficiaires visés : les populations servies, non l'institution maître d'ouvrage. Quantifier si possible.",
  },
  {
    cle: 'expectedResults',
    kind: 'texte',
    etape: 'Objectifs & livrables',
    max: 3000,
    description:
      "Résultats attendus : ce qui sera constaté, avec son horizon. Un par ligne.",
  },
  {
    cle: 'objectives',
    kind: 'liste_objectifs',
    etape: 'Objectifs & livrables',
    description:
      "Objectifs SMART. Chacun porte un énoncé ouvert par un verbe d'action à l'infinitif, et un critère de succès mesurable.",
  },
  {
    cle: 'deliverables',
    kind: 'liste_livrables',
    etape: 'Objectifs & livrables',
    description:
      "Livrables. Chacun porte un intitulé, un format court, et une échéance en délai relatif au démarrage (J+15, S+4, M+6) — jamais de date ferme.",
  },
  {
    cle: 'approach',
    kind: 'texte',
    etape: 'Méthodologie',
    max: 4000,
    description: "Approche générale : la démarche retenue, son phasage.",
  },
  {
    cle: 'methodology',
    kind: 'texte',
    etape: 'Méthodologie',
    max: 4000,
    description: "Méthodes et outils : standards, référentiels, instruments mobilisés.",
  },
  {
    cle: 'constraints',
    kind: 'texte',
    etape: 'Méthodologie',
    max: 3000,
    description: "Contraintes : dépendances, ressources critiques, fenêtres de décision.",
  },
  {
    cle: 'expertise',
    kind: 'texte',
    etape: 'Calendrier & expertise',
    max: 3000,
    description:
      "Expertise requise : qualifications et expérience attendues de l'institution ou de l'équipe.",
  },

  // --- Calendrier ---
  {
    cle: 'startDate',
    kind: 'date',
    etape: 'Calendrier & expertise',
    description: "Démarrage souhaité, au format AAAA-MM-JJ.",
  },
  {
    cle: 'durationMonths',
    kind: 'entier',
    etape: 'Calendrier & expertise',
    description: "Durée du marché en mois. Elle borne les échéances des livrables.",
  },
  {
    cle: 'effortDays',
    kind: 'entier',
    etape: 'Calendrier & expertise',
    description: "Volume d'effort en jours-homme, unité de facturation d'un marché de prestation.",
  },

  // --- Montants ---
  //
  // Ouverts à la transcription, non à l'invention. Le budget total est borné
  // par l'enveloppe de l'activité du plan, et le contrôle de complétude
  // vérifie en outre le cumul de tous les TDR de cette ligne.
  {
    cle: 'budgetTotalUsd',
    kind: 'montant',
    etape: 'Budget',
    description:
      "Budget total du marché, en USD. À n'écrire que si l'auteur le dicte ou s'il figure dans une pièce du dossier.",
  },
  {
    cle: 'budgetIdaUsd',
    kind: 'montant',
    etape: 'Budget',
    description: "Part financée par l'IDA, en USD.",
  },
  {
    cle: 'budgetAfdUsd',
    kind: 'montant',
    etape: 'Budget',
    description: "Part financée par l'AFD, en USD.",
  },
  {
    cle: 'budgetGovUsd',
    kind: 'montant',
    etape: 'Budget',
    description: "Part financée par le Gouvernement, en USD.",
  },

  // --- Institution ---
  {
    cle: 'beneficiaryOrganisation',
    kind: 'organisation',
    etape: 'Rattachement',
    description:
      "Maîtrise d'ouvrage bénéficiaire : l'entité POUR laquelle l'activité est conduite. Donnez son CODE au référentiel (ANCY, ONIP, ARPTC…), que `lister_organisations` énumère. À ne pas confondre avec les bénéficiaires visés, qui sont des populations.",
  },
];

const PAR_CLE = new Map(FIELDS.map((f) => [f.cle, f]));

export function champ(cle: string): FieldSpec | undefined {
  return PAR_CLE.get(cle);
}

/** L'énumération des champs, telle qu'elle est transmise au modèle. */
export function enumerationChamps(): string {
  return FIELDS.map((f) => `— ${f.cle} (étape ${f.etape}) : ${f.description}`).join('\n');
}

/**
 * Ramène une liste à un tableau, qu'elle arrive comme tel ou sérialisée.
 *
 * Le modèle sérialise volontiers un tableau en chaîne JSON — c'est ce
 * qu'il fait quand le paramètre n'annonce pas de type, et l'argument d'un
 * outil voyage de toute façon en texte. Refuser cette forme condamnait
 * l'écriture des objectifs et des livrables à échouer en boucle : il
 * réessayait à l'identique, puisque rien ne lui disait ce qui clochait.
 */
export function versTableau(valeur: unknown): unknown[] | null {
  if (Array.isArray(valeur)) return valeur;
  if (typeof valeur === 'string') {
    try {
      const lu: unknown = JSON.parse(valeur);
      return Array.isArray(lu) ? lu : null;
    } catch {
      return null;
    }
  }
  return null;
}

/**
 * Contrôle d'une valeur avant écriture.
 *
 * Le modèle est instruit, mais l'instruction n'est pas un contrôle : c'est
 * ici que la règle est tenue. Renvoie le motif du refus, ou null.
 */
export function refus(spec: FieldSpec, valeur: unknown): string | null {
  if (spec.kind === 'montant') {
    const n = typeof valeur === 'number' ? valeur : Number(String(valeur).replace(/[\s,]/g, ''));
    if (!Number.isFinite(n)) return `${spec.cle} attend un montant en USD, en chiffres.`;
    if (n < 0) return `${spec.cle} ne peut pas être négatif.`;
    // Un projet de 510 M USD n'a pas de marché à dix milliards : au-delà,
    // c'est une virgule mal placée, non une intention.
    if (n > 1e10) return `${spec.cle} : ${n} USD est hors de proportion. Vérifiez l'unité.`;
    return null;
  }

  if (spec.kind === 'entier') {
    const n = typeof valeur === 'number' ? valeur : Number(valeur);
    if (!Number.isInteger(n) || n <= 0) return `${spec.cle} attend un nombre entier positif.`;
    if (n > 3650) return `${spec.cle} : ${n} est hors de proportion.`;
    return null;
  }

  if (spec.kind === 'date') {
    if (typeof valeur !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(valeur)) {
      return `${spec.cle} attend une date au format AAAA-MM-JJ.`;
    }
    if (Number.isNaN(Date.parse(valeur))) return `${spec.cle} : cette date n'existe pas.`;
    return null;
  }

  if (spec.kind === 'organisation') {
    if (typeof valeur !== 'string' || !valeur.trim()) {
      return `${spec.cle} attend le code d'une organisation du référentiel.`;
    }
    // L'existence se vérifie en base, pas ici : le registre ne connaît pas
    // le référentiel.
    return null;
  }

  if (spec.kind === 'texte') {
    if (typeof valeur !== 'string') return `${spec.cle} attend du texte.`;
    if (!valeur.trim()) return `${spec.cle} ne peut pas être vidé par l'agent.`;
    if (spec.max && valeur.length > spec.max) {
      return `${spec.cle} dépasse ${spec.max} caractères (${valeur.length}).`;
    }
    return null;
  }

  const liste = versTableau(valeur);
  if (!liste) {
    // Le message dit la forme attendue : sans cela le modèle réessaie à
    // l'identique, et la conversation tourne à vide.
    const forme =
      spec.kind === 'liste_objectifs'
        ? '[{"title": "…", "criteria": "…"}]'
        : '[{"title": "…", "format": "…", "deadline": "M+6"}]';
    return `${spec.cle} attend un tableau d'objets, de la forme ${forme}.`;
  }
  if (liste.length === 0) return `${spec.cle} attend une liste non vide.`;
  if (liste.length > 20) {
    return `${spec.cle} : vingt entrées au maximum, ${liste.length} proposées.`;
  }

  for (const [i, ligne] of liste.entries()) {
    if (typeof ligne !== 'object' || ligne === null) {
      return `${spec.cle} : l'entrée ${i + 1} n'est pas un objet.`;
    }
    const o = ligne as Record<string, unknown>;
    const intitule = spec.kind === 'liste_objectifs' ? o.title : o.title;
    if (typeof intitule !== 'string' || !intitule.trim()) {
      return `${spec.cle} : l'entrée ${i + 1} n'a pas d'intitulé.`;
    }
  }
  return null;
}

/**
 * Normalise une liste avant écriture, en ne gardant que les colonnes
 * connues. Un objet renvoyé par le modèle peut porter des clés
 * surnuméraires ; les recopier telles quelles ferait échouer Prisma.
 */
export function normaliseListe(
  spec: FieldSpec,
  valeur: unknown,
): Array<Record<string, string>> {
  const texte = (v: unknown) => (typeof v === 'string' ? v.trim() : '');
  return (versTableau(valeur) ?? []).map((ligne): Record<string, string> => {
    const o = ligne as Record<string, unknown>;
    if (spec.kind === 'liste_objectifs') {
      return { title: texte(o.title), criteria: texte(o.criteria) };
    }
    return { title: texte(o.title), format: texte(o.format), deadline: texte(o.deadline) };
  });
}
