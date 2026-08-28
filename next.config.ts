import path from "path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  sassOptions: {
    includePaths: [path.join(__dirname, "node_modules")],
  },

  /**
   * Sortie autonome, pour le conteneur.
   *
   * Next rassemble alors dans `.next/standalone` le serveur et les SEULES
   * dépendances qu'il atteint réellement. L'image finale n'emporte plus
   * `node_modules` en entier — Carbon et ses icônes pèsent à eux seuls
   * plusieurs centaines de méga-octets dont presque rien ne sert à
   * l'exécution.
   *
   * Sans effet en développement : `next dev` l'ignore.
   */
  output: "standalone",

  /**
   * L'en-tête qui nomme le serveur ne sort pas.
   *
   * « X-Powered-By: Next.js » annonce la pile à qui cherche une version
   * vulnérable. Cela n'arrête personne de déterminé ; cela évite d'être
   * trouvé par un balayage qui ne cherchait que ça.
   */
  poweredByHeader: false,

  /**
   * Relais vers une API distante, pour le développement seulement.
   *
   * LE PROBLÈME. L'API de production n'autorise que `https://*.vercel.app`.
   * Un navigateur ouvert sur `http://localhost:3000` voit donc son préflight
   * refusé — 404 sans en-tête `Access-Control-Allow-Origin` — et la requête
   * n'est même jamais envoyée. Se connecter en local avec un compte réel
   * était impossible.
   *
   * LA SOLUTION. Le CORS est une politique de NAVIGATEUR : il ne s'applique
   * qu'aux appels partant d'une page. Quand le serveur Next relaie lui-même,
   * l'appel devient serveur-à-serveur et sort du domaine du mécanisme. La
   * page n'appelle plus qu'elle-même — même origine, aucun préflight.
   *
   * Vérifié plutôt que supposé : `POST /api/auth/login` sans en-tête
   * `Origin` répond 401, donc la requête atteint bien la logique
   * d'authentification. `main.ts` accepte explicitement l'absence d'origine
   * (`if (!origin) return callback(null, true)`) — un appel hors navigateur
   * n'a rien à arbitrer.
   *
   * RIEN N'EST OUVERT EN PRODUCTION. Aucune origine n'a été ajoutée à
   * `CORS_ORIGIN` : ouvrir la production à `localhost` l'aurait exposée à
   * toute machine de développement. Le contournement vit ici, et seulement
   * chez qui pose la variable.
   *
   * `API_PROXY_TARGET` n'a PAS le préfixe `NEXT_PUBLIC_` : elle reste au
   * serveur et n'est jamais inscrite dans le code envoyé au navigateur.
   * Absente — le cas de Vercel et de l'image Docker, qui n'ont pas de
   * `.env.local` — cette fonction ne déclare rien et le comportement normal
   * est intact.
   *
   * Le préfixe `/api-distant` évite `/api/v1`, occupé par les gestionnaires
   * de route locaux qui servent les données de démonstration.
   */
  async rewrites() {
    const cible = process.env.API_PROXY_TARGET?.trim();
    if (!cible) return [];

    return [
      {
        source: "/api-distant/:chemin*",
        destination: `${cible.replace(/\/+$/, "")}/:chemin*`,
      },
    ];
  },
};

export default nextConfig;
