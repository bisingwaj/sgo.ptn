import { Logger, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule);
  const config = app.get(ConfigService);
  const logger = new Logger('Bootstrap');

  app.setGlobalPrefix('api');

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  app.enableCors({
    origin: config.get<string>('CORS_ORIGIN') ?? 'http://localhost:3000',
    credentials: true,
  });

  if (config.get<string>('NODE_ENV') !== 'production') {
    const swagger = new DocumentBuilder()
      .setTitle('PTN-RDC · API de gouvernance')
      .setDescription(
        'Projet de Transformation Numérique de la RDC · P180495 · IDA + AFD. ' +
          'Aligné sur le Manuel d’Exécution du Projet du 23 juin 2025.',
      )
      .setVersion('0.1.0')
      .addBearerAuth()
      .build();
    SwaggerModule.setup('api/docs', app, SwaggerModule.createDocument(app, swagger));
  }

  // BACKENDPORT prime sur PORT : elle permet de lever un conflit de port
  // local sans toucher au reste de la configuration. À défaut, 3001 —
  // valeur documentée dans .env.example, attendue par CORS_ORIGIN et par
  // NEXT_PUBLIC_API_URL côté frontend.
  const port = config.get<number>('BACKENDPORT') ?? config.get<number>('PORT') ?? 3001;
  await app.listen(port);

  logger.log(`API démarrée sur http://localhost:${port}/api`);
  if (config.get<string>('NODE_ENV') !== 'production') {
    logger.log(`Documentation OpenAPI : http://localhost:${port}/api/docs`);
  }
}

void bootstrap();
