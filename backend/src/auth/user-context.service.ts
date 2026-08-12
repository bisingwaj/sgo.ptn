import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import type { AuthenticatedUser } from '../common/types/authenticated-user';

/**
 * Résout le contexte complet d'une session à partir d'un utilisateur et
 * de son affectation active.
 *
 * Cette résolution est faite en base à chaque requête authentifiée, de
 * sorte qu'une suspension de compte ou une révocation d'habilitation
 * prenne effet immédiatement.
 */
@Injectable()
export class UserContextService {
  constructor(private readonly prisma: PrismaService) {}

  async resolve(userId: string, assignmentId: string): Promise<AuthenticatedUser> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        status: true,
        mustChangePassword: true,
        onboardingCompletedAt: true,
      },
    });

    if (!user) {
      throw new UnauthorizedException('Compte introuvable.');
    }
    // INVITE est un état de connexion légitime : c'est celui d'un compte
    // dont le mot de passe temporaire n'a pas encore été remplacé. Le
    // refuser ici enfermerait dehors toute personne venant d'être
    // habilitée. Le verrou effectif est porté par `PermissionsGuard`,
    // qui n'ouvre alors que les routes du parcours d'activation.
    if (user.status !== 'ACTIF' && user.status !== 'INVITE') {
      throw new UnauthorizedException(
        user.status === 'SUSPENDU'
          ? 'Compte suspendu. Contactez l’administrateur de la plateforme.'
          : user.status === 'EXPIRE'
            ? 'Mot de passe temporaire expiré. Demandez à l’administrateur d’en réémettre un.'
            : 'Compte archivé.',
      );
    }

    const assignment = await this.prisma.assignment.findUnique({
      where: { id: assignmentId },
      include: {
        subrole: { include: { permissions: true } },
        organisation: { select: { id: true, code: true, name: true } },
        permissions: true,
      },
    });

    if (!assignment || assignment.userId !== userId) {
      throw new UnauthorizedException('Affectation introuvable pour ce compte.');
    }
    if (assignment.status !== 'ACTIVE') {
      throw new UnauthorizedException('Affectation révoquée ou suspendue.');
    }

    // Bornage temporel — un auditeur externe conservant son accès après
    // la fin de son mandat est une non-conformité.
    const now = new Date();
    if (assignment.validFrom > now) {
      throw new UnauthorizedException('Affectation pas encore entrée en vigueur.');
    }
    if (assignment.validUntil && assignment.validUntil < now) {
      throw new UnauthorizedException('Affectation expirée.');
    }

    return {
      userId: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      mustChangePassword: user.mustChangePassword,
      onboardingCompleted: user.onboardingCompletedAt !== null,

      assignmentId: assignment.id,
      profile: assignment.profile,
      subroleCode: assignment.subrole.code,
      subroleLabel: assignment.subrole.label,
      organisationId: assignment.organisation.id,
      organisationCode: assignment.organisation.code,
      organisationName: assignment.organisation.name,
      componentCode: assignment.componentCode,
      provinceCode: assignment.provinceCode,

      permissions: UserContextService.effectivePermissions(assignment),
    };
  }

  /**
   * Permissions du sous-rôle, corrigées des ajustements propres à
   * l'affectation (`granted: false` retire, `true` ajoute).
   */
  private static effectivePermissions(assignment: {
    subrole: { permissions: Array<{ permissionCode: string }> };
    permissions: Array<{ permissionCode: string; granted: boolean }>;
  }): string[] {
    const effective = new Set(assignment.subrole.permissions.map((p) => p.permissionCode));
    for (const override of assignment.permissions) {
      if (override.granted) effective.add(override.permissionCode);
      else effective.delete(override.permissionCode);
    }
    return [...effective].sort();
  }
}
