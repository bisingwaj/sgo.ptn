import type { ReactNode } from "react";
import { AuthGate } from "@/components/auth/AuthGate";
import { Header } from "./Header";
import { SideNav } from "./SideNav";
import { AssistantChatbot } from "@/components/chatbot/AssistantChatbot";
import styles from "./Shell.module.scss";

interface ShellProps {
  crumbs?: { label: string; href?: string }[];
  children: ReactNode;
  /** Affiche un panneau de droite contextuel (320px) */
  sidePanel?: ReactNode;
  /** Désactive l'assistant procédural (ex. pages confidentielles) */
  hideAssistant?: boolean;
}

/**
 * Coque des écrans authentifiés.
 *
 * `AuthGate` est posé ici, et non sur chaque page : les 53 écrans concernés
 * traversent déjà ce composant. Une garde à réappliquer page par page est une
 * garde qu'on finit par oublier — et la première oubliée serait celle qui
 * compte.
 */
export function Shell({ crumbs, children, sidePanel, hideAssistant }: ShellProps) {
  return (
    <AuthGate>
      <div className={styles.shell}>
        <Header crumbs={crumbs} />
        <div className={styles.body}>
          <SideNav />
          <main className={styles.main} id="ptn-main" tabIndex={-1}>
            <div className={styles.mainInner}>{children}</div>
            {sidePanel && (
              <aside className={styles.sidePanel} aria-label="Panneau contextuel">
                {sidePanel}
              </aside>
            )}
          </main>
        </div>
        {!hideAssistant && <AssistantChatbot />}
      </div>
    </AuthGate>
  );
}
