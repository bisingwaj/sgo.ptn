import { Logger, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import type { NestExpressApplication } from '@nestjs/platform-express';
import helmet from 'helmet';
import compression from 'compression';
import { AppModule } from './app.module';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  const config = app.get(ConfigService);
  const logger = new Logger('Bootstrap');
  const production = config.get<string>('NODE_ENV') === 'production';

  app.setGlobalPrefix('api');

  /**
   * L'API vit derrière un proxy qui termine le TLS.
   *
   * Sans cela, `req.ip` vaut l'adresse du proxy pour TOUTE requête : le
   * journal d'audit inscrirait 127.0.0.1 sur chaque acte, et le
   * verrouillage après échecs ne distinguerait plus deux postes. Un
   * journal qui ne sait pas d'où vient un acte ne prouve rien.
   *
   * Un seul saut de confiance : le proxy immédiat. Faire confiance à toute
   * la chaîne laisserait un client forger son `X-Forwarded-For`.
   */
  app.set('trust proxy', 1);

  /**
   * En-têtes de sécurité.
   *
   * La politique de contenu est désactivée ici : cette application ne sert
   * aucune page, seulement du JSON, un flux d'évènements et des fichiers.
   * Une CSP a du sens sur le front, qui vit ailleurs ; posée ici, elle
   * ne protégerait rien et gênerait Swagger en développement.
   *
   * `crossOriginResourcePolicy` est assoupli parce que le front est servi
   * depuis une autre origine et récupère PDF, DOCX et vignettes par
   * `fetch` : la valeur par défaut les bloquerait.
   */
  app.use(
    helmet({
      contentSecurityPolicy: false,
      crossOriginResourcePolicy: { policy: 'cross-origin' },
      crossOriginEmbedderPolicy: false,
    }),
  );

  // Le document d'un TDR fait 118 Ko de PDF et le plan qui le précède est
  // du JSON très répétitif : la compression paie sur les deux.
  app.use(compression());

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
      // En production, le détail des violations décrit la forme attendue
      // par l'API — donc ses colonnes. Le message reste utile en
      // développement, où il fait gagner du temps.
      disableErrorMessages: production,
    }),
  );

  /**
   * Origines autorisées.
   *
   * Plusieurs valeurs sont admises, séparées par des virgules : le front
   * peut vivre sur un domaine et ses prévisualisations sur un autre. Une
   * origine absente de la liste est refusée — et en production on n'accepte
   * jamais l'absence d'origine, qui est le cas d'un appel hors navigateur.
   */
  const origines = (
    config.get<string>('CORS_ORIGIN') ?? 'http://localhost:3000'
  )
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean);

  /**
   * Autorise une origine.
   *
   * Une entrée désigne un domaine exact, ou une famille de sous-domaines :
   * `https://*.vercel.app`. Cette seconde forme sert tant qu'une adresse de
   * déploiement n'est pas stabilisée — les prévisualisations changent de nom
   * à chaque branche, et les énumérer une à une est intenable.
   *
   * LE JOKER NE COUVRE QU'UN NIVEAU. `https://*.vercel.app` accepte
   * `https://a.vercel.app` et refuse `https://vercel.app.attaquant.cd` : le
   * protocole et le suffixe sont comparés strictement, et le sous-domaine
   * doit être non vide et sans point. Sans ces trois conditions, le motif
   * reviendrait à tout ouvrir.
   *
   * Motif repris du call-center qui tourne sur la même machine : deux
   * produits voisins n'ont aucune raison de résoudre différemment le même
   * problème, et le sien avait été éprouvé avant le nôtre.
   */
  const autorise = (origine: string): boolean =>
    origines.some((motif) => {
      if (motif === origine) return true;
      if (!motif.includes('*')) return false;

      const [protocole, reste] = motif.split('://');
      if (!reste?.startsWith('*.')) return false;

      const suffixe = reste.slice(1);
      const attendu = `${protocole}://`;
      if (!origine.startsWith(attendu)) return false;

      const hote = origine.slice(attendu.length);
      if (!hote.endsWith(suffixe)) return false;
      const sous = hote.slice(0, -suffixe.length);
      return sous.length > 0 && !sous.includes('.');
    });

  app.enableCors({
    origin: (origin, callback) => {
      // Absence d'origine : requête hors navigateur — sonde de
      // disponibilité, appel de service à service. Rien à arbitrer : le
      // mécanisme d'origine ne protège que du navigateur d'un tiers.
      if (!origin) return callback(null, true);
      if (autorise(origin)) return callback(null, true);
      logger.warn(`Origine refusée : ${origin}`);
      callback(null, false);
    },
    credentials: true,
    maxAge: 86_400,
  });

  /**
   * La documentation ne paraît pas en production.
   *
   * Elle énumère toutes les routes, leurs permissions et la forme de chaque
   * corps : c'est une carte de l'application offerte à qui la demande.
   */
  if (!production) {
    const swagger = new DocumentBuilder()
      .setTitle('PTN-RDC · API de gouvernance')
      .setDescription(
        'Projet de Transformation Numérique de la RDC · P180495 · IDA + AFD. ' +
          'Aligné sur le Manuel d’Exécution du Projet du 23 juin 2025.',
      )
      .setVersion('0.1.0')
      .addBearerAuth()
      .build();
    SwaggerModule.setup(
      'api/docs',
      app,
      SwaggerModule.createDocument(app, swagger),
    );
  }

  // BACKENDPORT prime sur PORT : elle permet de lever un conflit de port
  // local sans toucher au reste de la configuration.
  const port =
    config.get<number>('BACKENDPORT') ?? config.get<number>('PORT') ?? 3001;

  // En conteneur, écouter sur la boucle locale rendrait l'API injoignable
  // depuis le proxy : rien ne sortirait du conteneur.
  await app.listen(port, '0.0.0.0');

  logger.log(
    `API démarrée sur le port ${port}${production ? ' (production)' : ''}`,
  );
  if (!production) {
    logger.log(`Documentation OpenAPI : http://localhost:${port}/api/docs`);
  }
}

void bootstrap();
