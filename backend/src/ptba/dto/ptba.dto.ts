import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsArray, IsEnum, IsNumber, IsOptional, IsString, Matches, Min, MaxLength, MinLength } from 'class-validator';
import { ComponentCode } from '../../../generated/prisma/enums';

export class UpsertActivityDto {
  @ApiProperty({ example: 'A2.3.1', description: 'Code d’activité PTBA' })
  @IsString()
  @Matches(/^A\d+(\.\d+)*$/, {
    message: 'Le code doit suivre la forme A2.3.1 — lettre A puis niveaux séparés par des points.',
  })
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

  @ApiPropertyOptional({ example: 'KINSHASA' })
  @IsOptional()
  @IsString()
  provinceCode?: string;

  /**
   * Ce que l'activite porte en propre. Facultatif a la creation : une ligne
   * de plan peut s'inscrire avant que son contenu soit arrete, et se
   * completer ensuite.
   */
  @ApiPropertyOptional({ type: [Object] })
  @IsOptional()
  @IsArray()
  objectives?: Array<{ title: string; criteria?: string }>;

  @ApiPropertyOptional({ type: [Object] })
  @IsOptional()
  @IsArray()
  deliverables?: Array<{ title: string; format?: string; deadline?: string }>;

  @ApiPropertyOptional({ type: [Object] })
  @IsOptional()
  @IsArray()
  indicators?: Array<{ label: string; measure?: string; target?: string }>;

  @ApiPropertyOptional({ type: [Object] })
  @IsOptional()
  @IsArray()
  risks?: Array<{ label: string; description?: string; mitigation?: string; level?: string }>;

  @ApiPropertyOptional({ type: [Object] })
  @IsOptional()
  @IsArray()
  clauses?: Array<{ label: string; text?: string }>;
}
