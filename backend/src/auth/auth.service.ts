import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService, type JwtSignOptions } from '@nestjs/jwt';
import { createHash, randomUUID } from 'node:crypto';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { UserContextService } from './user-context.service';
import {
  familyLabel,
  familyOfProfile,
  profilesOfFamily,
} from '../referentiel/families';
import type { ProfileFamily } from '../../generated/prisma/enums';
import type {
  AccessTokenPayload,
  AuthenticatedUser,
  RefreshTokenPayload,
} from '../common/types/authenticated-user';

export interface RequestContext {
  ipAddress?: string;
  userAgent?: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: string;
}

export interface LoginResult extends AuthTokens {
  user: AuthenticatedUser;
  /** Autres affectations disponibles pour bascule de contexte */
  availableAssignments: Array<{
    id: string;
    profile: string;
    subroleLabel: string;
    organisationName: string;
    isPrimary: boolean;
  }>;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
    private readonly audit: AuditService,
    private readonly userContext: UserContextService,
  ) {}

  // ==========================================================
  // Connexion
  // ==========================================================

  async login(
    email: string,
    password: string,
    ctx: RequestContext,
    family?: ProfileFamily,
  ): Promise<LoginResult> {
    const normalized = email.trim().toLowerCase();

    const user = await this.prisma.user.findUnique({
      where: { email: normalized },
      select: {
        id: true,
        email: true,
        passwordHash: true,
        status: true,
        failedLoginAttempts: true,
        lockedUntil: true,
      },
    });

    // Message uniforme : ne jamais révéler si l'adresse existe.
    const invalid = () => new UnauthorizedException('Identifiants invalides.');

    if (!user || !user.passwordHash) {
      await this.audit.record({
        actorEmail: normalized,
        action: 'auth.login.failed',
        payload: { reason: 'unknown_account' },
        ...ctx,
      });
      throw invalid();
    }

    // LE MOT DE PASSE SE VÉRIFIE AVANT TOUT DIAGNOSTIC DE COMPTE.
    //
    // Ces contrôles précédaient la comparaison, et c'était une fuite : qui
    // soumettait une adresse avec un mot de passe quelconque lisait
    // « Compte suspendu » là où une adresse inconnue rendait « Identifiants
    // invalides ». Il suffisait de comparer les deux réponses pour énumérer
    // les comptes de la plateforme, verrouillage compris — lequel se
    // provoque en trois essais.
    //
    // La comparaison bcrypt s'exécute donc toujours, même sur un compte
    // suspendu : son coût est aussi ce qui égalise le temps de réponse.
    const passwordMatches = await bcrypt.compare(password, user.passwordHash);
    if (!passwordMatches) {
      await this.registerFailedAttempt(
        user.id,
        user.failedLoginAttempts,
        normalized,
        ctx,
      );
      throw invalid();
    }

    // À partir d'ici, l'appelant a prouvé qu'il détient le mot de passe :
    // lui dire pourquoi son compte ne s'ouvre pas ne renseigne plus un
    // tiers, et lui évite d'appeler l'administrateur pour rien.
    if (user.lockedUntil && user.lockedUntil > new Date()) {
      throw new ForbiddenException(
        `Compte temporairement verrouillé après plusieurs échecs. Réessayez après ${user.lockedUntil.toLocaleTimeString('fr-FR')}.`,
      );
    }

    if (user.status === 'ARCHIVE' || user.status === 'EXPIRE') {
      throw new ForbiddenException(
        'Ce compte n’est plus actif. Contactez l’administrateur.',
      );
    }
    if (user.status === 'SUSPENDU') {
      throw new ForbiddenException(
        'Compte suspendu. Contactez l’administrateur de la plateforme.',
      );
    }

    // Un compte INVITE dont le mot de passe temporaire a expiré ne peut
    // plus être activé : l'administrateur doit en réémettre un.
    const invite = await this.prisma.user.findUniqueOrThrow({
      where: { id: user.id },
      select: { status: true, tempPasswordExpiresAt: true },
    });
    if (
      invite.status === 'INVITE' &&
      invite.tempPasswordExpiresAt &&
      invite.tempPasswordExpiresAt < new Date()
    ) {
      await this.prisma.user.update({
        where: { id: user.id },
        data: { status: 'EXPIRE' },
      });
      throw new ForbiddenException(
        'Mot de passe temporaire expiré. Demandez à l’administrateur d’en réémettre un.',
      );
    }

    const assignment = await this.resolvePrimaryAssignment(user.id, family);

    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        failedLoginAttempts: 0,
        lockedUntil: null,
        lastLoginAt: new Date(),
      },
    });

    const context = await this.userContext.resolve(user.id, assignment.id);
    const tokens = await this.issueTokens(
      user.id,
      assignment.id,
      user.email,
      ctx,
    );

    await this.audit.record({
      actorId: user.id,
      actorEmail: user.email,
      action: 'auth.login',
      entityType: 'User',
      entityId: user.id,
      payload: {
        subrole: context.subroleCode,
        organisation: context.organisationCode,
      },
      ...ctx,
    });

    return {
      ...tokens,
      user: context,
      availableAssignments: await this.listAssignments(user.id),
    };
  }

  private async registerFailedAttempt(
    userId: string,
    current: number,
    email: string,
    ctx: RequestContext,
  ): Promise<void> {
    const max = Number(this.config.get('MAX_LOGIN_ATTEMPTS') ?? 5);
    const lockoutMinutes = Number(this.config.get('LOCKOUT_MINUTES') ?? 15);
    const attempts = current + 1;

    await this.prisma.user.update({
      where: { id: userId },
      data: {
        failedLoginAttempts: attempts,
        lockedUntil:
          attempts >= max
            ? new Date(Date.now() + lockoutMinutes * 60_000)
            : null,
      },
    });

    await this.audit.record({
      actorId: userId,
      actorEmail: email,
      action: attempts >= max ? 'auth.login.locked' : 'auth.login.failed',
      payload: { attempts },
      ...ctx,
    });
  }

  /**
   * Choisit l'habilitation à activer.
   *
   * La famille sélectionnée à la connexion n'est pas décorative : elle
   * détermine sous quelle casquette la personne entre. Une même personne
   * peut être cadre UGP et membre du CTP, ou partenaire et membre de
   * gouvernance — la famille lève l'ambiguïté.
   */
  private async resolvePrimaryAssignment(
    userId: string,
    family?: ProfileFamily,
  ) {
    const now = new Date();
    const assignments = await this.prisma.assignment.findMany({
      where: {
        userId,
        status: 'ACTIVE',
        validFrom: { lte: now },
        OR: [{ validUntil: null }, { validUntil: { gte: now } }],
      },
      orderBy: [{ isPrimary: 'desc' }, { createdAt: 'asc' }],
    });

    if (assignments.length === 0) {
      throw new ForbiddenException(
        'Aucune habilitation active n’est associée à ce compte. Contactez l’administrateur.',
      );
    }

    if (!family) return assignments[0];

    const eligible = profilesOfFamily(family);
    const match = assignments.find((a) => eligible.includes(a.profile));
    if (match) return match;

    // Le mot de passe a déjà été vérifié : nommer les familles réellement
    // détenues aide la personne sans rien révéler à un tiers.
    const held = [
      ...new Set(assignments.map((a) => familyOfProfile(a.profile))),
    ]
      .filter((f): f is ProfileFamily => Boolean(f))
      .map((f) => `« ${familyLabel(f)} »`)
      .join(', ');

    throw new ForbiddenException(
      `Ce compte ne détient aucune habilitation dans la famille « ${familyLabel(family)} ». Il relève de ${held}.`,
    );
  }

  async listAssignments(
    userId: string,
  ): Promise<LoginResult['availableAssignments']> {
    const now = new Date();
    const assignments = await this.prisma.assignment.findMany({
      where: {
        userId,
        status: 'ACTIVE',
        validFrom: { lte: now },
        OR: [{ validUntil: null }, { validUntil: { gte: now } }],
      },
      include: {
        subrole: { select: { label: true } },
        organisation: { select: { name: true } },
      },
      orderBy: [{ isPrimary: 'desc' }, { createdAt: 'asc' }],
    });

    return assignments.map((a) => ({
      id: a.id,
      profile: a.profile,
      subroleLabel: a.subrole.label,
      organisationName: a.organisation.name,
      isPrimary: a.isPrimary,
    }));
  }

  // ==========================================================
  // Jetons
  // ==========================================================

  private static hashToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }

  /**
   * @param replacesTokenId Jeton écarté par cette émission. Renseigné lors
   *   d'un rafraîchissement : le lien `replacedById` distingue ensuite une
   *   rotation d'une révocation par déconnexion.
   */
  private async issueTokens(
    userId: string,
    assignmentId: string,
    email: string,
    ctx: RequestContext,
    replacesTokenId?: string,
  ): Promise<AuthTokens> {
    const accessExpiration =
      this.config.get<string>('JWT_ACCESS_EXPIRATION') ?? '15m';

    // La durée du jeton de rafraîchissement EST le délai d'inactivité :
    // il n'est renouvelé qu'à l'occasion d'une action de la personne, donc
    // une session sans activité s'éteint d'elle-même. L'application est
    // ainsi côté serveur — un minuteur seulement côté navigateur pourrait
    // être contourné en gardant le jeton.
    const refreshExpiration =
      this.config.get<string>('SESSION_IDLE_TIMEOUT') ??
      this.config.get<string>('JWT_REFRESH_EXPIRATION') ??
      '30m';

    const accessPayload: AccessTokenPayload = {
      sub: userId,
      email,
      aid: assignmentId,
    };
    const accessToken = await this.jwt.signAsync(accessPayload, {
      secret: this.config.getOrThrow<string>('JWT_ACCESS_SECRET'),
      expiresIn: accessExpiration as JwtSignOptions['expiresIn'],
    });

    const jti = randomUUID();
    const refreshPayload: RefreshTokenPayload = { sub: userId, jti };
    const refreshToken = await this.jwt.signAsync(refreshPayload, {
      secret: this.config.getOrThrow<string>('JWT_REFRESH_SECRET'),
      expiresIn: refreshExpiration as JwtSignOptions['expiresIn'],
    });

    await this.prisma.refreshToken.create({
      data: {
        id: jti,
        userId,
        tokenHash: AuthService.hashToken(refreshToken),
        activeAssignmentId: assignmentId,
        expiresAt: new Date(
          Date.now() + AuthService.durationToMs(refreshExpiration),
        ),
        userAgent: ctx.userAgent ?? null,
        ipAddress: ctx.ipAddress ?? null,
      },
    });

    // Rotation : l'ancien jeton est révoqué et pointe vers son successeur.
    if (replacesTokenId) {
      await this.prisma.refreshToken.update({
        where: { id: replacesTokenId },
        data: { revokedAt: new Date(), replacedById: jti },
      });
    }

    return { accessToken, refreshToken, expiresIn: accessExpiration };
  }

  private static durationToMs(duration: string): number {
    const match = /^(\d+)([smhd])$/.exec(duration);
    if (!match) return 7 * 24 * 60 * 60 * 1000;
    const value = Number(match[1]);
    const unit = match[2];
    const factor =
      { s: 1_000, m: 60_000, h: 3_600_000, d: 86_400_000 }[unit] ?? 86_400_000;
    return value * factor;
  }

  /**
   * Rotation du jeton de rafraîchissement.
   *
   * Un jeton déjà révoqué qui se présente à nouveau signale un vol de
   * session : toutes les sessions de l'utilisateur sont alors coupées.
   *
   * Exception : une rotation interrompue en vol (voir le délai de grâce
   * ci-dessous), qui produit exactement la même apparence sans être une
   * attaque.
   */
  async refresh(token: string, ctx: RequestContext): Promise<AuthTokens> {
    let payload: RefreshTokenPayload;
    try {
      payload = await this.jwt.verifyAsync<RefreshTokenPayload>(token, {
        secret: this.config.getOrThrow<string>('JWT_REFRESH_SECRET'),
      });
    } catch {
      throw new UnauthorizedException(
        'Jeton de rafraîchissement invalide ou expiré.',
      );
    }

    const stored = await this.prisma.refreshToken.findUnique({
      where: { id: payload.jti },
    });
    if (!stored || stored.tokenHash !== AuthService.hashToken(token)) {
      throw new UnauthorizedException('Jeton de rafraîchissement inconnu.');
    }

    if (stored.revokedAt) {
      // Un jeton écarté par ROTATION qui se représente signale un vol :
      // le client légitime a reçu son successeur, donc quiconque présente
      // l'ancien en a gardé copie. On coupe toutes les sessions.
      if (stored.replacedById) {
        // ----------------------------------------------------------------
        // DÉLAI DE GRÂCE — rotation interrompue plutôt que vol de session
        //
        // La rotation n'est pas atomique du point de vue du navigateur :
        // le serveur crée le successeur ET révoque l'ancien jeton, puis
        // renvoie le nouveau. Si l'onglet se ferme, navigue ou se recharge
        // pendant cet aller-retour, la réponse est perdue alors que
        // l'ancien jeton est déjà consommé. Au chargement suivant, le
        // client présente donc de bonne foi un jeton « déjà remplacé ».
        //
        // Sans distinction, ce cas était traité comme un vol : TOUTES les
        // sessions de la personne étaient coupées. Une connexion lente ou
        // un clic pendant le chargement suffisait à déconnecter partout.
        //
        // Le critère qui sépare les deux situations n'est pas le délai
        // seul, mais l'état du SUCCESSEUR :
        //
        //   · successeur jamais utilisé  → le client légitime ne l'a jamais
        //     reçu : la rotation a bien été interrompue. On rejoue depuis
        //     le successeur et la session se poursuit.
        //
        //   · successeur déjà utilisé    → le client légitime l'a bien reçu
        //     et s'en est servi. Quiconque présente encore le parent en a
        //     gardé copie : c'est un vol, et on coupe tout.
        //
        // Le délai ne fait que borner la fenêtre pendant laquelle cette
        // indulgence s'applique. Conforme à la pratique recommandée pour la
        // rotation des jetons (OAuth 2.0 Security BCP, § 4.14.2).
        // ----------------------------------------------------------------
        const graceMs = AuthService.durationToMs(
          this.config.get<string>('REFRESH_ROTATION_GRACE') ?? '60s',
        );
        const rotatedAgo = stored.revokedAt
          ? Date.now() - stored.revokedAt.getTime()
          : Infinity;

        if (rotatedAgo <= graceMs) {
          const successor = await this.prisma.refreshToken.findUnique({
            where: { id: stored.replacedById },
          });

          const successorUntouched =
            successor &&
            !successor.revokedAt &&
            successor.expiresAt > new Date();

          if (successorUntouched) {
            const owner = await this.prisma.user.findUniqueOrThrow({
              where: { id: successor.userId },
              select: { email: true, status: true },
            });
            if (owner.status !== 'ACTIF' && owner.status !== 'INVITE') {
              throw new ForbiddenException('Compte inactif.');
            }

            const assignmentId =
              successor.activeAssignmentId ??
              (await this.resolvePrimaryAssignment(successor.userId)).id;

            // Tracé sans être traité comme incident : une fréquence
            // anormale de ces rejeux mérite un regard, une occurrence non.
            await this.audit.record({
              actorId: successor.userId,
              action: 'auth.refresh.grace_replay',
              payload: {
                tokenId: stored.id,
                successorId: successor.id,
                rotatedAgoMs: rotatedAgo,
              },
              ...ctx,
            });

            return this.issueTokens(
              successor.userId,
              assignmentId,
              owner.email,
              ctx,
              successor.id,
            );
          }
        }

        await this.revokeAllSessions(stored.userId);
        await this.audit.record({
          actorId: stored.userId,
          action: 'auth.refresh.reuse_detected',
          payload: {
            tokenId: stored.id,
            replacedBy: stored.replacedById,
            rotatedAgoMs: rotatedAgo,
          },
          ...ctx,
        });
        throw new UnauthorizedException(
          'Jeton déjà utilisé. Toutes les sessions ont été closes par précaution.',
        );
      }

      // Révoqué par une déconnexion ou une suspension : simplement périmé.
      // Couper les autres sessions de la personne serait disproportionné —
      // un onglet resté ouvert suffirait à la déconnecter partout.
      throw new UnauthorizedException('Session close. Reconnectez-vous.');
    }

    if (stored.expiresAt < new Date()) {
      throw new UnauthorizedException('Jeton de rafraîchissement expiré.');
    }

    const user = await this.prisma.user.findUniqueOrThrow({
      where: { id: stored.userId },
      select: { email: true, status: true },
    });
    if (user.status !== 'ACTIF' && user.status !== 'INVITE') {
      throw new ForbiddenException('Compte inactif.');
    }

    const assignmentId =
      stored.activeAssignmentId ??
      (await this.resolvePrimaryAssignment(stored.userId)).id;

    // La rotation révoque l'ancien jeton et l'enchaîne au nouveau.
    return this.issueTokens(
      stored.userId,
      assignmentId,
      user.email,
      ctx,
      stored.id,
    );
  }

  async logout(
    token: string,
    userId: string,
    ctx: RequestContext,
  ): Promise<void> {
    const hash = AuthService.hashToken(token);
    await this.prisma.refreshToken.updateMany({
      where: { userId, tokenHash: hash, revokedAt: null },
      data: { revokedAt: new Date() },
    });
    await this.audit.record({ actorId: userId, action: 'auth.logout', ...ctx });
  }

  async revokeAllSessions(userId: string): Promise<void> {
    await this.prisma.refreshToken.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  // ==========================================================
  // Mot de passe
  // ==========================================================

  async changePassword(
    userId: string,
    currentPassword: string,
    newPassword: string,
    ctx: RequestContext,
  ): Promise<void> {
    const user = await this.prisma.user.findUniqueOrThrow({
      where: { id: userId },
      select: { id: true, email: true, passwordHash: true, status: true },
    });

    if (
      !user.passwordHash ||
      !(await bcrypt.compare(currentPassword, user.passwordHash))
    ) {
      throw new UnauthorizedException('Mot de passe actuel incorrect.');
    }
    if (await bcrypt.compare(newPassword, user.passwordHash)) {
      throw new BadRequestException(
        'Le nouveau mot de passe doit différer de l’actuel.',
      );
    }

    const rounds = Number(this.config.get('BCRYPT_ROUNDS') ?? 12);
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        passwordHash: await bcrypt.hash(newPassword, rounds),
        mustChangePassword: false,
        tempPasswordExpiresAt: null,
        // Le premier changement de mot de passe consomme l'invitation.
        status: user.status === 'INVITE' ? 'ACTIF' : user.status,
      },
    });

    // Changer de mot de passe clôt les autres sessions.
    await this.revokeAllSessions(userId);

    await this.audit.record({
      actorId: userId,
      actorEmail: user.email,
      action: 'auth.password.changed',
      entityType: 'User',
      entityId: userId,
      ...ctx,
    });
  }

  // ==========================================================
  // Prise de fonction
  // ==========================================================

  /**
   * Consigne les engagements signés par la personne elle-même.
   *
   * Chaque signature est horodatée séparément : un contrôleur doit pouvoir
   * établir qu'une déclaration de conflit d'intérêts était en vigueur à la
   * date où l'intéressé a siégé en commission.
   */
  async signEngagements(userId: string, ctx: RequestContext) {
    const user = await this.prisma.user.findUniqueOrThrow({
      where: { id: userId },
      select: {
        email: true,
        firstName: true,
        lastName: true,
        codeOfConductSignedAt: true,
        coiDeclaredAt: true,
        dataPrivacyAckAt: true,
      },
    });

    const now = new Date();
    const updated = await this.prisma.user.update({
      where: { id: userId },
      data: {
        // Une signature déjà posée n'est pas réécrite : sa date fait foi.
        codeOfConductSignedAt: user.codeOfConductSignedAt ?? now,
        coiDeclaredAt: user.coiDeclaredAt ?? now,
        dataPrivacyAckAt: user.dataPrivacyAckAt ?? now,
        onboardingCompletedAt: now,
      },
      select: {
        codeOfConductSignedAt: true,
        coiDeclaredAt: true,
        dataPrivacyAckAt: true,
        onboardingCompletedAt: true,
      },
    });

    await this.audit.record({
      actorId: userId,
      actorEmail: user.email,
      action: 'engagements.signed',
      entityType: 'User',
      entityId: userId,
      payload: {
        signataire: `${user.firstName} ${user.lastName}`,
        codeOfConduct: updated.codeOfConductSignedAt,
        coi: updated.coiDeclaredAt,
        dataPrivacy: updated.dataPrivacyAckAt,
      },
      ...ctx,
    });

    return updated;
  }

  /** Préférences personnelles — hors périmètre de l'habilitation. */
  async updatePreferences(
    userId: string,
    data: { phone?: string; preferredLanguage?: string },
    ctx: RequestContext,
  ) {
    const updated = await this.prisma.user.update({
      where: { id: userId },
      data: {
        ...(data.phone !== undefined
          ? { phone: data.phone.trim() || null }
          : {}),
        ...(data.preferredLanguage
          ? {
              preferredLanguage: data.preferredLanguage as
                'FR' | 'EN' | 'LN' | 'SW' | 'TS' | 'KK',
            }
          : {}),
      },
      select: { phone: true, preferredLanguage: true },
    });

    await this.audit.record({
      actorId: userId,
      action: 'preferences.updated',
      entityType: 'User',
      entityId: userId,
      payload: { ...data },
      ...ctx,
    });

    return updated;
  }

  // ==========================================================
  // Bascule de contexte (multi-affectation)
  // ==========================================================

  async switchAssignment(
    userId: string,
    assignmentId: string,
    ctx: RequestContext,
  ): Promise<LoginResult> {
    const context = await this.userContext.resolve(userId, assignmentId);
    const tokens = await this.issueTokens(
      userId,
      assignmentId,
      context.email,
      ctx,
    );

    await this.audit.record({
      actorId: userId,
      actorEmail: context.email,
      action: 'auth.assignment.switched',
      entityType: 'Assignment',
      entityId: assignmentId,
      payload: {
        subrole: context.subroleCode,
        organisation: context.organisationCode,
      },
      ...ctx,
    });

    return {
      ...tokens,
      user: context,
      availableAssignments: await this.listAssignments(userId),
    };
  }
}
