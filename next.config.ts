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
};

export default nextConfig;
