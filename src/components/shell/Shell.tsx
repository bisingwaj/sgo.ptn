import type { ReactNode } from "react";
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

export function Shell({ crumbs, children, sidePanel, hideAssistant }: ShellProps) {
  return (
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
  );
}
