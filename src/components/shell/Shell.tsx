import type { ReactNode } from "react";
import { AuthGate } from "@/components/auth/AuthGate";
import { ShellFrame } from "./ShellFrame";

interface ShellProps {
  crumbs?: { label: string; href?: string }[];
  children: ReactNode;
  /**
   * Panneau contextuel. Présenté en tiroir, masqué par défaut : il n'occupe
   * plus 320 px en permanence sur des écrans dont le contenu réel est un
   * tableau.
   */
  sidePanel?: ReactNode;
  /** Intitulé du tiroir — sert de titre accessible au dialogue. */
  sidePanelTitle?: string;
  /** Désactive l'assistant procédural (ex. pages confidentielles) */
  hideAssistant?: boolean;
}

/**
 * Coque des écrans authentifiés.
 *
 * `AuthGate` est posé ici, et non sur chaque page : les écrans concernés
 * traversent déjà ce composant. Une garde à réappliquer page par page est une
 * garde qu'on finit par oublier — et la première oubliée serait celle qui
 * compte.
 */
export function Shell({
  crumbs,
  children,
  sidePanel,
  sidePanelTitle,
  hideAssistant,
}: ShellProps) {
  return (
    <AuthGate>
      <ShellFrame
        crumbs={crumbs}
        sidePanel={sidePanel}
        sidePanelTitle={sidePanelTitle}
        hideAssistant={hideAssistant}
      >
        {children}
      </ShellFrame>
    </AuthGate>
  );
}
