import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { AuditModule } from './audit/audit.module';
import { AuthModule } from './auth/auth.module';
import { ReferentielModule } from './referentiel/referentiel.module';
import { AccountsModule } from './accounts/accounts.module';
import { TdrReferentielModule } from './tdr-referentiel/tdr-referentiel.module';
import { PtbaModule } from './ptba/ptba.module';
import { TdrModule } from './tdr/tdr.module';
import { JwtAuthGuard } from './common/guards/jwt-auth.guard';
import { PermissionsGuard } from './common/guards/permissions.guard';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, envFilePath: ['.env'] }),
    PrismaModule,
    AuditModule,
    AuthModule,
    ReferentielModule,
    AccountsModule,
    TdrReferentielModule,
    PtbaModule,
    TdrModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    // Authentification et habilitation appliquées globalement : une route
    // n'est ouverte que si elle porte explicitement `@Public()`.
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: PermissionsGuard },
  ],
})
export class AppModule {}
