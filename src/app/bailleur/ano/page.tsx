/**
 * L'ancienne inbox ANO de l'espace bailleur.
 *
 * C'était une maquette : des données écrites en dur, des délais qui ne
 * s'écoulaient pas, des boutons sans effet. L'écran réel est `/ano`, et
 * il sert les deux côtés — le bailleur y décide, l'UGPTN y suit ses
 * dépôts. Deux écrans sur le même objet auraient fini par en donner deux
 * lectures.
 *
 * La redirection reste : un signet ou un lien envoyé par courriel doit
 * continuer de mener quelque part.
 */
import { redirect } from "next/navigation";

export default function BailleurAnoPage() {
  redirect("/ano");
}
