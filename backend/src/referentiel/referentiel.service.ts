import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import type { ProfileKey } from '../../generated/prisma/enums';

// Les familles vivent dans `families.ts` : l'authentification s'en sert
// aussi pour choisir l'habilitation à activer à la connexion.
export { FAMILIES } from './families';
import { FAMILIES } from './families';

/**
 * `restrictions` : ce que le profil ne peut pas faire, énoncé
 * explicitement. Une personne qui prend ses fonctions a besoin de
 * comprendre son périmètre — les interdits du MEP en font partie autant
 * que les droits.
 */
const PROFILE_LABELS: Record<
  ProfileKey,
  { label: string; short: string; readOnly: boolean; restrictions: string[] }
> = {
  UGP: {
    label: 'UGP / Gouvernement',
    short: 'UGP',
    readOnly: false,
    restrictions: [
      'Vous n’émettez pas d’avis de non-objection : cette prérogative appartient aux bailleurs.',
      'Les dossiers du canal confidentiel MGP-EAS/HS ne sont accessibles qu’au Spécialiste VBG/EAS.',
    ],
  },
  MDA: {
    label: 'Entité bénéficiaire (MDA)',
    short: 'MDA',
    readOnly: false,
    restrictions: [
      'Vous initiez des besoins et rédigez des TDR sectoriels, mais ne conduisez pas la passation.',
      'Les données fiduciaires du projet ne vous sont pas ouvertes.',
    ],
  },
  PARTENAIRE: {
    label: 'Partie prenante / Institution partenaire',
    short: 'Partenaire',
    readOnly: false,
    restrictions: [
      'Vous proposez des activités ; leur arbitrage et leur inscription au PPM relèvent de l’UGP.',
      'Vous ne voyez que les dossiers de votre organisation.',
    ],
  },
  BAILLEUR: {
    label: 'Bailleur (BM / AFD)',
    short: 'Bailleur',
    readOnly: false,
    restrictions: [
      'Vous ne rédigez jamais de termes de référence — consultation et émission d’ANO uniquement (présentation UGPTN § 15.4).',
      'Vous n’intervenez pas dans la constitution des commissions d’évaluation.',
    ],
  },
  SOUMISSIONNAIRE: {
    label: 'Soumissionnaire / Entreprise candidate',
    short: 'Soumissionnaire',
    readOnly: false,
    restrictions: [
      'Vous n’accédez qu’aux dossiers d’appel d’offres publiés et à vos propres soumissions.',
      'Les évaluations en cours et les offres concurrentes vous sont fermées.',
    ],
  },
  SBP: {
    label: 'Bénéficiaire SBP / Sous-projet',
    short: 'SBP',
    readOnly: false,
    restrictions: [
      'Vous ne voyez jamais les données d’un autre bénéficiaire.',
      'La vérification des jalons de performance revient à l’UGP.',
    ],
  },
  AUDITEUR: {
    label: 'Auditeur / Contrôle externe',
    short: 'Auditeur',
    readOnly: true,
    restrictions: [
      'Lecture seule intégrale : aucune écriture n’est possible hors consignation de constatations.',
      'Votre habilitation est bornée par votre mission et expire avec elle.',
      'Le canal confidentiel MGP-EAS/HS ne vous est ouvert qu’en statistiques agrégées non identifiantes.',
    ],
  },
  GOUVERNANCE: {
    label: 'Gouvernance (COPIL / CTP)',
    short: 'COPIL/CTP',
    readOnly: false,
    restrictions: [
      'Les délibérations du COPIL et du CTP sont cloisonnées : siéger dans l’un n’ouvre pas l’autre.',
      'Vous ne participez pas à l’exécution opérationnelle du projet.',
    ],
  },
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

  /**
   * Catalogue des permissions, pour donner un libellé lisible aux codes
   * portés par une session — `ano:decide` seul ne dit rien à personne.
   */
  permissions() {
    return this.prisma.permission.findMany({
      orderBy: [{ category: 'asc' }, { code: 'asc' }],
    });
  }
}
