import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  Matches,
  Min,
  MaxLength,
  MinLength,
  ValidateIf,
  ValidateNested,
} from 'class-validator';
import { ComponentCode, EsCategory } from '../../../generated/prisma/enums';

/**
 * Les cinq listes que porte une activite.
 *
 * Elles etaient declarees `@IsArray()` sans validation de leur contenu :
 * n'importe quel objet, et des chaines sans borne, atteignaient
 * l'ecriture. Le pipe global etant en `whitelist` + `forbidNonWhitelisted`,
 * ces classes bornent aussi ce qui peut entrer.
 *
 * Les lignes vides restent acceptees : un formulaire laisse volontiers une
 * ligne sans intitule en fin de saisie, et c'est le service qui les ecarte.
 */
export class ActivityObjectiveDto {
  @ApiProperty()
  @IsString()
  @MaxLength(300)
  title!: string;

  @ApiPropertyOptional({ description: 'Comment on constatera l’atteinte' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  criteria?: string;
}

export class ActivityDeliverableDto {
  @ApiProperty()
  @IsString()
  @MaxLength(300)
  title!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(200)
  format?: string;

  @ApiPropertyOptional({ description: 'Delai relatif au demarrage — J+15, M+6' })
  @IsOptional()
  @IsString()
  @MaxLength(32)
  deadline?: string;
}

export class ActivityIndicatorDto {
  @ApiProperty()
  @IsString()
  @MaxLength(300)
  label!: string;

  @ApiPropertyOptional({ description: 'Unite ou methode de mesure' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  measure?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(120)
  target?: string;
}

export class ActivityRiskDto {
  @ApiProperty()
  @IsString()
  @MaxLength(300)
  label!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  description?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  mitigation?: string;

  /**
   * Le formulaire renvoie une chaine vide quand le niveau n'est pas
   * renseigne — un `<select>` sans choix. `@IsOptional` ne couvre que
   * `null` et `undefined` ; sans cette condition, une ligne sans niveau
   * ferait echouer toute la saisie.
   */
  @ApiPropertyOptional({ enum: EsCategory })
  @ValidateIf((o: ActivityRiskDto) => o.level !== undefined && o.level !== '')
  @IsEnum(EsCategory, { message: 'Niveau de risque inconnu.' })
  level?: string;
}

export class ActivityClauseDto {
  @ApiProperty()
  @IsString()
  @MaxLength(200)
  label!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(4000)
  text?: string;
}

export class UpsertActivityDto {
  @ApiProperty({ example: 'A2.3.1', description: 'Code d’activité PTBA' })
  @IsString()
  @Matches(/^A\d+(\.\d+)*$/, {
    message: 'Le code doit suivre la forme A2.3.1 — lettre A puis niveaux séparés par des points.',
  })
  @MaxLength(24)
  code!: string;

  @ApiProperty({ example: 'Plateforme nationale d’identité numérique' })
  @IsString()
  @MinLength(5, { message: 'L’intitulé de l’activité est requis.' })
  @MaxLength(300)
  title!: string;

  @ApiProperty({ enum: ComponentCode })
  @IsEnum(ComponentCode, { message: 'Composante inconnue.' })
  componentCode!: keyof typeof ComponentCode;

  @ApiPropertyOptional({ example: '2.3', description: 'Sous-composante MEP' })
  @IsOptional()
  @IsString()
  @MaxLength(16)
  subComponent?: string;

  @ApiProperty({ example: 8700000, description: 'Enveloppe en USD' })
  @IsNumber({}, { message: 'L’enveloppe doit être un montant en USD.' })
  @Min(0)
  envelopeUsd!: number;

  @ApiPropertyOptional({ description: 'Part IDA en USD' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  idaUsd?: number;

  @ApiPropertyOptional({ description: 'Part AFD en USD' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  afdUsd?: number;

  /**
   * Couverture geographique. Une activite en traverse souvent plusieurs —
   * un backbone Goma-Bukavu en concerne trois — et le champ unique
   * obligeait a en choisir une au detriment des autres.
   *
   * Liste vide ou absente = couverture nationale. L'existence des codes est
   * verifiee par le service : une cle etrangere Prisma produirait une 500 la
   * ou une 400 explicite est attendue.
   */
  @ApiPropertyOptional({ example: ['KINSHASA', 'NORD_KIVU'], type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @MaxLength(64, { each: true })
  provinceCodes?: string[];

  /**
   * Ce que l'activite porte en propre. Facultatif a la creation : une ligne
   * de plan peut s'inscrire avant que son contenu soit arrete, et se
   * completer ensuite.
   */
  @ApiPropertyOptional({ type: [ActivityObjectiveDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ActivityObjectiveDto)
  objectives?: ActivityObjectiveDto[];

  @ApiPropertyOptional({ type: [ActivityDeliverableDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ActivityDeliverableDto)
  deliverables?: ActivityDeliverableDto[];

  @ApiPropertyOptional({ type: [ActivityIndicatorDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ActivityIndicatorDto)
  indicators?: ActivityIndicatorDto[];

  @ApiPropertyOptional({ type: [ActivityRiskDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ActivityRiskDto)
  risks?: ActivityRiskDto[];

  @ApiPropertyOptional({ type: [ActivityClauseDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ActivityClauseDto)
  clauses?: ActivityClauseDto[];
}

/**
 * Retrait d'une activite du plan.
 *
 * Le motif est exige : retirer une ligne enleve une enveloppe a un plan
 * que d'autres lisent, et l'operation n'a pas de reciproque cote produit.
 * Un journal qui dit qui a retire quoi, sans dire pourquoi, ne repond a
 * aucune des questions qu'on lui posera.
 */
export class DeactivateActivityDto {
  @ApiProperty({ example: 'Activité reportée à l’exercice suivant.' })
  @IsString()
  @MinLength(5, { message: 'Le motif du retrait est requis.' })
  @MaxLength(500)
  motif!: string;
}

/**
 * Allocation annuelle d'une composante.
 *
 * Le MEP fixe une dotation de projet ; sa repartition par exercice est une
 * decision de l'UGP, arretee a la preparation du PTBA. Elle ne se deduit
 * d'aucune source — d'ou une saisie, et non un calcul.
 */
export class UpsertAllocationDto {
  @ApiProperty({ enum: ComponentCode })
  @IsEnum(ComponentCode, { message: 'Composante inconnue.' })
  componentCode!: keyof typeof ComponentCode;

  @ApiProperty({ example: 42000000, description: 'Allocation de l’exercice, en USD' })
  @IsNumber({}, { message: 'L’allocation doit être un montant en USD.' })
  @Min(0)
  allocationUsd!: number;

  @ApiPropertyOptional({ description: 'Part IDA en USD' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  idaUsd?: number;

  @ApiPropertyOptional({ description: 'Part AFD en USD' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  afdUsd?: number;

  @ApiPropertyOptional({ description: 'Ce qui justifie ce montant, ou sa dernière révision' })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  note?: string;
}
