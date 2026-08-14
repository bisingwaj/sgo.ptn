"use client";

/**
 * Panneau de notifications.
 *
 * Le domaine n'existe pas encore côté API — il n'y a ni endpoint ni modèle.
 * Le panneau affiche donc un état vide EXPLICITE plutôt que des notifications
 * fabriquées.
 *
 * C'est délibéré. Des notifications d'exemple sur un bandeau permanent
 * seraient prises pour de vraies : quelqu'un lirait « ANO délivré sur
 * PTN-2026-018 » et agirait dessus. Sur une plateforme de gouvernance, une
 * information inventée qui ressemble à une information réelle est pire
 * qu'une absence d'information.
 */

import Link from "next/link";
import { Notification, Settings } from "@carbon/icons-react";

export function NotificationsPanel({ onNavigate }: { onNavigate: () => void }) {
  return (
    <div className="flex flex-col">
      <div className="border-subtle flex items-center justify-between border-b px-4 py-3">
        <h2 className="text-heading-01 text-primary">Notifications</h2>
        <Link
          href="/partenaire/notifications/preferences"
          onClick={onNavigate}
          className="text-caption text-accent inline-flex items-center gap-1 underline-offset-4 hover:underline"
        >
          <Settings size={14} aria-hidden />
          Préférences
        </Link>
      </div>

      <div className="flex flex-col items-center gap-2 px-6 py-10 text-center">
        <Notification size={24} aria-hidden className="text-helper" />
        <p className="text-body text-primary">Aucune notification</p>
        <p className="text-caption text-secondary max-w-[32ch]">
          Les avis de non-objection, échéances et demandes de clarification
          apparaîtront ici dès que le service sera raccordé.
        </p>
      </div>
    </div>
  );
}
