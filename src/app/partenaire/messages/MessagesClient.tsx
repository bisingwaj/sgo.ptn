"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Search,
  Send,
  Attachment,
  Document,
  AiGenerate,
  CheckmarkFilled,
  ArrowRight,
  OverflowMenuVertical,
  Notification,
  Filter,
} from "@carbon/icons-react";
import styles from "./messages.module.scss";

interface Thread {
  id: string;
  who: string;
  role: string;
  initials: string;
  ref: string;
  preview: string;
  when: string;
  unread: boolean;
  tag?: { label: string; tone: "warn" | "ok" | "default" };
}

const THREADS: Thread[] = [
  {
    id: "t-019",
    who: "M. Mukendi · Coord UGP",
    role: "UGP",
    initials: "MM",
    ref: "PROP-2026-019",
    preview: "Pourriez-vous préciser le profil attendu pour l'Expert E&S — notamment ICAO 9303 et les déploiements ID4D…",
    when: "il y a 3h",
    unread: true,
    tag: { label: "Clarification", tone: "warn" },
  },
  {
    id: "t-014",
    who: "K. Lufima · RPM",
    role: "UGP",
    initials: "KL",
    ref: "PROP-2026-014",
    preview: "Confirmation que votre proposition est intégrée au PPM Q3 — soumission TTL Banque mondiale prévue lundi.",
    when: "hier 14:30",
    unread: false,
    tag: { label: "Validé", tone: "ok" },
  },
  {
    id: "t-024",
    who: "Assistant IA",
    role: "IA",
    initials: "✦",
    ref: "PROP-2026-024",
    preview: "Brouillon de TDR généré pour le Hub formation — 4 sources consultées, confiance 89 %.",
    when: "hier 09:12",
    unread: false,
  },
  {
    id: "t-007",
    who: "S. Adesina · TTL Banque",
    role: "Bailleur",
    initials: "SA",
    ref: "PROP-2026-007",
    preview: "Welcome team. Looking forward to reviewing the modernisation initiative — please share the latest version.",
    when: "06 mai",
    unread: false,
  },
  {
    id: "t-011",
    who: "ID4Africa Secretariat",
    role: "Externe",
    initials: "ID",
    ref: "PROP-2026-011",
    preview: "Confirmation de votre participation à l'atelier — badges délégation envoyés.",
    when: "02 mai",
    unread: false,
  },
];

interface Message {
  id: string;
  who: string;
  role: string;
  initials: string;
  when: string;
  body: React.ReactNode;
  mine?: boolean;
  ai?: boolean;
  attachments?: Array<{ name: string; meta: string }>;
  quote?: string;
}

const MESSAGES: Record<string, Message[]> = {
  "t-019": [
    {
      id: "m1",
      who: "M. Mukendi",
      role: "Coord UGP",
      initials: "MM",
      when: "21 avr. · 10:42",
      body: (
        <>
          Bonjour Marie, accusé de réception de votre proposition <strong>PROP-2026-019</strong>.
          Je l&apos;arbitre cette semaine avec le RPM. Délai indicatif 7 jours.
        </>
      ),
    },
    {
      id: "m2",
      who: "Vous",
      role: "ANIE",
      initials: "AN",
      when: "21 avr. · 11:08",
      mine: true,
      body: <>Merci. À votre disposition pour toute clarification.</>,
    },
    {
      id: "m3",
      who: "Assistant IA",
      role: "IA",
      initials: "✦",
      when: "21 avr. · 11:09",
      ai: true,
      body: (
        <>
          <strong>Suggestion contextuelle</strong> — la proposition mentionne un Expert E&S sans
          détailler son expérience ID4D. 3 TDR similaires validés ANO mentionnent
          systématiquement l&apos;expérience ICAO 9303 et un dossier de références ID4D ≥ 2
          projets. Cela pourrait fluidifier l&apos;arbitrage UGP.
        </>
      ),
    },
    {
      id: "m4",
      who: "M. Mukendi",
      role: "Coord UGP",
      initials: "MM",
      when: "il y a 3h",
      body: (
        <>
          Bonjour, merci pour cette proposition très complète. Pourriez-vous préciser le profil
          attendu pour l&apos;<strong>Expert E&S</strong> — notamment sur l&apos;expérience ICAO
          9303 et les déploiements ID4D Banque mondiale ? Cela conditionnera la complétude du
          dossier avant transmission au RPM pour intégration PPM.
        </>
      ),
      quote: "Section 5 — Profils-clés requis · TDR v3 page 14",
      attachments: [{ name: "checklist-profils-cles-AMOA.pdf", meta: "240 Ko" }],
    },
  ],
};

const TABS = [
  { id: "inbox", label: "Boîte de réception", count: 5 },
  { id: "ugp", label: "UGP", count: 3 },
  { id: "ai", label: "IA", count: 1 },
  { id: "archived", label: "Archives", count: 12 },
];

export function MessagesClient() {
  const [activeTab, setActiveTab] = useState("inbox");
  const [activeThread, setActiveThread] = useState<string>("t-019");
  const [draft, setDraft] = useState("");

  const thread = THREADS.find((t) => t.id === activeThread);
  const messages = MESSAGES[activeThread] ?? [];

  return (
    <div className={styles.layout}>
      {/* ============ Inbox ============ */}
      <div className={styles.listCol}>
        <div className={styles.listHead}>
          <div className={styles.listTabs}>
            {TABS.map((t) => (
              <button
                key={t.id}
                type="button"
                className={`${styles.listTab} ${activeTab === t.id ? styles.listTabActive : ""}`}
                onClick={() => setActiveTab(t.id)}
              >
                {t.label}
                <span className={styles.listTabCount}>{t.count}</span>
              </button>
            ))}
          </div>
        </div>
        <div className={styles.listSearch}>
          <Search size={14} aria-hidden />
          <input type="search" placeholder="Rechercher un fil…" />
          <Filter size={14} aria-hidden />
        </div>
        <div className={styles.listScroll}>
          {THREADS.map((t) => (
            <button
              key={t.id}
              type="button"
              className={`${styles.threadItem} ${activeThread === t.id ? styles.threadActive : ""}`}
              onClick={() => setActiveThread(t.id)}
            >
              <div className={styles.threadHead}>
                <span className={styles.threadWho}>{t.who}</span>
                <span className={styles.threadWhen}>{t.when}</span>
              </div>
              <div className={styles.threadRef}>{t.ref}</div>
              <div className={styles.threadPreview}>{t.preview}</div>
              <div className={styles.threadMeta}>
                {t.unread && <span className={styles.threadUnread} />}
                {t.tag && (
                  <span
                    className={`${styles.threadTag} ${
                      t.tag.tone === "warn"
                        ? styles.threadTagWarn
                        : t.tag.tone === "ok"
                          ? styles.threadTagOk
                          : ""
                    }`}
                  >
                    {t.tag.label}
                  </span>
                )}
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* ============ Thread ============ */}
      <div className={styles.threadCol}>
        {thread && (
          <>
            <div className={styles.threadTopbar}>
              <div className={styles.threadAvatar}>{thread.initials}</div>
              <div className={styles.threadInfo}>
                <div className={styles.threadName}>{thread.who}</div>
                <div className={styles.threadStatus}>
                  <span className={styles.threadDot} />
                  En ligne · {thread.ref}
                </div>
              </div>
              <div className={styles.threadActions}>
                <button type="button" className={styles.btnIcon} aria-label="Notifications">
                  <Notification size={16} aria-hidden />
                </button>
                <button type="button" className={styles.btnIcon} aria-label="Plus d'actions">
                  <OverflowMenuVertical size={16} aria-hidden />
                </button>
              </div>
            </div>

            <div className={styles.threadScroll}>
              <div className={styles.daySep}>21 avril 2026</div>
              {messages.slice(0, 3).map((m) => (
                <MessageBubble key={m.id} m={m} />
              ))}
              <div className={styles.daySep}>Aujourd&apos;hui</div>
              {messages.slice(3).map((m) => (
                <MessageBubble key={m.id} m={m} />
              ))}
            </div>

            <div className={styles.composer}>
              <textarea
                className={styles.composerInput}
                placeholder="Répondre à M. Mukendi…  (⌘ + ↵ pour envoyer)"
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
              />
              <div className={styles.composerActions}>
                <div className={styles.composerLeft}>
                  <button type="button" className={styles.btnIcon} aria-label="Joindre un document">
                    <Attachment size={16} aria-hidden />
                  </button>
                  <button type="button" className={styles.btnIcon} aria-label="Lier une proposition">
                    <Document size={16} aria-hidden />
                  </button>
                  <button type="button" className={styles.btnIcon} aria-label="Brouillon IA">
                    <AiGenerate size={16} aria-hidden />
                  </button>
                </div>
                <div className={styles.composerSpacer} />
                <span className={styles.composerHint}>Markdown · ⌘ + ↵</span>
                <button type="button" className={styles.btnPrimary}>
                  <Send size={14} aria-hidden /> Envoyer
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      {/* ============ Context rail ============ */}
      <div className={styles.ctxCol}>
        <section className={styles.ctxSection}>
          <h4 className={styles.ctxH}>Proposition liée</h4>
          <div className={styles.ctxBody}>
            <div className={styles.ctxRow}>
              <div className={styles.ctxK}>Référence</div>
              <div className={`${styles.ctxV} ptn-mono`}>PROP-2026-019</div>
            </div>
            <div className={styles.ctxRow}>
              <div className={styles.ctxK}>Statut</div>
              <div className={styles.ctxV}>
                <span
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 4,
                    background: "var(--ptn-status-warning-surface)",
                    color: "#8e6a00",
                    fontSize: 10,
                    padding: "1px 6px",
                  }}
                >
                  <span
                    style={{
                      width: 6,
                      height: 6,
                      background: "var(--ptn-status-warning)",
                      borderRadius: "50%",
                    }}
                  />
                  Arbitrage UGP
                </span>
              </div>
            </div>
            <div className={styles.ctxRow}>
              <div className={styles.ctxK}>Étape</div>
              <div className={styles.ctxV}>3 / 6</div>
            </div>
            <Link href="/partenaire/propositions/PROP-2026-019" className={styles.ctxLink}>
              Ouvrir la proposition <ArrowRight size={12} aria-hidden />
            </Link>
          </div>
        </section>

        <section className={styles.ctxSection}>
          <h4 className={styles.ctxH}>Pièces partagées</h4>
          <div className={styles.ctxBody}>
            <div className={styles.ctxRow}>
              <div className={styles.ctxK}>Cette semaine</div>
              <div className={styles.ctxV}>2 fichiers</div>
            </div>
            <div className={styles.ctxLink}>
              <Document size={12} aria-hidden /> checklist-profils-cles-AMOA.pdf
            </div>
            <div className={styles.ctxLink}>
              <Document size={12} aria-hidden /> TDR-v3-finale.docx
            </div>
          </div>
        </section>

        <section className={styles.ctxSection}>
          <h4 className={styles.ctxH}>Participants</h4>
          <div className={styles.ctxBody}>
            <div className={styles.ctxRow}>
              <div className={styles.ctxK}>UGP</div>
              <div className={styles.ctxV}>M. Mukendi (Coord)</div>
            </div>
            <div className={styles.ctxRow}>
              <div className={styles.ctxK}>RPM</div>
              <div className={styles.ctxV}>K. Lufima</div>
            </div>
            <div className={styles.ctxRow}>
              <div className={styles.ctxK}>Vous</div>
              <div className={styles.ctxV}>M. Marie · ANIE</div>
            </div>
          </div>
        </section>

        <section className={styles.ctxSection}>
          <h4 className={styles.ctxH}>Audit & confidentialité</h4>
          <div className={styles.ctxBody}>
            <div
              style={{
                display: "flex",
                gap: 8,
                alignItems: "flex-start",
                fontSize: 11,
                color: "var(--cds-text-helper)",
                lineHeight: 1.45,
              }}
            >
              <CheckmarkFilled
                size={14}
                aria-hidden
                style={{ color: "var(--ptn-status-success)", flexShrink: 0, marginTop: 2 }}
              />
              <span>
                Échanges journalisés et signés HMAC. Conservation 5 ans après clôture du projet.
              </span>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

function MessageBubble({ m }: { m: Message }) {
  return (
    <div className={`${styles.msg} ${m.mine ? styles.msgMine : ""}`}>
      <div
        className={`${styles.msgAvatar} ${m.mine ? styles.msgAvatarMine : ""} ${
          m.ai ? styles.msgAvatarAi : ""
        }`}
      >
        {m.initials}
      </div>
      <div className={`${styles.msgContent} ${m.mine ? styles.msgContentMine : ""}`}>
        <div className={styles.msgHead}>
          <span className={styles.msgWho}>{m.who}</span>
          <span className={styles.msgRole}>{m.role}</span>
          <span>{m.when}</span>
        </div>
        <div
          className={`${styles.msgBubble} ${m.mine ? styles.msgBubbleMine : ""} ${
            m.ai ? styles.msgBubbleAi : ""
          }`}
        >
          {m.quote && <div className={styles.msgQuote}>{m.quote}</div>}
          {m.body}
          {m.attachments && (
            <div className={styles.msgAttachments}>
              {m.attachments.map((a, i) => (
                <span key={i} className={styles.msgAttach}>
                  <Document size={12} aria-hidden /> {a.name} · {a.meta}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
