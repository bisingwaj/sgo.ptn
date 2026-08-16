"use client";

/**
 * Liste d'entrées ordonnées.
 *
 * Première version : chaque entrée déployait ses deux ou trois champs de
 * saisie à même la liste. Trois défauts en découlaient, et le troisième
 * était le pire.
 *
 *  1. Dix objectifs faisaient dix fois trois zones de texte. La liste
 *     cessait d'être lisible au moment précis où elle devenait utile.
 *  2. Rien ne distinguait l'énoncé de son critère : même corps, même
 *     graisse, alors que l'un est la chose et l'autre son appui.
 *  3. On pouvait ouvrir trois entrées vides d'affilée, et le compteur les
 *     comptait. Une liste qui annonce cinq objectifs dont deux sont vides
 *     ment à qui la relit — et le contrôle de complétude passerait.
 *
 * Ici la liste se LIT : une ligne par entrée, l'énoncé en tête, son appui
 * en dessous. La saisie se fait en modale, qui refuse de fermer sur un
 * énoncé vide. Une entrée existe ou n'existe pas.
 */

import { useState } from "react";
import { Modal, TextArea, TextInput } from "@carbon/react";
import {
  Add,
  AiGenerate,
  ArrowDown,
  ArrowUp,
  Chat,
  ChevronDown,
  Edit,
  TrashCan,
} from "@carbon/icons-react";

export interface ChampEntree {
  cle: string;
  libelle: string;
  placeholder?: string;
  /** Zone de texte plutôt que ligne unique — pour un énoncé. */
  long?: boolean;
  /** Sans lui, l'entrée n'a pas lieu d'être. */
  requis?: boolean;
}

export function ListeEntrees<T extends Record<string, string>>({
  titre,
  prefixe,
  items,
  vide,
  champs,
  onChange,
  ajouterLabel,
  videTexte,
  onGenerer,
  onOuvrirAssistant,
  enCours,
  desactive,
  desactiveRaison,
  labelGenerer,
}: {
  titre: string;
  /** Repère d'ordre — « O » pour un objectif, « L » pour un livrable. */
  prefixe: string;
  items: T[];
  vide: T;
  champs: ChampEntree[];
  onChange: (v: T[]) => void;
  ajouterLabel: string;
  videTexte: string;
  onGenerer: () => void;
  onOuvrirAssistant: () => void;
  enCours?: boolean;
  desactive?: boolean;
  desactiveRaison?: string;
  labelGenerer: string;
}) {
  const [menu, setMenu] = useState(false);
  /** Entrée en cours d'édition. `-1` = création. */
  const [edite, setEdite] = useState<number | null>(null);
  const [brouillon, setBrouillon] = useState<T>(vide);

  const [principal, ...appuis] = champs;

  const ouvrir = (i: number | null) => {
    setEdite(i ?? -1);
    setBrouillon(i === null ? { ...vide } : { ...items[i] });
  };

  const valider = () => {
    const n = [...items];
    if (edite === -1) n.push(brouillon);
    else if (edite !== null) n[edite] = brouillon;
    onChange(n);
    setEdite(null);
  };

  /** L'ordre compte : le document renvoie à « O2 », « L1 ». */
  const deplacer = (i: number, sens: -1 | 1) => {
    const j = i + sens;
    if (j < 0 || j >= items.length) return;
    const n = [...items];
    [n[i], n[j]] = [n[j], n[i]];
    onChange(n);
  };

  const complet = champs
    .filter((c) => c.requis)
    .every((c) => (brouillon[c.cle] ?? "").trim().length > 0);

  return (
    <div className="border-subtle bg-background flex w-full flex-col border">
      {/* ---------- Barre de tête ---------- */}
      <div className="border-subtle bg-layer flex flex-wrap items-center gap-2 border-b px-3 py-1.5">
        <span className="text-caption text-secondary font-medium">{titre}</span>
        <span className="text-caption text-helper mono tabular-nums">
          {items.length} entrée{items.length > 1 ? "s" : ""}
        </span>

        <button
          type="button"
          onClick={() => ouvrir(null)}
          className="ptn-carte-liste text-secondary hover:bg-layer-hover hover:text-primary inline-flex h-7 w-7 items-center justify-center"
          aria-label={ajouterLabel}
          title={ajouterLabel}
        >
          <Add size={16} aria-hidden />
        </button>

        <div className="relative ml-auto flex">
          <button
            type="button"
            onClick={onGenerer}
            disabled={enCours || desactive}
            title={desactive ? desactiveRaison : undefined}
            className="bg-ai hover:bg-ai-hover text-on-color text-caption ptn-carte-liste inline-flex items-center gap-2 px-3 py-1.5 font-medium disabled:cursor-not-allowed disabled:hover:bg-ai disabled:opacity-40"
          >
            <AiGenerate size={16} aria-hidden />
            {enCours ? "Rédaction…" : labelGenerer}
          </button>
          <button
            type="button"
            onClick={() => setMenu((v) => !v)}
            disabled={desactive}
            aria-haspopup="menu"
            aria-expanded={menu}
            aria-label="Autres options d’assistance"
            className="bg-ai hover:bg-ai-hover text-on-color ptn-carte-liste border-l-on-color/25 inline-flex items-center border-l px-1.5 py-1.5 disabled:cursor-not-allowed disabled:hover:bg-ai disabled:opacity-40"
          >
            <ChevronDown size={16} aria-hidden />
          </button>

          {menu && (
            <div
              role="menu"
              className="border-subtle bg-background ptn-entree-ligne absolute top-full right-0 z-10 mt-1 w-72 border shadow-lg"
            >
              <button
                type="button"
                role="menuitem"
                className="hover:bg-layer flex w-full items-start gap-3 px-4 py-3 text-left"
                onClick={() => {
                  setMenu(false);
                  onOuvrirAssistant();
                }}
              >
                <Chat size={16} className="text-ai mt-0.5 shrink-0" aria-hidden />
                <span>
                  <span className="text-body text-primary block">Guider l’assistant</span>
                  <span className="text-caption text-helper block">
                    Dire précisément ce que vous attendez, et relire tout ce qui a été fait sur
                    ce dossier.
                  </span>
                </span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ---------- Liste ----------
          Lignes jointives, séparées d'un filet : on parcourt une liste, on
          ne feuillette pas des cartes. */}
      {items.length === 0 ? (
        <p className="text-body text-helper px-6 py-10 text-center">{videTexte}</p>
      ) : (
        <ol>
          {items.map((item, i) => (
            <li
              key={i}
              className="border-subtle hover:bg-layer group flex items-start gap-4 border-b px-4 py-3.5 last:border-b-0"
            >
              <span
                className="text-caption text-helper mono w-8 shrink-0 pt-1 tabular-nums"
                aria-hidden
              >
                {prefixe}
                {i + 1}
              </span>

              {/* L'énoncé est la chose, l'appui n'est que son appui : ils ne
                  peuvent pas porter le même corps ni la même graisse. */}
              <button
                type="button"
                onClick={() => ouvrir(i)}
                className="min-w-0 flex-1 text-left"
                aria-label={`Modifier ${prefixe}${i + 1}`}
              >
                <span className="text-body-lg text-primary block font-medium">
                  {item[principal.cle]?.trim() || (
                    <span className="text-helper italic">Sans énoncé</span>
                  )}
                </span>
                {appuis.map((c) =>
                  item[c.cle]?.trim() ? (
                    <span key={c.cle} className="text-caption text-secondary mt-1 block">
                      <span className="text-helper">{c.libelle} — </span>
                      {item[c.cle]}
                    </span>
                  ) : null,
                )}
              </button>

              <div className="flex shrink-0 items-center gap-0.5 pt-0.5">
                <button
                  type="button"
                  onClick={() => deplacer(i, -1)}
                  disabled={i === 0}
                  aria-label={`Monter ${prefixe}${i + 1}`}
                  className="ptn-carte-liste text-secondary hover:bg-layer-hover hover:text-primary flex h-7 w-7 items-center justify-center disabled:opacity-25"
                >
                  <ArrowUp size={14} aria-hidden />
                </button>
                <button
                  type="button"
                  onClick={() => deplacer(i, 1)}
                  disabled={i === items.length - 1}
                  aria-label={`Descendre ${prefixe}${i + 1}`}
                  className="ptn-carte-liste text-secondary hover:bg-layer-hover hover:text-primary flex h-7 w-7 items-center justify-center disabled:opacity-25"
                >
                  <ArrowDown size={14} aria-hidden />
                </button>
                <button
                  type="button"
                  onClick={() => ouvrir(i)}
                  aria-label={`Modifier ${prefixe}${i + 1}`}
                  className="ptn-carte-liste text-secondary hover:bg-layer-hover hover:text-primary flex h-7 w-7 items-center justify-center"
                >
                  <Edit size={14} aria-hidden />
                </button>
                <button
                  type="button"
                  onClick={() => onChange(items.filter((_, x) => x !== i))}
                  aria-label={`Retirer ${prefixe}${i + 1}`}
                  className="ptn-carte-liste text-secondary hover:bg-danger-surface hover:text-danger-text flex h-7 w-7 items-center justify-center"
                >
                  <TrashCan size={14} aria-hidden />
                </button>
              </div>
            </li>
          ))}
        </ol>
      )}

      {/* Second point d'ajout, au bout de la lecture : celui de la barre de
          tête sert quand la liste est longue et qu'on n'a pas à la parcourir. */}
      <div className="border-subtle border-t">
        <button
          type="button"
          onClick={() => ouvrir(null)}
          className="ptn-carte-liste text-caption text-secondary hover:bg-layer hover:text-primary flex w-full items-center justify-center gap-2 py-3"
        >
          <Add size={16} aria-hidden />
          {ajouterLabel}
        </button>
      </div>

      {/* ---------- Saisie ----------
          En modale : une entrée s'écrit d'un geste, entièrement, ou pas du
          tout. C'est ce qui empêche d'en laisser trois vides au compteur. */}
      <Modal
        open={edite !== null}
        modalHeading={edite === -1 ? ajouterLabel : `Modifier ${prefixe}${(edite ?? 0) + 1}`}
        modalLabel={titre}
        primaryButtonText={edite === -1 ? "Ajouter" : "Enregistrer"}
        secondaryButtonText="Annuler"
        primaryButtonDisabled={!complet}
        onRequestClose={() => setEdite(null)}
        onRequestSubmit={valider}
      >
        <div className="flex flex-col gap-5 pb-4">
          {champs.map((c) =>
            c.long ? (
              <TextArea
                key={c.cle}
                id={`entree-${c.cle}`}
                labelText={c.libelle}
                placeholder={c.placeholder}
                rows={3}
                value={brouillon[c.cle] ?? ""}
                onChange={(e) => setBrouillon({ ...brouillon, [c.cle]: e.target.value } as T)}
              />
            ) : (
              <TextInput
                key={c.cle}
                id={`entree-${c.cle}`}
                labelText={c.libelle}
                placeholder={c.placeholder}
                value={brouillon[c.cle] ?? ""}
                onChange={(e) => setBrouillon({ ...brouillon, [c.cle]: e.target.value } as T)}
              />
            ),
          )}
        </div>
      </Modal>
    </div>
  );
}
