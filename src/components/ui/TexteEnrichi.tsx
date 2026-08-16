/**
 * Le texte de l'assistant, mis en forme.
 *
 * Le modèle répond en balisage léger — du gras, de l'italique, des listes.
 * Rendu tel quel, ce balisage s'affiche en clair et encombre la lecture ;
 * rendu correctement, il aide : un récapitulatif de dossier se parcourt
 * mieux avec des puces et des intitulés en gras qu'en bloc de prose.
 *
 * Ce fichier ne fait que traduire en éléments l'arbre produit par
 * `src/lib/balisage.ts`. Toute la décision — où commence un gras, ce qui
 * n'en est pas un — vit là-bas, où elle se vérifie en s'exécutant.
 *
 * AUCUN HTML N'EST JAMAIS INTERPRÉTÉ : on construit des éléments React, et
 * `dangerouslySetInnerHTML` n'apparaît pas ici. Le texte vient d'un modèle,
 * donc d'une source que personne ne maîtrise, et qui a pu lire une pièce
 * jointe fournie par un tiers.
 *
 * POUR LA CONVERSATION, PAS POUR LE DOSSIER. Une valeur de champ ne porte
 * aucun balisage — elle part telle quelle dans une pièce contractuelle. Le
 * balisage y est écarté à l'écriture, côté serveur.
 */

import { Fragment as ReactFragment, type ReactNode } from "react";
import { analyser, type Fragment } from "@/lib/balisage";
import styles from "./TexteEnrichi.module.scss";

function rendre(fragments: Fragment[], prefixe = ""): ReactNode[] {
  return fragments.map((f, i) => {
    const cle = `${prefixe}${i}`;
    if (f.genre === "texte") return <ReactFragment key={cle}>{f.texte}</ReactFragment>;
    if (f.genre === "code")
      return (
        <code key={cle} className={styles.code}>
          {f.texte}
        </code>
      );
    if (f.genre === "gras") return <strong key={cle}>{rendre(f.enfants, `${cle}.`)}</strong>;
    return <em key={cle}>{rendre(f.enfants, `${cle}.`)}</em>;
  });
}

export function TexteEnrichi({ children }: { children: string }) {
  const blocs = analyser(children);

  return (
    <div className={styles.texte}>
      {blocs.map((b, i) => {
        if (b.genre === "intitule") {
          return (
            <p key={i} className={styles.intitule}>
              {rendre(b.fragments, `t${i}.`)}
            </p>
          );
        }

        if (b.genre === "liste") {
          const entrees = b.entrees.map((e, j) => <li key={j}>{rendre(e, `l${i}.${j}.`)}</li>);
          return b.ordonnee ? (
            <ol key={i} className={`${styles.liste} ${styles.listeOrdonnee}`}>
              {entrees}
            </ol>
          ) : (
            <ul key={i} className={styles.liste}>
              {entrees}
            </ul>
          );
        }

        return (
          <p key={i}>
            {b.lignes.map((l, j) => (
              <ReactFragment key={j}>
                {j > 0 && <br />}
                {rendre(l, `p${i}.${j}.`)}
              </ReactFragment>
            ))}
          </p>
        );
      })}
    </div>
  );
}
