"use client";

/**
 * RichEditor — éditeur Tiptap aligné Carbon DS.
 * Sauvegarde les diffs IA dans un journal local (production : à brancher
 * sur l'audit trail HMAC ISO/IEC 42001).
 */

import { useEditor, EditorContent, type Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  AiGenerate,
  CheckmarkFilled,
  Close,
  Renew,
  Subtract,
  Add,
} from "@carbon/icons-react";
import styles from "./RichEditor.module.scss";

export interface AiDiff {
  id: string;
  kind: "add" | "delete" | "rephrase";
  /** Section concernée (ex. "02 · Contexte") */
  section: string;
  /** Texte de la suggestion (ce qui sera ajouté ou modifié) */
  text: string;
  /** Texte original retiré (pour les delete et rephrase) */
  original?: string;
  /** Métadonnées du modèle */
  model?: string;
  confidence?: number;
}

export interface SavedDiff {
  ts: number;
  diff: AiDiff;
  decision: "accepted" | "rejected";
}

interface RichEditorProps {
  initialHtml?: string;
  placeholder?: string;
  editable?: boolean;
  /** Suggestions IA actives à afficher dans le panneau diff */
  diffs?: AiDiff[];
  /** Callback quand l'utilisateur accepte/refuse */
  onDiffDecision?: (diff: AiDiff, decision: "accepted" | "rejected") => void;
  /** Callback quand le contenu change (debounced) */
  onContentChange?: (html: string) => void;
  /** Tag/référence visible en haut à droite */
  ref_?: string;
}

export interface RichEditorHandle {
  editor: Editor | null;
  setContent: (html: string) => void;
  getHtml: () => string;
}

export function RichEditor({
  initialHtml = "",
  placeholder = "Tapez votre contenu…",
  editable = true,
  diffs = [],
  onDiffDecision,
  onContentChange,
  ref_,
}: RichEditorProps) {
  const [showDiff, setShowDiff] = useState(true);
  const [savedDiffs, setSavedDiffs] = useState<SavedDiff[]>([]);
  const lastSavedAt = useRef<number>(Date.now());
  const [savedLabel, setSavedLabel] = useState("Auto-sauvegardé");

  const editor = useEditor({
    extensions: [
      StarterKit,
      Placeholder.configure({ placeholder }),
    ],
    content: initialHtml,
    editable,
    immediatelyRender: false,
    editorProps: {
      attributes: {
        class: styles.proseEditor,
        spellcheck: "true",
      },
    },
    onUpdate: ({ editor }) => {
      lastSavedAt.current = Date.now();
      setSavedLabel("Sauvegarde…");
      const tid = setTimeout(() => {
        setSavedLabel(`Auto-sauvegardé · ${new Date().toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}`);
        onContentChange?.(editor.getHTML());
      }, 700);
      return () => clearTimeout(tid);
    },
  });

  // Sync editable state
  useEffect(() => {
    if (editor && editor.isEditable !== editable) {
      editor.setEditable(editable);
    }
  }, [editor, editable]);

  const handleAccept = useCallback(
    (diff: AiDiff) => {
      if (!editor) return;
      // Insert AI suggestion at end of current section paragraph
      if (diff.kind === "add") {
        editor.chain().focus("end").insertContent(`<p>${diff.text}</p>`).run();
      } else if (diff.kind === "rephrase" || diff.kind === "delete") {
        // Mock simple : on insère le nouveau texte à la fin
        editor.chain().focus("end").insertContent(`<p>${diff.text}</p>`).run();
      }
      setSavedDiffs((cur) => [...cur, { ts: Date.now(), diff, decision: "accepted" }]);
      onDiffDecision?.(diff, "accepted");
    },
    [editor, onDiffDecision],
  );

  const handleReject = useCallback(
    (diff: AiDiff) => {
      setSavedDiffs((cur) => [...cur, { ts: Date.now(), diff, decision: "rejected" }]);
      onDiffDecision?.(diff, "rejected");
    },
    [onDiffDecision],
  );

  const pending = diffs.filter(
    (d) => !savedDiffs.some((s) => s.diff.id === d.id),
  );

  return (
    <div className={styles.editorWrap}>
      {ref_ && (
        <div className={styles.historyChip}>
          <span className={styles.historyDot} aria-hidden />
          <span className="ptn-mono">{ref_}</span>
          <span>·</span>
          <span>{savedLabel}</span>
        </div>
      )}

      <EditorContent editor={editor} />

      {pending.length > 0 && (
        <aside
          className={`${styles.diffPanel} ${showDiff ? styles.diffPanelOpen : ""}`}
          role="complementary"
          aria-label="Suggestions IA"
        >
          <header className={styles.diffHead}>
            <div className={styles.diffHeadIco}>
              <AiGenerate size={14} aria-hidden />
            </div>
            <div className={styles.diffHeadInfo}>
              <div className={styles.diffTitle}>
                {pending.length} suggestion{pending.length > 1 ? "s" : ""} IA
              </div>
              <div className={styles.diffSub}>claude-opus-4-7 · validation requise</div>
            </div>
            <button
              type="button"
              className={styles.diffClose}
              onClick={() => setShowDiff(false)}
              aria-label="Fermer le panneau de suggestions"
            >
              <Close size={14} aria-hidden />
            </button>
          </header>

          <div className={styles.diffBody}>
            {pending.map((d) => {
              const cls =
                d.kind === "add"
                  ? styles.diffItemAdd
                  : d.kind === "delete"
                    ? styles.diffItemDel
                    : "";
              const Icon = d.kind === "add" ? Add : d.kind === "delete" ? Subtract : Renew;
              return (
                <div key={d.id} className={`${styles.diffItem} ${cls}`}>
                  <div className={styles.diffItemHead}>
                    <Icon size={10} aria-hidden />
                    <span>{d.kind.toUpperCase()}</span>
                    <span>· {d.section}</span>
                    {d.confidence !== undefined && (
                      <span style={{ marginLeft: "auto" }}>
                        Conf. {Math.round(d.confidence * 100)} %
                      </span>
                    )}
                  </div>
                  {d.original && (
                    <div
                      style={{
                        textDecoration: "line-through",
                        color: "var(--cds-text-helper)",
                        marginBottom: 4,
                      }}
                    >
                      {d.original}
                    </div>
                  )}
                  <div>{d.text}</div>
                  <div className={styles.diffActions}>
                    <button
                      type="button"
                      className={`${styles.diffBtn} ${styles.diffBtnAccept}`}
                      onClick={() => handleAccept(d)}
                    >
                      <CheckmarkFilled size={10} aria-hidden /> Accepter
                    </button>
                    <button
                      type="button"
                      className={`${styles.diffBtn} ${styles.diffBtnReject}`}
                      onClick={() => handleReject(d)}
                    >
                      <Close size={10} aria-hidden /> Refuser
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          <div className={styles.diffFoot}>
            <button
              type="button"
              className={styles.diffFootBtn}
              onClick={() => pending.forEach((d) => handleReject(d))}
            >
              Tout refuser
            </button>
            <button
              type="button"
              className={`${styles.diffFootBtn} ${styles.diffFootBtnPrimary}`}
              onClick={() => pending.forEach((d) => handleAccept(d))}
            >
              Tout accepter
            </button>
          </div>
        </aside>
      )}

      {pending.length === 0 && diffs.length > 0 && (
        <div
          style={{
            position: "absolute",
            bottom: 16,
            right: 16,
            background: "var(--ptn-status-success-surface)",
            color: "var(--ptn-status-success-text)",
            padding: "6px 12px",
            fontSize: 11,
            fontFamily: "var(--font-ibm-plex-mono)",
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            zIndex: 5,
          }}
        >
          <CheckmarkFilled size={12} aria-hidden /> Toutes suggestions traitées (
          {savedDiffs.length})
        </div>
      )}
    </div>
  );
}
