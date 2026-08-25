"use client";

/**
 * Sélecteur déroulant à choix multiple.
 *
 * Même allure que `DropdownPicker` — même déclencheur, même recherche, même
 * clavier, même feuille de style — mais le menu ne se referme pas au choix :
 * on coche plusieurs entrées d'affilée, et Espace bascule celle qui a le
 * focus.
 *
 * Une case à cocher plutôt qu'une coche à droite : elle dit AVANT le clic
 * que l'entrée est cochable, là où une coche ne le dit qu'après.
 *
 * Le déclencheur résume au lieu d'énumérer. Au-delà de deux entrées, une
 * liste complète déborde du champ et cesse d'être lisible.
 */

import { useEffect, useId, useMemo, useRef, useState } from "react";
import { ChevronDown, Checkmark, Search } from "@carbon/icons-react";
import type { DropdownOption } from "./DropdownPicker";
import styles from "./DropdownPicker.module.scss";

interface MultiDropdownPickerProps {
  options: DropdownOption[];
  values: string[];
  onChange: (v: string[]) => void;
  placeholder?: string;
  /** Affiche la zone de recherche — indispensable au-delà d'une dizaine */
  searchable?: boolean;
  disabled?: boolean;
  ariaLabel?: string;
  className?: string;
  /** Ce qu'affiche le déclencheur quand plusieurs entrées sont retenues */
  resume?: (choisis: DropdownOption[]) => string;
  /**
   * Intitulé de l'action « tout retenir ». Absent, l'action ne s'affiche
   * pas : cocher vingt-six entrées d'un geste n'a de sens que là où « tout »
   * est une réponse légitime — la couverture nationale, par exemple.
   */
  toutLabel?: string;
}

export function MultiDropdownPicker({
  options,
  values,
  onChange,
  placeholder = "Sélectionner",
  searchable,
  disabled,
  ariaLabel,
  className,
  resume,
  toutLabel,
}: MultiDropdownPickerProps) {
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

  const choisis = options.filter((o) => values.includes(o.value));

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [open]);

  useEffect(() => {
    if (open && searchable && searchRef.current) {
      const t = setTimeout(() => searchRef.current?.focus(), 30);
      return () => clearTimeout(t);
    }
  }, [open, searchable]);

  useEffect(() => {
    if (open) {
      setQuery("");
      setFocusedIdx(0);
    }
  }, [open]);

  // L'entrée qui a le focus reste visible pendant la navigation au clavier.
  useEffect(() => {
    if (!open || !listRef.current) return;
    const list = listRef.current;
    const cible = list.querySelectorAll("[role=option]")[focusedIdx] as HTMLElement | undefined;
    if (!cible) return;
    const haut = cible.offsetTop;
    const bas = haut + cible.offsetHeight;
    if (haut < list.scrollTop) list.scrollTop = haut;
    else if (bas > list.scrollTop + list.clientHeight) list.scrollTop = bas - list.clientHeight;
  }, [focusedIdx, open]);

  const basculer = (v: string) =>
    onChange(values.includes(v) ? values.filter((x) => x !== v) : [...values, v]);

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
    } else if (e.key === "Enter" || e.key === " ") {
      // Le menu reste ouvert, à la différence du sélecteur simple : on coche
      // plusieurs entrées sans le rouvrir à chaque fois.
      e.preventDefault();
      const opt = filtered[focusedIdx];
      if (opt && !opt.disabled) basculer(opt.value);
    } else if (e.key === "Tab") {
      setOpen(false);
    }
  };

  const etiquette =
    choisis.length === 0
      ? null
      : resume
        ? resume(choisis)
        : choisis.length <= 2
          ? choisis.map((o) => o.label).join(", ")
          : `${choisis.length} sélectionnés`;

  return (
    <div ref={wrapRef} className={`${styles.wrap} ${className ?? ""}`} onKeyDown={onKeyDown}>
      <button
        type="button"
        className={`${styles.trigger} ${open ? styles.triggerOpen : ""}`}
        onClick={() => !disabled && setOpen((o) => !o)}
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listboxId}
        aria-label={ariaLabel}
      >
        {etiquette ? (
          <span className={styles.value} title={choisis.map((o) => o.label).join(", ")}>
            {etiquette}
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
        aria-multiselectable
        id={listboxId}
        aria-hidden={!open}
      >
        {searchable && (
          <div className={styles.menuSearch}>
            <Search
              size={14}
              aria-hidden
              style={{ color: "var(--cds-text-helper)", flexShrink: 0 }}
            />
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

        {/* Tout retenir / tout retirer.
            Cocher les vingt-six provinces une à une était le seul moyen de
            dire « tout le pays » — vingt-six clics pour la réponse la plus
            courante. L'action agit sur ce qui est FILTRÉ : après une
            recherche, elle porte sur ce qu'on voit, jamais sur ce qu'on ne
            voit pas. */}
        {toutLabel && filtered.length > 1 && (
          <div className={styles.menuActions}>
            <button
              type="button"
              className={styles.menuAction}
              onClick={() => {
                const visibles = filtered.filter((o) => !o.disabled).map((o) => o.value);
                const tousRetenus = visibles.every((v) => values.includes(v));
                onChange(
                  tousRetenus
                    ? values.filter((v) => !visibles.includes(v))
                    : [...new Set([...values, ...visibles])],
                );
              }}
            >
              {filtered
                .filter((o) => !o.disabled)
                .every((o) => values.includes(o.value))
                ? "Tout retirer"
                : toutLabel}
            </button>
            {values.length > 0 && (
              <span className={styles.menuCount}>
                {values.length} retenue{values.length > 1 ? "s" : ""}
              </span>
            )}
          </div>
        )}

        <div className={styles.menuList} ref={listRef}>
          {filtered.length === 0 ? (
            <div className={styles.optionEmpty}>Aucun résultat</div>
          ) : (
            filtered.map((opt, i) => {
              const coche = values.includes(opt.value);
              const focus = i === focusedIdx;
              return (
                <button
                  key={opt.value}
                  type="button"
                  role="option"
                  aria-selected={coche}
                  disabled={opt.disabled}
                  className={`${styles.option} ${coche ? styles.optionActive : ""} ${
                    focus && !coche ? styles.optionFocused : ""
                  }`}
                  onClick={() => !opt.disabled && basculer(opt.value)}
                  onMouseEnter={() => setFocusedIdx(i)}
                >
                  <span className={styles.caseCocher} aria-hidden>
                    {coche && <Checkmark size={12} />}
                  </span>
                  <div className={styles.optionMain}>
                    <div className={styles.optionLabel}>{opt.label}</div>
                    {opt.sub && <div className={styles.optionSub}>{opt.sub}</div>}
                  </div>
                </button>
              );
            })
          )}
        </div>

        {/* Le pied reste visible pendant qu'on coche : c'est là que se lit le
            compte, et que l'on se dédit d'un coup. */}
        {values.length > 0 && (
          <div className={styles.menuPied}>
            <span>
              {values.length} retenue{values.length > 1 ? "s" : ""}
            </span>
            <button type="button" onClick={() => onChange([])}>
              Tout retirer
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
