import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import type { AuthenticatedUser } from '../common/types/authenticated-user';
import type { RequestContext } from '../auth/auth.service';
import type { ClauseCategory, RiskLevel, TemplateStatus } from '../../generated/prisma/enums';

/** Les trois bibliothèques partagent le même cycle de vie versionné. */
export type LibraryKind = 'clauses' | 'indicateurs' | 'risques';

/**
 * Référentiel de passation et bibliothèques TDR.
 *
 * Ces textes partent dans des documents contractuels soumis à ANO. Une
 * modification ne réécrit donc jamais l'existant : elle crée une nouvelle
 * version. L'ancienne est archivée mais conservée, de sorte qu'un TDR
 * approuvé reste lisible avec les clauses en vigueur à sa date.
 */
@Injectable()
export class TdrReferentielService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  // ==========================================================
  // Lecture du référentiel
  // ==========================================================

  types() {
    return this.prisma.tdrType.findMany({
      orderBy: { displayOrder: 'asc' },
      include: { defaultMethod: { select: { code: true, label: true } } },
    });
  }

  methods() {
    return this.prisma.procurementMethod.findMany({
      orderBy: [{ category: 'asc' }, { displayOrder: 'asc' }],
      include: { thresholds: { orderBy: { minUsd: 'asc' } } },
    });
  }

  /**
   * Méthode applicable à un montant donné, pour une catégorie.
   * Le seuil est la règle : la déduire ici évite qu'un écran l'écrive en dur.
   */
  async resolveMethod(category: string, amountUsd: number) {
    const thresholds = await this.prisma.procurementThreshold.findMany({
      // Trois méthodes ne se déduisent pas d'un montant et sont écartées de la
      // résolution : le marché direct et la source unique, qui se justifient,
      // et l'accord-cadre, qui se choisit sur un cas d'emploi — besoins
      // répétitifs, préqualification puis tirage. Sans ce filtre, leurs bornes
      // ouvertes captureraient n'importe quelle somme et un marché de 20 M USD
      // basculerait en gré à gré faute d'un autre seuil correspondant.
      // L'accord-cadre reste donc sélectionnable à la main, jamais proposé
      // d'office — c'est le rédacteur qui établit le caractère répétitif.
      where: { category: category as never, method: { isException: false, isActive: true } },
      include: { method: true },
    });

    const candidates = thresholds.filter((t) => {
      const aboveMin = t.minUsd === null || amountUsd >= Number(t.minUsd);
      const belowMax = t.maxUsd === null || amountUsd < Number(t.maxUsd);
      return aboveMin && belowMax;
    });
    if (candidates.length === 0) return null;

    // Le seuil le plus spécifique l'emporte : plafond le plus bas d'abord
    // — une fourniture à 50 k USD relève de la Demande de Cotation
    // (< 100 k) et non de l'Appel d'Offres National (< 4 M) —, puis
    // plancher le plus élevé.
    candidates.sort((a, b) => {
      const maxA = a.maxUsd === null ? Number.POSITIVE_INFINITY : Number(a.maxUsd);
      const maxB = b.maxUsd === null ? Number.POSITIVE_INFINITY : Number(b.maxUsd);
      if (maxA !== maxB) return maxA - maxB;
      return Number(b.minUsd ?? 0) - Number(a.minUsd ?? 0);
    });

    const match = candidates[0];
    return {
      method: { code: match.method.code, label: match.method.label },
      reviewType: match.reviewType,
      note: match.note,
      threshold: {
        minUsd: match.minUsd === null ? null : Number(match.minUsd),
        maxUsd: match.maxUsd === null ? null : Number(match.maxUsd),
      },
    };
  }

  // ==========================================================
  // Bibliothèques — lecture
  // ==========================================================

  async library(kind: LibraryKind, filters: { type?: string; status?: keyof typeof TemplateStatus }) {
    // `transversal` désigne les éléments applicables à tous les types,
    // stockés sans rattachement.
    const where = {
      ...(filters.type
        ? filters.type === 'transversal'
          ? { tdrTypeCode: null }
          : { tdrTypeCode: filters.type }
        : {}),
      ...(filters.status ? { status: filters.status as TemplateStatus } : {}),
    };
    const orderBy = [{ familyKey: 'asc' as const }, { version: 'desc' as const }];

    if (kind === 'clauses') return this.prisma.clauseTemplate.findMany({ where, orderBy });
    if (kind === 'indicateurs') return this.prisma.indicatorTemplate.findMany({ where, orderBy });
    return this.prisma.riskTemplate.findMany({ where, orderBy });
  }

  /** Toutes les versions d'un même élément, de la plus récente à la plus ancienne. */
  async history(kind: LibraryKind, familyKey: string) {
    const where = { familyKey };
    const orderBy = { version: 'desc' as const };
    if (kind === 'clauses') return this.prisma.clauseTemplate.findMany({ where, orderBy });
    if (kind === 'indicateurs') return this.prisma.indicatorTemplate.findMany({ where, orderBy });
    return this.prisma.riskTemplate.findMany({ where, orderBy });
  }

  // ==========================================================
  // Bibliothèques — édition versionnée
  // ==========================================================

  private async nextVersion(kind: LibraryKind, familyKey: string): Promise<number> {
    const latest =
      kind === 'clauses'
        ? await this.prisma.clauseTemplate.findFirst({ where: { familyKey }, orderBy: { version: 'desc' } })
        : kind === 'indicateurs'
          ? await this.prisma.indicatorTemplate.findFirst({ where: { familyKey }, orderBy: { version: 'desc' } })
          : await this.prisma.riskTemplate.findFirst({ where: { familyKey }, orderBy: { version: 'desc' } });
    return (latest?.version ?? 0) + 1;
  }

  private static slugify(label: string): string {
    return label
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 60);
  }

  /**
   * Crée une entrée en brouillon.
   *
   * `familyKey` fourni : nouvelle version d'un élément existant.
   * `familyKey` absent : nouvel élément, version 1.
   */
  async draft(
    kind: LibraryKind,
    data: Record<string, unknown>,
    familyKey: string | undefined,
    actor: AuthenticatedUser,
    ctx: RequestContext,
  ) {
    const scope = (data.tdrTypeCode as string | undefined) ?? 'transversal';
    const key = familyKey ?? `${scope}:${TdrReferentielService.slugify(String(data.label))}`;
    const version = await this.nextVersion(kind, key);

    const base = {
      familyKey: key,
      version,
      tdrTypeCode: (data.tdrTypeCode as string | undefined) ?? null,
      status: 'BROUILLON' as TemplateStatus,
      createdById: actor.userId,
    };

    const created =
      kind === 'clauses'
        ? await this.prisma.clauseTemplate.create({
            data: {
              ...base,
              category: data.category as ClauseCategory,
              label: String(data.label),
              text: String(data.text),
            },
          })
        : kind === 'indicateurs'
          ? await this.prisma.indicatorTemplate.create({
              data: {
                ...base,
                label: String(data.label),
                measure: String(data.measure),
                target: String(data.target),
              },
            })
          : await this.prisma.riskTemplate.create({
              data: {
                ...base,
                label: String(data.label),
                description: String(data.description),
                mitigation: String(data.mitigation),
                level: data.level as RiskLevel,
              },
            });

    await this.audit.record({
      actorId: actor.userId,
      actorEmail: actor.email,
      action: 'referentiel.draft_created',
      entityType: kind,
      entityId: created.id,
      payload: { familyKey: key, version, label: data.label },
      ...ctx,
    });

    return created;
  }

  /**
   * Met une version en vigueur. La version publiée précédente du même
   * élément est archivée — jamais supprimée : un TDR déjà soumis la cite.
   */
  async publish(kind: LibraryKind, id: string, actor: AuthenticatedUser, ctx: RequestContext) {
    const entry = await this.findOne(kind, id);
    if (entry.status === 'PUBLIE') {
      throw new BadRequestException('Cette version est déjà en vigueur.');
    }
    if (entry.status === 'ARCHIVE') {
      throw new BadRequestException('Une version archivée ne peut être remise en vigueur. Créez-en une nouvelle.');
    }

    const now = new Date();
    await this.prisma.$transaction(async (tx) => {
      const archivePrevious = {
        where: { familyKey: entry.familyKey, status: 'PUBLIE' as TemplateStatus },
        data: { status: 'ARCHIVE' as TemplateStatus, supersededAt: now },
      };
      const publish = { where: { id }, data: { status: 'PUBLIE' as TemplateStatus, effectiveFrom: now } };

      if (kind === 'clauses') {
        await tx.clauseTemplate.updateMany(archivePrevious);
        await tx.clauseTemplate.update(publish);
      } else if (kind === 'indicateurs') {
        await tx.indicatorTemplate.updateMany(archivePrevious);
        await tx.indicatorTemplate.update(publish);
      } else {
        await tx.riskTemplate.updateMany(archivePrevious);
        await tx.riskTemplate.update(publish);
      }
    });

    await this.audit.record({
      actorId: actor.userId,
      actorEmail: actor.email,
      action: 'referentiel.published',
      entityType: kind,
      entityId: id,
      payload: { familyKey: entry.familyKey, version: entry.version, label: entry.label },
      ...ctx,
    });

    return this.findOne(kind, id);
  }

  async archive(kind: LibraryKind, id: string, actor: AuthenticatedUser, ctx: RequestContext) {
    const entry = await this.findOne(kind, id);
    const data = { status: 'ARCHIVE' as TemplateStatus, supersededAt: new Date() };

    if (kind === 'clauses') await this.prisma.clauseTemplate.update({ where: { id }, data });
    else if (kind === 'indicateurs') await this.prisma.indicatorTemplate.update({ where: { id }, data });
    else await this.prisma.riskTemplate.update({ where: { id }, data });

    await this.audit.record({
      actorId: actor.userId,
      actorEmail: actor.email,
      action: 'referentiel.archived',
      entityType: kind,
      entityId: id,
      payload: { familyKey: entry.familyKey, version: entry.version },
      ...ctx,
    });

    return { id, status: 'ARCHIVE' as const };
  }

  private async findOne(kind: LibraryKind, id: string) {
    const entry =
      kind === 'clauses'
        ? await this.prisma.clauseTemplate.findUnique({ where: { id } })
        : kind === 'indicateurs'
          ? await this.prisma.indicatorTemplate.findUnique({ where: { id } })
          : await this.prisma.riskTemplate.findUnique({ where: { id } });

    if (!entry) throw new NotFoundException('Élément de bibliothèque introuvable.');
    return entry;
  }
}
