"use client";

/**
 * DropdownPicker — composant unifié remplaçant les <select> natifs.
 * Aligné sur le design system Carbon DS v11 / Claude Design.
 *
 * - Recherche live optionnelle
 * - Navigation clavier complète (↑ ↓ Enter Esc Tab)
 * - Click outside pour fermer
 * - Sub-labels pour options enrichies
 */

import {
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { ChevronDown, CheckmarkFilled, Search } from "@carbon/icons-react";
import styles from "./DropdownPicker.module.scss";

export interface DropdownOption {
  value: string;
  label: string;
  /** Sous-libellé optionnel (ex. "Banque mondiale · IDA") */
  sub?: string;
  /** Icône / élément à gauche du label */
  prefix?: ReactNode;
  disabled?: boolean;
}

interface DropdownPickerProps {
  options: DropdownOption[];
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  /** Active la zone de recherche en haut du menu */
  searchable?: boolean;
  disabled?: boolean;
  error?: boolean;
  ariaLabel?: string;
  className?: string;
}

export function DropdownPicker({
  options,
  value,
  onChange,
  placeholder = "Sélectionner",
  searchable,
  disabled,
  error,
  ariaLabel,
  className,
}: DropdownPickerProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [focusedIdx, setFocusedIdx] = useState(0);
  const wrapRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const listboxId = useId();

  const filtered = useMemo(() => {
    if (!query.trim()) return options;
    const q = query.toLowerCase();
    return options.filter(
      (o) =>
        o.label.toLowerCase().includes(q) ||
        o.value.toLowerCase().includes(q) ||
        (o.sub ?? "").toLowerCase().includes(q),
    );
  }, [options, query]);

  const current = options.find((o) => o.value === value);

  // Click outside
  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [open]);

  // Focus search when opening
  useEffect(() => {
    if (open && searchable && searchRef.current) {
      const t = setTimeout(() => searchRef.current?.focus(), 30);
      return () => clearTimeout(t);
    }
  }, [open, searchable]);

  // Reset query and focus when opening
  useEffect(() => {
    if (open) {
      setQuery("");
      const idx = options.findIndex((o) => o.value === value);
      setFocusedIdx(idx >= 0 ? idx : 0);
    }
  }, [open, options, value]);

  // Scroll focused option into view
  useEffect(() => {
    if (!open || !listRef.current) return;
    const list = listRef.current;
    const target = list.querySelectorAll("[role=option]")[focusedIdx] as HTMLElement | undefined;
    if (target) {
      const top = target.offsetTop;
      const bottom = top + target.offsetHeight;
      if (top < list.scrollTop) list.scrollTop = top;
      else if (bottom > list.scrollTop + list.clientHeight) {
        list.scrollTop = bottom - list.clientHeight;
      }
    }
  }, [focusedIdx, open]);

  const handleSelect = (v: string) => {
    onChange(v);
    setOpen(false);
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (disabled) return;
    if (e.key === "Escape") {
      e.preventDefault();
      setOpen(false);
      return;
    }
    if (!open && (e.key === "Enter" || e.key === " " || e.key === "ArrowDown")) {
      e.preventDefault();
      setOpen(true);
      return;
    }
    if (!open) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setFocusedIdx((i) => Math.min(filtered.length - 1, i + 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setFocusedIdx((i) => Math.max(0, i - 1));
    } else if (e.key === "Enter") {
      e.preventDefault();
      const opt = filtered[focusedIdx];
      if (opt && !opt.disabled) handleSelect(opt.value);
    } else if (e.key === "Tab") {
      setOpen(false);
    }
  };

  return (
    <div
      ref={wrapRef}
      className={`${styles.wrap} ${className ?? ""}`}
      onKeyDown={onKeyDown}
    >
      <button
        type="button"
        className={`${styles.trigger} ${open ? styles.triggerOpen : ""} ${error ? styles.triggerError : ""}`}
        onClick={() => !disabled && setOpen((o) => !o)}
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listboxId}
        aria-label={ariaLabel}
      >
        {current?.prefix && <span aria-hidden>{current.prefix}</span>}
        {current ? (
          <span className={styles.value} title={current.label}>
            {current.label}
          </span>
        ) : (
          <span className={styles.placeholder}>{placeholder}</span>
        )}
        <span className={`${styles.chevron} ${open ? styles.chevronOpen : ""}`}>
          <ChevronDown size={14} aria-hidden />
        </span>
      </button>

      <div
        className={`${styles.menu} ${open ? styles.menuOpen : ""}`}
        role="listbox"
        id={listboxId}
        aria-hidden={!open}
      >
        {searchable && (
          <div className={styles.menuSearch}>
            <Search size={14} aria-hidden style={{ color: "var(--cds-text-helper)", flexShrink: 0 }} />
            <input
              ref={searchRef}
              type="search"
              placeholder="Rechercher…"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setFocusedIdx(0);
              }}
              className={styles.menuSearchInput}
              aria-label="Filtrer les options"
            />
          </div>
        )}
        <div className={styles.menuList} ref={listRef}>
          {filtered.length === 0 ? (
            <div className={styles.optionEmpty}>Aucun résultat</div>
          ) : (
            filtered.map((opt, i) => {
              const isActive = opt.value === value;
              const isFocused = i === focusedIdx;
              return (
                <button
                  key={opt.value}
                  type="button"
                  role="option"
                  aria-selected={isActive}
                  disabled={opt.disabled}
                  className={`${styles.option} ${isActive ? styles.optionActive : ""} ${
                    isFocused && !isActive ? styles.optionFocused : ""
                  }`}
                  onClick={() => !opt.disabled && handleSelect(opt.value)}
                  onMouseEnter={() => setFocusedIdx(i)}
                >
                  {opt.prefix && <span aria-hidden>{opt.prefix}</span>}
                  <div className={styles.optionMain}>
                    <div className={styles.optionLabel}>{opt.label}</div>
                    {opt.sub && <div className={styles.optionSub}>{opt.sub}</div>}
                  </div>
                  {isActive && (
                    <span className={styles.optionCheck}>
                      <CheckmarkFilled size={14} aria-hidden />
                    </span>
                  )}
                </button>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
