import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import type { UpsertActivityDto, UpsertAllocationDto } from './dto/ptba.dto';
import type { AuthenticatedUser } from '../common/types/authenticated-user';
import type { RequestContext } from '../auth/auth.service';
import type { ComponentCode, PtbaStatus } from '../../generated/prisma/enums';

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

  /**
   * Ouvre un exercice budgétaire.
   *
   * L'ACTE N'EXISTAIT PAS. Le PTBA savait lire ses exercices, y allouer,
   * y inscrire des activités et les valider — mais rien ne permettait
   * d'en OUVRIR un. Celui de 2026 venait du peuplement de la base, et
   * l'arrivée de 2027 aurait demandé une intervention en base de données.
   *
   * L'exercice naît en BROUILLON, vide : ni allocation ni activité. Une
   * dotation est une décision du COPIL, et recopier celles de l'année
   * précédente les ferait passer pour reconduites alors que personne ne
   * les a arrêtées.
   *
   * TROIS REFUS, ET LEURS RAISONS. L'année déjà ouverte, parce qu'un
   * exercice est unique. L'année hors de la vie du projet — le PTN-RDC
   * s'achève au 31 décembre 2029, un plan pour 2032 n'aurait pas d'objet.
   * Et l'année antérieure au premier exercice connu, qui trahit une
   * saisie plutôt qu'une intention.
   */
  async openYear(
    year: number,
    label: string | undefined,
    actor: AuthenticatedUser,
    ctx: RequestContext,
  ) {
    const existant = await this.prisma.ptbaYear.findUnique({ where: { year } });
    if (existant) {
      throw new ConflictException(
        `L’exercice ${year} est déjà ouvert (${PtbaService.ETAT_LISIBLE[existant.status]}).`,
      );
    }

    // Bornes du projet, reprises du MEP : entrée en vigueur le 31 octobre
    // 2025, achèvement technique le 31 décembre 2029. Un exercice au-delà
    // se planifierait sans financement.
    if (year < PtbaService.PREMIER_EXERCICE || year > PtbaService.DERNIER_EXERCICE) {
      throw new BadRequestException(
        `Le PTN-RDC couvre les exercices ${PtbaService.PREMIER_EXERCICE} à ` +
          `${PtbaService.DERNIER_EXERCICE} (MEP du 23 juin 2025). L’exercice ${year} ` +
          'ne relève pas de la durée du projet.',
      );
    }

    const cree = await this.prisma.ptbaYear.create({
      data: {
        year,
        label: label?.trim() || `Plan de Travail et Budget Annuel ${year}`,
        status: 'BROUILLON',
      },
      include: { _count: { select: { activities: true } } },
    });

    await this.audit.record({
      actorId: actor.userId,
      actorEmail: actor.email,
      action: 'ptba.year_opened',
      entityType: 'PtbaYear',
      entityId: cree.id,
      payload: { year, label: cree.label },
      ...ctx,
    });

    return cree;
  }

  /** Bornes de la vie du projet, MEP du 23 juin 2025. */
  private static readonly PREMIER_EXERCICE = 2025;
  private static readonly DERNIER_EXERCICE = 2029;

  /** Ce qu'un état veut dire, quand le refus doit le nommer. */
  private static readonly ETAT_LISIBLE: Record<string, string> = {
    BROUILLON: 'en préparation',
    VALIDE: 'validé par le COPIL',
    CLOS: 'clos',
  };

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
        ...PtbaService.CONTENT_INCLUDE,
      },
    });

    const totalUsd = activities.reduce((sum, a) => sum + Number(a.envelopeUsd), 0);
    return { year: ptbaYear, activities, totalUsd };
  }

  /**
   * Une activité et ce qui s'y rattache.
   *
   * Les TDR sont joints parce que c'est la question qu'on vient poser à une
   * ligne de plan : combien de marchés en découlent, et où ils en sont.
   * La relation existait au schéma sans qu'aucun écran ne l'expose.
   */
  async activity(id: string) {
    const activity = await this.prisma.ptbaActivity.findUnique({
      where: { id },
      include: {
        component: { select: { code: true, shortLabel: true, label: true } },
        ptbaYear: { select: { year: true, label: true, status: true, validatedAt: true } },
        tdrs: {
          select: { id: true, reference: true, title: true, status: true, updatedAt: true },
          orderBy: { updatedAt: 'desc' },
        },
        ...PtbaService.CONTENT_INCLUDE,
      },
    });
    if (!activity) throw new NotFoundException('Activité PTBA introuvable.');
    return activity;
  }

  /**
   * Allocations de l'exercice, une ligne par composante du MEP.
   *
   * Les composantes sans allocation y figurent aussi, à `null` : c'est
   * exactement ce qu'il faut voir pour savoir ce qui reste à arrêter
   * avant que le plan puisse s'écrire.
   *
   * Les montants sortent en USD entiers. Le service ne formate rien —
   * l'interface en fait la présentation.
   */
  async allocations(year: number) {
    const ptbaYear = await this.loadYear(year);

    const [components, rows, activities, allYears] = await Promise.all([
      this.prisma.component.findMany({ orderBy: { code: 'asc' } }),
      this.prisma.ptbaYearComponentAllocation.findMany({ where: { ptbaYearId: ptbaYear.id } }),
      this.prisma.ptbaActivity.findMany({
        where: { ptbaYearId: ptbaYear.id, isActive: true },
        select: { componentCode: true, envelopeUsd: true },
      }),
      // Cumul des allocations d'une composante sur TOUS les exercices :
      // c'est lui qui dit ce qui reste de la dotation de projet.
      this.prisma.ptbaYearComponentAllocation.groupBy({
        by: ['componentCode'],
        _sum: { allocationUsd: true },
      }),
    ]);

    return {
      year: ptbaYear,
      rows: components.map((c) => {
        const allocation = rows.find((r) => r.componentCode === c.code) ?? null;
        const lines = activities.filter((a) => a.componentCode === c.code);
        const allocatedAllYears = allYears.find((g) => g.componentCode === c.code);

        return {
          componentCode: c.code,
          label: c.label,
          shortLabel: c.shortLabel,
          reconciliation: c.reconciliation,
          /// Dotation de projet du MEP, 2025-2029
          projectCeilingUsd: Number(c.totalUsdM) * 1_000_000,
          allocatedAllYearsUsd: Number(allocatedAllYears?._sum.allocationUsd ?? 0),
          allocationUsd: allocation ? Number(allocation.allocationUsd) : null,
          idaUsd: allocation?.idaUsd != null ? Number(allocation.idaUsd) : null,
          afdUsd: allocation?.afdUsd != null ? Number(allocation.afdUsd) : null,
          note: allocation?.note ?? null,
          plannedUsd: lines.reduce((sum, a) => sum + Number(a.envelopeUsd), 0),
          activityCount: lines.length,
        };
      }),
    };
  }

  /**
   * Arrête l'allocation annuelle d'une composante.
   *
   * Trois refus, dans cet ordre — du plus structurel au plus local :
   * l'exercice doit être ouvert à l'écriture ; le cumul des allocations
   * de la composante ne peut excéder sa dotation de projet ; et une
   * allocation ne peut descendre sous ce qui est déjà inscrit au plan,
   * sinon l'exercice deviendrait incohérent d'un seul geste.
   */
  async setAllocation(
    year: number,
    dto: UpsertAllocationDto,
    actor: AuthenticatedUser,
    ctx: RequestContext,
  ) {
    const ptbaYear = await this.loadYear(year);
    PtbaService.assertContentEditable(ptbaYear);

    const componentCode = dto.componentCode as ComponentCode;
    const component = await this.prisma.component.findUniqueOrThrow({ where: { code: componentCode } });

    PtbaService.assertSplit(dto.allocationUsd, dto.idaUsd, dto.afdUsd, 'l’allocation');

    // 1. La dotation de projet, tous exercices confondus.
    const projectCeilingUsd = Number(component.totalUsdM) * 1_000_000;
    const otherYears = await this.prisma.ptbaYearComponentAllocation.findMany({
      where: { componentCode, ptbaYearId: { not: ptbaYear.id } },
      select: { allocationUsd: true },
    });
    const allocatedElsewhere = otherYears.reduce((sum, a) => sum + Number(a.allocationUsd), 0);

    if (allocatedElsewhere + dto.allocationUsd > projectCeilingUsd) {
      const remaining = projectCeilingUsd - allocatedElsewhere;
      throw new ConflictException(
        `L’allocation dépasse la dotation de projet de la composante ${componentCode} : ` +
          `${PtbaService.millions(remaining)} M USD encore disponibles sur ` +
          `${PtbaService.millions(projectCeilingUsd)} M USD (MEP Tableau 2), ` +
          `dont ${PtbaService.millions(allocatedElsewhere)} M USD déjà alloués à d’autres exercices.`,
      );
    }

    // 2. Ce que le plan de cet exercice porte déjà.
    const planned = await this.plannedForComponent(ptbaYear.id, componentCode);
    if (dto.allocationUsd < planned) {
      throw new ConflictException(
        `L’allocation ne peut descendre sous les ${PtbaService.millions(planned)} M USD ` +
          `déjà inscrits au plan ${year} sur la composante ${componentCode}. ` +
          `Retirez des activités d’abord.`,
      );
    }

    const saved = await this.prisma.ptbaYearComponentAllocation.upsert({
      where: { ptbaYearId_componentCode: { ptbaYearId: ptbaYear.id, componentCode } },
      create: {
        ptbaYearId: ptbaYear.id,
        componentCode,
        allocationUsd: dto.allocationUsd,
        idaUsd: dto.idaUsd ?? null,
        afdUsd: dto.afdUsd ?? null,
        note: dto.note?.trim() || null,
      },
      update: {
        allocationUsd: dto.allocationUsd,
        idaUsd: dto.idaUsd ?? null,
        afdUsd: dto.afdUsd ?? null,
        note: dto.note?.trim() || null,
      },
    });

    await this.audit.record({
      actorId: actor.userId,
      actorEmail: actor.email,
      action: 'ptba.allocation_set',
      entityType: 'PtbaYearComponentAllocation',
      entityId: saved.id,
      payload: { year, componentCode, allocationUsd: dto.allocationUsd, plannedUsd: planned },
      ...ctx,
    });

    return saved;
  }

  /**
   * Les codes de province doivent exister au référentiel.
   *
   * Sans ce contrôle, un code inconnu remontait en violation de clé
   * étrangère Prisma — donc une 500 opaque, là où le fautif est une saisie
   * et mérite une 400 qui le nomme.
   */
  private async assertProvincesExist(codes?: string[]): Promise<void> {
    if (!codes || codes.length === 0) return;
    const uniques = [...new Set(codes)];
    const connues = await this.prisma.province.findMany({
      where: { code: { in: uniques } },
      select: { code: true },
    });
    const inconnues = uniques.filter((c) => !connues.some((p) => p.code === c));
    if (inconnues.length > 0) {
      throw new BadRequestException(
        `Province${inconnues.length > 1 ? 's' : ''} inconnue${inconnues.length > 1 ? 's' : ''} au référentiel : ${inconnues.join(', ')}.`,
      );
    }
  }

  /** Millions USD, pour les messages d'erreur. */
  private static millions(usd: number): string {
    return (usd / 1_000_000).toFixed(2);
  }

  /** Cumul des activités actives d'une composante sur un exercice. */
  private async plannedForComponent(
    ptbaYearId: string,
    componentCode: ComponentCode,
    excludeActivityId?: string,
  ): Promise<number> {
    const siblings = await this.prisma.ptbaActivity.findMany({
      where: {
        ptbaYearId,
        componentCode,
        isActive: true,
        ...(excludeActivityId ? { id: { not: excludeActivityId } } : {}),
      },
      select: { envelopeUsd: true },
    });
    return siblings.reduce((sum, a) => sum + Number(a.envelopeUsd), 0);
  }

  /**
   * Vérifie qu'une enveloppe tient dans l'allocation ANNUELLE de sa
   * composante.
   *
   * Le contrôle portait jusqu'ici sur la dotation de PROJET du MEP —
   * 385 M USD sur C1, pour cinq ans. Chaque exercice pouvait donc
   * inscrire l'intégralité de l'enveloppe quinquennale, et rien ne
   * bornait le cumul d'un exercice à l'autre.
   *
   * Une composante sans allocation n'accepte aucune activité. Le refus
   * est préféré à un repli sur la dotation de projet : ce repli rendrait
   * le garde-fou silencieusement inopérant, ce qui est précisément le
   * défaut corrigé ici.
   */
  private async assertEnvelopeFits(
    ptbaYearId: string,
    year: number,
    componentCode: ComponentCode,
    envelopeUsd: number,
    excludeActivityId?: string,
  ): Promise<void> {
    const allocation = await this.prisma.ptbaYearComponentAllocation.findUnique({
      where: { ptbaYearId_componentCode: { ptbaYearId, componentCode } },
    });
    if (!allocation) {
      throw new ConflictException(
        `La composante ${componentCode} n’a pas d’allocation sur l’exercice ${year}. ` +
          `Elle doit être arrêtée avant qu’une activité s’y inscrive.`,
      );
    }

    const ceilingUsd = Number(allocation.allocationUsd);
    const alreadyPlanned = await this.plannedForComponent(ptbaYearId, componentCode, excludeActivityId);

    if (alreadyPlanned + envelopeUsd > ceilingUsd) {
      const remaining = ceilingUsd - alreadyPlanned;
      throw new ConflictException(
        `L’enveloppe dépasse l’allocation ${year} de la composante ${componentCode} : ` +
          `${PtbaService.millions(remaining)} M USD encore disponibles sur ` +
          `${PtbaService.millions(ceilingUsd)} M USD alloués.`,
      );
    }
  }

  /**
   * La ventilation par bailleur, quand elle est renseignée, doit totaliser
   * le montant qu'elle ventile. Vaut pour l'enveloppe d'une activité comme
   * pour l'allocation d'une composante — c'est la même règle.
   */
  private static assertSplit(
    total: number,
    idaUsd: number | undefined,
    afdUsd: number | undefined,
    noun: string,
  ): void {
    const ida = idaUsd ?? 0;
    const afd = afdUsd ?? 0;
    if (ida === 0 && afd === 0) return;
    // Tolérance d'un dollar : les ventilations viennent souvent d'un
    // tableur et traînent des arrondis.
    if (Math.abs(ida + afd - total) > 1) {
      throw new BadRequestException(
        `La ventilation IDA (${ida}) + AFD (${afd}) ne correspond pas à ${noun} (${total}).`,
      );
    }
  }

  private async loadYear(year: number) {
    const ptbaYear = await this.prisma.ptbaYear.findUnique({ where: { year } });
    if (!ptbaYear) throw new NotFoundException(`Aucun exercice PTBA ${year}.`);
    return ptbaYear;
  }

  /**
   * Le plan ne se modifie qu'en préparation.
   *
   * La règle était jusqu'ici tenue par le seul écran, qui masque le bouton
   * hors BROUILLON. Un appel direct passait donc, et altérait un plan que
   * le COPIL a rendu opposable — sans que rien ne distingue cette écriture
   * d'une saisie ordinaire. La garde appartient au service : c'est lui qui
   * répond au bailleur de ce que porte le plan.
   *
   * Corriger un exercice validé suppose de le rouvrir en révision. Tant
   * que cette procédure n'existe pas, le refus est net plutôt que
   * contournable.
   */
  private static assertContentEditable(ptbaYear: { year: number; status: PtbaStatus }): void {
    if (ptbaYear.status === 'VALIDE') {
      throw new ConflictException(
        `Le PTBA ${ptbaYear.year} est validé : il est opposable et ne se modifie plus. ` +
          `Une correction suppose une révision de l’exercice.`,
      );
    }
    if (ptbaYear.status === 'CLOS') {
      throw new ConflictException(`L’exercice ${ptbaYear.year} est clos : plus aucune écriture.`);
    }
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
    if (dto.provinceCodes) {
      // Remplacement en bloc, comme les cinq listes : l'écran renvoie la
      // couverture complète, jamais un différentiel.
      await tx.ptbaActivityProvince.deleteMany({ where: { activityId } });
      await tx.ptbaActivityProvince.createMany({
        data: [...new Set(dto.provinceCodes)].map((provinceCode) => ({ activityId, provinceCode })),
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
    provinces: { include: { province: { select: { code: true, label: true } } } },
    objectives: { orderBy: { position: 'asc' } },
    deliverables: { orderBy: { position: 'asc' } },
    indicators: { orderBy: { position: 'asc' } },
    risks: { orderBy: { position: 'asc' } },
    clauses: { orderBy: { position: 'asc' } },
  } as const;

  async createActivity(year: number, dto: UpsertActivityDto, actor: AuthenticatedUser, ctx: RequestContext) {
    const ptbaYear = await this.loadYear(year);
    PtbaService.assertContentEditable(ptbaYear);
    PtbaService.assertSplit(dto.envelopeUsd, dto.idaUsd, dto.afdUsd, 'l’enveloppe');
    await this.assertProvincesExist(dto.provinceCodes);

    const existing = await this.prisma.ptbaActivity.findUnique({
      where: { ptbaYearId_code: { ptbaYearId: ptbaYear.id, code: dto.code } },
    });
    if (existing) {
      throw new ConflictException(`L’activité ${dto.code} existe déjà dans le PTBA ${year}.`);
    }

    await this.assertEnvelopeFits(
      ptbaYear.id,
      ptbaYear.year,
      dto.componentCode as ComponentCode,
      dto.envelopeUsd,
    );

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
    PtbaService.assertContentEditable(activity.ptbaYear);

    PtbaService.assertSplit(dto.envelopeUsd, dto.idaUsd, dto.afdUsd, 'l’enveloppe');
    await this.assertProvincesExist(dto.provinceCodes);
    await this.assertEnvelopeFits(
      activity.ptbaYearId,
      activity.ptbaYear.year,
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

  /**
   * Retrait du plan. L'activité est conservée : un TDR peut déjà la citer.
   *
   * Le retrait est une écriture comme une autre — il enlève une enveloppe
   * au plan. Il ne contrôlait pourtant rien : une ligne pouvait être
   * retirée d'un exercice validé, voire clos.
   */
  async deactivateActivity(
    id: string,
    motif: string,
    actor: AuthenticatedUser,
    ctx: RequestContext,
  ) {
    const activity = await this.prisma.ptbaActivity.findUnique({
      where: { id },
      include: { ptbaYear: true },
    });
    if (!activity) throw new NotFoundException('Activité PTBA introuvable.');
    PtbaService.assertContentEditable(activity.ptbaYear);

    await this.prisma.ptbaActivity.update({ where: { id }, data: { isActive: false } });

    await this.audit.record({
      actorId: actor.userId,
      actorEmail: actor.email,
      action: 'ptba.activity_deactivated',
      entityType: 'PtbaActivity',
      entityId: id,
      payload: { code: activity.code, motif, envelopeUsd: Number(activity.envelopeUsd) },
      ...ctx,
    });

    return { id, isActive: false };
  }

  /** Validation COPIL : le plan devient opposable. */
  async validateYear(year: number, actor: AuthenticatedUser, ctx: RequestContext) {
    // La validation ne passe pas par `assertContentEditable` : elle change
    // le statut, elle n'écrit pas dans le plan. Ses refus lui sont propres.
    const ptbaYear = await this.loadYear(year);
    if (ptbaYear.status === 'VALIDE') {
      throw new ConflictException(`L’exercice ${year} est déjà validé.`);
    }
    if (ptbaYear.status === 'CLOS') {
      throw new ConflictException(`L’exercice ${year} est clos : il ne peut plus être validé.`);
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
