"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  CheckmarkFilled,
  WarningAltFilled,
  Information,
  ErrorFilled,
  AiGenerate,
  Close,
} from "@carbon/icons-react";
import styles from "./Toast.module.scss";

export type ToastTone = "success" | "info" | "warning" | "error" | "ai";

export interface ToastInput {
  tone?: ToastTone;
  title: string;
  message?: ReactNode;
  /** Durée d'affichage en ms — 0 = persistant. Défaut 4000 */
  duration?: number;
  action?: { label: string; onClick: () => void };
}

interface ToastEntry extends Required<Omit<ToastInput, "message" | "action">> {
  id: string;
  message?: ReactNode;
  action?: ToastInput["action"];
  exiting?: boolean;
}

interface ToastContextValue {
  toast: (input: ToastInput) => string;
  dismiss: (id: string) => void;
  dismissAll: () => void;
}

const ToastCtx = createContext<ToastContextValue | null>(null);

let nextId = 0;
const makeId = () => `t-${++nextId}-${Date.now()}`;

const ICONS: Record<ToastTone, typeof CheckmarkFilled> = {
  success: CheckmarkFilled,
  info: Information,
  warning: WarningAltFilled,
  error: ErrorFilled,
  ai: AiGenerate,
};

const TONE_CLS: Record<ToastTone, { wrap: string; icon: string }> = {
  success: { wrap: styles.toastSuccess, icon: styles.iconSuccess },
  info: { wrap: styles.toastInfo, icon: styles.iconInfo },
  warning: { wrap: styles.toastWarning, icon: styles.iconWarning },
  error: { wrap: styles.toastError, icon: styles.iconError },
  ai: { wrap: styles.toastAi, icon: styles.iconAi },
};

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastEntry[]>([]);
  const timers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  const dismiss = useCallback((id: string) => {
    setToasts((cur) => cur.map((t) => (t.id === id ? { ...t, exiting: true } : t)));
    setTimeout(() => {
      setToasts((cur) => cur.filter((t) => t.id !== id));
    }, 200);
    const tm = timers.current.get(id);
    if (tm) {
      clearTimeout(tm);
      timers.current.delete(id);
    }
  }, []);

  const toast = useCallback(
    (input: ToastInput): string => {
      const id = makeId();
      const tone: ToastTone = input.tone ?? "info";
      const duration = input.duration ?? 4000;
      const entry: ToastEntry = {
        id,
        tone,
        title: input.title,
        message: input.message,
        action: input.action,
        duration,
      };
      setToasts((cur) => [...cur, entry]);
      if (duration > 0) {
        const tm = setTimeout(() => dismiss(id), duration);
        timers.current.set(id, tm);
      }
      return id;
    },
    [dismiss],
  );

  const dismissAll = useCallback(() => {
    setToasts([]);
    timers.current.forEach((tm) => clearTimeout(tm));
    timers.current.clear();
  }, []);

  // Cleanup timers on unmount
  useEffect(() => {
    const map = timers.current;
    return () => {
      map.forEach((tm) => clearTimeout(tm));
      map.clear();
    };
  }, []);

  return (
    <ToastCtx.Provider value={{ toast, dismiss, dismissAll }}>
      {children}
      <div className={styles.region} role="status" aria-live="polite">
        {toasts.map((t) => {
          const Icon = ICONS[t.tone];
          const cls = TONE_CLS[t.tone];
          return (
            <div
              key={t.id}
              className={`${styles.toast} ${cls.wrap} ${t.exiting ? styles.toastExit : ""}`}
            >
              <div className={`${styles.icon} ${cls.icon}`}>
                <Icon size={18} aria-hidden />
              </div>
              <div className={styles.body}>
                <div className={styles.title}>{t.title}</div>
                {t.message && <div className={styles.message}>{t.message}</div>}
                {t.action && (
                  <div className={styles.actions}>
                    <button
                      type="button"
                      className={styles.action}
                      onClick={() => {
                        t.action?.onClick();
                        dismiss(t.id);
                      }}
                    >
                      {t.action.label}
                    </button>
                  </div>
                )}
              </div>
              <button
                type="button"
                className={styles.close}
                onClick={() => dismiss(t.id)}
                aria-label="Fermer la notification"
              >
                <Close size={14} aria-hidden />
              </button>
            </div>
          );
        })}
      </div>
    </ToastCtx.Provider>
  );
}

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastCtx);
  if (!ctx) {
    throw new Error("useToast doit être utilisé dans un <ToastProvider>");
  }
  return ctx;
}
