"use client";

/**
 * Ossature client de la coque.
 *
 * Elle existe pour une seule raison : le bandeau porte le bouton d'ouverture
 * du panneau contextuel, et le panneau est ailleurs dans l'arbre. L'état est
 * donc tenu par leur ancêtre commun, ici, plutôt que par un contexte — deux
 * consommateurs voisins ne justifient pas une couche de plus.
 *
 * La préférence est mémorisée : quelqu'un qui garde le panneau ouvert le
 * retrouve ouvert au prochain écran, sans avoir à le rouvrir à chaque
 * navigation.
 */

import { useCallback, useSyncExternalStore, type ReactNode } from "react";
import { Header } from "./Header";
import { SideNav } from "./SideNav";
import { SidePanelDrawer } from "./SidePanelDrawer";
import { AssistantChatbot } from "@/components/chatbot/AssistantChatbot";
import {
  getServerSnapshot,
  getSnapshot,
  setSidePanelOpen,
  subscribe,
} from "./side-panel-store";
import styles from "./Shell.module.scss";

interface ShellFrameProps {
  crumbs?: { label: string; href?: string }[];
  children: ReactNode;
  sidePanel?: ReactNode;
  sidePanelTitle?: string;
  hideAssistant?: boolean;
}

export function ShellFrame({
  crumbs,
  children,
  sidePanel,
  sidePanelTitle,
  hideAssistant,
}: ShellFrameProps) {
  // Fermé par défaut ; la préférence est relue au montage côté client.
  // Voir side-panel-store.ts pour le choix de useSyncExternalStore.
  const panelOpen = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  const togglePanel = useCallback(() => {
    setSidePanelOpen(!getSnapshot());
  }, []);

  return (
    <div className={styles.shell}>
      <Header
        crumbs={crumbs}
        onToggleSidePanel={sidePanel ? togglePanel : undefined}
        sidePanelOpen={panelOpen}
      />
      <div className={styles.body}>
        <SideNav />
        <main className={styles.main} id="ptn-main" tabIndex={-1}>
          <div className={styles.mainInner}>{children}</div>
        </main>
      </div>

      {sidePanel && (
        <SidePanelDrawer
          open={panelOpen}
          onClose={togglePanel}
          title={sidePanelTitle ?? "Panneau contextuel"}
        >
          {sidePanel}
        </SidePanelDrawer>
      )}

      {!hideAssistant && <AssistantChatbot />}
    </div>
  );
}
