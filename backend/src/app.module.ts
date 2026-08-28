import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
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
import { TdrDocumentModule } from './tdr-document/tdr-document.module';
import { TdrAttachmentModule } from './tdr-attachment/tdr-attachment.module';
import { DocumentsModule } from './documents/documents.module';
import { AiModule } from './ai/ai.module';
import { AssistantModule } from './assistant/assistant.module';
import { MarketplaceModule } from './marketplace/marketplace.module';
import { PassationModule } from './passation/passation.module';
import { JwtAuthGuard } from './common/guards/jwt-auth.guard';
import { PermissionsGuard } from './common/guards/permissions.guard';

@Module({
  imports: [
    /**
     * Limitation de débit.
     *
     * Deux fenêtres, et la seconde est celle qui compte. La minute borne
     * l'usage courant ; l'heure borne l'acèsès obstiné. Le verrouillage après
     * trois échecs protège déjà UN compte ; il ne protège pas la plateforme
     * de qui essaie un mot de passe courant sur mille adresses — chaque
     * compte ne voit alors qu'un seul échec.
     *
     * Le décompte se fait par adresse, ce qui suppose `trust proxy` : sans
     * lui, tout le trafic paraîtrait venir du proxy et la limite tomberait
     * sur tout le monde à la fois.
     */
    ThrottlerModule.forRoot([
      { name: 'court', ttl: 60_000, limit: 120 },
      { name: 'long', ttl: 3_600_000, limit: 1_200 },
    ]),
    ConfigModule.forRoot({ isGlobal: true, envFilePath: ['.env'] }),
    PrismaModule,
    AuditModule,
    AuthModule,
    ReferentielModule,
    AccountsModule,
    TdrReferentielModule,
    PtbaModule,
    TdrModule,
    TdrDocumentModule,
    TdrAttachmentModule,
    DocumentsModule,
    AiModule,
    AssistantModule,
    MarketplaceModule,
    PassationModule,
  ],
  controllers: [AppController],
  providers: [
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    AppService,
    // Authentification et habilitation appliquées globalement : une route
    // n'est ouverte que si elle porte explicitement `@Public()`.
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: PermissionsGuard },
  ],
})
export class AppModule {}
