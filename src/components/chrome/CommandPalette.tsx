"use client";

/**
 * CommandPalette — palette de recherche globale ⌘K / Ctrl+K.
 * Indexe pages, propositions, documents, modèles, plaintes.
 *
 * Pour la démo : index statique mock. En production, à brancher sur l'API.
 */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useRouter } from "next/navigation";
import {
  Search,
  Dashboard,
  Document,
  Voicemail,
  Notification,
  Folders,
  Time,
  Idea,
  Catalog,
  Network_3,
  Add,
  AiGenerate,
  Activity,
  TaskApproved,
  Locked,
  Asleep,
  Light,
  ArrowRight,
} from "@carbon/icons-react";
import styles from "./CommandPalette.module.scss";

interface CommandItem {
  id: string;
  group: string;
  title: string;
  sub?: string;
  href?: string;
  action?: () => void;
  keywords?: string[];
  icon: ReactNode;
  kbd?: string;
}

interface CommandPaletteContextValue {
  open: () => void;
  close: () => void;
  toggle: () => void;
  registerCommands: (cmds: CommandItem[]) => () => void;
}

const Ctx = createContext<CommandPaletteContextValue | null>(null);

const DEFAULT_COMMANDS: CommandItem[] = [
  // Navigation
  {
    id: "nav-dashboard",
    group: "Navigation",
    title: "Tableau de bord",
    sub: "/partenaire",
    href: "/partenaire",
    icon: <Dashboard size={14} aria-hidden />,
    keywords: ["accueil", "home"],
    kbd: "G D",
  },
  {
    id: "nav-propositions",
    group: "Navigation",
    title: "Mes propositions",
    sub: "/partenaire/propositions",
    href: "/partenaire/propositions",
    icon: <Document size={14} aria-hidden />,
    keywords: ["tdr", "proposition"],
    kbd: "G P",
  },
  {
    id: "nav-workflow",
    group: "Navigation",
    title: "Workflow multi-acteurs",
    sub: "/partenaire/workflow",
    href: "/partenaire/workflow",
    icon: <Network_3 size={14} aria-hidden />,
    keywords: ["pipeline", "workflow", "étape"],
  },
  {
    id: "nav-modeles",
    group: "Navigation",
    title: "Modèles de TDR",
    sub: "/partenaire/modeles",
    href: "/partenaire/modeles",
    icon: <Catalog size={14} aria-hidden />,
    keywords: ["template", "modèle", "moteur similarité"],
  },
  {
    id: "nav-messages",
    group: "Navigation",
    title: "Messages",
    sub: "/partenaire/messages",
    href: "/partenaire/messages",
    icon: <Voicemail size={14} aria-hidden />,
    keywords: ["messagerie", "ugp"],
    kbd: "G M",
  },
  {
    id: "nav-notifications",
    group: "Navigation",
    title: "Notifications",
    sub: "/partenaire/notifications",
    href: "/partenaire/notifications",
    icon: <Notification size={14} aria-hidden />,
    keywords: ["alerte", "notif"],
  },
  {
    id: "nav-documents",
    group: "Navigation",
    title: "Documents partagés",
    sub: "/partenaire/documents",
    href: "/partenaire/documents",
    icon: <Folders size={14} aria-hidden />,
    keywords: ["fichier", "doc", "annexe"],
  },
  {
    id: "nav-calendrier",
    group: "Navigation",
    title: "Calendrier",
    sub: "/partenaire/calendrier",
    href: "/partenaire/calendrier",
    icon: <Time size={14} aria-hidden />,
    keywords: ["agenda", "échéance"],
  },
  {
    id: "nav-mgp",
    group: "Navigation",
    title: "MGP — Mécanisme de gestion des plaintes",
    sub: "/partenaire/mgp",
    href: "/partenaire/mgp",
    icon: <Voicemail size={14} aria-hidden />,
    keywords: ["plainte", "grief", "doléance"],
  },
  {
    id: "nav-reporting",
    group: "Navigation",
    title: "Reporting & rapports",
    sub: "/partenaire/reporting",
    href: "/partenaire/reporting",
    icon: <Activity size={14} aria-hidden />,
    keywords: ["rapport", "semestre", "indicateur"],
  },
  {
    id: "nav-organisation",
    group: "Navigation",
    title: "Profil organisation",
    sub: "/partenaire/organisation",
    href: "/partenaire/organisation",
    icon: <Idea size={14} aria-hidden />,
    keywords: ["org", "anie", "kyc"],
  },

  // Actions
  {
    id: "action-new-proposition",
    group: "Actions rapides",
    title: "Créer une nouvelle proposition TDR",
    sub: "Wizard 12 étapes guidé par IA",
    href: "/partenaire/propositions/nouveau",
    icon: <Add size={14} aria-hidden />,
    keywords: ["nouveau", "créer", "tdr", "ajouter"],
    kbd: "N P",
  },
  {
    id: "action-new-rapport",
    group: "Actions rapides",
    title: "Créer un rapport",
    sub: "Rapport semestriel · brouillon IA pré-rempli",
    href: "/partenaire/reporting/nouveau",
    icon: <Add size={14} aria-hidden />,
    keywords: ["rapport", "nouveau", "semestriel"],
  },
  {
    id: "action-new-plainte",
    group: "Actions rapides",
    title: "Déposer une plainte MGP",
    sub: "Wizard 4 étapes · anonyme ou identifié",
    href: "/partenaire/mgp/nouvelle",
    icon: <Add size={14} aria-hidden />,
    keywords: ["plainte", "réclamation", "mgp"],
  },
  {
    id: "action-upload-doc",
    group: "Actions rapides",
    title: "Téléverser un document",
    sub: "PDF · DOCX · XLSX · max 50 Mo",
    href: "/partenaire/documents/upload",
    icon: <Add size={14} aria-hidden />,
    keywords: ["upload", "téléverser", "fichier"],
  },
  {
    id: "action-message-ugp",
    group: "Actions rapides",
    title: "Nouveau fil de discussion UGP",
    sub: "Messagerie officielle · audit signé",
    href: "/partenaire/messages/nouveau",
    icon: <Add size={14} aria-hidden />,
    keywords: ["message", "ugp", "écrire"],
  },

  // Propositions actives (mock)
  {
    id: "prop-019",
    group: "Mes propositions",
    title: "AMOA Plateforme nationale d'identité numérique",
    sub: "PROP-2026-019 · 8,7 M USD · Arbitrage UGP",
    href: "/partenaire/propositions/PROP-2026-019",
    icon: <Document size={14} aria-hidden />,
    keywords: ["anie", "identité", "id4d", "amoa"],
  },
  {
    id: "prop-014",
    group: "Mes propositions",
    title: "Étude PGES Centre de données Tier-3",
    sub: "PROP-2026-014 · 420 k USD · PPM Q3",
    href: "/partenaire/propositions/PROP-2026-014",
    icon: <Document size={14} aria-hidden />,
    keywords: ["pges", "e&s", "datacenter"],
  },
  {
    id: "prop-011",
    group: "Mes propositions",
    title: "Atelier ID4Africa Abidjan 2026",
    sub: "PROP-2026-011 · 85 k USD · ANO BM",
    href: "/partenaire/propositions/PROP-2026-011",
    icon: <Document size={14} aria-hidden />,
    keywords: ["id4africa", "abidjan", "atelier"],
  },
  {
    id: "prop-007",
    group: "Mes propositions",
    title: "Modernisation du registre des personnes",
    sub: "PROP-2026-007 · 2,4 M USD · Brouillon",
    href: "/partenaire/propositions/PROP-2026-007",
    icon: <Document size={14} aria-hidden />,
    keywords: ["registre", "modernisation"],
  },

  // Aide
  {
    id: "help-assistant",
    group: "Aide",
    title: "Ouvrir l'assistant procédural ✦ IA",
    sub: "Questions sur MEP, PTBA, procédures",
    icon: <AiGenerate size={14} aria-hidden />,
    keywords: ["help", "aide", "assistant", "ia"],
  },
  {
    id: "help-eas-hs",
    group: "Aide",
    title: "Canal EAS-HS confidentiel",
    sub: "Violences, harcèlement, abus · anonymat garanti",
    href: "/mgp-eas-hs",
    icon: <Locked size={14} aria-hidden style={{ color: "var(--ptn-status-danger)" }} />,
    keywords: ["eas", "hs", "confidentiel", "violence", "harcèlement"],
  },
];

function highlightMatch(text: string, query: string): ReactNode {
  if (!query.trim()) return text;
  const lower = text.toLowerCase();
  const q = query.toLowerCase();
  const idx = lower.indexOf(q);
  if (idx < 0) return text;
  return (
    <>
      {text.slice(0, idx)}
      <mark className={styles.itemMatch}>{text.slice(idx, idx + q.length)}</mark>
      {text.slice(idx + q.length)}
    </>
  );
}

function score(item: CommandItem, query: string): number {
  if (!query.trim()) return 0.5;
  const q = query.toLowerCase();
  const title = item.title.toLowerCase();
  if (title.startsWith(q)) return 100;
  if (title.includes(q)) return 80;
  if ((item.sub ?? "").toLowerCase().includes(q)) return 60;
  if ((item.keywords ?? []).some((k) => k.toLowerCase().includes(q))) return 40;
  return 0;
}

export function CommandPaletteProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [focusedIdx, setFocusedIdx] = useState(0);
  const [extraCommands, setExtraCommands] = useState<CommandItem[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  const open = useCallback(() => {
    setIsOpen(true);
    setQuery("");
    setFocusedIdx(0);
  }, []);
  const close = useCallback(() => setIsOpen(false), []);
  const toggle = useCallback(() => setIsOpen((o) => !o), []);

  const registerCommands = useCallback((cmds: CommandItem[]) => {
    setExtraCommands((cur) => [...cur, ...cmds]);
    return () => {
      setExtraCommands((cur) => cur.filter((c) => !cmds.some((x) => x.id === c.id)));
    };
  }, []);

  // ⌘K / Ctrl+K
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        toggle();
      } else if (e.key === "Escape" && isOpen) {
        e.preventDefault();
        close();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [toggle, close, isOpen]);

  // Auto-focus input
  useEffect(() => {
    if (isOpen && inputRef.current) {
      const t = setTimeout(() => inputRef.current?.focus(), 60);
      return () => clearTimeout(t);
    }
  }, [isOpen]);

  const allCommands = useMemo(
    () => [...DEFAULT_COMMANDS, ...extraCommands],
    [extraCommands],
  );

  const filtered = useMemo(() => {
    const scored = allCommands
      .map((c) => ({ c, s: score(c, query) }))
      .filter(({ s }) => s > 0)
      .sort((a, b) => b.s - a.s);
    return scored.map(({ c }) => c);
  }, [allCommands, query]);

  // Group filtered by group, preserving order
  const grouped = useMemo(() => {
    const map = new Map<string, CommandItem[]>();
    for (const item of filtered) {
      if (!map.has(item.group)) map.set(item.group, []);
      map.get(item.group)!.push(item);
    }
    return Array.from(map.entries());
  }, [filtered]);

  // Flat ordered list for keyboard nav
  const flatList = useMemo(
    () => grouped.flatMap(([, items]) => items),
    [grouped],
  );

  // Reset focus on query change
  useEffect(() => {
    setFocusedIdx(0);
  }, [query]);

  const handleSelect = useCallback(
    (item: CommandItem) => {
      close();
      if (item.action) {
        item.action();
      } else if (item.href) {
        router.push(item.href);
      }
    },
    [close, router],
  );

  const onInputKey = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setFocusedIdx((i) => Math.min(flatList.length - 1, i + 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setFocusedIdx((i) => Math.max(0, i - 1));
    } else if (e.key === "Enter") {
      e.preventDefault();
      const item = flatList[focusedIdx];
      if (item) handleSelect(item);
    }
  };

  const value: CommandPaletteContextValue = {
    open,
    close,
    toggle,
    registerCommands,
  };

  return (
    <Ctx.Provider value={value}>
      {children}

      <div
        className={`${styles.backdrop} ${isOpen ? styles.backdropOpen : ""}`}
        onClick={close}
        aria-hidden
      >
        <div
          className={styles.palette}
          role="dialog"
          aria-label="Recherche globale"
          onClick={(e) => e.stopPropagation()}
        >
          <div className={styles.searchBar}>
            <Search size={18} aria-hidden className={styles.searchIco} />
            <input
              ref={inputRef}
              type="search"
              placeholder="Rechercher pages, propositions, actions…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={onInputKey}
              className={styles.searchInput}
              aria-label="Recherche globale"
            />
            <kbd className={styles.searchKbd}>esc</kbd>
          </div>

          <div className={styles.results}>
            {flatList.length === 0 ? (
              <div className={styles.empty}>
                Aucun résultat pour <strong>{query}</strong>
              </div>
            ) : (
              grouped.map(([group, items]) => (
                <div key={group}>
                  <div className={styles.groupHead}>{group}</div>
                  {items.map((item) => {
                    const idx = flatList.indexOf(item);
                    return (
                      <button
                        key={item.id}
                        type="button"
                        className={`${styles.item} ${
                          idx === focusedIdx ? styles.itemFocused : ""
                        }`}
                        onClick={() => handleSelect(item)}
                        onMouseEnter={() => setFocusedIdx(idx)}
                      >
                        <span className={styles.itemIco}>{item.icon}</span>
                        <div className={styles.itemBody}>
                          <div className={styles.itemTitle}>
                            {highlightMatch(item.title, query)}
                          </div>
                          {item.sub && <div className={styles.itemSub}>{item.sub}</div>}
                        </div>
                        {item.kbd ? (
                          <span className={styles.itemKbd}>{item.kbd}</span>
                        ) : (
                          <ArrowRight
                            size={12}
                            aria-hidden
                            style={{ color: "var(--cds-text-helper)" }}
                          />
                        )}
                      </button>
                    );
                  })}
                </div>
              ))
            )}
          </div>

          <div className={styles.foot}>
            <span className={styles.footItem}>
              <kbd className={styles.searchKbd}>↑↓</kbd> Naviguer
            </span>
            <span className={styles.footItem}>
              <kbd className={styles.searchKbd}>↵</kbd> Ouvrir
            </span>
            <span className={styles.footItem}>
              <kbd className={styles.searchKbd}>esc</kbd> Fermer
            </span>
            <span style={{ marginLeft: "auto" }}>
              <AiGenerate
                size={10}
                aria-hidden
                style={{
                  verticalAlign: "middle",
                  color: "var(--ptn-status-ai)",
                  marginRight: 4,
                }}
              />
              ✦ recherche enrichie IA
            </span>
          </div>
        </div>
      </div>
    </Ctx.Provider>
  );
}

export function useCommandPalette(): CommandPaletteContextValue {
  const ctx = useContext(Ctx);
  if (!ctx) {
    throw new Error("useCommandPalette must be used within <CommandPaletteProvider>");
  }
  return ctx;
}
