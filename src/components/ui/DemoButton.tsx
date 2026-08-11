"use client";

/**
 * DemoButton — bouton client qui émet un toast "à venir" pour les actions
 * non encore branchées sur un backend. Garantit que chaque clic a un retour
 * visuel et que l'utilisateur n'a pas l'impression de cliquer dans le vide.
 */

import type { ReactNode } from "react";
import { useToast, type ToastTone } from "@/components/toast/ToastContext";

interface DemoButtonProps {
  label: string;
  icon?: ReactNode;
  /** "secondary" (défaut) ou "primary" */
  variant?: "primary" | "secondary" | "ghost";
  /** Message du toast affiché au clic */
  toastTitle?: string;
  toastMessage?: ReactNode;
  toastTone?: ToastTone;
  className?: string;
  /** Classe inline (utilisé pour les styles partagés ugp-shared) */
  styleOverride?: React.CSSProperties;
  /** Action onClick custom — outrepasse le toast par défaut */
  onClick?: () => void;
}

export function DemoButton({
  label,
  icon,
  variant = "secondary",
  toastTitle,
  toastMessage,
  toastTone = "info",
  className,
  styleOverride,
  onClick,
}: DemoButtonProps) {
  const { toast } = useToast();

  const handleClick = () => {
    if (onClick) {
      onClick();
      return;
    }
    toast({
      tone: toastTone,
      title: toastTitle ?? `${label} — fonctionnalité bientôt disponible`,
      message:
        toastMessage ??
        "Cette action sera branchée sur l'API en production. Pour la démo, l'interaction est simulée.",
      duration: 3500,
    });
  };

  const defaultClass =
    variant === "primary"
      ? "demoBtnPrimary"
      : variant === "ghost"
        ? "demoBtnGhost"
        : "demoBtnSecondary";

  return (
    <button
      type="button"
      onClick={handleClick}
      className={`${defaultClass} ${className ?? ""}`}
      style={styleOverride}
    >
      {icon}
      <span>{label}</span>
    </button>
  );
}
