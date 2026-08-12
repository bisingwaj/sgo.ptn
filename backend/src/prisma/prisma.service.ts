import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../../generated/prisma/client';

/**
 * Client Prisma exposé comme provider NestJS.
 *
 * Prisma 7 impose un driver adapter explicite : la connexion passe par
 * `@prisma/adapter-pg` plutôt que par le moteur embarqué des versions
 * antérieures.
 */
@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);

  constructor(config: ConfigService) {
    const connectionString = config.getOrThrow<string>('DATABASE_URL');
    super({ adapter: new PrismaPg({ connectionString }) });
  }

  async onModuleInit(): Promise<void> {
    await this.$connect();
    this.logger.log('Connexion à PostgreSQL établie.');
  }

  async onModuleDestroy(): Promise<void> {
    await this.$disconnect();
  }
}
