/**
 * PTN-RDC · Catalogue des permissions et des sous-rôles.
 *
 * C'est ici que les règles du MEP deviennent exécutables. Les interdits
 * institutionnels — un bailleur ne rédige jamais de TDR, un auditeur
 * n'écrit jamais, seul le Spécialiste VBG/EAS accède au canal EAS/HS —
 * ne sont pas des conventions d'interface : ce sont des permissions
 * absentes de la table de correspondance ci-dessous.
 */

export interface PermissionDef {
  code: string;
  label: string;
  category:
    | 'referentiel'
    | 'passation'
    | 'fiduciaire'
    | 'sauvegardes'
    | 'mgp'
    | 'pilotage'
    | 'gouvernance'
    | 'marche'
    | 'admin';
  isWrite?: boolean;
  isSensitive?: boolean;
}

export const PERMISSIONS: PermissionDef[] = [
  // --- Référentiel ---
  { code: 'referentiel:read', label: 'Consulter le référentiel projet', category: 'referentiel' },

  // Administration du référentiel de passation. Responsabilité métier du
  // RPM et des spécialistes, distincte de l'administration technique de la
  // plateforme (`admin:*`, portée par le sous-rôle IT) : éditer une clause
  // contractuelle n'est pas un réglage système.
  {
    code: 'referentiel:passation',
    label: 'Administrer les types de TDR, méthodes et seuils de passation',
    category: 'referentiel',
    isWrite: true,
    isSensitive: true,
  },
  {
    code: 'referentiel:clauses',
    label: 'Maintenir les bibliothèques de clauses, indicateurs et risques',
    category: 'referentiel',
    isWrite: true,
    isSensitive: true,
  },
  {
    code: 'referentiel:modeles',
    label: 'Maintenir les modèles de TDR réutilisables',
    category: 'referentiel',
    isWrite: true,
  },

  // --- PTBA ---
  { code: 'ptba:read', label: 'Consulter le PTBA', category: 'passation' },
  { code: 'ptba:write', label: 'Éditer le PTBA', category: 'passation', isWrite: true },
  { code: 'ptba:validate', label: 'Valider le PTBA', category: 'passation', isWrite: true },

  // --- PPM ---
  { code: 'ppm:read', label: 'Consulter le PPM', category: 'passation' },
  { code: 'ppm:write', label: 'Éditer le PPM', category: 'passation', isWrite: true },
  { code: 'ppm:validate', label: 'Valider le PPM', category: 'passation', isWrite: true },

  // --- TDR ---
  { code: 'tdr:read', label: 'Consulter les TDR', category: 'passation' },
  // Jamais accordée aux profils BAILLEUR et AUDITEUR (MEP § 15.4)
  { code: 'tdr:author', label: 'Rédiger des TDR', category: 'passation', isWrite: true },
  { code: 'tdr:review', label: 'Réviser les TDR', category: 'passation', isWrite: true },
  { code: 'tdr:validate', label: 'Valider les TDR avant ANO', category: 'passation', isWrite: true },

  // --- ANO ---
  { code: 'ano:read', label: 'Consulter les ANO', category: 'passation' },
  { code: 'ano:submit', label: 'Soumettre une demande d’ANO', category: 'passation', isWrite: true },
  // Prérogative exclusive des bailleurs — MEP § 9.2
  {
    code: 'ano:decide',
    label: 'Émettre une décision d’ANO',
    category: 'passation',
    isWrite: true,
    isSensitive: true,
  },

  // --- DAO ---
  { code: 'dao:read', label: 'Consulter les DAO', category: 'passation' },
  { code: 'dao:write', label: 'Élaborer les DAO', category: 'passation', isWrite: true },
  { code: 'dao:publish', label: 'Publier un DAO', category: 'passation', isWrite: true },

  // --- Commissions ---
  { code: 'commission:read', label: 'Consulter les commissions', category: 'passation' },
  { code: 'commission:constitute', label: 'Constituer une commission', category: 'passation', isWrite: true },
  { code: 'commission:sit', label: 'Siéger en commission d’évaluation', category: 'passation', isWrite: true },
  { code: 'commission:preside', label: 'Présider une commission', category: 'passation', isWrite: true },

  // --- Contrats ---
  { code: 'contrat:read', label: 'Consulter les contrats', category: 'passation' },
  { code: 'contrat:write', label: 'Gérer les contrats et avenants', category: 'passation', isWrite: true },
  { code: 'contrat:sign', label: 'Signer un contrat', category: 'passation', isWrite: true, isSensitive: true },

  // --- Fiduciaire ---
  { code: 'fiduciaire:read', label: 'Consulter les données fiduciaires', category: 'fiduciaire' },
  { code: 'fiduciaire:prepare_wa', label: 'Préparer une demande de versement', category: 'fiduciaire', isWrite: true },
  {
    code: 'fiduciaire:approve_wa',
    label: 'Viser une demande de versement',
    category: 'fiduciaire',
    isWrite: true,
    isSensitive: true,
  },
  { code: 'fiduciaire:reconcile', label: 'Réconcilier le Compte Désigné', category: 'fiduciaire', isWrite: true },
  { code: 'comptabilite:write', label: 'Tenir la comptabilité', category: 'fiduciaire', isWrite: true },
  { code: 'caisse:write', label: 'Gérer la trésorerie courante', category: 'fiduciaire', isWrite: true },
  { code: 'rfi:produce', label: 'Produire les RFI trimestriels', category: 'fiduciaire', isWrite: true },

  // --- Sauvegardes E&S ---
  { code: 'es:read', label: 'Consulter les sauvegardes E&S', category: 'sauvegardes' },
  { code: 'es:screen', label: 'Réaliser le screening E&S', category: 'sauvegardes', isWrite: true },
  { code: 'es:validate', label: 'Valider les instruments E&S', category: 'sauvegardes', isWrite: true },

  // --- MGP général ---
  { code: 'mgp:read', label: 'Consulter les plaintes MGP', category: 'mgp' },
  { code: 'mgp:process', label: 'Instruire une plainte MGP', category: 'mgp', isWrite: true },
  { code: 'mgp:close', label: 'Clôturer une plainte MGP', category: 'mgp', isWrite: true },
  { code: 'mgp:stats', label: 'Consulter les statistiques agrégées EAS/HS', category: 'mgp' },

  // --- MGP-EAS/HS confidentiel ---
  // Cloisonnement absolu. Accordées au seul Spécialiste VBG/EAS et aux
  // prestataires dûment habilités. Aucune autre affectation ne doit les
  // porter — leur octroi exige justification écrite et validation du
  // Coordonnateur.
  {
    code: 'easHs:read',
    label: 'Accéder au canal confidentiel EAS/HS',
    category: 'mgp',
    isSensitive: true,
  },
  {
    code: 'easHs:process',
    label: 'Instruire un dossier EAS/HS',
    category: 'mgp',
    isWrite: true,
    isSensitive: true,
  },

  // --- Pilotage ---
  { code: 'indicateur:read', label: 'Consulter le cadre de résultats', category: 'pilotage' },
  { code: 'indicateur:write', label: 'Saisir les mesures d’indicateurs', category: 'pilotage', isWrite: true },
  { code: 'sbp:read', label: 'Consulter les subventions SBP', category: 'pilotage' },
  { code: 'sbp:submit_data', label: 'Saisir les données de performance SBP', category: 'pilotage', isWrite: true },
  { code: 'sbp:validate', label: 'Vérifier et valider les jalons SBP', category: 'pilotage', isWrite: true },
  { code: 'communication:write', label: 'Publier des communications', category: 'pilotage', isWrite: true },

  // --- Audit ---
  { code: 'audit:read_all', label: 'Consulter l’intégralité des dossiers (lecture seule)', category: 'pilotage' },
  { code: 'audit:plan', label: 'Élaborer le plan d’audit', category: 'pilotage', isWrite: true },
  { code: 'audit:finding_write', label: 'Consigner des constatations', category: 'pilotage', isWrite: true },
  { code: 'audit:trail_read', label: 'Consulter la piste d’audit', category: 'pilotage' },

  // --- Gouvernance ---
  // COPIL et CTP sont cloisonnés : un membre CTP ne voit pas les
  // délibérations COPIL, sauf passerelle explicite de remontée.
  { code: 'gouvernance:copil', label: 'Accéder aux délibérations COPIL', category: 'gouvernance' },
  { code: 'gouvernance:ctp', label: 'Accéder aux délibérations CTP', category: 'gouvernance' },
  { code: 'gouvernance:decide', label: 'Consigner une décision de séance', category: 'gouvernance', isWrite: true },

  // --- Espace marché (soumissionnaires) ---
  { code: 'marketplace:read', label: 'Consulter les opportunités', category: 'marche' },
  { code: 'soumission:write', label: 'Déposer une offre', category: 'marche', isWrite: true },
  { code: 'kyc:write', label: 'Renseigner le dossier KYC', category: 'marche', isWrite: true },

  // --- Administration de la plateforme ---
  // Portées par le sous-rôle UGP « IT » (MEP § 6.1, poste n°18).
  { code: 'admin:users', label: 'Créer et gérer les comptes', category: 'admin', isWrite: true, isSensitive: true },
  { code: 'admin:roles', label: 'Gérer les habilitations', category: 'admin', isWrite: true, isSensitive: true },
  { code: 'admin:audit_read', label: 'Consulter le journal d’administration', category: 'admin' },
];

// ============================================================
// SOUS-RÔLES
// ============================================================

export type ProfileKeyName =
  | 'UGP'
  | 'MDA'
  | 'PARTENAIRE'
  | 'BAILLEUR'
  | 'SOUMISSIONNAIRE'
  | 'SBP'
  | 'AUDITEUR'
  | 'GOUVERNANCE';

export interface SubroleDef {
  code: string;
  label: string;
  profile: ProfileKeyName;
  /** Un seul titulaire actif à la fois */
  isUnique?: boolean;
  /** Octroi soumis à justification et validation du Coordonnateur */
  isSensitive?: boolean;
  /** Séparation des tâches — codes incompatibles */
  incompatibleWith?: string[];
  /** Rattachement à une composante obligatoire */
  requiresComponent?: boolean;
  /** Référence et dates de mission obligatoires */
  requiresMission?: boolean;
  permissions: string[];
}

/** Socle commun à toute personne connectée. */
const BASE = ['referentiel:read'];

/** Lecture transverse du cycle de passation. */
const LECTURE_PASSATION = [
  'ptba:read',
  'ppm:read',
  'tdr:read',
  'ano:read',
  'dao:read',
  'commission:read',
  'contrat:read',
];

// --- Séparation des tâches (MEP § 5.1 et § 6.3) ---
// La fonction de paiement, la fonction comptable et la fonction de caisse
// ne peuvent être exercées par la même personne. L'Auditeur Interne est
// rattaché au Coordonnateur pour garantir son indépendance : il ne peut
// cumuler aucune fonction opérationnelle.
const FIDUCIAIRE_TRIO = ['UGP_RAF', 'UGP_COMPTABLE', 'UGP_CAISSIER'];
const OPERATIONNELS = [
  'UGP_COORDONNATEUR',
  'UGP_COORDONNATEUR_ADJOINT',
  'UGP_RAF',
  'UGP_COMPTABLE',
  'UGP_CAISSIER',
  'UGP_RPM',
  'UGP_CHARGE_PM',
];

export const SUBROLES: SubroleDef[] = [
  // ==========================================================
  // UGP — 19 sous-rôles opérationnels (MEP § 6.1)
  // ==========================================================
  {
    code: 'UGP_COORDONNATEUR',
    label: 'Coordonnateur',
    profile: 'UGP',
    isUnique: true,
    incompatibleWith: ['UGP_AUDITEUR_INTERNE'],
    permissions: [
      ...BASE,
      ...LECTURE_PASSATION,
      'ptba:validate',
      'ppm:validate',
      'tdr:validate',
      'ano:submit',
      'dao:publish',
      'commission:constitute',
      'contrat:sign',
      'fiduciaire:read',
      'fiduciaire:approve_wa',
      'rfi:produce',
      'es:read',
      'es:validate',
      'mgp:read',
      'mgp:stats',
      'indicateur:read',
      'sbp:read',
      'audit:trail_read',
      'gouvernance:copil',
      'gouvernance:ctp',
    ],
  },
  {
    code: 'UGP_COORDONNATEUR_ADJOINT',
    label: 'Coordonnateur Adjoint',
    profile: 'UGP',
    isUnique: true,
    incompatibleWith: ['UGP_AUDITEUR_INTERNE'],
    permissions: [
      ...BASE,
      ...LECTURE_PASSATION,
      'ptba:write',
      'ppm:write',
      'tdr:review',
      'ano:submit',
      'commission:constitute',
      'fiduciaire:read',
      'es:read',
      'mgp:read',
      'mgp:stats',
      'indicateur:read',
      'sbp:read',
    ],
  },
  {
    code: 'UGP_AUDITEUR_INTERNE',
    label: 'Auditeur Interne',
    profile: 'UGP',
    isUnique: true,
    // Indépendance : aucun cumul avec une fonction opérationnelle
    incompatibleWith: OPERATIONNELS,
    permissions: [
      ...BASE,
      'audit:read_all',
      'audit:plan',
      'audit:finding_write',
      'audit:trail_read',
      'fiduciaire:read',
      'mgp:stats',
      'indicateur:read',
    ],
  },
  {
    code: 'UGP_RC1',
    label: 'Responsable Composante 1',
    profile: 'UGP',
    isUnique: true,
    requiresComponent: true,
    permissions: [...BASE, ...LECTURE_PASSATION, 'ptba:write', 'tdr:author', 'tdr:review', 'ano:submit', 'dao:write', 'commission:sit', 'es:read', 'indicateur:read', 'indicateur:write'],
  },
  {
    code: 'UGP_RC2',
    label: 'Responsable Composante 2',
    profile: 'UGP',
    isUnique: true,
    requiresComponent: true,
    permissions: [...BASE, ...LECTURE_PASSATION, 'ptba:write', 'tdr:author', 'tdr:review', 'ano:submit', 'dao:write', 'commission:sit', 'es:read', 'indicateur:read', 'indicateur:write'],
  },
  {
    code: 'UGP_RC3',
    label: 'Responsable Composante 3',
    profile: 'UGP',
    isUnique: true,
    requiresComponent: true,
    permissions: [...BASE, ...LECTURE_PASSATION, 'ptba:write', 'tdr:author', 'tdr:review', 'ano:submit', 'dao:write', 'commission:sit', 'es:read', 'indicateur:read', 'indicateur:write', 'sbp:read', 'sbp:validate'],
  },
  {
    code: 'UGP_RAF',
    label: 'Responsable Administratif et Financier',
    profile: 'UGP',
    isUnique: true,
    incompatibleWith: ['UGP_COMPTABLE', 'UGP_CAISSIER', 'UGP_AUDITEUR_INTERNE'],
    permissions: [
      ...BASE,
      ...LECTURE_PASSATION,
      'fiduciaire:read',
      'fiduciaire:prepare_wa',
      'fiduciaire:reconcile',
      'rfi:produce',
      'ptba:write',
    ],
  },
  {
    code: 'UGP_COMPTABLE',
    label: 'Comptable',
    profile: 'UGP',
    incompatibleWith: ['UGP_RAF', 'UGP_CAISSIER', 'UGP_AUDITEUR_INTERNE'],
    permissions: [...BASE, 'fiduciaire:read', 'comptabilite:write', 'contrat:read'],
  },
  {
    code: 'UGP_CAISSIER',
    label: 'Caissier',
    profile: 'UGP',
    incompatibleWith: ['UGP_RAF', 'UGP_COMPTABLE', 'UGP_AUDITEUR_INTERNE'],
    permissions: [...BASE, 'fiduciaire:read', 'caisse:write'],
  },
  {
    code: 'UGP_LOGISTICIEN',
    label: 'Logisticien',
    profile: 'UGP',
    permissions: [...BASE, 'ppm:read', 'contrat:read'],
  },
  {
    code: 'UGP_RPM',
    label: 'Responsable Passation des Marchés',
    profile: 'UGP',
    isUnique: true,
    incompatibleWith: ['UGP_AUDITEUR_INTERNE'],
    permissions: [
      ...BASE,
      ...LECTURE_PASSATION,
      'ppm:write',
      'ppm:validate',
      'tdr:review',
      'tdr:validate',
      'ano:submit',
      'dao:write',
      'dao:publish',
      'commission:constitute',
      'commission:preside',
      'contrat:write',
      // Administration du référentiel de passation : c'est son mandat.
      'referentiel:passation',
      'referentiel:clauses',
      'referentiel:modeles',
    ],
  },
  {
    code: 'UGP_CHARGE_PM',
    label: 'Chargé de Passation des Marchés',
    profile: 'UGP',
    incompatibleWith: ['UGP_AUDITEUR_INTERNE'],
    permissions: [...BASE, ...LECTURE_PASSATION, 'ppm:write', 'tdr:review', 'ano:submit', 'dao:write', 'commission:sit', 'contrat:write', 'referentiel:modeles'],
  },
  {
    code: 'UGP_SPE_ENVIRONNEMENT',
    label: 'Spécialiste Environnement',
    profile: 'UGP',
    isUnique: true,
    permissions: [...BASE, 'tdr:read', 'dao:read', 'es:read', 'es:screen', 'es:validate', 'mgp:read', 'indicateur:read', 'referentiel:clauses'],
  },
  {
    code: 'UGP_SPE_DEV_SOCIAL',
    label: 'Spécialiste Développement Social',
    profile: 'UGP',
    isUnique: true,
    permissions: [...BASE, 'tdr:read', 'dao:read', 'es:read', 'es:screen', 'es:validate', 'mgp:read', 'mgp:process', 'indicateur:read', 'referentiel:clauses'],
  },
  {
    code: 'UGP_SPE_VBG_EAS',
    label: 'Spécialiste VBG/EAS',
    profile: 'UGP',
    isUnique: true,
    // Seule habilitation ouvrant le canal confidentiel EAS/HS.
    // Octroi soumis à justification écrite et validation du Coordonnateur.
    isSensitive: true,
    permissions: [...BASE, 'es:read', 'mgp:read', 'mgp:stats', 'easHs:read', 'easHs:process'],
  },
  {
    code: 'UGP_SPE_SE',
    label: 'Spécialiste Suivi & Évaluation',
    profile: 'UGP',
    isUnique: true,
    permissions: [...BASE, ...LECTURE_PASSATION, 'indicateur:read', 'indicateur:write', 'sbp:read', 'mgp:stats', 'es:read', 'ptba:write', 'referentiel:clauses'],
  },
  {
    code: 'UGP_SPE_COMMUNICATION',
    label: 'Spécialiste Communication',
    profile: 'UGP',
    isUnique: true,
    permissions: [...BASE, 'indicateur:read', 'communication:write', 'mgp:stats'],
  },
  {
    code: 'UGP_IT',
    label: 'Responsable Informatique (IT)',
    profile: 'UGP',
    isUnique: true,
    // Administrateur de la plateforme — poste n°18 du MEP § 6.1.
    // Aucun rôle technique inventé hors du manuel.
    isSensitive: true,
    permissions: [...BASE, 'admin:users', 'admin:roles', 'admin:audit_read', 'audit:trail_read'],
  },
  {
    code: 'UGP_AGENT_LIAISON',
    label: 'Agent de liaison provincial',
    profile: 'UGP',
    permissions: [...BASE, 'ptba:read', 'es:read', 'mgp:read', 'mgp:process', 'indicateur:read'],
  },

  // ==========================================================
  // MDA — entités bénéficiaires
  // ==========================================================
  { code: 'MDA_MINISTRE_CABINET', label: 'Ministre / Cabinet', profile: 'MDA', permissions: [...BASE, 'ptba:read', 'tdr:read', 'ano:read', 'contrat:read', 'indicateur:read'] },
  { code: 'MDA_SECRETAIRE_GENERAL', label: 'Secrétaire Général', profile: 'MDA', permissions: [...BASE, 'ptba:read', 'tdr:read', 'tdr:author', 'ano:read', 'contrat:read', 'indicateur:read'] },
  { code: 'MDA_DIRECTEUR_SECTORIEL', label: 'Directeur sectoriel', profile: 'MDA', permissions: [...BASE, 'ptba:read', 'tdr:read', 'tdr:author', 'ano:read', 'commission:sit', 'indicateur:read'] },
  { code: 'MDA_POINT_FOCAL', label: 'Point focal projet', profile: 'MDA', permissions: [...BASE, 'ptba:read', 'tdr:read', 'tdr:author', 'ano:read', 'es:read', 'mgp:read', 'indicateur:read'] },
  { code: 'MDA_RESPONSABLE_BUDGET', label: 'Responsable budget', profile: 'MDA', permissions: [...BASE, 'ptba:read', 'fiduciaire:read', 'contrat:read'] },

  // ==========================================================
  // PARTENAIRE — institutions partenaires
  // ==========================================================
  { code: 'PART_COORDONNATEUR', label: 'Coordonnateur agence partenaire', profile: 'PARTENAIRE', permissions: [...BASE, 'ptba:read', 'tdr:read', 'tdr:author', 'ano:read', 'indicateur:read', 'mgp:read'] },
  { code: 'PART_REP_ANIE', label: 'Représentant ANIE', profile: 'PARTENAIRE', permissions: [...BASE, 'tdr:read', 'tdr:author', 'ano:read', 'indicateur:read'] },
  { code: 'PART_REP_ARPTC', label: 'Représentant ARPTC', profile: 'PARTENAIRE', permissions: [...BASE, 'tdr:read', 'tdr:author', 'ano:read', 'indicateur:read'] },
  { code: 'PART_REP_ONIP', label: 'Représentant ONIP', profile: 'PARTENAIRE', permissions: [...BASE, 'tdr:read', 'tdr:author', 'ano:read', 'indicateur:read'] },
  { code: 'PART_REP_OSC', label: 'Représentant OSC', profile: 'PARTENAIRE', permissions: [...BASE, 'tdr:read', 'tdr:author', 'mgp:read', 'es:read'] },
  { code: 'PART_REP_UNIVERSITE', label: 'Représentant université', profile: 'PARTENAIRE', permissions: [...BASE, 'tdr:read', 'tdr:author', 'indicateur:read'] },
  { code: 'PART_REP_FEDERATION', label: 'Représentant fédération privée', profile: 'PARTENAIRE', permissions: [...BASE, 'tdr:read', 'tdr:author', 'marketplace:read'] },

  // ==========================================================
  // BAILLEUR — BM / AFD
  // Prérogative d'ANO, mais jamais `tdr:author` : « Bailleurs :
  // consultation et émission d'ANO uniquement » (MEP § 15.4).
  // ==========================================================
  {
    code: 'BAILLEUR_TTL_BM',
    label: 'TTL Banque mondiale',
    profile: 'BAILLEUR',
    permissions: [...BASE, ...LECTURE_PASSATION, 'ano:decide', 'fiduciaire:read', 'es:read', 'mgp:stats', 'indicateur:read', 'audit:trail_read'],
  },
  {
    code: 'BAILLEUR_SPE_BM',
    label: 'Spécialiste Banque mondiale',
    profile: 'BAILLEUR',
    permissions: [...BASE, ...LECTURE_PASSATION, 'ano:decide', 'es:read', 'mgp:stats', 'indicateur:read'],
  },
  {
    code: 'BAILLEUR_REFERENT_AFD',
    label: 'Référent AFD',
    profile: 'BAILLEUR',
    permissions: [...BASE, ...LECTURE_PASSATION, 'ano:decide', 'fiduciaire:read', 'es:read', 'indicateur:read'],
  },
  {
    code: 'BAILLEUR_SPE_AFD',
    label: 'Spécialiste AFD',
    profile: 'BAILLEUR',
    permissions: [...BASE, ...LECTURE_PASSATION, 'ano:decide', 'es:read', 'indicateur:read'],
  },

  // ==========================================================
  // SOUMISSIONNAIRE
  // ==========================================================
  { code: 'SOUM_REPRESENTANT_LEGAL', label: 'Représentant légal entreprise', profile: 'SOUMISSIONNAIRE', permissions: [...BASE, 'marketplace:read', 'soumission:write', 'kyc:write', 'contrat:read'] },
  { code: 'SOUM_CHARGE_OFFRES', label: 'Chargé d’offres', profile: 'SOUMISSIONNAIRE', permissions: [...BASE, 'marketplace:read', 'soumission:write'] },
  { code: 'SOUM_CONSULTANT_INDIVIDUEL', label: 'Consultant individuel', profile: 'SOUMISSIONNAIRE', permissions: [...BASE, 'marketplace:read', 'soumission:write', 'kyc:write'] },

  // ==========================================================
  // SBP — bénéficiaires de subventions basées sur la performance
  // Cloisonnement : un bénéficiaire ne voit jamais les données d'un autre.
  // ==========================================================
  { code: 'SBP_EESU', label: 'EESU bénéficiaire', profile: 'SBP', permissions: [...BASE, 'sbp:read', 'sbp:submit_data', 'indicateur:read'] },
  { code: 'SBP_HUB', label: 'Hub technologique', profile: 'SBP', permissions: [...BASE, 'sbp:read', 'sbp:submit_data', 'indicateur:read'] },
  { code: 'SBP_STARTUP', label: 'Startup numérique', profile: 'SBP', permissions: [...BASE, 'sbp:read', 'sbp:submit_data'] },
  { code: 'SBP_CENTRE_INNOVATION', label: 'Centre d’innovation', profile: 'SBP', permissions: [...BASE, 'sbp:read', 'sbp:submit_data', 'indicateur:read'] },

  // ==========================================================
  // AUDITEUR — lecture seule intégrale, habilitation bornée par mission
  // Aucune permission d'écriture hors consignation de constatations.
  // ==========================================================
  { code: 'AUD_CABINET_EXTERNE', label: 'Cabinet d’audit externe', profile: 'AUDITEUR', requiresMission: true, permissions: [...BASE, 'audit:read_all', 'audit:trail_read', 'audit:finding_write', 'fiduciaire:read', 'mgp:stats'] },
  { code: 'AUD_TPM', label: 'TPM (Tierce Partie Monitoring)', profile: 'AUDITEUR', requiresMission: true, permissions: [...BASE, 'audit:read_all', 'audit:finding_write', 'es:read', 'indicateur:read'] },
  { code: 'AUD_ACE', label: 'ACE (Agence Congolaise de l’Environnement)', profile: 'AUDITEUR', requiresMission: true, permissions: [...BASE, 'es:read', 'audit:finding_write'] },
  { code: 'AUD_COUR_DES_COMPTES', label: 'Cour des Comptes', profile: 'AUDITEUR', requiresMission: true, permissions: [...BASE, 'audit:read_all', 'audit:trail_read', 'fiduciaire:read'] },
  { code: 'AUD_IGF', label: 'IGF (Inspection Générale des Finances)', profile: 'AUDITEUR', requiresMission: true, permissions: [...BASE, 'audit:read_all', 'audit:trail_read', 'fiduciaire:read'] },

  // ==========================================================
  // GOUVERNANCE — COPIL / CTP (postes 19 et 20 du MEP § 6.1)
  // Cloisonnement mutuel des délibérations.
  // ==========================================================
  { code: 'GOUV_MEMBRE_COPIL', label: 'Membre COPIL', profile: 'GOUVERNANCE', permissions: [...BASE, 'gouvernance:copil', 'indicateur:read', 'fiduciaire:read', 'ptba:read'] },
  { code: 'GOUV_MEMBRE_CTP', label: 'Membre CTP', profile: 'GOUVERNANCE', permissions: [...BASE, 'gouvernance:ctp', 'indicateur:read', 'ptba:read', 'ppm:read'] },
  { code: 'GOUV_PRESIDENT_SEANCE', label: 'Président de séance', profile: 'GOUVERNANCE', permissions: [...BASE, 'gouvernance:copil', 'gouvernance:ctp', 'gouvernance:decide', 'indicateur:read'] },
  { code: 'GOUV_SECRETAIRE_SEANCE', label: 'Secrétaire de séance', profile: 'GOUVERNANCE', permissions: [...BASE, 'gouvernance:copil', 'gouvernance:ctp', 'gouvernance:decide'] },
];

/** Ordre d'affichage stable, par profil puis par déclaration. */
export const SUBROLES_WITH_ORDER = SUBROLES.map((s, index) => ({ ...s, displayOrder: index }));

/** Garde-fou de cohérence : aucune permission inconnue dans le catalogue. */
export function assertCatalogIntegrity(): void {
  const known = new Set(PERMISSIONS.map((p) => p.code));
  const unknown: string[] = [];
  for (const subrole of SUBROLES) {
    for (const code of subrole.permissions) {
      if (!known.has(code)) unknown.push(`${subrole.code} → ${code}`);
    }
  }
  if (unknown.length > 0) {
    throw new Error(`Permissions inconnues dans le catalogue :\n  ${unknown.join('\n  ')}`);
  }

  // Interdits structurels du MEP, vérifiés au seed plutôt qu'en revue de code.
  const violations: string[] = [];
  for (const subrole of SUBROLES) {
    if (subrole.profile === 'BAILLEUR' && subrole.permissions.includes('tdr:author')) {
      violations.push(`${subrole.code} : un bailleur ne rédige jamais de TDR (MEP § 15.4)`);
    }
    if (subrole.profile === 'AUDITEUR' && subrole.permissions.includes('tdr:author')) {
      violations.push(`${subrole.code} : un auditeur ne rédige jamais de TDR`);
    }
    const easHs = subrole.permissions.some((p) => p.startsWith('easHs:'));
    if (easHs && subrole.code !== 'UGP_SPE_VBG_EAS') {
      violations.push(`${subrole.code} : le canal EAS/HS est réservé au Spécialiste VBG/EAS`);
    }
    if (subrole.profile !== 'BAILLEUR' && subrole.permissions.includes('ano:decide')) {
      violations.push(`${subrole.code} : seuls les bailleurs émettent un ANO (MEP § 9.2)`);
    }
  }
  if (violations.length > 0) {
    throw new Error(`Violations MEP détectées dans le catalogue :\n  ${violations.join('\n  ')}`);
  }
}
