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

import { useCallback, type ReactNode } from "react";
import { Header } from "./Header";
import { SideNav } from "./SideNav";
import { SidePanelDrawer } from "./SidePanelDrawer";
import { AssistantChatbot } from "@/components/chatbot/AssistantChatbot";
import { VoileSelonChemin } from "@/components/etat/VoileDeveloppement";
import { sidePanelStore } from "./side-panel-store";
import { sideNavStore } from "./sidenav-store";
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
  const panelOpen = sidePanelStore.use();
  const navCollapsed = sideNavStore.use();

  const togglePanel = useCallback(() => {
    sidePanelStore.set(!sidePanelStore.get());
  }, []);

  const toggleNav = useCallback(() => {
    sideNavStore.set(!sideNavStore.get());
  }, []);

  return (
    <div className={styles.shell}>
      <Header
        crumbs={crumbs}
        onToggleSidePanel={sidePanel ? togglePanel : undefined}
        sidePanelOpen={panelOpen}
        onToggleNav={toggleNav}
        navCollapsed={navCollapsed}
      />
      <div className={styles.body}>
        <SideNav collapsed={navCollapsed} />
        <main className={styles.main} id="ptn-main" tabIndex={-1}>
          {/*
            Le voile est posé ICI, à l'intérieur de la coque.

            Sept profils sur huit atterrissent sur un module encore bâti
            sur des fixtures — cockpit, tableau de bord, partenaire,
            bailleur, SBP, auditeur, gouvernance. Voiler plus haut
            emporterait le bandeau et la navigation avec le contenu :
            ces profils se connecteraient sur un écran flou SANS ISSUE.
            Ici, seul le contenu est couvert ; les menus restent vivants
            et conduisent aux modules qui, eux, fonctionnent.
          */}
          <div className={styles.mainInner}>
            <VoileSelonChemin>{children}</VoileSelonChemin>
          </div>
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
