/**
 * Plan du document de termes de référence.
 *
 * UNE SEULE SOURCE POUR LES DEUX FORMATS. Le PDF et le DOCX doivent dire la
 * même chose, sinon deux versions d'une pièce contractuelle circuleraient
 * en se contredisant. Ce fichier décide du contenu ; les deux composeurs ne
 * décident que de l'apparence.
 *
 * RIEN N'EST GÉNÉRÉ ICI. Chaque valeur est reprise mot pour mot du dossier
 * saisi par l'auteur, qui a signé son attestation de conformité sur ce
 * texte-là. Le socle de connaissance interdit d'ailleurs au modèle de
 * rédiger un document final : « Vous produisez une matière première
 * destinée à être reprise par un rédacteur humain, qui en porte la
 * responsabilité. » Composer n'est pas rédiger — et c'est ce que fait ce
 * fichier, sans appeler aucun modèle.
 */

export type Bloc =
  | { genre: 'paragraphe'; texte: string }
  | { genre: 'liste'; entrees: string[] }
  | { genre: 'definitions'; lignes: Array<{ cle: string; valeur: string }> }
  | { genre: 'absent'; mention: string };

export interface Section {
  numero: string;
  titre: string;
  blocs: Bloc[];
}

export interface PlanDocument {
  reference: string;
  titre: string;
  typeCode: string;
  typeNom: string;
  organisation: string;
  statut: string;
  /** Date de composition, en toutes lettres */
  dateComposition: string;
  entete: Array<{ cle: string; valeur: string }>;
  sections: Section[];
  /** Champs auxquels l'assistant a contribué — mention en fin de document */
  champsAssistes: string[];
}

/** Ce qu'on écrit quand un champ est vide : dire le vide, non le masquer. */
const VIDE = 'Non renseigné.';

/**
 * Nom lisible des champs assistés, pour la mention de rédaction assistée.
 *
 * Le document annonçait « Rédaction assistée sur : context, justification,
 * beneficiaries, expectedResults… » — les clés du modèle, telles quelles,
 * dans une pièce qui part chez un bailleur. La mention existe pour être
 * comprise ; elle disait le contraire de ce qu'elle vaut.
 *
 * Les libellés reprennent les titres de section du document, quand il y en
 * a un : le lecteur doit pouvoir aller voir la section nommée.
 */
const NOM_CHAMP: Record<string, string> = {
  context: 'Contexte',
  justification: 'Justification',
  beneficiaries: 'Bénéficiaires visés',
  expectedResults: 'Résultats attendus',
  objectives: 'Objectifs',
  deliverables: 'Livrables attendus',
  approach: 'Approche',
  methodology: 'Méthodologie',
  constraints: 'Contraintes',
  expertise: 'Expertise requise',
};

/**
 * Une clé inconnue est rendue telle quelle plutôt qu'écartée : un champ
 * ajouté au registre sans l'être ici doit se voir, non disparaître de la
 * déclaration. Taire une contribution serait une omission.
 */
export function nommerChampsAssistes(cles: string[]): string[] {
  return cles.map((c) => NOM_CHAMP[c] ?? c);
}

/**
 * Statut, en clair.
 *
 * Le plan porte déjà `dateComposition` en toutes lettres et ses titres de
 * section en français : ce n'est pas une charge utile d'API, c'est un
 * document composé. Un code d'énumération n'y a pas plus sa place qu'une
 * date ISO — la règle « l'API transporte des données » vaut pour les
 * ressources, pas pour la pièce elle-même.
 */
const NOM_STATUT: Record<string, string> = {
  BROUILLON: 'Brouillon',
  SOUMIS_UGP: 'Transmis à l’UGP',
  REVUE_UGP: 'En revue UGP',
  RETOURNE: 'Retourné pour reprise',
  VALIDE_UGP: 'Validé par l’UGP',
  ANO_EN_COURS: 'ANO en cours',
  ANO_OBTENU: 'ANO obtenu',
  ANO_REFUSE: 'ANO refusé',
  ARCHIVE: 'Archivé',
};

const MOIS = [
  'janvier', 'février', 'mars', 'avril', 'mai', 'juin',
  'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre',
];

export function dateEnToutesLettres(d: Date): string {
  return `${d.getDate()} ${MOIS[d.getMonth()]} ${d.getFullYear()}`;
}

const usd = (v: unknown): string =>
  v === null || v === undefined ? '—' : `${(Number(v) / 1e6).toFixed(2)} M USD`;

const prose = (v: string | null | undefined): Bloc =>
  v && v.trim() ? { genre: 'paragraphe', texte: v.trim() } : { genre: 'absent', mention: VIDE };

/**
 * Champs qui s'écrivent une entrée par ligne.
 *
 * Résultats attendus, méthodologie, contraintes, expertise : la consigne de
 * rédaction demande une entrée par ligne, l'écran offre une mise en liste,
 * et le document les rendait pourtant en un seul paragraphe. Le tiret posé
 * par l'auteur s'y retrouvait littéralement, au milieu du texte.
 *
 * Une seule ligne reste de la prose : forcer une liste d'un élément
 * fabriquerait une puce là où il n'y a qu'une phrase.
 *
 * Les marqueurs de tête sont retirés — tiret, cadratin, puce, numérotation.
 * Ils servent à voir la structure pendant la saisie ; le document, lui,
 * porte sa propre puce, et deux puces valent une faute de composition.
 */
const listeOuProse = (v: string | null | undefined): Bloc => {
  if (!v?.trim()) return { genre: 'absent', mention: VIDE };

  const entrees = v
    .split('\n')
    .map((l) => l.trim().replace(/^(?:[-–—•*]|\d+[.)])\s*/, '').trim())
    .filter(Boolean);

  return entrees.length > 1
    ? { genre: 'liste', entrees }
    : { genre: 'paragraphe', texte: v.trim() };
};

/**
 * Compose le plan depuis le dossier.
 *
 * La numérotation suit celle d'un TDR de la Banque mondiale : objet et
 * contexte d'abord, puis ce qui est attendu, comment, quand, à quel prix,
 * et sous quelles conditions.
 */
export function composerPlan(tdr: DossierComplet): PlanDocument {
  const sections: Section[] = [];

  sections.push({
    numero: '1',
    titre: 'Contexte',
    blocs: [prose(tdr.context)],
  });

  sections.push({
    numero: '2',
    titre: 'Justification',
    blocs: [prose(tdr.justification)],
  });

  sections.push({
    numero: '3',
    titre: 'Bénéficiaires visés',
    blocs: [prose(tdr.beneficiaries)],
  });

  sections.push({
    numero: '4',
    titre: 'Objectifs',
    blocs: [
      tdr.objectives.length
        ? {
            genre: 'liste',
            entrees: tdr.objectives.map(
              (o, i) => `O${i + 1} · ${o.title}${o.criteria ? ` — ${o.criteria}` : ''}`,
            ),
          }
        : { genre: 'absent', mention: 'Aucun objectif défini.' },
      ...(tdr.expectedResults?.trim()
        ? ([listeOuProse(tdr.expectedResults)] as Bloc[])
        : []),
    ],
  });

  sections.push({
    numero: '5',
    titre: 'Livrables attendus',
    blocs: [
      tdr.deliverables.length
        ? {
            genre: 'liste',
            entrees: tdr.deliverables.map(
              (d, i) =>
                `L${i + 1} · ${d.title}` +
                (d.format ? ` — ${d.format}` : '') +
                (d.deadline ? ` · échéance ${d.deadline}` : ''),
            ),
          }
        : { genre: 'absent', mention: 'Aucun livrable défini.' },
      ...(tdr.deliverableFormat || tdr.reportingRhythm
        ? ([
            {
              genre: 'definitions',
              lignes: [
                ...(tdr.deliverableFormat
                  ? [{ cle: 'Format de remise', valeur: FORMATS[tdr.deliverableFormat] ?? tdr.deliverableFormat }]
                  : []),
                ...(tdr.reportingRhythm
                  ? [{ cle: 'Rythme de reporting', valeur: RYTHMES[tdr.reportingRhythm] ?? tdr.reportingRhythm }]
                  : []),
              ],
            },
          ] as Bloc[])
        : []),
    ],
  });

  sections.push({
    numero: '6',
    titre: 'Méthodologie',
    // L'approche reste de la prose : elle expose une voie, elle ne
    // s'énumère pas. Les étapes et les contraintes, si.
    blocs: [prose(tdr.approach), listeOuProse(tdr.methodology), listeOuProse(tdr.constraints)],
  });

  sections.push({
    numero: '7',
    titre: 'Calendrier et expertise',
    blocs: [
      {
        genre: 'definitions',
        lignes: [
          {
            cle: 'Démarrage souhaité',
            valeur: tdr.startDate ? dateEnToutesLettres(new Date(tdr.startDate)) : '—',
          },
          { cle: 'Durée', valeur: tdr.durationMonths ? `${tdr.durationMonths} mois` : '—' },
          {
            cle: 'Volume d’effort',
            valeur: tdr.effortDays ? `${tdr.effortDays} jours-homme` : '—',
          },
          {
            cle: 'Couverture géographique',
            valeur: tdr.provinces.length
              ? tdr.provinces.map((c) => c.province.label).join(', ')
              : 'Nationale',
          },
        ],
      },
      listeOuProse(tdr.expertise),
      tdr.keyProfiles.length
        ? { genre: 'liste', entrees: tdr.keyProfiles.map((p) => PROFILS[p] ?? p) }
        : { genre: 'absent', mention: 'Aucun profil-clé désigné.' },
    ],
  });

  sections.push({
    numero: '8',
    titre: 'Budget',
    blocs: [
      {
        genre: 'definitions',
        lignes: [
          { cle: 'Budget total', valeur: usd(tdr.budgetTotalUsd) },
          { cle: 'Part IDA', valeur: usd(tdr.budgetIdaUsd) },
          { cle: 'Part AFD', valeur: usd(tdr.budgetAfdUsd) },
          { cle: 'Part Gouvernement', valeur: usd(tdr.budgetGovUsd) },
          ...(tdr.procurementMethodCode
            ? [
                {
                  cle: 'Méthode de passation',
                  valeur: `${tdr.procurementMethodCode} · revue ${
                    tdr.reviewType === 'PRIOR' ? 'préalable' : 'postérieure'
                  }`,
                },
              ]
            : []),
        ],
      },
    ],
  });

  sections.push({
    numero: '9',
    titre: 'Dispositions contractuelles',
    blocs: [
      tdr.clauses.length
        ? { genre: 'liste', entrees: tdr.clauses.map((c) => `${c.label} — ${c.text}`) }
        : { genre: 'absent', mention: 'Aucune clause retenue.' },
    ],
  });

  sections.push({
    numero: '10',
    titre: 'Indicateurs de performance',
    blocs: [
      tdr.indicators.length
        ? {
            genre: 'liste',
            entrees: tdr.indicators.map((i) => `${i.label} — ${i.measure}, cible ${i.target}`),
          }
        : { genre: 'absent', mention: 'Aucun indicateur retenu.' },
    ],
  });

  sections.push({
    numero: '11',
    titre: 'Risques et atténuation',
    blocs: [
      tdr.risks.length
        ? {
            genre: 'liste',
            entrees: tdr.risks.map(
              (r) => `${r.label} [${r.level.toLowerCase()}] — ${r.description}. Atténuation : ${r.mitigation}`,
            ),
          }
        : { genre: 'absent', mention: 'Aucun risque recensé.' },
    ],
  });

  sections.push({
    numero: '12',
    titre: 'Sauvegardes environnementales et sociales',
    blocs: [
      {
        genre: 'definitions',
        lignes: [
          {
            cle: 'Catégorie de risque',
            valeur: tdr.esCategory ? CATEGORIES[tdr.esCategory] ?? tdr.esCategory : 'Non déterminée',
          },
        ],
      },
      tdr.esRisks.length
        ? { genre: 'liste', entrees: tdr.esRisks.map((r) => RISQUES_ES[r] ?? r) }
        : { genre: 'absent', mention: 'Aucun risque environnemental et social identifié.' },
    ],
  });

  return {
    reference: tdr.reference,
    titre: tdr.title,
    typeCode: tdr.tdrTypeCode,
    typeNom: tdr.tdrType.name,
    organisation: tdr.organisation.fullName,
    statut: NOM_STATUT[tdr.status] ?? tdr.status,
    dateComposition: dateEnToutesLettres(new Date()),
    entete: [
      { cle: 'Référence', valeur: tdr.reference },
      { cle: 'Type', valeur: `${tdr.tdrTypeCode} — ${tdr.tdrType.name}` },
      {
        cle: 'Activité du plan annuel',
        valeur: tdr.ptbaActivity
          ? `${tdr.ptbaActivity.code} — ${tdr.ptbaActivity.title}`
          : 'Non rattaché',
      },
      {
        cle: 'Composante',
        valeur: tdr.ptbaActivity
          ? `${tdr.ptbaActivity.componentCode} — ${tdr.ptbaActivity.component.label}`
          : '—',
      },
      { cle: 'Entité rédactrice', valeur: tdr.organisation.fullName },
      {
        cle: 'Maîtrise d’ouvrage bénéficiaire',
        valeur: tdr.beneficiaryOrganisation?.fullName ?? 'Aucune désignée',
      },
    ],
    sections,
    champsAssistes: nommerChampsAssistes(tdr.aiAssistedFields),
  };
}

const FORMATS: Record<string, string> = {
  'docx-pdf': 'DOCX éditable et PDF signé',
  pdf: 'PDF signé uniquement',
  structured: 'Données structurées et PDF',
  mixed: 'Mixte, selon le livrable',
};

const RYTHMES: Record<string, string> = {
  weekly: 'Hebdomadaire',
  biweekly: 'Bimensuel',
  monthly: 'Mensuel',
  milestone: 'À chaque jalon',
};

const PROFILS: Record<string, string> = {
  chef: 'Chef de mission',
  'expert-tech': 'Expert technique sénior',
  'expert-junior': 'Expert technique junior',
  'expert-es': 'Expert environnemental et social',
  'expert-genre': 'Expert genre et inclusion',
};

const CATEGORIES: Record<string, string> = {
  FAIBLE: 'Faible — clauses contractuelles seules',
  MODERE: 'Modéré — NIES et PGES allégé',
  SUBSTANTIEL: 'Substantiel — EIES allégée et PGES',
  ELEVE: 'Élevé — EIES complète et PGES',
};

const RISQUES_ES: Record<string, string> = {
  deplacement: 'Déplacement involontaire ou acquisition foncière',
  biodiversite: 'Biodiversité et aires protégées',
  patrimoine: 'Patrimoine culturel',
  travail: 'Conditions de travail, EAS et HS',
  sante: 'Santé et sécurité communautaire',
};

/** Forme du dossier attendue par le composeur. */
export interface DossierComplet {
  reference: string;
  title: string;
  status: string;
  tdrTypeCode: string;
  tdrType: { name: string };
  ptbaActivity: { code: string; title: string; componentCode: string; component: { label: string } } | null;
  organisation: { fullName: string };
  beneficiaryOrganisation: { fullName: string } | null;
  provinces: Array<{ province: { label: string } }>;
  context: string | null;
  justification: string | null;
  beneficiaries: string | null;
  expectedResults: string | null;
  deliverableFormat: string | null;
  reportingRhythm: string | null;
  approach: string | null;
  methodology: string | null;
  constraints: string | null;
  startDate: Date | null;
  durationMonths: number | null;
  effortDays: number | null;
  expertise: string | null;
  keyProfiles: string[];
  budgetTotalUsd: unknown;
  budgetIdaUsd: unknown;
  budgetAfdUsd: unknown;
  budgetGovUsd: unknown;
  procurementMethodCode: string | null;
  reviewType: string | null;
  esCategory: string | null;
  esRisks: string[];
  aiAssistedFields: string[];
  objectives: Array<{ title: string; criteria: string }>;
  deliverables: Array<{ title: string; format: string | null; deadline: string | null }>;
  clauses: Array<{ label: string; text: string }>;
  indicators: Array<{ label: string; measure: string; target: string }>;
  risks: Array<{ label: string; description: string; mitigation: string; level: string }>;
}
