"use client";

/**
 * Saisie d'un montant en dollars entiers, groupé pendant la frappe.
 *
 * `input[type=number]` rendait « 23009880 » : huit chiffres collés, qu'il
 * faut compter pour distinguer de « 230098800 ». Sur un écran budgétaire
 * c'est un écart d'un facteur dix qui ne se voit pas. Les milliers sont donc
 * groupés à mesure — « 23 009 880 » se lit d'un coup d'œil.
 *
 * Deux conséquences, traitées ici et nulle part ailleurs :
 *
 *   — le champ devient du TEXTE. `type=number` refuse les séparateurs, et
 *     `inputMode="numeric"` suffit à lever le pavé numérique sur les mobiles ;
 *   — reformater déplace le curseur. Sans rattrapage, il saute en fin de
 *     champ à chaque touche, et corriger un chiffre au milieu devient
 *     impossible. On repère la position en NOMBRE DE CHIFFRES, seule mesure
 *     stable quand les séparateurs apparaissent et disparaissent.
 *
 * L'état porte les chiffres nus. Le groupement est un fait d'affichage, il ne
 * part jamais en base.
 */

import { useLayoutEffect, useRef } from "react";
import { Field, Input } from "@/components/wizard/WizardFields";
import { digitsOnly, formatUsdBare } from "@/lib/format";

export function ChampMontant({
  label,
  helper,
  required,
  error,
  valeur,
  onChange,
  placeholder,
}: {
  label: string;
  helper?: React.ReactNode;
  required?: boolean;
  error?: string | null;
  /** Chiffres nus, tels qu'ils partent en base. */
  valeur: string;
  onChange: (chiffres: string) => void;
  placeholder?: string;
}) {
  const champ = useRef<HTMLInputElement>(null);
  /** Rang du chiffre devant lequel replacer le curseur, après reformatage. */
  const rangCurseur = useRef<number | null>(null);

  const affiche = valeur ? formatUsdBare(Number(valeur)) : "";

  useLayoutEffect(() => {
    const rang = rangCurseur.current;
    if (rang === null || !champ.current) return;
    rangCurseur.current = null;

    const texte = champ.current.value;
    let vus = 0;
    let position = texte.length;
    if (rang === 0) {
      position = 0;
    } else {
      for (let i = 0; i < texte.length; i += 1) {
        if (texte[i] >= "0" && texte[i] <= "9") {
          vus += 1;
          if (vus === rang) {
            position = i + 1;
            break;
          }
        }
      }
    }
    champ.current.setSelectionRange(position, position);
  });

  /** Chiffres présents avant la position `n` dans une chaîne quelconque. */
  const chiffresAvant = (texte: string, n: number) =>
    texte.slice(0, n).replace(/\D/g, "").length;

  return (
    <Field label={label} helper={helper} required={required} error={error}>
      <Input
        ref={champ}
        type="text"
        inputMode="numeric"
        autoComplete="off"
        value={affiche}
        placeholder={placeholder}
        onChange={(e) => {
          const brut = e.target.value;
          rangCurseur.current = chiffresAvant(brut, e.target.selectionStart ?? brut.length);
          onChange(digitsOnly(brut));
        }}
        onKeyDown={(e) => {
          // Retour arrière sur un séparateur. Le comportement natif retire
          // l'espace, que le reformatage remet aussitôt : la touche paraît
          // morte, et l'auteur appuie plus fort. C'est le chiffre d'avant
          // qu'il visait.
          if (e.key !== "Backspace") return;
          const el = e.currentTarget;
          const debut = el.selectionStart ?? 0;
          if (debut === 0 || debut !== el.selectionEnd) return;
          const precedent = el.value[debut - 1];
          if (precedent >= "0" && precedent <= "9") return;

          e.preventDefault();
          const avant = el.value.slice(0, debut - 1);
          rangCurseur.current = Math.max(0, chiffresAvant(avant, avant.length) - 1);
          onChange(digitsOnly(avant.slice(0, -1) + el.value.slice(debut)));
        }}
      />
    </Field>
  );
}
