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
import styles from "./agent.module.scss";

/** Une écriture faite par l'assistant, et de quoi la défaire. */
export interface Ecriture {
  champ: string;
  etape: string;
  valeur: unknown;
  avant: unknown;
}

interface Bulle {
  role: "user" | "assistant";
  texte: string;
  /** Ce que l'assistant a fait pendant ce tour */
  actes: Array<{ genre: "travail" | "ecriture" | "refus"; libelle: string; champ?: string }>;
  /** Écritures de ce tour, pour l'annulation */
  ecritures: Ecriture[];
  encours?: boolean;
}

const SUGGESTIONS = [
  "Rédige le contexte à partir de l’activité du plan.",
  "Propose trois objectifs SMART et leurs critères.",
  "Raccourcis la justification de moitié.",
];

export function AgentPanel({
  tdrId,
  ouvert,
  onToggle,
  onEcriture,
  onAnnuler,
  etapeCourante,
}: {
  tdrId: string | null;
  ouvert: boolean;
  onToggle: () => void;
  /** Le parcours recharge le champ écrit depuis la base */
  onEcriture: (e: Ecriture) => void;
  /** Restaure la valeur précédente */
  onAnnuler: (e: Ecriture) => void;
  etapeCourante: string;
}) {
  const [bulles, setBulles] = useState<Bulle[]>([]);
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

  if (!ouvert) {
    return (
      <aside className={styles.replie}>
        <button
          type="button"
          className={styles.poignee}
          onClick={onToggle}
          aria-label="Ouvrir l’assistant"
          title="Assistant du dossier"
        >
          <AiGenerate size={18} aria-hidden />
        </button>
      </aside>
    );
  }

  return (
    <aside className={styles.panneau} aria-label="Assistant du dossier">
      <header className={styles.tete}>
        <AiGenerate size={16} aria-hidden />
        <div className={styles.teteTexte}>
          <strong>Assistant du dossier</strong>
          <span>{etapeCourante}</span>
        </div>
        <button type="button" className={styles.fermer} onClick={onToggle} aria-label="Replier">
          <Close size={16} aria-hidden />
        </button>
      </header>

      <div className={styles.fil} ref={filRef}>
        {bulles.length === 0 && (
          <div className={styles.accueil}>
            <p>
              Dites-lui ce que vous attendez. Il écrit directement dans les champs du dossier, et
              signale ce qu’il a touché.
            </p>
            <p className={styles.limite}>
              Les montants, le rattachement au plan et les attestations de conformité ne lui sont
              pas ouverts : ils se décident, ils ne se rédigent pas.
            </p>
            <div className={styles.suggestions}>
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  type="button"
                  className={styles.suggestion}
                  onClick={() => void envoyer(s)}
                  disabled={!tdrId}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {bulles.map((b, i) => (
          <div key={i} className={b.role === "user" ? styles.bulleAuteur : styles.bulleAgent}>
            {b.actes.length > 0 && (
              <ul className={styles.actes}>
                {b.actes.map((a, j) => (
                  <li key={j} className={a.genre === "refus" ? styles.acteRefus : undefined}>
                    {a.libelle}
                  </li>
                ))}
              </ul>
            )}

            {b.texte && <p className={styles.texte}>{b.texte}</p>}

            {b.encours && !b.texte && b.actes.length === 0 && (
              <span className={styles.points} aria-label="L’assistant travaille">
                <i />
                <i />
                <i />
              </span>
            )}

            {b.ecritures.map((e) => (
              <div key={e.champ} className={styles.annuler}>
                <span>
                  <strong>{e.champ}</strong> · étape {e.etape}
                </span>
                <button type="button" onClick={() => onAnnuler(e)}>
                  <Undo size={13} aria-hidden /> Annuler
                </button>
              </div>
            ))}
          </div>
        ))}

        {/* Le texte tel qu'il s'écrit dans le champ, avant même d'y être
            enregistré. C'est ce qui remplace l'écran immobile. */}
        {apercu && (
          <div className={styles.apercu}>
            <span className={styles.apercuTete}>
              Écriture dans <strong>{apercu.champ}</strong>
            </span>
            <p>{apercu.texte}</p>
          </div>
        )}
      </div>

      <form
        className={styles.saisie}
        onSubmit={(e) => {
          e.preventDefault();
          void envoyer(saisie);
        }}
      >
        <textarea
          value={saisie}
          onChange={(e) => setSaisie(e.target.value)}
          placeholder={tdrId ? "Que voulez-vous ?" : "Ouvrez d’abord le brouillon."}
          rows={2}
          disabled={!tdrId || occupe}
          onKeyDown={(e) => {
            // Entrée envoie, Maj+Entrée passe à la ligne : c'est l'usage
            // dans une zone de conversation.
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              void envoyer(saisie);
            }
          }}
        />
        <button type="submit" disabled={!tdrId || occupe || !saisie.trim()} aria-label="Envoyer">
          <SendAlt size={16} aria-hidden />
        </button>
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

/** Rendu de l'état « l'assistant réfléchit », hors du fil. */
export function MarqueAssistee({ children }: { children: React.ReactNode }) {
  return (
    <span className={styles.marque} title="L’assistant a contribué à ce champ">
      <AiGenerate size={12} aria-hidden />
      {children}
    </span>
  );
}

export { WarningAltFilled };
