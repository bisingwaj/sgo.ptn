import { ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthGuard } from '@nestjs/passport';
import { IS_PUBLIC_KEY } from '../decorators';

/**
 * Garde d'authentification appliquée globalement.
 *
 * L'authentification est le défaut : une route n'est ouverte que si elle
 * porte explicitement `@Public()`. Oublier de protéger une route devient
 * ainsi impossible — c'est l'oubli inverse, exposer volontairement, qui
 * demande un geste délibéré.
 */
@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  constructor(private readonly reflector: Reflector) {
    super();
  }

  canActivate(context: ExecutionContext) {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;
    return super.canActivate(context);
  }
}
