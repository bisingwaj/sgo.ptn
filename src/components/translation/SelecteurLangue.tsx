"use client";

/**
 * Le sélecteur de langue.
 *
 * CE QU'IL REMPLACE. Le précédent proposait quatre langues — français,
 * anglais, lingala, kiswahili — et n'en traduisait aucune : `useText`
 * n'était appelé que dans un fichier sur cent quatre-vingt-un. Un sélecteur
 * qui ne fait rien use la confiance à chaque usage, et le dépôt le proscrit
 * explicitement. Les six langues du corpus concernent le SITE PUBLIC, qui
 * n'est pas dans ce dépôt ; la plateforme, elle, en sert deux.
 *
 * POURQUOI UN RECHARGEMENT. La langue vit dans un cookie que le SERVEUR lit
 * à chaque rendu : la changer sans recharger laisserait les parties rendues
 * au serveur dans l'ancienne langue, et l'écran mélangerait les deux.
 * `router.refresh()` redemande le rendu sans repartir de zéro — la position
 * dans la page et l'état des formulaires survivent.
 */

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { Translate, Checkmark, ChevronDown } from "@carbon/icons-react";
import { LANGUES, LIBELLES_LANGUE, type Langue } from "@/i18n/langue";
import { changerLangue } from "@/i18n/actions";
import styles from "./SelecteurLangue.module.scss";

export function SelecteurLangue({ compact }: { compact?: boolean }) {
  const active = useLocale() as Langue;
  const t = useTranslations("langue");
  const router = useRouter();
  const [ouvert, setOuvert] = useState(false);
  const [enCours, demarrer] = useTransition();

  const choisir = (langue: Langue) => {
    setOuvert(false);
    if (langue === active) return;

    // Le cookie se pose au SERVEUR : il y est lu à chaque rendu, et une
    // écriture depuis le navigateur laisserait les parties rendues au
    // serveur dans l'ancienne langue jusqu'à la navigation suivante.
    demarrer(async () => {
      await changerLangue(langue);
      router.refresh();
    });
  };

  return (
    <div className={styles.enveloppe}>
      <button
        type="button"
        className={`${styles.declencheur} ${compact ? styles.compact : ""}`}
        onClick={() => setOuvert((o) => !o)}
        aria-haspopup="listbox"
        aria-expanded={ouvert}
        aria-label={t("active", { langue: LIBELLES_LANGUE[active].nom })}
        disabled={enCours}
      >
        <Translate size={16} aria-hidden />
        {!compact && <span className={styles.sigle}>{LIBELLES_LANGUE[active].sigle}</span>}
        <ChevronDown size={12} aria-hidden className={ouvert ? styles.chevronOuvert : ""} />
      </button>

      {ouvert && (
        <>
          {/* Un voile qui ferme au clic ailleurs. Sans lui, le menu resterait
              ouvert derrière la page, et un second clic le rouvrirait. */}
          <button
            type="button"
            className={styles.voile}
            onClick={() => setOuvert(false)}
            aria-label={t("changer")}
            tabIndex={-1}
          />
          <ul className={styles.menu} role="listbox" aria-label={t("selecteur")}>
            {LANGUES.map((langue) => {
              const l = LIBELLES_LANGUE[langue];
              const choisie = langue === active;
              return (
                <li key={langue}>
                  <button
                    type="button"
                    role="option"
                    aria-selected={choisie}
                    className={`${styles.option} ${choisie ? styles.optionActive : ""}`}
                    onClick={() => choisir(langue)}
                  >
                    <span className={styles.optionSigle}>{l.sigle}</span>
                    <span className={styles.optionTexte}>
                      <strong>{l.nom}</strong>
                      <em>{l.note}</em>
                    </span>
                    {choisie && <Checkmark size={14} aria-hidden />}
                  </button>
                </li>
              );
            })}
            {/* Ce que la traduction NE FAIT PAS. Un TDR reste dans la langue
                de son auteur : le traduire produirait une seconde version
                d'une pièce contractuelle, et deux versions qui circulent se
                contredisent tôt ou tard. */}
            <li className={styles.reserve}>{t("faitFoi")}</li>
          </ul>
        </>
      )}
    </div>
  );
}
