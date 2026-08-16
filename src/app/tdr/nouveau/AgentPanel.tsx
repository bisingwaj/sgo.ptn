"use client";

/**
 * L'assistant du dossier — panneau du parcours de rédaction.
 *
 * Il ne propose plus des textes à recopier : il écrit dans les champs. Ce
 * qu'il écrit est marqué, et chaque écriture reste annulable tant que la
 * conversation est ouverte — c'est ce qui remplace le geste de reprise que
 * l'ancien parcours exigeait.
 *
 * Trois choses arrivent au fil de l'eau, et c'est délibéré : l'outil qu'il
 * mobilise, le texte à mesure qu'il s'écrit, puis ce qu'il en dit. Sans
 * cela, l'auteur regardait un écran immobile pendant vingt secondes.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { parlerAgent, type AgentEvent, type TourDeParole } from "@/lib/agent-stream";
import { AiGenerate, Close, SendAlt, Undo, WarningAltFilled } from "@carbon/icons-react";
import { useAssistant, type Bulle, type Ecriture } from "./assistant-contexte";

/** Une écriture faite par l'assistant, et de quoi la défaire. */
export type { Ecriture } from "./assistant-contexte";

const SUGGESTIONS = [
  "Rédige le contexte à partir de l’activité du plan.",
  "Propose trois objectifs SMART et leurs critères.",
  "Raccourcis la justification de moitié.",
];

export function AgentPanel({
  tdrId,
  onEcriture,
  onAnnuler,
  etapeCourante,
}: {
  tdrId: string | null;
  /** Le parcours recharge le champ écrit depuis la base */
  onEcriture: (e: Ecriture) => void;
  /** Restaure la valeur précédente */
  onAnnuler: (e: Ecriture) => void;
  etapeCourante: string;
}) {
  // Le fil vit dans le contexte : une génération lancée depuis un champ s'y
  // inscrit aussi, et le panneau n'en est qu'une vue.
  const { ouvert, fermer, bulles, setBulles, champCourant } = useAssistant();
  const [saisie, setSaisie] = useState("");
  const [occupe, setOccupe] = useState(false);
  const [apercu, setApercu] = useState<{ champ: string; texte: string } | null>(null);

  const filRef = useRef<HTMLDivElement>(null);
  const abandonRef = useRef<AbortController | null>(null);

  // Le fil suit la génération : un texte qui s'écrit hors de vue ne sert
  // à rien.
  useEffect(() => {
    filRef.current?.scrollTo({ top: filRef.current.scrollHeight, behavior: "smooth" });
  }, [bulles, apercu]);

  useEffect(() => () => abandonRef.current?.abort(), []);

  const envoyer = useCallback(
    async (instruction: string) => {
      if (!tdrId || occupe || !instruction.trim()) return;

      const historique: TourDeParole[] = bulles
        .filter((b) => b.texte.trim())
        .map((b) => ({ role: b.role, content: b.texte }));

      setSaisie("");
      setOccupe(true);
      setApercu(null);
      setBulles((b) => [
        ...b,
        { role: "user", texte: instruction, actes: [], ecritures: [] },
        { role: "assistant", texte: "", actes: [], ecritures: [], encours: true },
      ]);

      const controleur = new AbortController();
      abandonRef.current = controleur;

      const majDerniere = (f: (b: Bulle) => Bulle) =>
        setBulles((tout) => tout.map((b, i) => (i === tout.length - 1 ? f(b) : b)));

      try {
        for await (const ev of parlerAgent(tdrId, instruction, historique, controleur.signal)) {
          appliquer(ev, majDerniere, setApercu, onEcriture);
        }
      } finally {
        majDerniere((b) => ({ ...b, encours: false }));
        setApercu(null);
        setOccupe(false);
        abandonRef.current = null;
      }
    },
    [tdrId, occupe, bulles, onEcriture],
  );

  // Fermé, il n'occupe rien : plus de poignée flottante en permanence.
  // L'assistance s'ouvre depuis la barre d'outils du champ, là où l'on
  // écrit — c'est le seul endroit où l'on en a besoin.
  if (!ouvert) return null;

  const vide = bulles.length === 0;

  return (
    <aside
      className="border-subtle bg-background flex h-full max-h-full w-full min-h-0 flex-col border-l"
      aria-label="Assistant du dossier"
    >
      {/* ---------- En-tête ---------- */}
      <header className="border-subtle flex items-center gap-3 border-b px-4 py-3">
        <span className="bg-ai-surface text-ai flex h-8 w-8 shrink-0 items-center justify-center">
          <AiGenerate size={18} aria-hidden />
        </span>
        <span className="min-w-0 flex-1">
          <span className="text-body text-primary block font-medium">Assistant du dossier</span>
          <span className="text-caption text-helper block truncate">
            {champCourant ?? etapeCourante}
          </span>
        </span>
        <button
          type="button"
          onClick={fermer}
          aria-label="Fermer l’assistant"
          className="ptn-carte-liste text-secondary hover:bg-layer hover:text-primary flex h-8 w-8 items-center justify-center"
        >
          <Close size={16} aria-hidden />
        </button>
      </header>

      {/* ---------- Fil ---------- */}
      <div
        ref={filRef}
        // `min-h-0` : sans lui, un enfant flex grandit avec son contenu au
        // lieu de defiler, et pousse la zone de saisie hors du cadre.
        className="flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto p-4"
      >
        {vide && (
          <div className="flex flex-col gap-4 py-6">
            <p className="text-body text-secondary">
              Dites-lui ce que vous attendez. Il écrit directement dans les champs du dossier
              et signale ce qu’il a touché.
            </p>
            <p className="text-caption text-helper border-subtle border-l-2 pl-3">
              Les montants, le rattachement au plan et les attestations de conformité ne lui
              sont pas ouverts : ils se décident, ils ne se rédigent pas.
            </p>
            <div className="flex flex-col gap-2">
              {SUGGESTIONS.map((sug) => (
                <button
                  key={sug}
                  type="button"
                  onClick={() => void envoyer(sug)}
                  disabled={!tdrId}
                  className="ptn-carte-liste border-subtle text-body text-primary hover:border-ai hover:bg-ai-surface border px-3 py-2.5 text-left disabled:cursor-not-allowed disabled:opacity-40"
                >
                  {sug}
                </button>
              ))}
            </div>
          </div>
        )}

        {bulles.map((b, i) =>
          b.role === "user" ? (
            <div key={i} className="flex justify-end">
              <p className="bg-layer text-body text-primary ptn-entree-ligne max-w-[85%] px-3 py-2">
                {b.texte}
              </p>
            </div>
          ) : (
            <div key={i} className="ptn-entree-ligne flex flex-col gap-2">
              {/* Ce que l'assistant fait, à mesure : sans cela l'auteur
                  regardait un écran immobile pendant vingt secondes. */}
              {b.actes.length > 0 && (
                <ul className="flex flex-col gap-1">
                  {b.actes.map((a, j) => (
                    <li
                      key={j}
                      className={`text-caption flex items-center gap-2 ${
                        a.genre === "refus" ? "text-danger-text" : "text-helper"
                      }`}
                    >
                      <i
                        aria-hidden
                        className={`inline-block h-1.5 w-1.5 shrink-0 ${
                          a.genre === "refus" ? "bg-danger" : "bg-ai"
                        }`}
                      />
                      {a.libelle}
                    </li>
                  ))}
                </ul>
              )}

              {b.texte && (
                <p className="text-body text-primary whitespace-pre-wrap">{b.texte}</p>
              )}

              {b.encours && !b.texte && b.actes.length === 0 && (
                <span className="text-caption text-helper" aria-label="L’assistant travaille">
                  L’assistant travaille…
                </span>
              )}

              {b.ecritures.map((e) => (
                <div
                  key={e.champ}
                  className="border-ai bg-ai-surface flex flex-wrap items-center gap-2 border px-3 py-2"
                >
                  <span className="text-caption text-ai-text flex-1">
                    Écrit dans <strong>{e.champ}</strong> · étape {e.etape}
                  </span>
                  <button
                    type="button"
                    onClick={() => onAnnuler(e)}
                    className="ptn-carte-liste border-ai text-ai-text text-caption inline-flex items-center gap-1.5 border px-2 py-1"
                  >
                    <Undo size={13} aria-hidden /> Annuler
                  </button>
                </div>
              ))}
            </div>
          ),
        )}

        {/* Le texte tel qu'il s'écrit dans le champ, avant même d'y être
            enregistré. C'est ce qui remplace l'écran immobile. */}
        {apercu && (
          <div className="border-ai bg-ai-surface border p-3">
            <span className="text-caption text-ai-text block">
              Écriture dans <strong>{apercu.champ}</strong>
            </span>
            <p className="text-body text-primary mt-1 whitespace-pre-wrap">{apercu.texte}</p>
          </div>
        )}
      </div>

      {/* ---------- Saisie ----------
          Un seul contenant : le bouton vit DANS le champ. Deux rectangles
          côte à côte se désolidarisaient dès que le texte grandissait. */}
      <form
        className="border-subtle p-3"
        onSubmit={(e) => {
          e.preventDefault();
          void envoyer(saisie);
        }}
      >
        <div className="border-strong bg-field focus-within:border-ai flex items-end gap-2 border px-3 py-2">
          <textarea
            value={saisie}
            onChange={(e) => setSaisie(e.target.value)}
            placeholder={tdrId ? "Que voulez-vous ?" : "Ouvrez d’abord le brouillon."}
            rows={1}
            disabled={!tdrId || occupe}
            onKeyDown={(e) => {
              // Entrée envoie, Maj+Entrée passe à la ligne : c'est l'usage
              // dans une zone de conversation.
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                void envoyer(saisie);
              }
            }}
            className="ptn-zone-redaction text-body text-primary placeholder:text-placeholder max-h-40 min-h-[1.75rem] flex-1 resize-none border-0 bg-transparent py-1 outline-none"
          />
          <button
            type="submit"
            disabled={!tdrId || occupe || !saisie.trim()}
            aria-label="Envoyer"
            className="bg-ai text-on-color ptn-carte-liste mb-0.5 flex h-8 w-8 shrink-0 items-center justify-center disabled:opacity-30"
          >
            {occupe ? (
              <span className="ptn-points" aria-hidden>
                <i />
                <i />
                <i />
              </span>
            ) : (
              <SendAlt size={16} aria-hidden />
            )}
          </button>
        </div>
        <p className="text-caption text-helper mt-2">
          L’assistant peut se tromper. Tout ce qu’il écrit reste à relire.
        </p>
      </form>
    </aside>
  );
}

/** Traduit un évènement du flux en effet visible. */
function appliquer(
  ev: AgentEvent,
  majDerniere: (f: (b: Bulle) => Bulle) => void,
  setApercu: React.Dispatch<React.SetStateAction<{ champ: string; texte: string } | null>>,
  onEcriture: (e: Ecriture) => void,
): void {
  switch (ev.type) {
    case "travail":
      majDerniere((b) => ({ ...b, actes: [...b.actes, { genre: "travail", libelle: ev.libelle }] }));
      break;

    case "apercu":
      setApercu((v) =>
        v && v.champ === ev.champ
          ? { champ: ev.champ, texte: v.texte + ev.delta }
          : { champ: ev.champ, texte: ev.delta },
      );
      break;

    case "ecriture": {
      const e: Ecriture = { champ: ev.champ, etape: ev.etape, valeur: ev.valeur, avant: ev.avant };
      setApercu(null);
      onEcriture(e);
      majDerniere((b) => ({
        ...b,
        actes: [...b.actes, { genre: "ecriture", libelle: `Champ ${ev.champ} écrit`, champ: ev.champ }],
        ecritures: [...b.ecritures.filter((x) => x.champ !== e.champ), e],
      }));
      break;
    }

    case "refus":
      majDerniere((b) => ({
        ...b,
        actes: [...b.actes, { genre: "refus", libelle: `${ev.champ} : ${ev.motif}` }],
      }));
      break;

    case "texte":
      majDerniere((b) => ({ ...b, texte: b.texte + ev.delta }));
      break;

    case "erreur":
      majDerniere((b) => ({
        ...b,
        actes: [...b.actes, { genre: "refus", libelle: ev.message }],
        encours: false,
      }));
      break;

    default:
      break;
  }
}


export { WarningAltFilled };
