import type { ProfileKey } from '../../../generated/prisma/enums';

/**
 * Identité résolue attachée à chaque requête authentifiée.
 *
 * Le multi-affectation étant assumé, une session est toujours rattachée
 * à UNE affectation active : c'est elle qui détermine le profil, le
 * sous-rôle, l'organisation et les permissions en vigueur. Basculer de
 * contexte revient à changer d'affectation active.
 */
export interface AuthenticatedUser {
  userId: string;
  email: string;
  firstName: string;
  lastName: string;
  mustChangePassword: boolean;
  onboardingCompleted: boolean;

  /** Affectation active de la session */
  assignmentId: string;
  profile: ProfileKey;
  subroleCode: string;
  subroleLabel: string;
  organisationId: string;
  organisationCode: string;
  organisationName: string;
  componentCode: string | null;
  provinceCode: string | null;

  /** Permissions effectives, sous-rôle et ajustements confondus */
  permissions: string[];
}

/**
 * Charge utile du jeton d'accès — volontairement minimale.
 *
 * Les permissions ne sont PAS embarquées : elles sont résolues en base à
 * chaque requête. Le coût d'une jointure indexée est négligeable à
 * l'échelle d'une UGP, et le bénéfice décisif — la révocation d'une
 * habilitation prend effet immédiatement, sans attendre l'expiration du
 * jeton. Pour un canal comme le MGP-EAS/HS, quinze minutes de permission
 * périmée seraient quinze minutes de trop.
 */
export interface AccessTokenPayload {
  sub: string;
  email: string;
  /** Identifiant de l'affectation active */
  aid: string;
}

/** Charge utile du jeton de rafraîchissement. */
export interface RefreshTokenPayload {
  sub: string;
  /** Identifiant du jeton en base, pour la rotation et la révocation */
  jti: string;
}
