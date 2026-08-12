import type { NextRequest } from "next/server";
import { AnoDecisionSchema } from "@/lib/schemas/ano";
import { decideAno, getAno } from "@/server/store";
import { fail, failGuardrails, ok, parseBody, simulateLatency } from "@/server/http";

/**
 * POST /api/v1/ano/:id/decision — le bailleur se prononce.
 *
 * Le profil est lu dans un en-tête tant que la session n'est pas branchée sur
 * ce domaine. C'est un raccourci ASSUMÉ et temporaire : un en-tête se falsifie
 * trivialement. Il tient uniquement parce que ces routes servent des données
 * de démonstration. Le jour où ce endpoint passe sur le backend NestJS, le
 * profil doit venir du JWT vérifié — jamais du client.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  if (!getAno(id)) {
    return fail(404, `Aucune demande d'ANO ne porte l'identifiant ${id}.`);
  }

  const { data: decision, error } = await parseBody(request, AnoDecisionSchema);
  if (error) return error;

  const actorProfile = request.headers.get("x-ptn-profile") ?? "UGP";
  const outcome = decideAno(id, decision, actorProfile);

  if (outcome.blockers.length > 0) {
    return failGuardrails(outcome.blockers, outcome.warnings);
  }

  await simulateLatency();
  return ok({ request: outcome.request, warnings: outcome.warnings });
}
