import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { TdrReferentielService } from '../tdr-referentiel/tdr-referentiel.service';
import type { AuthenticatedUser } from '../common/types/authenticated-user';
import type { RequestContext } from '../auth/auth.service';
import type { ProfileKey, TdrOrigin } from '../../generated/prisma/enums';

/** L'origine découle du profil de la session, jamais d'une déclaration. */
const ORIGIN_BY_PROFILE: Partial<Record<ProfileKey, TdrOrigin>> = {
  UGP: 'UGP',
  MDA: 'PARTENAIRE',
  PARTENAIRE: 'PARTENAIRE',
  SBP: 'SBP',
};

@Injectable()
export class TdrService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly referentiel: TdrReferentielService,
  ) {}

  /**
   * Origine de rédaction, déduite du profil.
   *
   * Un bailleur et un auditeur n'y figurent pas : ils consultent et, pour
   * le premier, émettent des ANO — ils ne rédigent jamais (MEP § 15.4).
   * Cette déduction remplace le paramètre d'URL `?origin=` de l'ancien
   * sélecteur, qu'un utilisateur pouvait modifier à sa guise.
   */
  static originOf(user: AuthenticatedUser): TdrOrigin {
    const origin = ORIGIN_BY_PROFILE[user.profile];
    if (!origin) {
      throw new ForbiddenException(
        'Votre profil ne rédige pas de termes de référence : consultation et, le cas échéant, émission d’avis de non-objection.',
      );
    }
    return origin;
  }

  /** Référence lisible PTN-2026-019, séquentielle par exercice. */
  private async nextReference(year: number): Promise<string> {
    const seq = await this.prisma.tdrSequence.upsert({
      where: { year },
      update: { lastSeq: { increment: 1 } },
      create: { year, lastSeq: 1 },
    });
    return `PTN-${year}-${String(seq.lastSeq).padStart(3, '0')}`;
  }

  async createDraft(
    data: { tdrTypeCode: string; title: string; ptbaActivityId?: string },
    actor: AuthenticatedUser,
    ctx: RequestContext,
  ) {
    const origin = TdrService.originOf(actor);

    const type = await this.prisma.tdrType.findUnique({ where: { code: data.tdrTypeCode } });
    if (!type || !type.isActive) throw new NotFoundException('Type de TDR inconnu.');

    if (!type.allowedOrigins.includes(origin)) {
      throw new ForbiddenException(
        `Le type « ${type.name} » n’est pas ouvert à votre profil. Origines autorisées : ${type.allowedOrigins.join(', ').toLowerCase()}.`,
      );
    }

    const reference = await this.nextReference(new Date().getFullYear());

    const tdr = await this.prisma.tdr.create({
      data: {
        reference,
        tdrTypeCode: type.code,
        origin,
        authorId: actor.userId,
        organisationId: actor.organisationId,
        title: data.title.trim(),
        ptbaActivityId: data.ptbaActivityId ?? null,
        // Amorce de contexte pré-remplie depuis le type, marqueurs
        // substitués si une activité PTBA est déjà rattachée.
        context: type.contextTemplate,
      },
    });

    await this.audit.record({
      actorId: actor.userId,
      actorEmail: actor.email,
      action: 'tdr.draft_created',
      entityType: 'Tdr',
      entityId: tdr.id,
      payload: { reference, type: type.code, origin },
      ...ctx,
    });

    return tdr;
  }

  private async loadEditable(id: string, actor: AuthenticatedUser) {
    const tdr = await this.prisma.tdr.findUnique({ where: { id } });
    if (!tdr) throw new NotFoundException('TDR introuvable.');

    // Un TDR appartient à son auteur tant qu'il est en rédaction. L'UGP
    // reprend la main à partir de la revue.
    const isAuthor = tdr.authorId === actor.userId;
    const isUgpReviewer = actor.permissions.includes('tdr:review');
    if (!isAuthor && !isUgpReviewer) {
      throw new ForbiddenException('Ce TDR ne relève pas de votre périmètre.');
    }
    if (!['BROUILLON', 'RETOURNE'].includes(tdr.status)) {
      throw new BadRequestException(
        `Un TDR au statut ${tdr.status} ne se modifie plus. Il faut le retourner à son auteur.`,
      );
    }
    return tdr;
  }

  /** Enregistrement partiel — le parcours de rédaction sauvegarde au fil de l'eau. */
  async updateDraft(id: string, data: Record<string, unknown>, actor: AuthenticatedUser) {
    await this.loadEditable(id, actor);

    const scalar = [
      'title', 'context', 'justification', 'beneficiaries',
      'approach', 'methodology', 'constraints',
      'expertise', 'provinceCode', 'esCategory',
      'ptbaActivityId', 'durationMonths',
      'budgetTotalUsd', 'budgetIdaUsd', 'budgetAfdUsd', 'budgetGovUsd',
    ] as const;

    const patch: Record<string, unknown> = {};
    for (const key of scalar) if (key in data) patch[key] = data[key];
    if ('startDate' in data) patch.startDate = data.startDate ? new Date(String(data.startDate)) : null;
    if ('keyProfiles' in data) patch.keyProfiles = data.keyProfiles;
    if ('esRisks' in data) patch.esRisks = data.esRisks;

    // Les collections sont remplacées en bloc : le parcours renvoie l'état
    // complet de chaque liste, pas des opérations différentielles.
    const collections = ['objectives', 'deliverables', 'clauses', 'indicators', 'risks'] as const;

    return this.prisma.$transaction(async (tx) => {
      if (Object.keys(patch).length > 0) {
        await tx.tdr.update({ where: { id }, data: patch });
      }

      for (const name of collections) {
        if (!(name in data)) continue;
        const rows = (data[name] as Record<string, unknown>[]) ?? [];

        if (name === 'objectives') {
          await tx.tdrObjective.deleteMany({ where: { tdrId: id } });
          await tx.tdrObjective.createMany({
            data: rows.map((r, i) => ({ tdrId: id, title: String(r.title), criteria: String(r.criteria ?? ''), position: i })),
          });
        } else if (name === 'deliverables') {
          await tx.tdrDeliverable.deleteMany({ where: { tdrId: id } });
          await tx.tdrDeliverable.createMany({
            data: rows.map((r, i) => ({ tdrId: id, title: String(r.title), format: r.format ? String(r.format) : null, deadline: r.deadline ? String(r.deadline) : null, position: i })),
          });
        } else if (name === 'clauses') {
          await tx.tdrClause.deleteMany({ where: { tdrId: id } });
          await tx.tdrClause.createMany({
            // Le texte est copié, jamais référencé : une évolution de la
            // bibliothèque ne doit pas réécrire ce document.
            data: rows.map((r, i) => ({
              tdrId: id,
              sourceFamilyKey: r.sourceFamilyKey ? String(r.sourceFamilyKey) : null,
              sourceVersion: r.sourceVersion ? Number(r.sourceVersion) : null,
              category: r.category as never,
              label: String(r.label),
              text: String(r.text),
              position: i,
            })),
          });
        } else if (name === 'indicators') {
          await tx.tdrIndicator.deleteMany({ where: { tdrId: id } });
          await tx.tdrIndicator.createMany({
            data: rows.map((r, i) => ({ tdrId: id, sourceFamilyKey: r.sourceFamilyKey ? String(r.sourceFamilyKey) : null, label: String(r.label), measure: String(r.measure), target: String(r.target), position: i })),
          });
        } else {
          await tx.tdrRisk.deleteMany({ where: { tdrId: id } });
          await tx.tdrRisk.createMany({
            data: rows.map((r, i) => ({ tdrId: id, sourceFamilyKey: r.sourceFamilyKey ? String(r.sourceFamilyKey) : null, label: String(r.label), description: String(r.description), mitigation: String(r.mitigation), level: r.level as never, position: i })),
          });
        }
      }

      return tx.tdr.findUniqueOrThrow({ where: { id }, include: TdrService.FULL_INCLUDE });
    });
  }

  private static readonly FULL_INCLUDE = {
    tdrType: true,
    ptbaActivity: { include: { component: true } },
    organisation: { select: { code: true, name: true } },
    author: { select: { firstName: true, lastName: true, email: true } },
    objectives: { orderBy: { position: 'asc' } },
    deliverables: { orderBy: { position: 'asc' } },
    clauses: { orderBy: { position: 'asc' } },
    indicators: { orderBy: { position: 'asc' } },
    risks: { orderBy: { position: 'asc' } },
  } as const;

  /**
   * Contrôle de complétude avant transmission.
   *
   * Exposé à part pour que le parcours affiche les manques au fil de la
   * rédaction, plutôt qu'au moment de cliquer sur « soumettre ».
   */
  async checkCompleteness(id: string): Promise<{ blockers: string[]; warnings: string[] }> {
    const tdr = await this.prisma.tdr.findUnique({
      where: { id },
      include: { tdrType: true, ptbaActivity: true, objectives: true, deliverables: true },
    });
    if (!tdr) throw new NotFoundException('TDR introuvable.');

    const blockers: string[] = [];
    const warnings: string[] = [];

    if (!tdr.ptbaActivityId) {
      blockers.push('Aucune activité PTBA rattachée : sans ligne au plan, l’activité n’a pas d’enveloppe.');
    }
    if (!tdr.context?.trim()) blockers.push('Le contexte n’est pas rédigé.');
    if (tdr.objectives.length === 0) blockers.push('Aucun objectif défini.');
    if (tdr.deliverables.length === 0) blockers.push('Aucun livrable défini.');
    if (!tdr.budgetTotalUsd || Number(tdr.budgetTotalUsd) <= 0) {
      blockers.push('Le budget n’est pas renseigné.');
    }
    if (!tdr.consentMepAt || !tdr.consentRgpdAt) {
      blockers.push('Les engagements de conformité au MEP et de protection des données ne sont pas confirmés.');
    }

    // L'enveloppe du TDR ne peut excéder celle de l'activité au plan.
    if (tdr.ptbaActivity && tdr.budgetTotalUsd) {
      const envelope = Number(tdr.ptbaActivity.envelopeUsd);
      if (Number(tdr.budgetTotalUsd) > envelope) {
        blockers.push(
          `Le budget (${(Number(tdr.budgetTotalUsd) / 1e6).toFixed(2)} M USD) dépasse l’enveloppe de l’activité ${tdr.ptbaActivity.code} (${(envelope / 1e6).toFixed(2)} M USD).`,
        );
      }
    }

    if (tdr.tdrType.requiresPges && !tdr.esCategory) {
      blockers.push(
        `Le type « ${tdr.tdrType.name} » exige un PGES : la catégorie de risque environnemental et social doit être déterminée.`,
      );
    }
    if (!tdr.esCategory) {
      warnings.push('Aucune catégorie E&S renseignée — le screening reste à conduire.');
    }
    if (!tdr.methodology?.trim()) {
      warnings.push('La méthodologie attendue n’est pas décrite.');
    }

    return { blockers, warnings };
  }

  /**
   * Transmission à l'UGP.
   *
   * Fige la méthode de passation et le type de revue depuis les seuils en
   * vigueur ce jour, et prend un instantané complet du document : c'est
   * lui qui permettra de reconstituer ce qui a été transmis, des années
   * plus tard.
   */
  async submit(id: string, actor: AuthenticatedUser, ctx: RequestContext) {
    const tdr = await this.loadEditable(id, actor);
    const { blockers } = await this.checkCompleteness(id);
    if (blockers.length > 0) {
      throw new BadRequestException({ message: 'Le TDR est incomplet.', blockers });
    }

    const full = await this.prisma.tdr.findUniqueOrThrow({
      where: { id },
      include: TdrService.FULL_INCLUDE,
    });

    const category = TdrService.categoryOf(full.tdrType.family, full.tdrTypeCode);
    const resolved = category
      ? await this.referentiel.resolveMethod(category, Number(full.budgetTotalUsd ?? 0))
      : null;

    const lastVersion = await this.prisma.tdrVersion.findFirst({
      where: { tdrId: id },
      orderBy: { version: 'desc' },
    });

    const updated = await this.prisma.$transaction(async (tx) => {
      await tx.tdrVersion.create({
        data: {
          tdrId: id,
          version: (lastVersion?.version ?? 0) + 1,
          snapshot: JSON.parse(JSON.stringify(full)) as never,
          submittedById: actor.userId,
        },
      });

      return tx.tdr.update({
        where: { id },
        data: {
          status: 'SOUMIS_UGP',
          submittedAt: new Date(),
          procurementMethodCode: resolved?.method.code ?? null,
          reviewType: resolved?.reviewType ?? null,
        },
        include: TdrService.FULL_INCLUDE,
      });
    });

    await this.audit.record({
      actorId: actor.userId,
      actorEmail: actor.email,
      action: 'tdr.submitted',
      entityType: 'Tdr',
      entityId: id,
      payload: {
        reference: tdr.reference,
        method: resolved?.method.code ?? null,
        reviewType: resolved?.reviewType ?? null,
        budgetUsd: Number(full.budgetTotalUsd ?? 0),
      },
      ...ctx,
    });

    return updated;
  }

  /** Catégorie de passation correspondant au type, pour la déduction de méthode. */
  private static categoryOf(family: number, typeCode: string): string | null {
    if (typeCode === 'TDR-TX') return 'TRAVAUX';
    if (typeCode === 'TDR-FN') return 'FOURNITURES';
    if (typeCode === 'TDR-CS' || typeCode === 'TDR-ET' || typeCode === 'TDR-AU') {
      return 'SERVICES_CONSULTANTS';
    }
    if (typeCode === 'TDR-SN') return 'SERVICES_NON_CONSULTANTS';
    // Les activités opérationnelles (ateliers, formations, missions) et les
    // subventions ne relèvent pas d'une méthode de passation classique.
    return family === 1 ? 'FOURNITURES' : null;
  }

  async findOne(id: string, actor: AuthenticatedUser) {
    const tdr = await this.prisma.tdr.findUnique({ where: { id }, include: TdrService.FULL_INCLUDE });
    if (!tdr) throw new NotFoundException('TDR introuvable.');

    // Cloisonnement : hors UGP et bailleurs, on ne voit que les TDR de son
    // organisation.
    const isPrivileged =
      actor.permissions.includes('tdr:review') || actor.permissions.includes('ano:decide');
    if (!isPrivileged && tdr.organisationId !== actor.organisationId) {
      throw new ForbiddenException('Ce TDR ne relève pas de votre organisation.');
    }
    return tdr;
  }

  async list(actor: AuthenticatedUser, filters: { status?: string } = {}) {
    const isPrivileged =
      actor.permissions.includes('tdr:review') || actor.permissions.includes('ano:decide');

    return this.prisma.tdr.findMany({
      where: {
        ...(isPrivileged ? {} : { organisationId: actor.organisationId }),
        ...(filters.status ? { status: filters.status as never } : {}),
      },
      orderBy: { updatedAt: 'desc' },
      include: {
        tdrType: { select: { code: true, name: true } },
        ptbaActivity: { select: { code: true, componentCode: true } },
        organisation: { select: { code: true, name: true } },
      },
    });
  }
}
