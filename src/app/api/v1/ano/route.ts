import type { NextRequest } from "next/server";
import { AnoQuerySchema } from "@/lib/schemas/ano";
import { listAno } from "@/server/store";
import { ok, parseQuery, simulateLatency } from "@/server/http";

/** GET /api/v1/ano — inbox des demandes de non-objection. */
export async function GET(request: NextRequest) {
  const { data: query, error } = parseQuery(request.url, AnoQuerySchema);
  if (error) return error;

  await simulateLatency();
  return ok(listAno(query));
}
