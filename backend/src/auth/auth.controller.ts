import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Req,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import type { Request } from 'express';
import { AuthService, type RequestContext } from './auth.service';
import {
  ChangePasswordDto,
  LoginDto,
  RefreshDto,
  SignEngagementsDto,
  SwitchAssignmentDto,
  UpdatePreferencesDto,
} from './dto/auth.dto';
import { AllowTempPassword, CurrentUser, Public } from '../common/decorators';
import type { AuthenticatedUser } from '../common/types/authenticated-user';

function contextOf(req: Request): RequestContext {
  return {
    ipAddress: req.ip ?? undefined,
    userAgent: req.get('user-agent') ?? undefined,
  };
}

@ApiTags('Authentification')
@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  /**
   * Borne resserrée, et distincte du plafond général.
   *
   * Le verrouillage après trois échecs protège UN compte. Il ne protège pas
   * la plateforme de qui essaie un mot de passe répandu sur mille adresses :
   * chaque compte ne voit alors qu'un seul échec, et aucun ne se verrouille.
   * Dix tentatives par minute et cent par heure, comptées par adresse IP,
   * ferment cette porte sans gêner qui se trompe deux fois de suite.
   */
  @Throttle({
    court: { ttl: 60_000, limit: 10 },
    long: { ttl: 3_600_000, limit: 100 },
  })
  @ApiOperation({
    summary: 'Connexion par adresse électronique et mot de passe',
  })
  login(@Body() dto: LoginDto, @Req() req: Request) {
    return this.auth.login(dto.email, dto.password, contextOf(req), dto.family);
  }

  @Public()
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary:
      'Renouveler le jeton d’accès (rotation du jeton de rafraîchissement)',
  })
  refresh(@Body() dto: RefreshDto, @Req() req: Request) {
    return this.auth.refresh(dto.refreshToken, contextOf(req));
  }

  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiBearerAuth()
  @AllowTempPassword()
  @ApiOperation({ summary: 'Clore la session courante' })
  async logout(
    @Body() dto: RefreshDto,
    @CurrentUser('userId') userId: string,
    @Req() req: Request,
  ): Promise<void> {
    await this.auth.logout(dto.refreshToken, userId, contextOf(req));
  }

  @Get('me')
  @ApiBearerAuth()
  @AllowTempPassword()
  @ApiOperation({ summary: 'Contexte de la session courante' })
  async me(@CurrentUser() user: AuthenticatedUser) {
    return {
      user,
      availableAssignments: await this.auth.listAssignments(user.userId),
    };
  }

  @Post('change-password')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiBearerAuth()
  // Accessible avec un mot de passe temporaire : c'est précisément le
  // point d'entrée du parcours d'activation.
  @AllowTempPassword()
  @ApiOperation({ summary: 'Changer son mot de passe' })
  async changePassword(
    @Body() dto: ChangePasswordDto,
    @CurrentUser('userId') userId: string,
    @Req() req: Request,
  ): Promise<void> {
    await this.auth.changePassword(
      userId,
      dto.currentPassword,
      dto.newPassword,
      contextOf(req),
    );
  }

  @Post('engagements')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Signer ses engagements de prise de fonction',
    description:
      'Code de Conduite, déclaration de conflits d’intérêts et confidentialité. Ces actes n’appartiennent qu’à la personne : un administrateur ne peut pas les poser à sa place (MEP § 5.2.8).',
  })
  signEngagements(
    @Body() _dto: SignEngagementsDto,
    @CurrentUser('userId') userId: string,
    @Req() req: Request,
  ) {
    // Le DTO n'a d'autre rôle que d'exiger les trois consentements : la
    // validation refuse toute valeur autre que `true`.
    return this.auth.signEngagements(userId, contextOf(req));
  }

  @Post('preferences')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @AllowTempPassword()
  @ApiOperation({
    summary: 'Mettre à jour ses préférences personnelles',
    description:
      'Téléphone et langue uniquement. Le nom, l’adresse électronique et le périmètre relèvent de l’habilitation accordée par l’administrateur.',
  })
  updatePreferences(
    @Body() dto: UpdatePreferencesDto,
    @CurrentUser('userId') userId: string,
    @Req() req: Request,
  ) {
    return this.auth.updatePreferences(userId, dto, contextOf(req));
  }

  @Get('assignments')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Lister ses habilitations actives' })
  listAssignments(@CurrentUser('userId') userId: string) {
    return this.auth.listAssignments(userId);
  }

  @Post('switch-assignment')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Basculer sur une autre habilitation' })
  switchAssignment(
    @Body() dto: SwitchAssignmentDto,
    @CurrentUser('userId') userId: string,
    @Req() req: Request,
  ) {
    return this.auth.switchAssignment(userId, dto.assignmentId, contextOf(req));
  }
}
