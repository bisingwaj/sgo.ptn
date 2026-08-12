import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsDateString,
  IsEmail,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';
import { ComponentCode, Language, ProfileKey, UserStatus } from '../../../generated/prisma/enums';

export class CreateAccountDto {
  // --- Étape 02 : identité ---
  @ApiProperty({ example: 'Joseph' })
  @IsString()
  @MinLength(2, { message: 'Le prénom est requis.' })
  @MaxLength(80)
  firstName!: string;

  @ApiProperty({ example: 'Mukendi' })
  @IsString()
  @MinLength(2, { message: 'Le nom est requis.' })
  @MaxLength(80)
  lastName!: string;

  @ApiProperty({ example: 'j.mukendi@ptn-rdc.gov.cd' })
  @IsEmail({}, { message: 'Adresse électronique invalide.' })
  email!: string;

  @ApiPropertyOptional({ example: '+243 81 234 56 78' })
  @IsOptional()
  @IsString()
  @MaxLength(32)
  phone?: string;

  @ApiPropertyOptional({ enum: Language, default: Language.FR })
  @IsOptional()
  @IsEnum(Language)
  preferredLanguage?: keyof typeof Language;

  // --- Étape 01 : famille, profil, sous-rôle ---
  @ApiProperty({ enum: ProfileKey })
  @IsEnum(ProfileKey, { message: 'Profil inconnu.' })
  profile!: keyof typeof ProfileKey;

  @ApiProperty({ example: 'UGP_RC2', description: 'Code du sous-rôle' })
  @IsString()
  @MinLength(3)
  subroleCode!: string;

  // --- Étape 03 : rattachement ---
  @ApiProperty({ description: 'Organisation de rattachement' })
  @IsUUID(undefined, { message: 'Organisation de rattachement invalide.' })
  organisationId!: string;

  @ApiPropertyOptional({ enum: ComponentCode, description: 'Obligatoire pour RC1, RC2, RC3' })
  @IsOptional()
  @IsEnum(ComponentCode)
  componentCode?: keyof typeof ComponentCode;

  @ApiPropertyOptional({ example: 'KINSHASA' })
  @IsOptional()
  @IsString()
  provinceCode?: string;

  // --- Étape 04 : bornage et habilitation sensible ---
  @ApiPropertyOptional({
    example: 'AUD-EXT-2026-T1',
    description: 'Obligatoire pour les profils de contrôle : l’accès expire avec la mission.',
  })
  @IsOptional()
  @IsString()
  @MaxLength(64)
  missionRef?: string;

  @ApiPropertyOptional({ description: 'Date de fin d’habilitation (ISO 8601)' })
  @IsOptional()
  @IsDateString({}, { message: 'Date de fin d’habilitation invalide.' })
  validUntil?: string;

  @ApiPropertyOptional({
    description:
      'Justification écrite — obligatoire pour toute habilitation sensible (Spé VBG/EAS, IT).',
  })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  justification?: string;

  @ApiPropertyOptional({
    default: true,
    description: 'Affectation chargée par défaut à la connexion',
  })
  @IsOptional()
  @IsBoolean()
  isPrimary?: boolean;
}

export class AddAssignmentDto extends CreateAccountDto {}

export class ListAccountsQueryDto {
  @ApiPropertyOptional({ enum: ProfileKey })
  @IsOptional()
  @IsEnum(ProfileKey)
  profile?: keyof typeof ProfileKey;

  @ApiPropertyOptional({ enum: UserStatus })
  @IsOptional()
  @IsEnum(UserStatus)
  status?: keyof typeof UserStatus;

  @ApiPropertyOptional({ description: 'Recherche sur nom, prénom ou adresse électronique' })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  search?: string;

  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @IsInt()
  @Min(1)
  page?: number;

  @ApiPropertyOptional({ default: 25 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  pageSize?: number;
}

export class SuspendAccountDto {
  @ApiProperty({ description: 'Motif consigné dans la piste d’audit' })
  @IsString()
  @MinLength(5, { message: 'Un motif est requis.' })
  @MaxLength(500)
  reason!: string;
}
