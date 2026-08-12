import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { generateTemporaryPassword } from './password-generator';
import type { CreateAccountDto, ListAccountsQueryDto } from './dto/accounts.dto';
import type { AuthenticatedUser } from '../common/types/authenticated-user';
import type { RequestContext } from '../auth/auth.service';
import type { ComponentCode, Language, ProfileKey } from '../../generated/prisma/enums';

export interface Guardrail {
  code: string;
  message: string;
}

export interface GuardrailReport {
  /** Empêchent la création tant qu'ils ne sont pas levés */
  blockers: Guardrail[];
  /** N'empêchent pas, mais doivent être portés à la connaissance de l'admin */
  warnings: Guardrail[];
}

/** Domaine institutionnel attendu pour les comptes UGP. */
const UGP_EMAIL_DOMAIN = '@ptn-rdc.gov.cd';

@Injectable()
export class AccountsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    private readonly audit: AuditService,
  ) {}

  // ==========================================================
  // Garde-fous institutionnels
  // ==========================================================

  /**
   * Contrôle des règles du MEP avant création.
   *
   * Exposé comme point d'API à part entière pour que le formulaire
   * d'administration puisse afficher les conflits en temps réel, à
   * l'étape « Habilitations », plutôt qu'au moment de la soumission.
   *
   * `existingUserId` est renseigné lorsqu'on ajoute une affectation à un
   * compte déjà créé : les incompatibilités s'évaluent alors au regard
   * de ses affectations en cours.
   */
  async checkGuardrails(dto: CreateAccountDto, existingUserId?: string): Promise<GuardrailReport> {
    const blockers: Guardrail[] = [];
    const warnings: Guardrail[] = [];

    const email = dto.email.trim().toLowerCase();

    // --- Unicité de l'adresse ---
    if (!existingUserId) {
      const existing = await this.prisma.user.findUnique({
        where: { email },
        select: { id: true, firstName: true, lastName: true, status: true },
      });
      if (existing) {
        blockers.push({
          code: 'EMAIL_TAKEN',
          message: `Cette adresse est déjà associée au compte de ${existing.firstName} ${existing.lastName} (${existing.status.toLowerCase()}). Ajoutez-lui une affectation plutôt que de créer un second compte.`,
        });
      }
    }

    // --- Sous-rôle ---
    const subrole = await this.prisma.subrole.findUnique({ where: { code: dto.subroleCode } });
    if (!subrole) {
      blockers.push({ code: 'SUBROLE_UNKNOWN', message: `Sous-rôle inconnu : ${dto.subroleCode}.` });
      return { blockers, warnings };
    }
    if (subrole.profile !== dto.profile) {
      blockers.push({
        code: 'SUBROLE_PROFILE_MISMATCH',
        message: `Le sous-rôle « ${subrole.label} » relève du profil ${subrole.profile}, pas de ${dto.profile}.`,
      });
    }

    // --- Organisation ---
    const organisation = await this.prisma.organisation.findUnique({
      where: { id: dto.organisationId },
      select: { id: true, code: true, name: true, isActive: true },
    });
    if (!organisation) {
      blockers.push({ code: 'ORG_UNKNOWN', message: 'Organisation de rattachement introuvable.' });
    } else if (!organisation.isActive) {
      blockers.push({ code: 'ORG_INACTIVE', message: `L’organisation ${organisation.name} est inactive.` });
    }

    // --- Unicité du poste (MEP § 6.1) ---
    // Il y a un Coordonnateur, un RAF, un Auditeur Interne, un RPM.
    if (subrole.isUnique) {
      const holder = await this.prisma.assignment.findFirst({
        where: {
          subroleId: subrole.id,
          status: 'ACTIVE',
          ...(existingUserId ? { userId: { not: existingUserId } } : {}),
        },
        include: { user: { select: { firstName: true, lastName: true, email: true } } },
      });
      if (holder) {
        blockers.push({
          code: 'SUBROLE_ALREADY_HELD',
          message: `Le poste « ${subrole.label} » est déjà occupé par ${holder.user.firstName} ${holder.user.lastName} (${holder.user.email}). Révoquez d’abord son habilitation.`,
        });
      }
    }

    // --- Séparation des tâches (MEP § 5.1 et § 6.3) ---
    if (existingUserId && subrole.incompatibleWith.length > 0) {
      const conflicts = await this.prisma.assignment.findMany({
        where: {
          userId: existingUserId,
          status: 'ACTIVE',
          subrole: { code: { in: subrole.incompatibleWith } },
        },
        include: { subrole: { select: { label: true, code: true } } },
      });
      for (const conflict of conflicts) {
        blockers.push({
          code: 'SEPARATION_OF_DUTIES',
          message: `Cumul interdit : « ${subrole.label} » est incompatible avec « ${conflict.subrole.label} », déjà détenu par cette personne. La séparation des fonctions d’ordonnancement, de comptabilité et de caisse est une exigence fiduciaire.`,
        });
      }
    }

    // --- Habilitation sensible ---
    if (subrole.isSensitive && !dto.justification?.trim()) {
      blockers.push({
        code: 'JUSTIFICATION_REQUIRED',
        message: `« ${subrole.label} » est une habilitation sensible. Une justification écrite est obligatoire.`,
      });
    }
    if (subrole.code === 'UGP_SPE_VBG_EAS') {
      warnings.push({
        code: 'EAS_HS_CHANNEL',
        message:
          'Cette habilitation ouvre le canal confidentiel MGP-EAS/HS, qui contient des dossiers de survivantes de violences sexuelles. Elle doit être contresignée par le Coordonnateur et fait l’objet d’une entrée dédiée dans la piste d’audit.',
      });
    }

    // --- Périmètre obligatoire ---
    if (subrole.requiresComponent && !dto.componentCode) {
      blockers.push({
        code: 'COMPONENT_REQUIRED',
        message: `« ${subrole.label} » doit être rattaché à une composante du projet.`,
      });
    }

    // --- Mission bornée ---
    if (subrole.requiresMission) {
      if (!dto.missionRef?.trim()) {
        blockers.push({
          code: 'MISSION_REQUIRED',
          message: `« ${subrole.label} » exige une référence de mission (ex. AUD-EXT-2026-T1).`,
        });
      }
      if (!dto.validUntil) {
        blockers.push({
          code: 'VALID_UNTIL_REQUIRED',
          message:
            'Une date de fin d’habilitation est obligatoire pour les profils de contrôle : l’accès doit expirer avec la mission.',
        });
      }
    }

    if (dto.validUntil && new Date(dto.validUntil) <= new Date()) {
      blockers.push({
        code: 'VALID_UNTIL_PAST',
        message: 'La date de fin d’habilitation doit être postérieure à aujourd’hui.',
      });
    }

    // --- Domaine institutionnel ---
    if (dto.profile === 'UGP' && !email.endsWith(UGP_EMAIL_DOMAIN)) {
      warnings.push({
        code: 'EMAIL_DOMAIN',
        message: `Les comptes UGP utilisent normalement une adresse en ${UGP_EMAIL_DOMAIN}. Vérifiez qu’une adresse personnelle est bien voulue ici.`,
      });
    }

    // --- Lecture seule ---
    if (dto.profile === 'AUDITEUR') {
      warnings.push({
        code: 'READ_ONLY_PROFILE',
        message:
          'Profil de contrôle : ce compte n’aura aucun droit d’écriture hors consignation de constatations.',
      });
    }

    return { blockers, warnings };
  }

  // ==========================================================
  // Création
  // ==========================================================

  async create(dto: CreateAccountDto, actor: AuthenticatedUser, ctx: RequestContext) {
    const report = await this.checkGuardrails(dto);
    if (report.blockers.length > 0) {
      throw new ConflictException({
        message: 'La création est bloquée par des règles institutionnelles.',
        blockers: report.blockers,
        warnings: report.warnings,
      });
    }

    const email = dto.email.trim().toLowerCase();
    const subrole = await this.prisma.subrole.findUniqueOrThrow({ where: { code: dto.subroleCode } });

    const temporaryPassword = generateTemporaryPassword();
    const rounds = Number(this.config.get('BCRYPT_ROUNDS') ?? 12);
    const ttlHours = Number(this.config.get('TEMP_PASSWORD_TTL_HOURS') ?? 72);

    const created = await this.prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          email,
          firstName: dto.firstName.trim(),
          lastName: dto.lastName.trim(),
          phone: dto.phone?.trim() || null,
          preferredLanguage: (dto.preferredLanguage ?? 'FR') as Language,
          passwordHash: await bcrypt.hash(temporaryPassword, rounds),
          status: 'INVITE',
          mustChangePassword: true,
          tempPasswordExpiresAt: new Date(Date.now() + ttlHours * 3_600_000),
          createdById: actor.userId,
        },
      });

      const assignment = await tx.assignment.create({
        data: {
          userId: user.id,
          organisationId: dto.organisationId,
          profile: dto.profile as ProfileKey,
          subroleId: subrole.id,
          isPrimary: dto.isPrimary ?? true,
          componentCode: (dto.componentCode ?? null) as ComponentCode | null,
          provinceCode: dto.provinceCode ?? null,
          missionRef: dto.missionRef?.trim() || null,
          validUntil: dto.validUntil ? new Date(dto.validUntil) : null,
          justification: dto.justification?.trim() || null,
          grantedById: actor.userId,
          status: 'ACTIVE',
        },
      });

      return { user, assignment };
    });

    await this.audit.record({
      actorId: actor.userId,
      actorEmail: actor.email,
      action: 'account.created',
      entityType: 'User',
      entityId: created.user.id,
      payload: {
        email,
        profile: dto.profile,
        subrole: subrole.code,
        organisationId: dto.organisationId,
        missionRef: dto.missionRef ?? null,
        validUntil: dto.validUntil ?? null,
      },
      ...ctx,
    });

    // Les habilitations sensibles laissent une trace distincte, isolable
    // lors d'une revue d'accès.
    if (subrole.isSensitive) {
      await this.audit.record({
        actorId: actor.userId,
        actorEmail: actor.email,
        action: 'assignment.granted.sensitive',
        entityType: 'Assignment',
        entityId: created.assignment.id,
        payload: {
          subrole: subrole.code,
          beneficiary: email,
          justification: dto.justification ?? null,
        },
        ...ctx,
      });
    }

    return {
      user: {
        id: created.user.id,
        email: created.user.email,
        firstName: created.user.firstName,
        lastName: created.user.lastName,
        status: created.user.status,
      },
      assignment: { id: created.assignment.id, subroleCode: subrole.code, subroleLabel: subrole.label },
      /**
       * Affiché une seule fois à l'administrateur, jamais restitué
       * ensuite : seul son haché est conservé. À transmettre de vive voix
       * ou par un canal sûr.
       */
      temporaryPassword,
      temporaryPasswordExpiresAt: created.user.tempPasswordExpiresAt,
      warnings: report.warnings,
    };
  }

  // ==========================================================
  // Consultation
  // ==========================================================

  async list(query: ListAccountsQueryDto) {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 25;
    const search = query.search?.trim();

    const where = {
      ...(query.status ? { status: query.status } : {}),
      ...(query.profile ? { assignments: { some: { profile: query.profile } } } : {}),
      ...(search
        ? {
            OR: [
              { firstName: { contains: search, mode: 'insensitive' as const } },
              { lastName: { contains: search, mode: 'insensitive' as const } },
              { email: { contains: search, mode: 'insensitive' as const } },
            ],
          }
        : {}),
    };

    const [total, items] = await Promise.all([
      this.prisma.user.count({ where }),
      this.prisma.user.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          status: true,
          lastLoginAt: true,
          createdAt: true,
          mustChangePassword: true,
          assignments: {
            where: { status: 'ACTIVE' },
            select: {
              id: true,
              profile: true,
              isPrimary: true,
              validUntil: true,
              missionRef: true,
              subrole: { select: { code: true, label: true, isSensitive: true } },
              organisation: { select: { code: true, name: true } },
            },
          },
        },
      }),
    ]);

    return { total, page, pageSize, items };
  }

  async findOne(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        phone: true,
        preferredLanguage: true,
        status: true,
        mustChangePassword: true,
        tempPasswordExpiresAt: true,
        lastLoginAt: true,
        codeOfConductSignedAt: true,
        coiDeclaredAt: true,
        onboardingCompletedAt: true,
        createdAt: true,
        createdBy: { select: { firstName: true, lastName: true, email: true } },
        assignments: {
          orderBy: { createdAt: 'desc' },
          select: {
            id: true,
            profile: true,
            status: true,
            isPrimary: true,
            componentCode: true,
            provinceCode: true,
            missionRef: true,
            validFrom: true,
            validUntil: true,
            justification: true,
            createdAt: true,
            revokedAt: true,
            revokeReason: true,
            subrole: { select: { code: true, label: true, isSensitive: true, isUnique: true } },
            organisation: { select: { code: true, name: true, fullName: true } },
            grantedBy: { select: { firstName: true, lastName: true, email: true } },
          },
        },
      },
    });

    if (!user) throw new NotFoundException('Compte introuvable.');
    return user;
  }

  // ==========================================================
  // Cycle de vie — jamais de suppression physique
  // ==========================================================

  async suspend(id: string, reason: string, actor: AuthenticatedUser, ctx: RequestContext) {
    const user = await this.prisma.user.findUnique({ where: { id }, select: { id: true, email: true, status: true } });
    if (!user) throw new NotFoundException('Compte introuvable.');
    if (user.id === actor.userId) {
      throw new BadRequestException('Vous ne pouvez pas suspendre votre propre compte.');
    }

    await this.prisma.$transaction([
      this.prisma.user.update({ where: { id }, data: { status: 'SUSPENDU' } }),
      this.prisma.refreshToken.updateMany({
        where: { userId: id, revokedAt: null },
        data: { revokedAt: new Date() },
      }),
    ]);

    await this.audit.record({
      actorId: actor.userId,
      actorEmail: actor.email,
      action: 'account.suspended',
      entityType: 'User',
      entityId: id,
      payload: { email: user.email, reason },
      ...ctx,
    });

    return { id, status: 'SUSPENDU' as const };
  }

  async reactivate(id: string, actor: AuthenticatedUser, ctx: RequestContext) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: { id: true, email: true, status: true, passwordHash: true },
    });
    if (!user) throw new NotFoundException('Compte introuvable.');
    if (user.status !== 'SUSPENDU') {
      throw new BadRequestException('Seul un compte suspendu peut être réactivé.');
    }

    await this.prisma.user.update({
      where: { id },
      data: { status: 'ACTIF', failedLoginAttempts: 0, lockedUntil: null },
    });

    await this.audit.record({
      actorId: actor.userId,
      actorEmail: actor.email,
      action: 'account.reactivated',
      entityType: 'User',
      entityId: id,
      payload: { email: user.email },
      ...ctx,
    });

    return { id, status: 'ACTIF' as const };
  }

  /** Réémet un mot de passe temporaire — invitation expirée, oubli, compromission. */
  async resetTemporaryPassword(id: string, actor: AuthenticatedUser, ctx: RequestContext) {
    const user = await this.prisma.user.findUnique({ where: { id }, select: { id: true, email: true, status: true } });
    if (!user) throw new NotFoundException('Compte introuvable.');
    if (user.status === 'ARCHIVE') {
      throw new BadRequestException('Compte archivé : réémission impossible.');
    }

    const temporaryPassword = generateTemporaryPassword();
    const rounds = Number(this.config.get('BCRYPT_ROUNDS') ?? 12);
    const ttlHours = Number(this.config.get('TEMP_PASSWORD_TTL_HOURS') ?? 72);

    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id },
        data: {
          passwordHash: await bcrypt.hash(temporaryPassword, rounds),
          mustChangePassword: true,
          tempPasswordExpiresAt: new Date(Date.now() + ttlHours * 3_600_000),
          status: 'INVITE',
          failedLoginAttempts: 0,
          lockedUntil: null,
        },
      }),
      this.prisma.refreshToken.updateMany({
        where: { userId: id, revokedAt: null },
        data: { revokedAt: new Date() },
      }),
    ]);

    await this.audit.record({
      actorId: actor.userId,
      actorEmail: actor.email,
      action: 'account.temp_password_reissued',
      entityType: 'User',
      entityId: id,
      payload: { email: user.email },
      ...ctx,
    });

    return { temporaryPassword, expiresInHours: ttlHours };
  }

  async archive(id: string, reason: string, actor: AuthenticatedUser, ctx: RequestContext) {
    const user = await this.prisma.user.findUnique({ where: { id }, select: { id: true, email: true } });
    if (!user) throw new NotFoundException('Compte introuvable.');
    if (user.id === actor.userId) {
      throw new BadRequestException('Vous ne pouvez pas archiver votre propre compte.');
    }

    // Archivage, jamais suppression : il faut pouvoir répondre à
    // « qui avait accès à quoi, et quand » plusieurs années après.
    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id },
        data: { status: 'ARCHIVE', archivedAt: new Date() },
      }),
      this.prisma.assignment.updateMany({
        where: { userId: id, status: 'ACTIVE' },
        data: { status: 'REVOKED', revokedAt: new Date(), revokeReason: reason },
      }),
      this.prisma.refreshToken.updateMany({
        where: { userId: id, revokedAt: null },
        data: { revokedAt: new Date() },
      }),
    ]);

    await this.audit.record({
      actorId: actor.userId,
      actorEmail: actor.email,
      action: 'account.archived',
      entityType: 'User',
      entityId: id,
      payload: { email: user.email, reason },
      ...ctx,
    });

    return { id, status: 'ARCHIVE' as const };
  }

  /**
   * Comptes dormants — support de la revue périodique des habilitations,
   * demande classique d'un audit externe et de la Banque mondiale.
   */
  async dormantAccounts(days = 90) {
    const threshold = new Date(Date.now() - days * 86_400_000);
    return this.prisma.user.findMany({
      where: {
        status: { in: ['ACTIF', 'INVITE'] },
        OR: [{ lastLoginAt: null, createdAt: { lt: threshold } }, { lastLoginAt: { lt: threshold } }],
      },
      orderBy: { lastLoginAt: 'asc' },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        status: true,
        lastLoginAt: true,
        createdAt: true,
        assignments: {
          where: { status: 'ACTIVE' },
          select: { subrole: { select: { label: true, isSensitive: true } } },
        },
      },
    });
  }
}
