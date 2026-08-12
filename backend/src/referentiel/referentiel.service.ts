import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import type { ProfileKey } from '../../generated/prisma/enums';

/**
 * Les 4 familles du sélecteur de connexion et de création de compte,
 * et les profils qu'elles regroupent.
 */
export const FAMILIES: Array<{
  key: 'UGP_GOUV' | 'BAILLEURS' | 'BENEFICIAIRES' | 'CONTROLE';
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

const PROFILE_LABELS: Record<ProfileKey, { label: string; short: string; readOnly: boolean }> = {
  UGP: { label: 'UGP / Gouvernement', short: 'UGP', readOnly: false },
  MDA: { label: 'Entité bénéficiaire (MDA)', short: 'MDA', readOnly: false },
  PARTENAIRE: { label: 'Partie prenante / Institution partenaire', short: 'Partenaire', readOnly: false },
  BAILLEUR: { label: 'Bailleur (BM / AFD)', short: 'Bailleur', readOnly: false },
  SOUMISSIONNAIRE: { label: 'Soumissionnaire / Entreprise candidate', short: 'Soumissionnaire', readOnly: false },
  SBP: { label: 'Bénéficiaire SBP / Sous-projet', short: 'SBP', readOnly: false },
  AUDITEUR: { label: 'Auditeur / Contrôle externe', short: 'Auditeur', readOnly: true },
  GOUVERNANCE: { label: 'Gouvernance (COPIL / CTP)', short: 'COPIL/CTP', readOnly: false },
};

@Injectable()
export class ReferentielService {
  constructor(private readonly prisma: PrismaService) {}

  /** Arbre famille → profil → sous-rôles, tel que consommé par le wizard. */
  async familles() {
    const subroles = await this.prisma.subrole.findMany({
      orderBy: { displayOrder: 'asc' },
      include: { permissions: { select: { permissionCode: true } } },
    });

    return FAMILIES.map((family) => ({
      key: family.key,
      label: family.label,
      hint: family.hint,
      profiles: family.profiles.map((profile) => ({
        key: profile,
        ...PROFILE_LABELS[profile],
        subroles: subroles
          .filter((s) => s.profile === profile)
          .map((s) => ({
            id: s.id,
            code: s.code,
            label: s.label,
            isUnique: s.isUnique,
            isSensitive: s.isSensitive,
            requiresComponent: s.requiresComponent,
            requiresMission: s.requiresMission,
            incompatibleWith: s.incompatibleWith,
            permissionCount: s.permissions.length,
          })),
      })),
    }));
  }

  organisations() {
    return this.prisma.organisation.findMany({
      where: { isActive: true },
      orderBy: [{ type: 'asc' }, { code: 'asc' }],
      select: {
        id: true,
        code: true,
        name: true,
        fullName: true,
        type: true,
        provinceCode: true,
        kycLevel: true,
      },
    });
  }

  provinces() {
    return this.prisma.province.findMany({
      orderBy: [{ isPriorityCpf: 'desc' }, { label: 'asc' }],
    });
  }

  composantes() {
    return this.prisma.component.findMany({ orderBy: { code: 'asc' } });
  }
}
