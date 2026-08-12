import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsIn, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';
import { ClauseCategory, RiskLevel, TemplateStatus } from '../../../generated/prisma/enums';

export class ListLibraryQueryDto {
  @ApiPropertyOptional({ description: 'Code du type de TDR ; « transversal » pour les éléments communs' })
  @IsOptional()
  @IsString()
  type?: string;

  @ApiPropertyOptional({ enum: TemplateStatus })
  @IsOptional()
  @IsEnum(TemplateStatus)
  status?: keyof typeof TemplateStatus;
}

export class UpsertClauseDto {
  @ApiPropertyOptional({ description: 'Type de TDR ; omis pour une clause transversale' })
  @IsOptional()
  @IsString()
  tdrTypeCode?: string;

  @ApiProperty({ enum: ClauseCategory })
  @IsEnum(ClauseCategory, { message: 'Catégorie de clause inconnue.' })
  category!: keyof typeof ClauseCategory;

  @ApiProperty({ example: 'Méthode SFQC 80/20' })
  @IsString()
  @MinLength(3, { message: 'Le libellé est requis.' })
  @MaxLength(160)
  label!: string;

  @ApiProperty({ description: 'Texte inséré tel quel dans le TDR' })
  @IsString()
  @MinLength(20, { message: 'Le texte de la clause doit être rédigé.' })
  @MaxLength(4000)
  text!: string;
}

export class UpsertIndicatorDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  tdrTypeCode?: string;

  @ApiProperty()
  @IsString()
  @MinLength(3)
  @MaxLength(160)
  label!: string;

  @ApiProperty({ description: 'Type de mesure — ratio, délai, score, pourcentage' })
  @IsString()
  @MinLength(3)
  @MaxLength(200)
  measure!: string;

  @ApiProperty({ description: 'Cible MEP ou standard PTN-RDC' })
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  target!: string;
}

export class UpsertRiskDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  tdrTypeCode?: string;

  @ApiProperty()
  @IsString()
  @MinLength(3)
  @MaxLength(160)
  label!: string;

  @ApiProperty()
  @IsString()
  @MinLength(10)
  @MaxLength(2000)
  description!: string;

  @ApiProperty({ description: 'Mesure d’atténuation' })
  @IsString()
  @MinLength(10)
  @MaxLength(2000)
  mitigation!: string;

  @ApiProperty({ enum: RiskLevel })
  @IsEnum(RiskLevel)
  level!: keyof typeof RiskLevel;
}

export class LibraryKindParamDto {
  @ApiProperty({ enum: ['clauses', 'indicateurs', 'risques'] })
  @IsIn(['clauses', 'indicateurs', 'risques'])
  kind!: 'clauses' | 'indicateurs' | 'risques';
}
