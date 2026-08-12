import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsString, IsUUID, Matches, MinLength } from 'class-validator';

/**
 * Politique de mot de passe.
 *
 * 12 caractères minimum avec les quatre classes. La plateforme porte des
 * habilitations fiduciaires et l'accès à un canal de signalement de
 * violences sexuelles : le seuil de 8 caractères usuel n'est pas
 * proportionné à l'enjeu.
 */
export const PASSWORD_PATTERN = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{12,}$/;
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
