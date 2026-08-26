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

import { useId } from "react";
import type { ComponentType, ReactNode } from "react";
import { ComboBox, Dropdown } from "@carbon/react";
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

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  /**
   * React 19 transmet `ref` comme une prop ordinaire aux composants
   * fonction — plus de `forwardRef`. Déclarée ici parce que
   * `InputHTMLAttributes` ne la porte pas : sans elle, un champ masqué ne
   * peut pas replacer le curseur après reformatage.
   */
  ref?: React.Ref<HTMLInputElement>;
}

export function Input(props: InputProps) {
  return <input {...props} className={`${styles.input} ${props.className ?? ""}`} />;
}

/**
 * Une interface qui n'ajoute aucun membre équivaut à son sur-type, et le
 * lint le refuse à juste titre : elle laisse croire à une extension qui
 * n'existe pas. `Input` au-dessus en ajoute un, `Textarea` non — un alias
 * dit exactement cela.
 */
type TextareaProps = React.TextareaHTMLAttributes<HTMLTextAreaElement>;

export function Textarea(props: TextareaProps) {
  return <textarea {...props} className={`${styles.textarea} ${props.className ?? ""}`} />;
}

export interface OptionSelect {
  value: string;
  label: string;
}

interface SelectProps {
  label: string;
  value: string;
  onChange: (valeur: string) => void;
  options: OptionSelect[];
  /**
   * Le choix « rien ». Rendu comme une ENTRÉE de la liste, non comme un
   * gris de fond : c'est souvent une réponse en soi — « aucune maîtrise
   * d'ouvrage tierce » — et il faut pouvoir y revenir après coup.
   */
  placeholder?: string;
  helper?: ReactNode;
  required?: boolean;
  error?: string | null;
  disabled?: boolean;
  /**
   * Liste longue : bascule en saisie filtrante. Vingt-six organisations
   * dans un menu déroulant se parcourent à l'aveugle.
   */
  searchable?: boolean;
  id?: string;
}

/**
 * Liste de choix — Carbon, et non plus `<select>` natif.
 *
 * Le `<select>` du navigateur ouvre une liste dessinée par le SYSTÈME :
 * fond noir, police du système, aucun jeton du thème. Au milieu d'un
 * formulaire Carbon, elle passait pour un défaut d'affichage — et elle ne
 * suivait ni le thème sombre, ni l'échelle typographique du produit.
 *
 * Le libellé est porté par le composant lui-même : Carbon le veut dans
 * `titleText`, et l'envelopper dans le `<label>` de `Field` mettrait une
 * liste interactive à l'intérieur d'une étiquette.
 */
export function Select({
  label,
  value,
  onChange,
  options,
  placeholder,
  helper,
  required,
  error,
  disabled,
  searchable,
  id,
}: SelectProps) {
  const auto = useId();
  const idChamp = id ?? `select-${auto}`;

  // Le choix « rien » est une entrée à part entière, en tête de liste.
  const entrees: OptionSelect[] = placeholder
    ? [{ value: "", label: placeholder }, ...options]
    : options;
  const choisi = entrees.find((o) => o.value === value) ?? null;

  const communs = {
    id: idChamp,
    titleText: (
      <>
        {label}
        {required && <span className={styles.required}>*</span>}
      </>
    ),
    helperText: error ? undefined : helper,
    invalid: Boolean(error),
    invalidText: error ?? undefined,
    disabled,
    items: entrees,
    itemToString: (o: OptionSelect | null) => o?.label ?? "",
    selectedItem: choisi,
  };

  return searchable ? (
    <ComboBox
      {...communs}
      placeholder={placeholder ?? "Rechercher…"}
      onChange={({ selectedItem }: { selectedItem?: OptionSelect | null }) =>
        onChange(selectedItem?.value ?? "")
      }
    />
  ) : (
    <Dropdown
      {...communs}
      label={placeholder ?? "Sélectionner"}
      onChange={({ selectedItem }: { selectedItem?: OptionSelect | null }) =>
        onChange(selectedItem?.value ?? "")
      }
    />
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

/**
 * Marque de sélection, commune à tout le produit.
 *
 * Carré tant que rien n'est retenu, coche pleine dès que ça l'est — et le
 * carré disparaît alors, il ne s'ajoute pas à la coche. C'est la forme
 * qu'utilisent déjà les sélecteurs en lignes des premières étapes ; deux
 * grammaires de sélection dans un même parcours obligent à réapprendre à
 * mi-chemin.
 *
 * La case native reste en place, seulement retirée de l'affichage : c'est
 * elle qui porte l'état pour le clavier et les lecteurs d'écran.
 */
export function CheckRow({ checked, onChange, title, description, level }: CheckRowProps) {
  return (
    <label className={`${styles.checkRow} ${checked ? styles.checkRowChecked : ""}`}>
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className={styles.checkInputCache}
      />
      <span
        aria-hidden
        className={`${styles.checkMark} ${checked ? styles.checkMarkOn : ""}`}
      >
        {checked && <CheckmarkFilled size={20} />}
      </span>
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
