import { Body, Controller, Get, HttpCode, HttpStatus, Post, Req } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import { AuthService, type RequestContext } from './auth.service';
import {
  ChangePasswordDto,
  LoginDto,
  RefreshDto,
  SwitchAssignmentDto,
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
  @ApiOperation({ summary: 'Connexion par adresse électronique et mot de passe' })
  login(@Body() dto: LoginDto, @Req() req: Request) {
    return this.auth.login(dto.email, dto.password, contextOf(req));
  }

  @Public()
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Renouveler le jeton d’accès (rotation du jeton de rafraîchissement)' })
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
    await this.auth.changePassword(userId, dto.currentPassword, dto.newPassword, contextOf(req));
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
