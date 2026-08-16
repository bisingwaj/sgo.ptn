import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  Put,
  Query,
  Req,
  Res,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray,
  IsIn,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import type { Request, Response } from 'express';
import { TdrService } from './tdr.service';
import { TdrAssistService } from '../ai/tdr-assist.service';
import { TdrAgentService } from '../ai/tdr-agent.service';
import { CurrentUser, RequirePermissions } from '../common/decorators';
import type { AuthenticatedUser } from '../common/types/authenticated-user';
import type { RequestContext } from '../auth/auth.service';

function contextOf(req: Request): RequestContext {
  return { ipAddress: req.ip ?? undefined, userAgent: req.get('user-agent') ?? undefined };
}

class TourDeParoleDto {
  @ApiProperty({ enum: ['user', 'assistant'] })
  @IsIn(['user', 'assistant'])
  role!: 'user' | 'assistant';

  @ApiProperty()
  @IsString()
  @MaxLength(8000)
  content!: string;
}

export class AgentTurnDto {
  @ApiProperty({ example: 'Rédige-moi un contexte en rapport avec l’activité PTBA.' })
  @IsString()
  @MinLength(2, { message: 'Dites ce que vous attendez.' })
  @MaxLength(4000)
  instruction!: string;

  @ApiPropertyOptional({ description: 'Tours précédents, du plus ancien au plus récent' })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TourDeParoleDto)
  historique?: TourDeParoleDto[];
}

/**
 * Champ visé par une demande d'assistance.
 *
 * Une chaine bornee : le service la confronte au registre FIELDS, seule
 * autorite sur ce qui existe dans le monde de l'assistant.
 */
export class AssistFieldDto {
  @ApiProperty({ example: 'methodology' })
  @IsString()
  @MaxLength(64)
  champ!: string;
}

export class CreateDraftDto {
  @ApiProperty({ example: 'TDR-CS' })
  @IsString()
  @MinLength(3)
  tdrTypeCode!: string;

  @ApiProperty({ example: 'AMOA plateforme d’identité numérique' })
  @IsString()
  @MinLength(5, { message: 'Un intitulé est requis.' })
  @MaxLength(300)
  title!: string;

  @ApiPropertyOptional({ description: 'Activité PTBA de rattachement' })
  @IsOptional()
  @IsUUID()
  ptbaActivityId?: string;
}

/**
 * Termes de référence.
 *
 * L'origine de rédaction découle du profil de la session : un bailleur et
 * un auditeur ne rédigent jamais (présentation UGPTN § 15.4). C'est `tdr:author` qui
 * ouvre la rédaction, et cette permission ne leur est pas accordée.
 */
@ApiTags('TDR')
@ApiBearerAuth()
@Controller('tdr')
export class TdrController {
  constructor(
    private readonly tdr: TdrService,
    private readonly assist: TdrAssistService,
    private readonly agent: TdrAgentService,
  ) {}

  @Get()
  @RequirePermissions('tdr:read')
  @ApiOperation({
    summary: 'Lister les TDR',
    description:
      'Hors UGP et bailleurs, la liste est restreinte aux TDR de votre organisation.',
  })
  list(@CurrentUser() actor: AuthenticatedUser, @Query('statut') status?: string) {
    return this.tdr.list(actor, { status });
  }

  @Get(':id')
  @RequirePermissions('tdr:read')
  @ApiOperation({ summary: 'Consulter un TDR' })
  findOne(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() actor: AuthenticatedUser) {
    return this.tdr.findOne(id, actor);
  }

  @Get(':id/completude')
  @RequirePermissions('tdr:read')
  @ApiOperation({
    summary: 'Contrôle de complétude',
    description:
      'Permet au parcours de rédaction d’afficher les manques au fil de l’eau, plutôt qu’au moment de soumettre.',
  })
  completeness(@Param('id', ParseUUIDPipe) id: string) {
    return this.tdr.checkCompleteness(id);
  }

  @Get(':id/enveloppe')
  @RequirePermissions('tdr:read')
  @ApiOperation({
    summary: 'Situation de l’enveloppe de la ligne du plan',
    description:
      'Enveloppe de l’activité PTBA rattachée, ce que les autres dossiers en prennent déjà, ' +
      'et ce qu’il y reste. Le cumul n’est connu que du serveur : la liste des TDR est ' +
      'restreinte à l’organisation de l’appelant, un calcul côté navigateur le sous-estimerait. ' +
      'Agrégat seul — jamais les références des autres dossiers.',
  })
  envelope(@Param('id', ParseUUIDPipe) id: string) {
    return this.tdr.envelopeStatus(id);
  }

  @Post()
  @RequirePermissions('tdr:author')
  @ApiOperation({
    summary: 'Ouvrir un brouillon',
    description:
      'L’origine est déduite du profil de la session. Le type doit être ouvert à cette origine.',
  })
  create(
    @Body() dto: CreateDraftDto,
    @CurrentUser() actor: AuthenticatedUser,
    @Req() req: Request,
  ) {
    return this.tdr.createDraft(dto, actor, contextOf(req));
  }

  @Put(':id')
  @RequirePermissions('tdr:author')
  @ApiOperation({
    summary: 'Enregistrer le brouillon',
    description:
      'Enregistrement partiel : seuls les champs transmis sont modifiés. Les collections envoyées sont remplacées en bloc.',
  })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: Record<string, unknown>,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.tdr.updateDraft(id, body, actor);
  }

  @Post(':id/assistance/champ')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions('tdr:author')
  @ApiOperation({
    summary: 'Proposer la rédaction d’un champ de texte du dossier',
    description:
      'Point d’entrée unique pour les champs de texte : le registre FIELDS porte déjà la nature ' +
      'et la description de chacun. Les champs de montant et de date en sont exclus — l’assistant ' +
      'transcrit une valeur qu’on lui dicte, il n’en propose jamais. Rien n’est enregistré : ' +
      'la proposition n’entre au dossier que si l’auteur la reprend.',
  })
  assistField(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AssistFieldDto,
    @CurrentUser() actor: AuthenticatedUser,
    @Req() req: Request,
  ) {
    return this.assist.proposeField(id, dto.champ, actor, contextOf(req));
  }

  @Post(':id/assistance/champ/flux')
  @RequirePermissions('tdr:author')
  @ApiOperation({
    summary: 'Proposer la rédaction d’un champ, au fil de l’eau',
    description:
      'Même proposition que la route d’un bloc, servie en flux d’évènements. Une rédaction ' +
      'met dix à vingt secondes : les premiers mots paraissent en une seconde, et l’auteur ' +
      'juge tôt s’il garde ou relance. Rien n’est enregistré — la proposition n’entre au ' +
      'dossier que si l’auteur la reprend.',
  })
  async assistFieldStream(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AssistFieldDto,
    @CurrentUser() actor: AuthenticatedUser,
    @Req() req: Request,
    @Res() res: Response,
  ): Promise<void> {
    res.writeHead(HttpStatus.OK, {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      // Sans cela, un proxy intermédiaire garde le flux en tampon et le
      // rend d'un bloc : l'effet recherché disparaît.
      'X-Accel-Buffering': 'no',
    });

    const envoyer = (ev: unknown) => res.write(`data: ${JSON.stringify(ev)}\n\n`);

    let ferme = false;
    req.on('close', () => {
      ferme = true;
    });

    try {
      for await (const ev of this.assist.streamField(id, dto.champ, actor, contextOf(req))) {
        if (ferme) break;
        envoyer(ev);
      }
    } catch (e) {
      envoyer({
        type: 'erreur',
        message: e instanceof Error ? e.message : 'La proposition n’a pas abouti.',
      });
    } finally {
      if (!ferme) res.end();
    }
  }

  @Post(':id/assistance/contexte')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions('tdr:author')
  @ApiOperation({
    summary: 'Proposer une rédaction du contexte',
    description:
      'Le modèle reçoit l’activité PTBA, la composante, le type et la couverture — jamais de donnée personnelle ni de contenu EAS/HS. Il renvoie une proposition : rien n’est enregistré tant que l’auteur ne l’a pas reprise.',
  })
  assistContext(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() actor: AuthenticatedUser,
    @Req() req: Request,
  ) {
    return this.assist.proposeContext(id, actor, contextOf(req));
  }

  @Post(':id/assistance/justification')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions('tdr:author')
  @ApiOperation({
    summary: 'Proposer ou reprendre la justification',
    description:
      'Rédige si le champ est vide. S’il est renseigné, le modèle en reprend la forme sans y introduire de fait nouveau — améliorer ne doit pas servir à ajouter des affirmations que l’auteur n’a pas écrites.',
  })
  assistJustification(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() actor: AuthenticatedUser,
    @Req() req: Request,
  ) {
    return this.assist.proposeJustification(id, actor, contextOf(req));
  }

  @Post(':id/assistance/objectifs')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions('tdr:author')
  @ApiOperation({
    summary: 'Proposer des objectifs assortis de leur critère de constatation',
    description:
      'S’appuie sur le contexte déjà rédigé. Les valeurs cibles manquantes sont laissées entre crochets plutôt qu’inventées.',
  })
  assistObjectives(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() actor: AuthenticatedUser,
    @Req() req: Request,
  ) {
    return this.assist.proposeObjectives(id, actor, contextOf(req));
  }

  @Post(':id/assistance/livrables')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions('tdr:author')
  @ApiOperation({
    summary: 'Proposer les livrables attendus',
    description:
      'Découle des objectifs déjà arrêtés, et non du contexte : un livrable qui ne sert aucun objectif n’a pas à être commandé. Les échéances restent des délais relatifs au démarrage, et valent « [à fixer] » tant que la durée du marché n’est pas saisie — une date engage contractuellement.',
  })
  assistDeliverables(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() actor: AuthenticatedUser,
    @Req() req: Request,
  ) {
    return this.assist.proposeDeliverables(id, actor, contextOf(req));
  }

  @Delete(':id')
  @RequirePermissions('tdr:author')
  @ApiOperation({
    summary: 'Supprimer un brouillon',
    description:
      'Réservé à l’auteur, et au seul statut BROUILLON : un dossier transmis se retourne, il ne s’efface pas. La suppression est journalisée avant d’être opérée, et la référence reste consommée.',
  })
  remove(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() actor: AuthenticatedUser,
    @Req() req: Request,
  ) {
    return this.tdr.deleteDraft(id, actor, contextOf(req));
  }

  /**
   * Un échange avec l'assistant, rendu au fil de l'eau.
   *
   * Écriture SSE directe plutôt que le décorateur `Sse` : celui-ci s'appuie
   * sur un flux d'évènements en GET, or l'instruction voyage en corps de
   * requête. `@Res()` désactive la sérialisation de Nest, ce qui est
   * précisément ce qu'on veut : c'est ici qu'on écrit.
   *
   * Le premier fragment part en moins d'une seconde. Sans cela, l'auteur
   * attendrait dix à vingt-cinq secondes devant un écran immobile.
   */
  @Post(':id/agent')
  @RequirePermissions('tdr:author')
  @ApiOperation({
    summary: 'Parler à l’assistant du dossier',
    description:
      'Flux d’évènements. L’assistant écrit directement dans les champs qui lui sont ouverts, et chaque écriture est marquée et journalisée. Les montants, le rattachement et les attestations lui sont fermés.',
  })
  async agentTurn(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AgentTurnDto,
    @CurrentUser() actor: AuthenticatedUser,
    @Req() req: Request,
    @Res() res: Response,
  ): Promise<void> {
    res.writeHead(HttpStatus.OK, {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      // Sans cela, un proxy intermédiaire garde le flux en tampon et le
      // rend d'un bloc : l'effet recherché disparaît.
      'X-Accel-Buffering': 'no',
    });

    const envoyer = (ev: unknown) => res.write(`data: ${JSON.stringify(ev)}

`);

    // Un auteur qui quitte l'étape ferme la connexion : inutile de
    // continuer à écrire dans le vide.
    let ferme = false;
    req.on('close', () => {
      ferme = true;
    });

    try {
      for await (const ev of this.agent.converser(
        id,
        dto.instruction,
        dto.historique ?? [],
        actor,
        contextOf(req),
      )) {
        if (ferme) break;
        envoyer(ev);
      }
    } catch (e) {
      envoyer({
        type: 'erreur',
        message: e instanceof Error ? e.message : 'L’assistant n’a pas pu répondre.',
      });
    } finally {
      if (!ferme) res.end();
    }
  }

  @Post(':id/soumettre')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions('tdr:author')
  @ApiOperation({
    summary: 'Transmettre à l’UGP',
    description:
      'Fige la méthode de passation et le type de revue depuis les seuils en vigueur, et prend un instantané complet du document.',
  })
  submit(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() actor: AuthenticatedUser,
    @Req() req: Request,
  ) {
    return this.tdr.submit(id, actor, contextOf(req));
  }
}
