"use client";

/**
 * Assistant procédural — cas d'usage IA #10 du rapport stratégique PTN-RDC.
 * RAG sur MEP/PTBA, accessible depuis toutes les pages partenaire.
 *
 * Pour la démo : réponses mockées avec sources citées.
 * Production : remplacer `mockAnswer` par un appel à l'API LLM avec RAG.
 */

import { useEffect, useRef, useState } from "react";
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
  Voicemail,
} from "@carbon/icons-react";
import styles from "./AssistantChatbot.module.scss";

interface Message {
  id: string;
  role: "user" | "assistant";
  body: React.ReactNode;
  sources?: string[];
  pending?: boolean;
}

const SUGGESTED = [
  {
    icon: Document,
    text: "Comment proposer une nouvelle activité au PTBA ?",
  },
  {
    icon: Time,
    text: "Quel est le délai moyen ANO Banque mondiale ?",
  },
  {
    icon: Money,
    text: "Quels sont les seuils de procédure (AOI, AON, SBQC) ?",
  },
  {
    icon: TaskApproved,
    text: "Que faire si l'UGP demande une clarification ?",
  },
  {
    icon: Earth,
    text: "Comment se passe la catégorisation E&S ?",
  },
  {
    icon: Voicemail,
    text: "Comment déposer une plainte au MGP ?",
  },
];

interface MockEntry {
  match: RegExp;
  body: React.ReactNode;
  sources: string[];
}

const MOCK_ANSWERS: MockEntry[] = [
  {
    match: /proposer|nouvelle.*activit|tdr|propos/i,
    body: (
      <>
        <p>
          Pour proposer une nouvelle activité au PTBA, suivez ce parcours en 3 étapes :
        </p>
        <p>
          <strong>1.</strong> Vérifiez que l&apos;activité figure dans le PTBA en cours
          (PTBA-2026-Q2). Si non, soumettez une demande d&apos;ajout au RPM UGP avant tout
          dépôt de TDR.
        </p>
        <p>
          <strong>2.</strong> Utilisez l&apos;<em>Assistant TDR</em> (8 étapes guidées par IA)
          accessible depuis « Mes propositions → Nouvelle proposition ». Le wizard pré-remplit
          jusqu&apos;à 64 % des sections à partir de TDR similaires validés ANO.
        </p>
        <p>
          <strong>3.</strong> Soumettez à l&apos;UGP qui arbitre sous 7 jours indicatifs, puis
          intègre au PPM, puis sollicite l&apos;ANO bailleur (12 j BM / 21 j AFD).
        </p>
      </>
    ),
    sources: ["MEP §4.2", "PTBA-2026-Q2", "Procurement Reg. fév. 2025"],
  },
  {
    match: /délai|delai|ano\s*moyen|temps/i,
    body: (
      <>
        <p>
          Le délai moyen TDR → ANO Banque mondiale dans le PTN-RDC est actuellement de{" "}
          <strong>38 jours</strong> (cible 12 jours fin 2026). Pour les TDR utilisant un{" "}
          <strong>modèle éprouvé</strong> de la bibliothèque, le délai descend à{" "}
          <strong>9,4 jours</strong> en moyenne — soit ~75 % de réduction.
        </p>
        <p>
          Sur votre profil ANIE, le délai moyen UGP est de <strong>9 jours</strong>.
        </p>
        <p>
          <strong>Conseil</strong> : 3 facteurs réduisent le délai — utiliser un modèle
          éprouvé, joindre tous les documents requis dès le 1er dépôt, et désigner les
          profils-clés conformes au TDR de référence.
        </p>
      </>
    ),
    sources: ["Cockpit S&E avr. 2026", "Modèles TDR validés"],
  },
  {
    match: /seuil|aoi|aon|sbqc|procédure|procedur/i,
    body: (
      <>
        <p>Les seuils Procurement Regulations Banque mondiale (février 2025) :</p>
        <p>
          <strong>Biens / travaux</strong> : AON jusqu&apos;à 5 M USD · AOI au-delà ·{" "}
          <span className="ptn-mono">ANO préalable obligatoire ≥ 500 k USD</span>.
        </p>
        <p>
          <strong>Services de consultants</strong> : SBQC pour mission complexe · CQS si
          critères qualité prévalents · CMC pour audit · Sélection de gré à gré (SGG) sous
          conditions strictes.
        </p>
        <p>
          La <em>vérification de cohérence</em> au sein du wizard TDR contrôle automatiquement
          ces seuils et bloque la soumission en cas d&apos;incompatibilité.
        </p>
      </>
    ),
    sources: ["Procurement Reg. fév. 2025", "PPSD PTN-RDC"],
  },
  {
    match: /clarif|question|réponse|repond/i,
    body: (
      <>
        <p>
          Si l&apos;UGP demande une clarification sur votre proposition, vous avez{" "}
          <strong>7 jours ouvrables</strong> pour répondre.
        </p>
        <p>
          Accédez à votre proposition (ex. PROP-2026-019), onglet{" "}
          <strong>Commentaires UGP</strong>. Répondez précisément en citant les sections de
          votre TDR (numéro + page). Les pièces jointes complémentaires sont les bienvenues.
        </p>
        <p>
          Au-delà de 7 jours sans réponse, votre proposition repasse en statut{" "}
          <em>Brouillon partenaire</em> et perd sa place dans le pipeline d&apos;arbitrage.
        </p>
      </>
    ),
    sources: ["MEP §4.5", "Tableau de bord Coord UGP"],
  },
  {
    match: /e&s|e\s*\\&\s*s|environ|sauvegarde|pges|cges/i,
    body: (
      <>
        <p>
          La catégorisation E&S se fait au moment de la soumission du TDR, en{" "}
          <strong>auto-évaluation</strong> par le partenaire, puis validation par
          l&apos;expert E&S UGP.
        </p>
        <p>
          <strong>4 catégories</strong> selon le CGES PTN-RDC :{" "}
          <strong>Faible</strong> (procédures simplifiées) · <strong>Modéré</strong>{" "}
          (screening UGP) · <strong>Substantielle</strong> (PEES requis · délai +14 j) ·{" "}
          <strong>Élevée</strong> (PEES + PMPP + PGMO requis · délai +30 j).
        </p>
        <p>
          La catégorie est rapprochée des risques cochés dans le wizard (déplacement,
          biodiversité, EAS-HS, etc.). En cas d&apos;écart, l&apos;UGP peut requalifier.
        </p>
      </>
    ),
    sources: ["CGES PTN-RDC §3", "NES 1-10 Banque mondiale"],
  },
  {
    match: /plainte|mgp|grief/i,
    body: (
      <>
        <p>
          Le Mécanisme de Gestion des Plaintes (MGP) est accessible depuis{" "}
          <strong>Espace partenaire → MGP</strong>. Toute plainte est traitée sous{" "}
          <strong>10 jours ouvrables</strong> (SLA UGP).
        </p>
        <p>
          <strong>Cycle</strong> : réception (24h) · qualification (48h) · instruction (5-7 j)
          · réponse (J+10) · clôture.
        </p>
        <p>
          <strong>EAS-HS confidentiel</strong> : pour toute violence, harcèlement ou abus
          sexuel, utilisez impérativement le canal séparé{" "}
          <span className="ptn-mono">/mgp-eas-hs</span> — anonymat garanti.
        </p>
      </>
    ),
    sources: ["CGES §6.3", "NES 10 Banque mondiale"],
  },
];

const DEFAULT_ANSWER: MockEntry = {
  match: /.*/,
  body: (
    <>
      <p>
        Désolé, je ne dispose pas de réponse précise sur ce sujet dans le corpus du PTN-RDC
        actuellement indexé (MEP, CGES, Procurement Regulations, PTBA).
      </p>
      <p>
        Vous pouvez reformuler votre question ou bien :
      </p>
      <p>
        — contacter directement votre référent UGP via{" "}
        <strong>Espace partenaire → Messages</strong>
        <br />
        — déposer une demande d&apos;information via{" "}
        <strong>MGP → Nouvelle plainte (catégorie « Information »)</strong>
      </p>
    </>
  ),
  sources: ["Repli — pas de match RAG"],
};

function mockAnswer(question: string): { body: React.ReactNode; sources: string[] } {
  const entry = MOCK_ANSWERS.find((e) => e.match.test(question)) ?? DEFAULT_ANSWER;
  return { body: entry.body, sources: entry.sources };
}

let nextId = 0;
const newId = () => `m-${++nextId}`;

export function AssistantChatbot() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [draft, setDraft] = useState("");
  const [thinking, setThinking] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

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

  const sendQuestion = (q: string) => {
    const text = q.trim();
    if (!text || thinking) return;

    const userMsg: Message = { id: newId(), role: "user", body: text };
    setMessages((m) => [...m, userMsg]);
    setDraft("");
    setThinking(true);

    // Mock latency 700-1200ms (déterministe par taille de question pour éviter random impur)
    const delay = 700 + Math.min(500, text.length * 8);
    setTimeout(() => {
      const { body, sources } = mockAnswer(text);
      const aiMsg: Message = { id: newId(), role: "assistant", body, sources };
      setMessages((m) => [...m, aiMsg]);
      setThinking(false);
    }, delay);
  };

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
            <div className={styles.headerSub}>RAG · MEP · PTBA · Procurement Reg.</div>
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
                <div
                  key={m.id}
                  className={`${styles.msg} ${m.role === "user" ? styles.msgUser : ""}`}
                >
                  <div
                    className={`${styles.msgAvatar} ${
                      m.role === "user" ? styles.msgAvatarUser : styles.msgAvatarAi
                    }`}
                  >
                    {m.role === "user" ? "M" : "✦"}
                  </div>
                  <div
                    className={`${styles.msgBubble} ${
                      m.role === "user" ? styles.msgBubbleUser : ""
                    }`}
                  >
                    {m.body}
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
              {thinking && (
                <div className={styles.msg}>
                  <div className={`${styles.msgAvatar} ${styles.msgAvatarAi}`}>✦</div>
                  <div className={styles.msgBubble}>
                    <span className={styles.typing} aria-label="Réflexion en cours">
                      <span className={styles.typingDot} />
                      <span className={styles.typingDot} />
                      <span className={styles.typingDot} />
                    </span>
                  </div>
                </div>
              )}
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
