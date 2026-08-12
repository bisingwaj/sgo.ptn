import type { NextRequest } from "next/server";
import { InitiativeQuerySchema } from "@/lib/schemas/initiative";
import { listInitiatives } from "@/server/store";
import { ok, parseQuery, simulateLatency } from "@/server/http";

/** GET /api/v1/initiatives — portefeuille paginé, filtrable et triable. */
export async function GET(request: NextRequest) {
  const { data: query, error } = parseQuery(request.url, InitiativeQuerySchema);
  if (error) return error;

  await simulateLatency();
  return ok(listInitiatives(query));
}
