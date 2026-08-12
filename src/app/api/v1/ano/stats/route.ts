import { anoStats } from "@/server/store";
import { ok, simulateLatency } from "@/server/http";

/**
 * GET /api/v1/ano/stats — compteurs du cockpit.
 *
 * Endpoint distinct de la liste : le cockpit affiche « 9 ANO en attente »
 * sans avoir besoin des dossiers eux-mêmes. Charger 78 marchés pour en
 * afficher le nombre est le réflexe qui rend un tableau de bord lent.
 */
export async function GET() {
  await simulateLatency(120);
  return ok(anoStats());
}
