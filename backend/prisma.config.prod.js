/**
 * Configuration Prisma pour le conteneur de production.
 *
 * POURQUOI UN SECOND FICHIER. `prisma.config.ts` est du TypeScript et
 * importe `dotenv` : le premier demande un chargeur que l'image n'a pas,
 * le second lit un fichier `.env` qui n'y est pas non plus — les variables
 * arrivent par l'environnement du conteneur, jamais par une couche.
 *
 * Sans configuration lisible, `prisma migrate deploy` s'arrête sur « The
 * datasource.url property is required », et le conteneur redémarre en
 * boucle. Constaté au premier déploiement.
 *
 * Il ne porte pas d'amorçage : le seed est un geste de développement, et
 * un conteneur qui redémarre ne doit pas pouvoir réinsérer des données.
 */
module.exports = {
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
  },
  datasource: {
    url: process.env.DATABASE_URL,
  },
};
