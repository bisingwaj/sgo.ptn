import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  Req,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import { AccountsService } from './accounts.service';
import {
  AddAssignmentDto,
  CreateAccountDto,
  ListAccountsQueryDto,
  RevokeAssignmentDto,
  SuspendAccountDto,
} from './dto/accounts.dto';
import { CurrentUser, RequirePermissions } from '../common/decorators';
import type { AuthenticatedUser } from '../common/types/authenticated-user';
import type { RequestContext } from '../auth/auth.service';

function contextOf(req: Request): RequestContext {
  return {
    ipAddress: req.ip ?? undefined,
    userAgent: req.get('user-agent') ?? undefined,
  };
}

/**
 * Administration des comptes.
 *
 * Réservé au sous-rôle UGP « IT » (poste n°18 du présentation UGPTN § 6.1), via la
 * permission `admin:users`. Aucun rôle technique hors manuel n'a été
 * introduit pour cette fonction.
 */
@ApiTags('Administration · Comptes')
@ApiBearerAuth()
@Controller('admin/comptes')
@RequirePermissions('admin:users')
export class AccountsController {
  constructor(private readonly accounts: AccountsService) {}

  @Post('verifier')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Contrôler les règles institutionnelles sans créer le compte',
    description:
      'Permet au formulaire d’afficher les conflits en temps réel : poste déjà occupé, cumul interdit, justification manquante, périmètre requis.',
  })
  verifier(@Body() dto: CreateAccountDto) {
    return this.accounts.checkGuardrails(dto);
  }

  @Post()
  @ApiOperation({
    summary: 'Créer un compte',
    description:
      'Retourne un mot de passe temporaire affiché une seule fois. Seul son haché est conservé.',
  })
  create(
    @Body() dto: CreateAccountDto,
    @CurrentUser() actor: AuthenticatedUser,
    @Req() req: Request,
  ) {
    return this.accounts.create(dto, actor, contextOf(req));
  }

  @Get()
  @ApiOperation({ summary: 'Lister les comptes' })
  list(@Query() query: ListAccountsQueryDto) {
    return this.accounts.list(query);
  }

  @Get('dormants')
  @ApiOperation({
    summary: 'Comptes inactifs depuis 90 jours',
    description:
      'Support de la revue périodique des habilitations exigée en audit.',
  })
  dormants() {
    return this.accounts.dormantAccounts();
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Fiche d’un compte et historique de ses habilitations',
  })
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.accounts.findOne(id);
  }

  @Post(':id/habilitations/verifier')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Contrôler les règles avant d’ajouter une habilitation',
    description:
      'Seule voie où la séparation des tâches s’évalue : elle se juge au regard des habilitations déjà détenues.',
  })
  checkAssignment(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AddAssignmentDto,
  ) {
    return this.accounts.checkAssignmentGuardrails(id, dto);
  }

  @Post(':id/habilitations')
  @ApiOperation({ summary: 'Ajouter une habilitation à un compte existant' })
  addAssignment(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AddAssignmentDto,
    @CurrentUser() actor: AuthenticatedUser,
    @Req() req: Request,
  ) {
    return this.accounts.addAssignment(id, dto, actor, contextOf(req));
  }

  @Post(':id/habilitations/:assignmentId/revoquer')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Révoquer une habilitation',
    description:
      'La dernière habilitation active ne peut être révoquée : suspendre ou archiver le compte est le geste approprié.',
  })
  revokeAssignment(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('assignmentId', ParseUUIDPipe) assignmentId: string,
    @Body() dto: RevokeAssignmentDto,
    @CurrentUser() actor: AuthenticatedUser,
    @Req() req: Request,
  ) {
    return this.accounts.revokeAssignment(
      id,
      assignmentId,
      dto.reason,
      actor,
      contextOf(req),
    );
  }

  @Post(':id/suspendre')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Suspendre un compte et clore ses sessions' })
  suspend(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: SuspendAccountDto,
    @CurrentUser() actor: AuthenticatedUser,
    @Req() req: Request,
  ) {
    return this.accounts.suspend(id, dto.reason, actor, contextOf(req));
  }

  @Post(':id/reactiver')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Lever la suspension d’un compte' })
  reactivate(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() actor: AuthenticatedUser,
    @Req() req: Request,
  ) {
    return this.accounts.reactivate(id, actor, contextOf(req));
  }

  @Post(':id/reinitialiser-mot-de-passe')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Réémettre un mot de passe temporaire' })
  resetPassword(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() actor: AuthenticatedUser,
    @Req() req: Request,
  ) {
    return this.accounts.resetTemporaryPassword(id, actor, contextOf(req));
  }

  @Post(':id/archiver')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Archiver un compte',
    description:
      'Aucune suppression physique : la piste d’audit doit rester reconstituable.',
  })
  archive(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: SuspendAccountDto,
    @CurrentUser() actor: AuthenticatedUser,
    @Req() req: Request,
  ) {
    return this.accounts.archive(id, dto.reason, actor, contextOf(req));
  }
}
