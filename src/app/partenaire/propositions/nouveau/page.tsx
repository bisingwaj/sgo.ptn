import { redirect } from "next/navigation";

/**
 * Ancien parcours de rédaction, remplacé par le parcours unique
 * `/tdr/nouveau`. Il coexistait avec celui du MDA, avec un modèle de
 * données incompatible, et n'enregistrait rien.
 */
export default function LegacyRedirect() {
  redirect("/tdr/nouveau");
}
