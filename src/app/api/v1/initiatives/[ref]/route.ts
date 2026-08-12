import { getInitiative } from "@/server/store";
import { fail, ok, simulateLatency } from "@/server/http";

/** GET /api/v1/initiatives/:ref — fiche détaillée d'un marché. */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ ref: string }> },
) {
  const { ref } = await params;
  const initiative = getInitiative(ref);

  if (!initiative) {
    return fail(404, `Aucune initiative ne porte la référence ${ref}.`);
  }

  await simulateLatency();
  return ok(initiative);
}
