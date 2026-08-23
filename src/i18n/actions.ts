"use server";

/**
 * Changer de langue, côté serveur.
 *
 * Le cookie s'écrivait depuis le navigateur — `document.cookie = …` — ce
 * que le compilateur React refuse, et à raison : une écriture directe dans
 * un objet du document échappe à tout suivi de rendu.
 *
 * Une action serveur pose le cookie ET invalide le rendu dans le même
 * aller-retour. Le serveur relit alors la langue et rend les messages
 * correspondants : sans cela, les parties rendues au serveur resteraient
 * dans l'ancienne langue et l'écran mélangerait les deux.
 */

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { COOKIE_LANGUE, COOKIE_LANGUE_DUREE, estLangue } from "./langue";

export async function changerLangue(langue: string): Promise<void> {
  // Une valeur que personne n'a écrite est une valeur qu'on n'a pas voulue :
  // on ne l'inscrit pas, et la langue en cours demeure.
  if (!estLangue(langue)) return;

  const magasin = await cookies();
  magasin.set(COOKIE_LANGUE, langue, {
    path: "/",
    maxAge: COOKIE_LANGUE_DUREE,
    // `lax` : le cookie suit une navigation ordinaire, mais ne part pas sur
    // une requête déclenchée par un site tiers. Il ne porte aucun secret,
    // seulement une préférence — rien n'oblige pour autant à l'exposer.
    sameSite: "lax",
    httpOnly: false,
  });

  // Toute la mise en page dépend de la langue, pas seulement l'écran
  // courant : l'invalidation porte donc sur la racine.
  revalidatePath("/", "layout");
}
