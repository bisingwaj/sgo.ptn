import type { ProfileFamily, ProfileKey } from '../../generated/prisma/enums';

/**
 * Les 4 familles d'acteurs et les profils qu'elles regroupent.
 *
 * Partagé entre le référentiel (qui les expose) et l'authentification
 * (qui s'en sert pour choisir l'habilitation à activer à la connexion).
 */
export const FAMILIES: Array<{
  key: ProfileFamily;
  label: string;
  hint: string;
  profiles: ProfileKey[];
}> = [
  {
    key: 'UGP_GOUV',
    label: 'UGP / Gouvernement',
    hint: 'MPTN, UGP, MDA bénéficiaires, gouvernance COPIL/CTP',
    profiles: ['UGP', 'MDA', 'GOUVERNANCE'],
  },
  {
    key: 'BAILLEURS',
    label: 'Bailleurs',
    hint: 'Banque mondiale (IDA), Agence Française de Développement',
    profiles: ['BAILLEUR'],
  },
  {
    key: 'BENEFICIAIRES',
    label: 'Bénéficiaires & Soumissionnaires',
    hint: 'Partenaires institutionnels, entreprises, EESU, hubs, startups',
    profiles: ['PARTENAIRE', 'SOUMISSIONNAIRE', 'SBP'],
  },
  {
    key: 'CONTROLE',
    label: 'Contrôle & Vérification',
    hint: 'Audit externe, TPM, Cour des Comptes, IGF, ACE',
    profiles: ['AUDITEUR'],
  },
];

export function profilesOfFamily(family: ProfileFamily): ProfileKey[] {
  return FAMILIES.find((f) => f.key === family)?.profiles ?? [];
}

export function familyOfProfile(profile: ProfileKey): ProfileFamily | undefined {
  return FAMILIES.find((f) => f.profiles.includes(profile))?.key;
}

export function familyLabel(family: ProfileFamily): string {
  return FAMILIES.find((f) => f.key === family)?.label ?? family;
}
