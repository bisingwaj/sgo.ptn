/**
 * Ce que le serveur sait de la langue, à chaque rendu.
 *
 * `next-intl` appelle cette fonction pour chaque requête rendue côté
 * serveur : elle lit le cookie et charge le dictionnaire correspondant.
 *
 * Aucun repli silencieux sur une locale inconnue : une valeur que personne
 * n'a écrite est une valeur qu'on n'a pas voulue, et servir l'anglais à qui
 * a demandé le lingala serait pire que de servir le français.
 */

import { cookies } from "next/headers";
import { getRequestConfig } from "next-intl/server";
import { COOKIE_LANGUE, LANGUE_PAR_DEFAUT, estLangue } from "./langue";

export default getRequestConfig(async () => {
  const magasin = await cookies();
  const brut = magasin.get(COOKIE_LANGUE)?.value;
  const locale = estLangue(brut) ? brut : LANGUE_PAR_DEFAUT;

  return {
    locale,
    messages: (await import(`../../messages/${locale}.json`)).default,
    // Les dates et les nombres suivent la langue : « 12 sept. 2026 » en
    // français, « Sep 12, 2026 » en anglais. Le fuseau est celui de Kinshasa
    // — sans lui, un rendu côté serveur daterait en UTC et un dossier
    // déposé à 23 h paraîtrait déposé le lendemain.
    timeZone: "Africa/Kinshasa",
  };
});
