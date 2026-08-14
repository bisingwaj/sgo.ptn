import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import type { UpsertActivityDto } from './dto/ptba.dto';
import type { AuthenticatedUser } from '../common/types/authenticated-user';
import type { RequestContext } from '../auth/auth.service';
import type { ComponentCode } from '../../generated/prisma/enums';

/**
 * Plan de Travail et Budget Annuel.
 *
 * Le PTBA est le rattachement obligatoire de tout TDR : une activité sans
 * ligne PTBA n'a pas d'enveloppe, donc pas de marché possible. Il est
 * arrêté annuellement et validé par le COPIL — une fois validé, il devient
 * opposable et ne se modifie plus librement.
 */
@Injectable()
export class PtbaService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  years() {
    return this.prisma.ptbaYear.findMany({
      orderBy: { year: 'desc' },
      include: { _count: { select: { activities: true } } },
    });
  }

  async activities(year: number, filters: { componentCode?: string } = {}) {
    const ptbaYear = await this.prisma.ptbaYear.findUnique({ where: { year } });
    if (!ptbaYear) throw new NotFoundException(`Aucun exercice PTBA ${year}.`);

    const activities = await this.prisma.ptbaActivity.findMany({
      where: {
        ptbaYearId: ptbaYear.id,
        isActive: true,
        ...(filters.componentCode ? { componentCode: filters.componentCode as ComponentCode } : {}),
      },
      orderBy: [{ componentCode: 'asc' }, { code: 'asc' }],
      include: {
        component: { select: { code: true, shortLabel: true } },
        province: { select: { code: true, label: true } },
        ...PtbaService.CONTENT_INCLUDE,
      },
    });

    const totalUsd = activities.reduce((sum, a) => sum + Number(a.envelopeUsd), 0);
    return { year: ptbaYear, activities, totalUsd };
  }

  /**
   * Vérifie la cohérence d'une enveloppe avant enregistrement.
   *
   * Le cumul des activités d'une composante ne peut excéder l'enveloppe
   * que le MEP lui attribue : c'est le premier garde-fou budgétaire du
   * cycle, avant même qu'un TDR ne soit rédigé.
   */
  private async assertEnvelopeFits(
    ptbaYearId: string,
    componentCode: ComponentCode,
    envelopeUsd: number,
    excludeActivityId?: string,
  ): Promise<void> {
    const component = await this.prisma.component.findUniqueOrThrow({ where: { code: componentCode } });
    const componentCeilingUsd = Number(component.totalUsdM) * 1_000_000;

    const siblings = await this.prisma.ptbaActivity.findMany({
      where: {
        ptbaYearId,
        componentCode,
        isActive: true,
        ...(excludeActivityId ? { id: { not: excludeActivityId } } : {}),
      },
      select: { envelopeUsd: true },
    });

    const alreadyPlanned = siblings.reduce((sum, a) => sum + Number(a.envelopeUsd), 0);
    if (alreadyPlanned + envelopeUsd > componentCeilingUsd) {
      const remaining = componentCeilingUsd - alreadyPlanned;
      throw new ConflictException(
        `L’enveloppe dépasse le solde de la composante ${componentCode} : ` +
          `${(remaining / 1_000_000).toFixed(2)} M USD encore disponibles sur ` +
          `${Number(component.totalUsdM)} M USD (MEP Tableau 2).`,
      );
    }
  }

  private static assertDonorSplit(dto: UpsertActivityDto): void {
    const ida = dto.idaUsd ?? 0;
    const afd = dto.afdUsd ?? 0;
    if (ida === 0 && afd === 0) return;
    // Tolérance d'un dollar : les ventilations viennent souvent d'un
    // tableur et traînent des arrondis.
    if (Math.abs(ida + afd - dto.envelopeUsd) > 1) {
      throw new BadRequestException(
        `La ventilation IDA (${ida}) + AFD (${afd}) ne correspond pas à l’enveloppe (${dto.envelopeUsd}).`,
      );
    }
  }

  private async assertEditable(year: number) {
    const ptbaYear = await this.prisma.ptbaYear.findUnique({ where: { year } });
    if (!ptbaYear) throw new NotFoundException(`Aucun exercice PTBA ${year}.`);
    if (ptbaYear.status === 'CLOS') {
      throw new BadRequestException(`L’exercice ${year} est clos.`);
    }
    return ptbaYear;
  }

  /**
   * Ecrit les cinq listes que l'activite porte en propre.
   *
   * Remplacement en bloc, comme pour les collections d'un TDR : l'ecran
   * renvoie l'etat complet de chaque liste, jamais des operations
   * differentielles. Une entree sans intitule est ecartee — un formulaire
   * laisse volontiers une ligne vide en fin de saisie.
   */
  private static async writeContent(
    tx: Parameters<Parameters<PrismaService['$transaction']>[0]>[0],
    activityId: string,
    dto: UpsertActivityDto,
  ): Promise<void> {
    const propre = (v?: string) => (v && v.trim() ? v.trim() : null);

    if (dto.objectives) {
      await tx.ptbaActivityObjective.deleteMany({ where: { activityId } });
      await tx.ptbaActivityObjective.createMany({
        data: dto.objectives
          .filter((o) => o.title?.trim())
          .map((o, i) => ({ activityId, title: o.title.trim(), criteria: propre(o.criteria), position: i })),
      });
    }
    if (dto.deliverables) {
      await tx.ptbaActivityDeliverable.deleteMany({ where: { activityId } });
      await tx.ptbaActivityDeliverable.createMany({
        data: dto.deliverables
          .filter((d) => d.title?.trim())
          .map((d, i) => ({
            activityId, title: d.title.trim(), format: propre(d.format), deadline: propre(d.deadline), position: i,
          })),
      });
    }
    if (dto.indicators) {
      await tx.ptbaActivityIndicator.deleteMany({ where: { activityId } });
      await tx.ptbaActivityIndicator.createMany({
        data: dto.indicators
          .filter((n) => n.label?.trim())
          .map((n, i) => ({
            activityId, label: n.label.trim(), measure: propre(n.measure), target: propre(n.target), position: i,
          })),
      });
    }
    if (dto.risks) {
      await tx.ptbaActivityRisk.deleteMany({ where: { activityId } });
      await tx.ptbaActivityRisk.createMany({
        data: dto.risks
          .filter((r) => r.label?.trim())
          .map((r, i) => ({
            activityId,
            label: r.label.trim(),
            description: propre(r.description),
            mitigation: propre(r.mitigation),
            level: (propre(r.level) as never) ?? null,
            position: i,
          })),
      });
    }
    if (dto.clauses) {
      await tx.ptbaActivityClause.deleteMany({ where: { activityId } });
      await tx.ptbaActivityClause.createMany({
        data: dto.clauses
          .filter((c) => c.label?.trim())
          .map((c, i) => ({ activityId, label: c.label.trim(), text: propre(c.text), position: i })),
      });
    }
  }

  /** Les cinq listes, ordonnees, pour tout renvoi d'activite. */
  private static readonly CONTENT_INCLUDE = {
    objectives: { orderBy: { position: 'asc' } },
    deliverables: { orderBy: { position: 'asc' } },
    indicators: { orderBy: { position: 'asc' } },
    risks: { orderBy: { position: 'asc' } },
    clauses: { orderBy: { position: 'asc' } },
  } as const;

  async createActivity(year: number, dto: UpsertActivityDto, actor: AuthenticatedUser, ctx: RequestContext) {
    const ptbaYear = await this.assertEditable(year);
    PtbaService.assertDonorSplit(dto);

    const existing = await this.prisma.ptbaActivity.findUnique({
      where: { ptbaYearId_code: { ptbaYearId: ptbaYear.id, code: dto.code } },
    });
    if (existing) {
      throw new ConflictException(`L’activité ${dto.code} existe déjà dans le PTBA ${year}.`);
    }

    await this.assertEnvelopeFits(ptbaYear.id, dto.componentCode as ComponentCode, dto.envelopeUsd);

    // Une seule transaction : une activite dont le contenu aurait echoue a
    // s'ecrire serait pire qu'une activite absente, puisqu'elle passerait
    // pour complete.
    const activity = await this.prisma.$transaction(async (tx) => {
      const created = await tx.ptbaActivity.create({
        data: {
          ptbaYearId: ptbaYear.id,
          code: dto.code,
          title: dto.title.trim(),
          componentCode: dto.componentCode as ComponentCode,
          subComponent: dto.subComponent?.trim() || null,
          envelopeUsd: dto.envelopeUsd,
          idaUsd: dto.idaUsd ?? null,
          afdUsd: dto.afdUsd ?? null,
          provinceCode: dto.provinceCode || null,
        },
      });
      await PtbaService.writeContent(tx, created.id, dto);
      return tx.ptbaActivity.findUniqueOrThrow({
        where: { id: created.id },
        include: PtbaService.CONTENT_INCLUDE,
      });
    });

    await this.audit.record({
      actorId: actor.userId,
      actorEmail: actor.email,
      action: 'ptba.activity_created',
      entityType: 'PtbaActivity',
      entityId: activity.id,
      payload: { year, code: dto.code, componentCode: dto.componentCode, envelopeUsd: dto.envelopeUsd },
      ...ctx,
    });

    return activity;
  }

  async updateActivity(id: string, dto: UpsertActivityDto, actor: AuthenticatedUser, ctx: RequestContext) {
    const activity = await this.prisma.ptbaActivity.findUnique({
      where: { id },
      include: { ptbaYear: true },
    });
    if (!activity) throw new NotFoundException('Activité PTBA introuvable.');
    if (activity.ptbaYear.status === 'CLOS') {
      throw new BadRequestException('L’exercice est clos : cette activité n’est plus modifiable.');
    }

    PtbaService.assertDonorSplit(dto);
    await this.assertEnvelopeFits(
      activity.ptbaYearId,
      dto.componentCode as ComponentCode,
      dto.envelopeUsd,
      id,
    );

    const updated = await this.prisma.$transaction(async (tx) => {
      await tx.ptbaActivity.update({
        where: { id },
        data: {
          code: dto.code,
          title: dto.title.trim(),
          componentCode: dto.componentCode as ComponentCode,
          subComponent: dto.subComponent?.trim() || null,
          envelopeUsd: dto.envelopeUsd,
          idaUsd: dto.idaUsd ?? null,
          afdUsd: dto.afdUsd ?? null,
          provinceCode: dto.provinceCode || null,
        },
      });
      await PtbaService.writeContent(tx, id, dto);
      return tx.ptbaActivity.findUniqueOrThrow({
        where: { id },
        include: PtbaService.CONTENT_INCLUDE,
      });
    });

    await this.audit.record({
      actorId: actor.userId,
      actorEmail: actor.email,
      action: 'ptba.activity_updated',
      entityType: 'PtbaActivity',
      entityId: id,
      payload: { code: dto.code, envelopeUsd: dto.envelopeUsd },
      ...ctx,
    });

    return updated;
  }

  /** Retrait du plan. L'activité est conservée : un TDR peut déjà la citer. */
  async deactivateActivity(id: string, actor: AuthenticatedUser, ctx: RequestContext) {
    const activity = await this.prisma.ptbaActivity.findUnique({ where: { id } });
    if (!activity) throw new NotFoundException('Activité PTBA introuvable.');

    await this.prisma.ptbaActivity.update({ where: { id }, data: { isActive: false } });

    await this.audit.record({
      actorId: actor.userId,
      actorEmail: actor.email,
      action: 'ptba.activity_deactivated',
      entityType: 'PtbaActivity',
      entityId: id,
      payload: { code: activity.code },
      ...ctx,
    });

    return { id, isActive: false };
  }

  /** Validation COPIL : le plan devient opposable. */
  async validateYear(year: number, actor: AuthenticatedUser, ctx: RequestContext) {
    const ptbaYear = await this.assertEditable(year);
    if (ptbaYear.status === 'VALIDE') {
      throw new BadRequestException(`L’exercice ${year} est déjà validé.`);
    }

    const count = await this.prisma.ptbaActivity.count({
      where: { ptbaYearId: ptbaYear.id, isActive: true },
    });
    if (count === 0) {
      throw new BadRequestException('Un exercice sans activité ne peut être validé.');
    }

    const updated = await this.prisma.ptbaYear.update({
      where: { id: ptbaYear.id },
      data: { status: 'VALIDE', validatedAt: new Date(), validatedById: actor.userId },
    });

    await this.audit.record({
      actorId: actor.userId,
      actorEmail: actor.email,
      action: 'ptba.year_validated',
      entityType: 'PtbaYear',
      entityId: ptbaYear.id,
      payload: { year, activities: count },
      ...ctx,
    });

    return updated;
  }
}
