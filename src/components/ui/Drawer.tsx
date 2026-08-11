"use client";

import { useEffect, type ReactNode } from "react";
import { Close } from "@carbon/icons-react";
import styles from "./Drawer.module.scss";

interface DrawerProps {
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle?: ReactNode;
  width?: number;
  children: ReactNode;
  footer?: ReactNode;
}

export function Drawer({
  open,
  onClose,
  title,
  subtitle,
  width = 480,
  children,
  footer,
}: DrawerProps) {
  // Esc pour fermer
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [open, onClose]);

  // Scroll lock
  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  if (!open) return null;

  return (
    <>
      <div className={styles.backdrop} onClick={onClose} aria-hidden />
      <aside
        className={styles.drawer}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        style={{ width }}
      >
        <header className={styles.head}>
          <div className={styles.headMeta}>
            <h2 className={styles.title}>{title}</h2>
            {subtitle && <div className={styles.subtitle}>{subtitle}</div>}
          </div>
          <button
            type="button"
            className={styles.close}
            onClick={onClose}
            aria-label="Fermer"
          >
            <Close size={20} aria-hidden />
          </button>
        </header>
        <div className={styles.body}>{children}</div>
        {footer && <footer className={styles.foot}>{footer}</footer>}
      </aside>
    </>
  );
}
