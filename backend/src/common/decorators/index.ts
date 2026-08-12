import { createParamDecorator, SetMetadata, type ExecutionContext } from '@nestjs/common';
import type { AuthenticatedUser } from '../types/authenticated-user';

/** Route accessible sans authentification (connexion, santé, MGP public). */
export const IS_PUBLIC_KEY = 'ptn:isPublic';
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);

/**
 * Route accessible avec un mot de passe temporaire non encore changé.
 * Réservée aux points d'entrée du parcours d'activation : sans cela,
 * l'utilisateur serait enfermé dehors.
 */
export const ALLOW_TEMP_PASSWORD_KEY = 'ptn:allowTempPassword';
export const AllowTempPassword = () => SetMetadata(ALLOW_TEMP_PASSWORD_KEY, true);

/** Permissions exigées (conjonction : toutes requises). */
export const PERMISSIONS_KEY = 'ptn:permissions';
export const RequirePermissions = (...permissions: string[]) =>
  SetMetadata(PERMISSIONS_KEY, permissions);

/** Injecte l'utilisateur authentifié, ou l'un de ses champs. */
export const CurrentUser = createParamDecorator(
  (field: keyof AuthenticatedUser | undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest<{ user?: AuthenticatedUser }>();
    const user = request.user;
    if (!user) return undefined;
    return field ? user[field] : user;
  },
);
