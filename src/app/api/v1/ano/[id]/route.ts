import { getAno } from "@/server/store";
import { fail, ok, simulateLatency } from "@/server/http";

/** GET /api/v1/ano/:id — fiche d'une demande de non-objection. */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const request = getAno(id);

  if (!request) {
    return fail(404, `Aucune demande d'ANO ne porte l'identifiant ${id}.`);
  }

  await simulateLatency();
  return ok(request);
}
