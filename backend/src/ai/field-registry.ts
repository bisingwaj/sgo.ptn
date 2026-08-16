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
  /**
   * Longueur maximale acceptée, en caractères.
   *
   * Ce n'est plus une contrainte rédactionnelle : les plafonds bornaient la
   * rédaction bien avant ce qu'un dossier réel demande, et un auteur s'y
   * heurtait en écrivant normalement. Ce qui subsiste est un garde-fou
   * technique — une réponse de modèle partie en boucle ne doit pas écrire
   * un demi-mégaoctet dans un champ.
   */
  max?: number;
}

export const FIELDS: FieldSpec[] = [
  {
    cle: 'context',
    kind: 'texte',
    etape: 'Cadrage',
    max: 40000,
    description:
      "Contexte du dossier : ce qui motive l'activité, son rattachement à la composante et au plan annuel. Deux à trois paragraphes.",
  },
  {
    cle: 'justification',
    kind: 'texte',
    etape: 'Cadrage',
    max: 30000,
    description:
      'Justification : pourquoi ce marché maintenant, et ce que son report coûterait. Un à deux paragraphes.',
  },
  {
    cle: 'beneficiaries',
    kind: 'texte',
    etape: 'Cadrage',
    max: 16000,
    description:
      "Bénéficiaires visés : les populations servies, non l'institution maître d'ouvrage. Quantifier si possible.",
  },
  {
    cle: 'expectedResults',
    kind: 'texte',
    etape: 'Objectifs & livrables',
    max: 24000,
    description:
      'Résultats attendus : ce qui sera constaté, avec son horizon. Un par ligne.',
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
      'Livrables. Chacun porte un intitulé, un format court, et une échéance en délai relatif au démarrage (J+15, S+4, M+6) — jamais de date ferme.',
  },
  {
    cle: 'approach',
    kind: 'texte',
    etape: 'Méthodologie',
    max: 30000,
    description: 'Approche générale : la démarche retenue, son phasage.',
  },
  {
    cle: 'methodology',
    kind: 'texte',
    etape: 'Méthodologie',
    max: 30000,
    description:
      'Méthodes et outils : standards, référentiels, instruments mobilisés.',
  },
  {
    cle: 'constraints',
    kind: 'texte',
    etape: 'Méthodologie',
    max: 24000,
    description:
      'Contraintes : dépendances, ressources critiques, fenêtres de décision.',
  },
  {
    cle: 'expertise',
    kind: 'texte',
    etape: 'Calendrier & expertise',
    max: 24000,
    description:
      "Expertise requise : qualifications et expérience attendues de l'institution ou de l'équipe.",
  },

  // --- Calendrier ---
  {
    cle: 'startDate',
    kind: 'date',
    etape: 'Calendrier & expertise',
    description: 'Démarrage souhaité, au format AAAA-MM-JJ.',
  },
  {
    cle: 'durationMonths',
    kind: 'entier',
    etape: 'Calendrier & expertise',
    description:
      'Durée du marché en mois. Elle borne les échéances des livrables.',
  },
  {
    cle: 'effortDays',
    kind: 'entier',
    etape: 'Calendrier & expertise',
    description:
      "Volume d'effort en jours-homme, unité de facturation d'un marché de prestation.",
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
    description: 'Part financée par le Gouvernement, en USD.',
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
  return FIELDS.map(
    (f) => `— ${f.cle} (étape ${f.etape}) : ${f.description}`,
  ).join('\n');
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
    const n =
      typeof valeur === 'number'
        ? valeur
        : Number(String(valeur).replace(/[\s,]/g, ''));
    if (!Number.isFinite(n))
      return `${spec.cle} attend un montant en USD, en chiffres.`;
    if (n < 0) return `${spec.cle} ne peut pas être négatif.`;
    // Un projet de 510 M USD n'a pas de marché à dix milliards : au-delà,
    // c'est une virgule mal placée, non une intention.
    if (n > 1e10)
      return `${spec.cle} : ${n} USD est hors de proportion. Vérifiez l'unité.`;
    return null;
  }

  if (spec.kind === 'entier') {
    const n = typeof valeur === 'number' ? valeur : Number(valeur);
    if (!Number.isInteger(n) || n <= 0)
      return `${spec.cle} attend un nombre entier positif.`;
    if (n > 3650) return `${spec.cle} : ${n} est hors de proportion.`;
    return null;
  }

  if (spec.kind === 'date') {
    if (typeof valeur !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(valeur)) {
      return `${spec.cle} attend une date au format AAAA-MM-JJ.`;
    }
    if (Number.isNaN(Date.parse(valeur)))
      return `${spec.cle} : cette date n'existe pas.`;
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
  const texte = (v: unknown) =>
    typeof v === 'string' ? sansBalisage(v.trim()) : '';
  return (versTableau(valeur) ?? []).map((ligne): Record<string, string> => {
    const o = ligne as Record<string, unknown>;
    if (spec.kind === 'liste_objectifs') {
      return { title: texte(o.title), criteria: texte(o.criteria) };
    }
    return {
      title: texte(o.title),
      format: texte(o.format),
      deadline: texte(o.deadline),
    };
  });
}

/**
 * Ôte le balisage léger d'une valeur destinée au dossier.
 *
 * Le modèle répond en Markdown : c'est utile dans la conversation, où le
 * panneau le rend. Ce n'est pas admissible dans un CHAMP. La valeur d'un
 * champ part telle quelle dans un PDF et un DOCX contractuels, composés par
 * pdfkit et docx, qui écrivent le texte sans l'interpréter : un contexte
 * rédigé « **Contexte** » sortirait avec ses astérisques sur une pièce
 * signée. La règle du dépôt le dit autrement : l'API transporte des
 * DONNÉES, l'interface en fait la PRÉSENTATION.
 *
 * On ôte SEULEMENT des paires reconnues, jamais un caractère isolé. Un
 * astérisque de renvoi — « (*) voir annexe » — ou une multiplication —
 * « 2 * 3 lots » — sont des textes administratifs parfaitement légitimes
 * qu'un nettoyage aveugle abîmerait. Les mêmes règles de flanc que le rendu
 * du panneau s'appliquent : une ouverture suit une espace et précède un
 * caractère plein ; une fermeture suit un caractère plein et précède une
 * espace ou une ponctuation.
 *
 * Ce nettoyage double la consigne donnée au modèle, il ne la remplace pas.
 * Une consigne se contourne, un contrôle non.
 */
export function sansBalisage(texte: string): string {
  // Pas de sortie hâtive sur l'absence de marqueur : le nettoyage des débuts
  // de ligne, plus bas, s'applique aussi à un texte qui n'en porte aucun.
  // La première version sortait ici et laissait passer « ## Contexte ».

  const ouvre = (s: string, i: number, n: number) => {
    const avant = i === 0 ? ' ' : s[i - 1];
    const apres = s[i + n];
    return /\s/.test(avant) && apres !== undefined && !/\s/.test(apres);
  };
  const ferme = (s: string, i: number, n: number) => {
    const avant = s[i - 1];
    const apres = s[i + n];
    return (
      avant !== undefined &&
      !/\s/.test(avant) &&
      (apres === undefined || /[\s.,;:!?)\]»…]/.test(apres))
    );
  };

  // Le gras d'abord : « ** » serait sinon lu comme deux italiques.
  const signes = ['**', '__', '*', '_', '`'];

  let reste = texte;
  let sortie = '';

  // Le balayage des marqueurs ne sert que s'il y en a : le cas courant
  // est un texte qui n'en porte aucun.
  if (!/[*_`]/.test(texte)) {
    sortie = texte;
    reste = '';
  }

  while (reste.length > 0) {
    let trouve: { debut: number; fin: number; signe: string } | null = null;

    for (let i = 0; i < reste.length && !trouve; i += 1) {
      const signe = signes.find((s) => reste.startsWith(s, i));
      if (!signe) continue;

      const litteral = signe === '`';
      if (!litteral && !ouvre(reste, i, signe.length)) continue;

      const depart = i + signe.length;
      for (let j = depart; j < reste.length; j += 1) {
        if (!reste.startsWith(signe, j)) continue;
        if (j === depart) continue;
        if (!litteral && !ferme(reste, j, signe.length)) continue;
        trouve = { debut: i, fin: j, signe };
        break;
      }
    }

    if (!trouve) {
      sortie += reste;
      break;
    }

    sortie += reste.slice(0, trouve.debut);
    // Récursif par la boucle : le contenu repasse et perd ses marques
    // internes, un gras pouvant porter de l'italique.
    reste =
      reste.slice(trouve.debut + trouve.signe.length, trouve.fin) +
      reste.slice(trouve.fin + trouve.signe.length);
  }

  // En tête de ligne, trois traitements distincts — et c'est là qu'est le
  // point délicat de cette fonction.
  //
  // LE TIRET RESTE. Une énumération ouverte par un tiret est une forme
  // administrative française parfaitement ordinaire, qui s'imprime telle
  // quelle sans choquer personne dans un TDR. La retirer détruirait la
  // structure d'un champ « résultats attendus », dont la consigne dit
  // justement « un par ligne ».
  //
  // L'ASTÉRISQUE DEVIENT UN TIRET. Employé comme puce, il ne se lit pas :
  // c'est une convention d'écriture technique, pas de rédaction.
  //
  // LE DIÈSE PART. « ## Contexte » n'a aucun sens sur une pièce imprimée.
  return sortie
    .split('\n')
    .map((l) =>
      l.replace(/^( {0,3})\*(\s+)/, '$1-$2').replace(/^ {0,3}#{1,6}\s+/, ''),
    )
    .join('\n')
    .trim();
}
