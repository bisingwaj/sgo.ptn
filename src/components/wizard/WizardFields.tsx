"use client";

/**
 * Atomes de formulaire pour Wizard, alignés Carbon DS.
 * - Field : label + input + helper/error
 * - Textarea
 * - Select
 * - RadioGroup (segments)
 * - Tile selectable
 * - SignatureBlock (Code de Conduite, COI)
 */

import type { ComponentType, ReactNode } from "react";
import { CheckmarkFilled } from "@carbon/icons-react";
import styles from "./WizardFields.module.scss";

interface FieldProps {
  label: string;
  required?: boolean;
  helper?: ReactNode;
  error?: string | null;
  children: ReactNode;
}

export function Field({ label, required, helper, error, children }: FieldProps) {
  return (
    <label className={styles.field}>
      <span className={styles.label}>
        {label}
        {required && <span className={styles.required}>*</span>}
      </span>
      <span className={`${styles.inputWrap} ${error ? styles.inputWrapError : ""}`}>
        {children}
      </span>
      {error ? (
        <span className={styles.error}>{error}</span>
      ) : helper ? (
        <span className={styles.helper}>{helper}</span>
      ) : null}
    </label>
  );
}

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {}

export function Input(props: InputProps) {
  return <input {...props} className={`${styles.input} ${props.className ?? ""}`} />;
}

interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {}

export function Textarea(props: TextareaProps) {
  return <textarea {...props} className={`${styles.textarea} ${props.className ?? ""}`} />;
}

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  options: Array<{ value: string; label: string }>;
  placeholder?: string;
}

export function Select({ options, placeholder, ...rest }: SelectProps) {
  return (
    <select {...rest} className={`${styles.select} ${rest.className ?? ""}`}>
      {placeholder && (
        <option value="" disabled>
          {placeholder}
        </option>
      )}
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  );
}

interface SegmentedProps {
  options: Array<{ value: string; label: string }>;
  value: string;
  onChange: (v: string) => void;
  ariaLabel: string;
}

export function Segmented({ options, value, onChange, ariaLabel }: SegmentedProps) {
  return (
    <div className={styles.segmented} role="radiogroup" aria-label={ariaLabel}>
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          role="radio"
          aria-checked={o.value === value}
          onClick={() => onChange(o.value)}
          className={`${styles.segment} ${o.value === value ? styles.segmentActive : ""}`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

interface SelectableTileProps {
  selected: boolean;
  onClick: () => void;
  /** Tag mono à gauche (ex. "C2", "EESU") */
  tag?: string;
  title: string;
  description?: string;
  metrics?: ReactNode;
  disabled?: boolean;
  /**
   * Pictogramme du choix. Une grille de onze tuiles se parcourt d'abord à
   * la forme : sans lui, l'œil doit lire onze titres pour en distinguer un.
   */
  icon?: ComponentType<{ size?: number }>;
}

export function SelectableTile({
  selected,
  onClick,
  tag,
  title,
  description,
  metrics,
  disabled,
  icon: Icon,
}: SelectableTileProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`${styles.tile} ${selected ? styles.tileSelected : ""}`}
    >
      <div className={styles.tileHead}>
        {Icon ? (
          <span className={styles.tileIcon} aria-hidden>
            <Icon size={20} />
          </span>
        ) : (
          tag && <span className={`${styles.tileTag} ptn-mono`}>{tag}</span>
        )}
        {selected && (
          <span className={styles.tileCheck} aria-hidden>
            <CheckmarkFilled size={16} />
          </span>
        )}
      </div>
      <div className={styles.tileTitle}>{title}</div>
      {Icon && tag && <span className={`${styles.tileRef} ptn-mono`}>{tag}</span>}
      {description && <div className={styles.tileDesc}>{description}</div>}
      {metrics && <div className={styles.tileMetrics}>{metrics}</div>}
    </button>
  );
}

interface CheckRowProps {
  checked: boolean;
  onChange: (next: boolean) => void;
  title: string;
  description?: ReactNode;
  level?: { label: string; tone: "blue" | "green" | "yellow" | "red" | "gray" };
}

export function CheckRow({ checked, onChange, title, description, level }: CheckRowProps) {
  return (
    <label className={`${styles.checkRow} ${checked ? styles.checkRowChecked : ""}`}>
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className={styles.checkInput}
      />
      <div className={styles.checkBody}>
        <div className={styles.checkHead}>
          <span className={styles.checkTitle}>{title}</span>
          {level && (
            <span className={`${styles.checkLevel} ${styles[`level_${level.tone}`]}`}>
              {level.label}
            </span>
          )}
        </div>
        {description && <div className={styles.checkDesc}>{description}</div>}
      </div>
    </label>
  );
}

interface SignatureBlockProps {
  title: string;
  text: ReactNode;
  signed: boolean;
  onSign: () => void;
  signerName: string;
}

export function SignatureBlock({
  title,
  text,
  signed,
  onSign,
  signerName,
}: SignatureBlockProps) {
  return (
    <div className={`${styles.signature} ${signed ? styles.signatureSigned : ""}`}>
      <div className={styles.signatureHead}>
        <strong>{title}</strong>
        {signed && (
          <span className={styles.signedBadge}>
            <CheckmarkFilled size={14} aria-hidden /> Signé électroniquement
          </span>
        )}
      </div>
      <div className={styles.signatureText}>{text}</div>
      {!signed ? (
        <button type="button" onClick={onSign} className={styles.signBtn}>
          Lire et signer
        </button>
      ) : (
        <div className={styles.signedFooter}>
          <span className="ptn-mono">{signerName}</span>
          <span className={`${styles.signedTime} ptn-mono`}>
            {new Date().toLocaleString("fr-FR", {
              dateStyle: "short",
              timeStyle: "short",
            })}{" "}
            UTC
          </span>
        </div>
      )}
    </div>
  );
}

/** Note d'avertissement contextuelle */
interface NoteProps {
  tone?: "info" | "warning" | "danger" | "ai";
  children: ReactNode;
  title?: ReactNode;
}

export function Note({ tone = "info", children, title }: NoteProps) {
  return (
    <div className={`${styles.note} ${styles[`note_${tone}`]}`}>
      {title && <strong className={styles.noteTitle}>{title}</strong>}
      <div className={styles.noteBody}>{children}</div>
    </div>
  );
}
