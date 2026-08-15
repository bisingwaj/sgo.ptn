"use client";

/**
 * Assistance rédactionnelle sur un champ.
 *
 * Trois règles, qui tiennent tout le reste :
 *
 *  1. Le modèle PROPOSE. Rien n'entre dans le dossier sans un geste
 *     explicite de l'auteur — pas de champ qui se remplit tout seul.
 *  2. Ce sur quoi la proposition repose est montré, toujours. Un texte
 *     dont on ignore l'ancrage ne se relit pas, il se recopie.
 *  3. Ce que l'assistant a touché reste marqué, même réécrit par-dessus.
 *     Un TDR est une pièce contractuelle : il faut pouvoir établir ce
 *     qu'une machine y a écrit.
 *
 * Le violet est celui de l'IA, et de rien d'autre — règle de la maison.
 */

import { useState } from "react";
import { AiGenerate, CheckmarkFilled, Close, Renew, WarningAltFilled } from "@carbon/icons-react";
import { tdrApi, ApiError } from "@/lib/api";

interface Props {
  /** Identifiant du dossier. Absent tant que le brouillon n'est pas ouvert. */
  tdrId: string | null;
  /** Clé du champ au registre du serveur — `context`, `methodology`… */
  champ: string;
  /** Ce que l'assistant fera, dit à l'auteur avant qu'il clique. */
  annonce: string;
  /** Texte actuel du champ : commande le régime rédaction / reprise. */
  valeur: string;
  /** L'auteur reprend la proposition. */
  onReprendre: (texte: string) => void;
  /** Le champ a déjà reçu une contribution de l'assistant. */
  dejaAssiste?: boolean;
}

export function AssistanceChamp({
  tdrId,
  champ,
  annonce,
  valeur,
  onReprendre,
  dejaAssiste,
}: Props) {
  const [proposition, setProposition] = useState<string | null>(null);
  const [ancrage, setAncrage] = useState<string[]>([]);
  const [mode, setMode] = useState<"redaction" | "reprise" | null>(null);
  const [enCours, setEnCours] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);

  const ouvert = Boolean(tdrId);
  const aDuTexte = valeur.trim().length > 0;

  const demander = async () => {
    if (!tdrId) return;
    setEnCours(true);
    setErreur(null);
    try {
      const r = await tdrApi.assistField(tdrId, champ);
      setProposition(r.proposal);
      setAncrage(r.groundedOn);
      setMode(r.mode ?? null);
    } catch (e) {
      setProposition(null);
      setErreur(
        e instanceof ApiError && e.status === 503
          ? "L’assistance n’est pas configurée sur ce serveur. Le champ reste à remplir à la main."
          : e instanceof Error
            ? e.message
            : "La proposition n’a pas abouti.",
      );
    } finally {
      setEnCours(false);
    }
  };

  return (
    <section
      className="border-ai-surface bg-ai-surface border"
      aria-label="Assistance rédactionnelle"
    >
      <header className="flex flex-wrap items-center gap-2 px-4 pt-3">
        <AiGenerate size={16} className="text-ai shrink-0" aria-hidden />
        <span className="text-caption text-ai-text font-semibold tracking-wider uppercase">
          Assistance
        </span>
        {dejaAssiste && (
          <span className="text-caption text-ai-text border-ai ml-auto border px-2 py-0.5">
            Champ déjà assisté
          </span>
        )}
      </header>

      <p className="text-caption text-secondary px-4 pt-2 pb-3">{annonce}</p>

      {erreur && (
        <p className="text-caption text-danger-text flex items-start gap-2 px-4 pb-3">
          <WarningAltFilled size={16} className="mt-0.5 shrink-0" aria-hidden />
          {erreur}
        </p>
      )}

      {proposition && (
        <div className="px-4 pb-3">
          <div className="border-subtle bg-background ptn-entree-ligne max-h-80 overflow-y-auto border p-4">
            <p className="text-body text-primary whitespace-pre-wrap">{proposition}</p>
          </div>

          {/* Le modèle employé est consigné au journal d'audit, pas affiché :
              ce qui intéresse le rédacteur, c'est ce sur quoi la proposition
              repose, et qu'elle reste à relire. */}
          <p className="text-caption text-helper mt-2">
            {mode === "reprise"
              ? "Reprise de votre texte : la forme change, aucun fait nouveau n’a été ajouté. "
              : ""}
            Établie à partir de {ancrage.join(" · ") || "l’état du dossier"}. Aucune donnée
            personnelle n’a été transmise. À relire et à adapter avant transmission.
          </p>
        </div>
      )}

      <footer className="flex flex-wrap items-center gap-2 px-4 pb-3">
        {proposition ? (
          <>
            <button
              type="button"
              className="ptn-carte-liste bg-ai text-on-color text-caption inline-flex items-center gap-2 px-3 py-2 font-medium"
              onClick={() => {
                onReprendre(proposition);
                setProposition(null);
              }}
            >
              <CheckmarkFilled size={16} aria-hidden />
              {aDuTexte ? "Remplacer mon texte" : "Reprendre dans le champ"}
            </button>
            <button
              type="button"
              className="ptn-carte-liste border-ai text-ai-text text-caption inline-flex items-center gap-2 border px-3 py-2"
              onClick={() => void demander()}
              disabled={enCours}
            >
              <Renew size={16} aria-hidden />
              {enCours ? "En cours…" : "Proposer autre chose"}
            </button>
            <button
              type="button"
              className="text-caption text-secondary hover:text-primary inline-flex items-center gap-1.5 px-2 py-2"
              onClick={() => setProposition(null)}
            >
              <Close size={16} aria-hidden />
              Écarter
            </button>
          </>
        ) : (
          <button
            type="button"
            className="ptn-carte-liste bg-ai text-on-color text-caption inline-flex items-center gap-2 px-3 py-2 font-medium disabled:cursor-not-allowed disabled:opacity-40"
            onClick={() => void demander()}
            disabled={enCours || !ouvert}
            title={ouvert ? undefined : "Disponible une fois le brouillon ouvert."}
          >
            <AiGenerate size={16} aria-hidden />
            {enCours
              ? "Rédaction en cours…"
              : aDuTexte
                ? "Reprendre ce que j’ai écrit"
                : "Proposer une rédaction"}
          </button>
        )}

        {!ouvert && (
          <span className="text-caption text-helper">
            Disponible une fois le brouillon ouvert, à l’étape Identification.
          </span>
        )}
      </footer>
    </section>
  );
}
