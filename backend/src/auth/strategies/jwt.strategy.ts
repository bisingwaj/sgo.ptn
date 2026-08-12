import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { UserContextService } from '../user-context.service';
import type { AccessTokenPayload, AuthenticatedUser } from '../../common/types/authenticated-user';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(
    config: ConfigService,
    private readonly userContext: UserContextService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: config.getOrThrow<string>('JWT_ACCESS_SECRET'),
    });
  }

  /** Le contexte est résolu en base : révocation immédiate garantie. */
  async validate(payload: AccessTokenPayload): Promise<AuthenticatedUser> {
    return this.userContext.resolve(payload.sub, payload.aid);
  }
}
