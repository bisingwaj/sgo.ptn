import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  Logger,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import {
  ALLOW_TEMP_PASSWORD_KEY,
  IS_PUBLIC_KEY,
  PERMISSIONS_KEY,
} from '../decorators';
import { messageHabilitation } from './habilitation-message';
import type { AuthenticatedUser } from '../types/authenticated-user';

/**
 * Contrôle d'accès par permission.
 *
 * Avec 21 sous-rôles pour la seule UGP, un contrôle par profil ne tient
 * pas : les interdits du MEP s'expriment au grain de la permission
 * (`ano:decide` réservé aux bailleurs, `tdr:author` jamais accordé à un
 * bailleur ni à un auditeur, `easHs:read` au seul Spécialiste VBG/EAS).
 *
 * Cette garde applique aussi le verrou du mot de passe temporaire : tant
 * qu'il n'est pas changé, seules les routes du parcours d'activation
 * répondent.
 */
@Injectable()
export class PermissionsGuard implements CanActivate {
  private readonly logger = new Logger(PermissionsGuard.name);

  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const request = context
      .switchToHttp()
      .getRequest<{ user?: AuthenticatedUser }>();
    const user = request.user;
    if (!user) throw new ForbiddenException('Contexte utilisateur absent.');

    // Verrou du mot de passe temporaire
    const allowTempPassword = this.reflector.getAllAndOverride<boolean>(
      ALLOW_TEMP_PASSWORD_KEY,
      [context.getHandler(), context.getClass()],
    );
    if (user.mustChangePassword && !allowTempPassword) {
      throw new ForbiddenException(
        'Mot de passe temporaire : vous devez définir un nouveau mot de passe avant de poursuivre.',
      );
    }

    const required = this.reflector.getAllAndOverride<string[]>(
      PERMISSIONS_KEY,
      [context.getHandler(), context.getClass()],
    );
    if (!required || required.length === 0) return true;

    const missing = required.filter(
      (permission) => !user.permissions.includes(permission),
    );
    if (missing.length > 0) {
      // Le code technique part au journal, où l'exploitant le cherchera ;
      // l'agent, lui, reçoit le nom du module et le détenteur du droit.
      this.logger.warn(
        `Refus d'habilitation — ${user.email} · manquantes : ${missing.join(', ')}`,
      );
      throw new ForbiddenException(messageHabilitation(missing));
    }

    return true;
  }
}
