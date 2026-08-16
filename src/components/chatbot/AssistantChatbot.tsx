"use client";

/**
 * L'assistant général, offert sur tous les écrans.
 *
 * Il répond depuis le socle de connaissance du projet et depuis le
 * RÉFÉRENTIEL EN BASE : un seuil, une méthode, une catégorie sont LUS avant
 * d'être cités. C'est la seule chose qui compte ici, et elle est tenue
 * côté serveur.
 *
 * La version précédente répondait par six textes écrits en dur, choisis par
 * expression régulière et servis après une attente calculée sur la longueur
 * de la question. Elle annonçait « AON jusqu'à 5 M USD » là où le
 * référentiel dit 15 M pour les travaux et 4 M pour les fournitures, un
 * « délai moyen de 38 jours » qui n'existe nulle part, et plaçait sous
 * chacun une source de la forme « MEP §4.2 » que le manuel ne porte pas.
 * Un chiffre inventé se repère ; un chiffre inventé AVEC SA CITATION se
 * croit. C'était le vrai défaut, et c'est pourquoi les sources affichées
 * ici sont désormais celles que le serveur a réellement consultées.
 *
 * Il ne modifie rien : aucun de ses outils n'écrit. Il est vu par les huit
 * profils, auditeurs compris.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import {
  AiGenerate,
  Close,
  Send,
  Document,
  Time,
  Money,
  TaskApproved,
  ChartLineSmooth,
  Earth,
} from "@carbon/icons-react";
import { interrogerAssistant, type TourDeParole } from "@/lib/agent-stream";
import { TexteEnrichi } from "@/components/ui/TexteEnrichi";
import styles from "./AssistantChatbot.module.scss";

interface Message {
  id: string;
  role: "user" | "assistant";
  /** Du TEXTE, et non du JSX : il vient du serveur, au fil de l'eau */
  body: string;
  /** Ce que le serveur a réellement consulté pour répondre */
  sources?: string[];
  /** Ce qu'il consulte en ce moment, dit pendant qu'il le fait */
  consultations?: string[];
  encours?: boolean;
  erreur?: boolean;
}

/**
 * Les amorces ne portent que des questions auxquelles il peut répondre depuis
 * le référentiel. Les précédentes appelaient un « délai moyen ANO » que la
 * plateforme ne publie pas, et nommaient une méthode « SBQC » qui n'existe
 * pas — proposer une question sans réponse use la confiance dès le premier
 * clic.
 */
const SUGGESTED = [
  {
    icon: Money,
    text: "Quels seuils s’appliquent à un marché de fournitures ?",
  },
  {
    icon: TaskApproved,
    text: "Quelle méthode pour des travaux de 8 millions USD ?",
  },
  {
    icon: Document,
    text: "Quels types de TDR existent, et lesquels exigent un PGES ?",
  },
  {
    icon: ChartLineSmooth,
    text: "Quelles sont les composantes du projet et leurs dotations ?",
  },
  {
    icon: Time,
    text: "Où en sont les dossiers de mon organisation ?",
  },
  {
    icon: Earth,
    text: "Comment se passe la catégorisation E&S d’un dossier ?",
  },
];

// Un compteur, et non un tirage : deux rendus successifs doivent donner les
// mêmes clés, sinon React remonte la liste entière à chaque fragment reçu.
let nextId = 0;
const newId = () => `m-${++nextId}`;

export function AssistantChatbot() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [draft, setDraft] = useState("");
  const [thinking, setThinking] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const abandonRef = useRef<AbortController | null>(null);

  // Fermer le panneau ne doit pas laisser un appel courir dans le vide.
  useEffect(() => () => abandonRef.current?.abort(), []);

  // ESC ferme
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && open) setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  // Scroll to bottom
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, thinking]);

  // Auto-focus input on open
  useEffect(() => {
    if (open && inputRef.current) {
      const t = setTimeout(() => inputRef.current?.focus(), 200);
      return () => clearTimeout(t);
    }
  }, [open]);

  /**
   * Pose la question et rend la réponse à mesure.
   *
   * Aucune attente n'est simulée : celle qu'on voit est celle du modèle, et
   * les premiers mots arrivent en une seconde là où la réponse entière en
   * demande cinq à quinze. Les consultations s'affichent pendant qu'elles
   * ont lieu — c'est ce qui remplace un écran immobile.
   */
  const sendQuestion = useCallback(
    async (q: string) => {
      const text = q.trim();
      if (!text || thinking) return;

      // L'historique part AVANT que la question n'y entre : le serveur
      // reçoit le contexte, puis la question, et jamais deux fois la même.
      const historique: TourDeParole[] = messages
        .filter((m) => m.body.trim())
        .map((m) => ({ role: m.role, content: m.body }));

      const idReponse = newId();
      setMessages((m) => [
        ...m,
        { id: newId(), role: "user", body: text },
        { id: idReponse, role: "assistant", body: "", consultations: [], encours: true },
      ]);
      setDraft("");
      setThinking(true);

      const controleur = new AbortController();
      abandonRef.current = controleur;

      const majReponse = (f: (m: Message) => Message) =>
        setMessages((tout) => tout.map((m) => (m.id === idReponse ? f(m) : m)));

      try {
        for await (const ev of interrogerAssistant(text, historique, controleur.signal)) {
          if (ev.type === "texte") {
            majReponse((m) => ({ ...m, body: m.body + ev.delta }));
          } else if (ev.type === "consultation") {
            majReponse((m) => ({
              ...m,
              consultations: [...(m.consultations ?? []), ev.libelle],
            }));
          } else if (ev.type === "sources") {
            majReponse((m) => ({ ...m, sources: ev.sources }));
          } else if (ev.type === "erreur") {
            majReponse((m) => ({ ...m, body: ev.message, erreur: true }));
          }
        }
      } finally {
        majReponse((m) => ({ ...m, encours: false, consultations: [] }));
        setThinking(false);
        abandonRef.current = null;
      }
    },
    [messages, thinking],
  );

  const onKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      sendQuestion(draft);
    }
  };

  return (
    <>
      <button
        type="button"
        className={styles.fab}
        aria-label="Ouvrir l'assistant procédural"
        onClick={() => setOpen(true)}
        style={{ display: open ? "none" : undefined }}
      >
        <span className={styles.fabPulse} aria-hidden />
        <AiGenerate size={24} aria-hidden />
      </button>

      <div
        className={`${styles.backdrop} ${open ? styles.backdropOpen : ""}`}
        onClick={() => setOpen(false)}
        aria-hidden
      />

      <aside
        className={`${styles.panel} ${open ? styles.panelOpen : ""}`}
        aria-label="Assistant procédural PTN-RDC"
        aria-hidden={!open}
      >
        <header className={styles.header}>
          <div className={styles.headerIco}>
            <AiGenerate size={18} aria-hidden />
          </div>
          <div className={styles.headerInfo}>
            <h3 className={styles.headerTitle}>Assistant procédural ✦</h3>
            <div className={styles.headerSub}>Référentiel du projet · lecture seule</div>
          </div>
          <button
            type="button"
            className={styles.headerClose}
            onClick={() => setOpen(false)}
            aria-label="Fermer l'assistant"
          >
            <Close size={16} aria-hidden />
          </button>
        </header>

        <div className={styles.body} ref={scrollRef}>
          {messages.length === 0 ? (
            <>
              <div className={styles.intro}>
                <div className={styles.introTitle}>Comment puis-je vous aider ?</div>
                Je réponds à vos questions sur le MEP, le PTBA, les procédures de passation, les
                sauvegardes E&S et le MGP du PTN-RDC. Chaque réponse cite ses sources et est
                journalisée pour audit.
              </div>

              <div className={styles.chips}>
                <div className={styles.chipsTitle}>Suggestions</div>
                {SUGGESTED.map((s, i) => {
                  const Icon = s.icon;
                  return (
                    <button
                      key={i}
                      type="button"
                      className={styles.chip}
                      onClick={() => sendQuestion(s.text)}
                    >
                      <Icon size={14} aria-hidden className={styles.chipIco} />
                      {s.text}
                    </button>
                  );
                })}
              </div>
            </>
          ) : (
            <>
              {messages.map((m) => (
                /* Deux traitements asymétriques, et c'est délibéré : la
                   question est une bulle courte, alignée à droite ; la
                   réponse est le corps du panneau, pleine largeur et sans
                   cadre. Une réponse qui porte des listes et des sources
                   ne tient pas dans une bulle de 80 %, et la mettre en
                   vis-à-vis de la question suggère une conversation entre
                   égaux là où l'un demande et l'autre renseigne.

                   Même vocabulaire que le panneau du parcours TDR : deux
                   surfaces d'assistance dans le même produit ne doivent pas
                   se lire différemment. */
                <div key={m.id} className={m.role === "user" ? styles.tourAuteur : styles.tourAi}>
                  <div className={m.role === "user" ? styles.bulleAuteur : undefined}>
                    {/* Ce qu'il consulte, pendant qu'il le fait. Disparaît
                        une fois la réponse close : c'est un signe de vie,
                        pas une trace à conserver. */}
                    {m.consultations && m.consultations.length > 0 && (
                      <ul className={styles.msgTravail}>
                        {m.consultations.map((c, i) => (
                          <li key={i}>{c}</li>
                        ))}
                      </ul>
                    )}

                    {m.role === "assistant" && !m.erreur ? (
                      m.body && <TexteEnrichi>{m.body}</TexteEnrichi>
                    ) : (
                      <p className={m.erreur ? styles.msgErreur : undefined}>{m.body}</p>
                    )}

                    {m.encours && !m.body && (
                      <span className={styles.typing} aria-label="Réponse en cours">
                        <span className={styles.typingDot} />
                        <span className={styles.typingDot} />
                        <span className={styles.typingDot} />
                      </span>
                    )}

                    {/* Ce qui a RÉELLEMENT été lu, rapporté par le serveur.
                        Jamais une référence composée par le modèle : une
                        citation fabriquée fait croire ce qu'elle accompagne. */}
                    {m.sources && m.sources.length > 0 && (
                      <div className={styles.msgSources}>
                        {m.sources.map((src, i) => (
                          <span key={i} className={styles.msgSource}>
                            {src}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ))}

            </>
          )}
        </div>

        <div className={styles.composer}>
          <div className={styles.composerInner}>
            <textarea
              ref={inputRef}
              className={styles.input}
              placeholder="Posez votre question…  (⌘ + ↵ pour envoyer)"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={onKeyDown}
              rows={1}
            />
            <button
              type="button"
              className={styles.sendBtn}
              disabled={!draft.trim() || thinking}
              onClick={() => sendQuestion(draft)}
              aria-label="Envoyer"
            >
              <Send size={14} aria-hidden />
            </button>
          </div>
          <div className={styles.disclaimer}>
            <ChartLineSmooth size={10} aria-hidden style={{ verticalAlign: "middle", marginRight: 4 }} />
            ✦ IA non décideur · réponses indicatives · valider auprès du référent UGP
          </div>
        </div>
      </aside>
    </>
  );
}
