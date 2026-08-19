import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import type { AuthenticatedUser } from '../common/types/authenticated-user';
import type { RequestContext } from '../auth/auth.service';

/**
 * Le marketplace — la fenêtre de publication du cycle de passation.
 *
 * C'est le seul endroit du produit où quelqu'un d'extérieur au projet
 * agit : une entreprise candidate y consulte les marchés ouverts et dépose
 * son offre. Tout ce qui s'y voit est donc PUBLIC par construction — un
 * avis publié l'est pour tout le monde — et tout ce qui s'y dépose est
 * STRICTEMENT PRIVÉ : une offre concurrente ne se montre jamais.
 *
 * DEUX BORNES QUE LE CODE TIENT
 *
 * Un avis n'apparaît que si son marché est publié. Le statut ne se déduit
 * pas de la date : un marché retiré avant sa clôture cesse d'être visible
 * le jour même, ce qu'une comparaison de dates ne saurait exprimer.
 *
 * Une offre n'est lisible que par l'organisation qui l'a déposée. Le
 * bornage se fait sur `organisationId`, jamais sur l'utilisateur : dans une
 * entreprise, celui qui prépare l'offre et celui qui la signe sont deux
 * personnes, et le second doit relire le travail du premier.
 */
@Injectable()
export class MarketplaceService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  /**
   * Ce qu'un avis montre dans la liste.
   *
   * Le montant estimatif y figure parce que les règlements l'imposent à la
   * publication : une entreprise doit pouvoir juger si le marché est à sa
   * taille avant d'engager des frais de dossier.
   */
  private static readonly VUE_AVIS = {
    id: true,
    reference: true,
    objet: true,
    resume: true,
    qualifications: true,
    publishedAt: true,
    closingAt: true,
    marche: {
      select: {
        reference: true,
        methodCode: true,
        estimatedUsd: true,
        method: { select: { code: true, label: true } },
        tdr: {
          select: {
            tdrTypeCode: true,
            esCategory: true,
            ptbaActivity: {
              select: {
                code: true,
                componentCode: true,
                component: { select: { label: true } },
              },
            },
          },
        },
      },
    },
  } as const;

  /**
   * Les avis ouverts.
   *
   * Aucun score de pertinence n'est rendu. L'écran en affichait un —
   * « Match IA 92 % » — présenté comme calculé depuis le KYC, les
   * certifications et l'historique du candidat. Rien de tout cela n'existe,
   * et un tel score orienterait une décision commerciale sur un nombre
   * fabriqué. Il reviendra le jour où il sera calculé.
   */
  async avis(actor: AuthenticatedUser, options: { clos?: boolean } = {}) {
    const lignes = await this.prisma.appelOffres.findMany({
      where: {
        marche: {
          status: options.clos ? { in: ['PUBLIE', 'CLOTURE'] } : 'PUBLIE',
        },
      },
      select: MarketplaceService.VUE_AVIS,
      orderBy: { closingAt: 'asc' },
    });

    // Les offres de l'appelant, pour qu'un avis déjà soumissionné le dise.
    // Une entreprise qui redécouvre un avis sans savoir qu'elle y a déjà
    // répondu prépare un doublon que la base refusera à l'enregistrement.
    const deja = await this.prisma.soumission.findMany({
      where: { organisationId: actor.organisationId },
      select: { appelOffresId: true, status: true },
    });
    const parAvis = new Map(deja.map((s) => [s.appelOffresId, s.status]));

    return lignes.map((a) => ({
      ...MarketplaceService.presente(a),
      maSoumission: parAvis.get(a.id) ?? null,
    }));
  }

  async avisDetail(id: string, actor: AuthenticatedUser) {
    const a = await this.prisma.appelOffres.findUnique({
      where: { id },
      select: {
        ...MarketplaceService.VUE_AVIS,
        openingNote: true,
        marcheId: true,
      },
    });
    if (!a) throw new NotFoundException('Avis introuvable.');

    const mienne = await this.prisma.soumission.findUnique({
      where: {
        appelOffresId_organisationId: {
          appelOffresId: id,
          organisationId: actor.organisationId,
        },
      },
      select: {
        id: true,
        reference: true,
        status: true,
        montantUsd: true,
        submittedAt: true,
      },
    });

    return {
      ...MarketplaceService.presente(a),
      openingNote: a.openingNote,
      maSoumission: mienne
        ? {
            ...mienne,
            montantUsd: mienne.montantUsd ? Number(mienne.montantUsd) : null,
          }
        : null,
    };
  }

  /** Les offres de l'organisation de l'appelant, et d'elle seule. */
  async mesSoumissions(actor: AuthenticatedUser) {
    const lignes = await this.prisma.soumission.findMany({
      where: { organisationId: actor.organisationId },
      select: {
        id: true,
        reference: true,
        status: true,
        montantUsd: true,
        submittedAt: true,
        updatedAt: true,
        appelOffres: {
          select: {
            id: true,
            reference: true,
            objet: true,
            closingAt: true,
            marche: { select: { methodCode: true, status: true } },
          },
        },
      },
      orderBy: { updatedAt: 'desc' },
    });

    return lignes.map((s) => ({
      id: s.id,
      reference: s.reference,
      status: s.status,
      montantUsd: s.montantUsd ? Number(s.montantUsd) : null,
      submittedAt: s.submittedAt,
      avis: {
        id: s.appelOffres.id,
        reference: s.appelOffres.reference,
        objet: s.appelOffres.objet,
        closingAt: s.appelOffres.closingAt,
        methodCode: s.appelOffres.marche.methodCode,
        marcheStatus: s.appelOffres.marche.status,
      },
    }));
  }

  /**
   * Dépose une offre.
   *
   * Deux refus, et tous deux sont des règles de passation, non des
   * préférences d'écran : rien après l'heure limite, et une seule offre par
   * candidat et par avis. La seconde est doublée d'une contrainte en base —
   * deux requêtes simultanées passeraient un contrôle applicatif.
   */
  async deposer(
    avisId: string,
    corps: { montantUsd: number; note?: string },
    actor: AuthenticatedUser,
    ctx: RequestContext,
  ) {
    const avis = await this.prisma.appelOffres.findUnique({
      where: { id: avisId },
      select: {
        id: true,
        reference: true,
        closingAt: true,
        marche: { select: { status: true } },
      },
    });
    if (!avis) throw new NotFoundException('Avis introuvable.');

    if (avis.marche.status !== 'PUBLIE') {
      throw new BadRequestException(
        `L’avis ${avis.reference} n’est plus ouvert : aucune offre ne peut y être déposée.`,
      );
    }
    if (avis.closingAt.getTime() <= Date.now()) {
      throw new BadRequestException(
        `La date limite de ${avis.reference} est passée. Une offre reçue après l’heure limite n’est pas recevable.`,
      );
    }
    if (!(corps.montantUsd > 0)) {
      throw new BadRequestException('Le montant de votre offre est requis.');
    }

    const existante = await this.prisma.soumission.findUnique({
      where: {
        appelOffresId_organisationId: {
          appelOffresId: avisId,
          organisationId: actor.organisationId,
        },
      },
      select: { reference: true, status: true },
    });
    if (existante && existante.status !== 'BROUILLON') {
      throw new ForbiddenException(
        `Une offre a déjà été déposée pour cet avis au nom de votre organisation (${existante.reference}). Un candidat ne dépose qu’une offre par marché.`,
      );
    }

    const compte = await this.prisma.soumission.count({
      where: { appelOffresId: avisId },
    });
    const reference = `OFF-${avis.reference}-${compte + 1}`;

    const soumission = await this.prisma.soumission.upsert({
      where: {
        appelOffresId_organisationId: {
          appelOffresId: avisId,
          organisationId: actor.organisationId,
        },
      },
      update: {
        status: 'DEPOSEE',
        montantUsd: corps.montantUsd,
        note: corps.note?.trim() || null,
        submittedById: actor.userId,
        submittedAt: new Date(),
      },
      create: {
        reference,
        appelOffresId: avisId,
        organisationId: actor.organisationId,
        status: 'DEPOSEE',
        montantUsd: corps.montantUsd,
        note: corps.note?.trim() || null,
        submittedById: actor.userId,
        submittedAt: new Date(),
      },
      select: { id: true, reference: true, status: true, submittedAt: true },
    });

    // Le dépôt est un acte : il fait courir des délais et engage le
    // candidat. Le montant est journalisé avec lui.
    await this.audit.record({
      actorId: actor.userId,
      actorEmail: actor.email,
      action: 'soumission.deposee',
      entityType: 'Soumission',
      entityId: soumission.id,
      payload: {
        avis: avis.reference,
        soumission: soumission.reference,
        organisationId: actor.organisationId,
        montantUsd: corps.montantUsd,
      },
      ...ctx,
    });

    return soumission;
  }

  /** Met la ligne en forme sans rien calculer qui ne soit dans la base. */
  private static presente(a: {
    id: string;
    reference: string;
    objet: string;
    resume: string;
    qualifications: string[];
    publishedAt: Date;
    closingAt: Date;
    marche: {
      reference: string;
      methodCode: string;
      estimatedUsd: unknown;
      method: { code: string; label: string };
      tdr: {
        tdrTypeCode: string;
        esCategory: string | null;
        ptbaActivity: {
          code: string;
          componentCode: string;
          component: { label: string };
        } | null;
      };
    };
  }) {
    return {
      id: a.id,
      reference: a.reference,
      objet: a.objet,
      resume: a.resume,
      qualifications: a.qualifications,
      publishedAt: a.publishedAt,
      closingAt: a.closingAt,
      marcheReference: a.marche.reference,
      methodCode: a.marche.method.code,
      methodLabel: a.marche.method.label,
      // En unités mineures ? Non : le dépôt entier, en USD. L'interface en
      // fait la présentation, comme partout ailleurs dans ce dépôt.
      estimatedUsd: Number(a.marche.estimatedUsd),
      tdrTypeCode: a.marche.tdr.tdrTypeCode,
      esCategory: a.marche.tdr.esCategory,
      componentCode: a.marche.tdr.ptbaActivity?.componentCode ?? null,
      componentLabel: a.marche.tdr.ptbaActivity?.component.label ?? null,
      ptbaCode: a.marche.tdr.ptbaActivity?.code ?? null,
    };
  }
}
