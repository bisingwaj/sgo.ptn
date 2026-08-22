import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  Equals,
  IsBoolean,
  IsEmail,
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';

/**
 * Politique de mot de passe.
 *
 * 12 caractères minimum avec les quatre classes. La plateforme porte des
 * habilitations fiduciaires et l'accès à un canal de signalement de
 * violences sexuelles : le seuil de 8 caractères usuel n'est pas
 * proportionné à l'enjeu.
 */
export const PASSWORD_PATTERN =
  /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{12,}$/;
export const PASSWORD_MESSAGE =
  'Le mot de passe doit contenir au moins 12 caractères, dont une minuscule, une majuscule, un chiffre et un caractère spécial.';

export class LoginDto {
  @ApiProperty({ example: 'admin@ptn-rdc.gov.cd' })
  @IsEmail({}, { message: 'Adresse électronique invalide.' })
  email!: string;

  @ApiProperty({ example: 'Admin@PTN2026' })
  @IsString()
  @IsNotEmpty({ message: 'Le mot de passe est requis.' })
  password!: string;

  /**
   * Famille d'acteurs sélectionnée à la connexion.
   *
   * Détermine l'habilitation à activer pour la session : une personne peut
   * en détenir plusieurs, dans des familles différentes. Omise, c'est
   * l'habilitation principale qui est chargée.
   */
  @ApiPropertyOptional({
    enum: ['UGP_GOUV', 'BAILLEURS', 'BENEFICIAIRES', 'CONTROLE'],
    description: 'Famille d’acteurs — détermine l’habilitation activée',
  })
  @IsOptional()
  @IsIn(['UGP_GOUV', 'BAILLEURS', 'BENEFICIAIRES', 'CONTROLE'])
  family?: 'UGP_GOUV' | 'BAILLEURS' | 'BENEFICIAIRES' | 'CONTROLE';
}

export class RefreshDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  refreshToken!: string;
}

export class ChangePasswordDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty({ message: 'Le mot de passe actuel est requis.' })
  currentPassword!: string;

  @ApiProperty({ description: PASSWORD_MESSAGE })
  @IsString()
  @MinLength(12, { message: PASSWORD_MESSAGE })
  @Matches(PASSWORD_PATTERN, { message: PASSWORD_MESSAGE })
  newPassword!: string;
}

export class SwitchAssignmentDto {
  @ApiProperty({ description: 'Affectation à activer pour la session' })
  @IsUUID()
  assignmentId!: string;
}

/**
 * Engagements signés lors de la prise de fonction.
 *
 * Ces actes n'appartiennent qu'à la personne : un administrateur ne peut
 * pas déclarer un conflit d'intérêts à sa place (MEP § 5.2.8). Les trois
 * sont exigés — l'API refuse une signature partielle plutôt que de laisser
 * un compte à moitié engagé.
 */
export class SignEngagementsDto {
  @ApiProperty({ description: 'Code de Conduite UGP-PTN' })
  @IsBoolean()
  @Equals(true, {
    message: 'La signature du Code de Conduite est obligatoire.',
  })
  codeOfConduct!: boolean;

  @ApiProperty({ description: 'Déclaration de conflits d’intérêts' })
  @IsBoolean()
  @Equals(true, {
    message: 'La déclaration de conflits d’intérêts est obligatoire.',
  })
  coi!: boolean;

  @ApiProperty({ description: 'Confidentialité et protection des données' })
  @IsBoolean()
  @Equals(true, { message: 'L’engagement de confidentialité est obligatoire.' })
  dataPrivacy!: boolean;
}

/**
 * Préférences personnelles.
 *
 * Volontairement limité au téléphone et à la langue. Le nom, l'adresse
 * électronique et le périmètre relèvent de l'habilitation accordée par
 * l'administrateur : les laisser modifiables ici les désynchroniserait.
 */
export class UpdatePreferencesDto {
  @ApiPropertyOptional({ example: '+243 81 234 56 78' })
  @IsOptional()
  @IsString()
  @MaxLength(32)
  phone?: string;

  @ApiPropertyOptional({ enum: ['FR', 'EN', 'LN', 'SW', 'TS', 'KK'] })
  @IsOptional()
  @IsIn(['FR', 'EN', 'LN', 'SW', 'TS', 'KK'])
  preferredLanguage?: 'FR' | 'EN' | 'LN' | 'SW' | 'TS' | 'KK';
}
