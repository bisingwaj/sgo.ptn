"use client";

import { useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  Notification,
  CheckmarkFilled,
  WarningAltFilled,
  AiGenerate,
  TaskApproved,
  Time,
  Document,
  Filter,
  ArrowRight,
} from "@carbon/icons-react";
import { EmptyState } from "@/components/ui/EmptyState";
import styles from "./notifications.module.scss";

interface Notif {
  id: string;
  kind: "ok" | "warn" | "err" | "ai" | "info";
  Icon: typeof CheckmarkFilled;
  title: string;
  desc: string;
  meta: string;
  when: string;
  unread: boolean;
  tag: { label: string; tone?: "warn" | "ok" | "ai" };
  actionLabel?: string;
}

const NOTIFICATIONS: Notif[] = [
  {
    id: "n1",
    kind: "warn",
    Icon: WarningAltFilled,
    title: "Demande de clarification UGP sur PROP-2026-019",
    desc: "M. Mukendi (Coord UGP) attend votre réponse sur la section profils-clés. Délai : aujourd'hui.",
    meta: "PROP-2026-019 · Plateforme identité numérique",
    when: "il y a 3h",
    unread: true,
    tag: { label: "Action requise", tone: "warn" },
    actionLabel: "Répondre",
  },
  {
    id: "n2",
    kind: "ok",
    Icon: CheckmarkFilled,
    title: "Banque mondiale a délivré l'ANO pour le DAO PTN-2026-018",
    desc: "Délai final 12 jours (cible 12 j). Vous pouvez démarrer la passation. Contrat à émettre dans les 30 jours.",
    meta: "PROP-2026-018 · Datacenter Tier-3",
    when: "il y a 24 min",
    unread: true,
    tag: { label: "ANO obtenu", tone: "ok" },
    actionLabel: "Voir le DAO",
  },
  {
    id: "n3",
    kind: "ai",
    Icon: AiGenerate,
    title: "Brouillon de TDR généré pour PROP-2026-024",
    desc: "L'assistant IA a généré un brouillon basé sur 4 TDR similaires ayant obtenu un ANO. Confiance 87 %.",
    meta: "Modèle claude-opus-4-7 · Hash a3f2e1",
    when: "il y a 2h",
    unread: true,
    tag: { label: "✦ IA", tone: "ai" },
    actionLabel: "Réviser",
  },
  {
    id: "n4",
    kind: "info",
    Icon: TaskApproved,
    title: "Votre proposition PROP-2026-014 a été intégrée au PPM Q3",
    desc: "RPM K. Lufima a confirmé l'intégration. ANO BM demandé · délai cible 14 j.",
    meta: "PROP-2026-014 · Identité numérique",
    when: "hier 14:30",
    unread: false,
    tag: { label: "PPM Q3" },
  },
  {
    id: "n5",
    kind: "warn",
    Icon: Time,
    title: "Échéance dans 4 jours — Validation comité de pilotage",
    desc: "Le COPIL semestriel valide votre proposition Hub formation le 14 mai. Documentation requise avant 13 mai 18h.",
    meta: "PROP-2026-024 · Hub formation",
    when: "hier 09:12",
    unread: false,
    tag: { label: "J−4", tone: "warn" },
    actionLabel: "Préparer",
  },
  {
    id: "n6",
    kind: "info",
    Icon: Document,
    title: "Document partagé — Plan de sauvegarde environnementale",
    desc: "Bureau d'études CEDEAO a téléversé le PGES Datacenter Tier-3 (4,8 Mo). En revue UGP.",
    meta: "PROP-2026-014 · DOC-2026-082",
    when: "06 mai 11:05",
    unread: false,
    tag: { label: "Document" },
  },
  {
    id: "n7",
    kind: "ok",
    Icon: CheckmarkFilled,
    title: "Marché PTN-2025-094 attribué à Konnect SARL",
    desc: "Attribution validée par la commission. Contrat 2,1 M USD · 18 mois. Signature prévue 15 mai.",
    meta: "PTN-2025-094 · Backbone fibre",
    when: "02 mai 14:20",
    unread: false,
    tag: { label: "Attribué", tone: "ok" },
  },
  {
    id: "n8",
    kind: "info",
    Icon: Notification,
    title: "Mise à jour du Manuel d'Exécution du Projet",
    desc: "Le MEP v2.3 du 23 juin 2025 est maintenant la version active. Modifications principales : §4.2 et §6.1.",
    meta: "MEP v2.3 · Coord UGP",
    when: "01 mai 08:00",
    unread: false,
    tag: { label: "Cadre" },
  },
];

interface FilterDef {
  id: string;
  label: string;
  match: (n: Notif) => boolean;
}

const FILTERS: FilterDef[] = [
  { id: "all", label: "Toutes", match: () => true },
  { id: "unread", label: "Non lues", match: (n) => n.unread },
  { id: "actions", label: "Actions requises", match: (n) => Boolean(n.actionLabel) },
  { id: "ai", label: "IA", match: (n) => n.kind === "ai" },
  { id: "ano", label: "ANO bailleur", match: (n) => n.title.includes("ANO") },
  { id: "echeances", label: "Échéances", match: (n) => /échéance|j−|copil/i.test(n.title) },
];

export function NotificationsClient() {
  const params = useSearchParams();
  const demoEmpty = params?.get("empty") === "1";
  const [activeFilter, setActiveFilter] = useState<string>("all");
  const [items, setItems] = useState<Notif[]>(demoEmpty ? [] : NOTIFICATIONS);

  const counts = useMemo(() => {
    const map: Record<string, number> = {};
    for (const f of FILTERS) {
      map[f.id] = items.filter(f.match).length;
    }
    return map;
  }, [items]);

  const filtered = useMemo(() => {
    const f = FILTERS.find((x) => x.id === activeFilter) ?? FILTERS[0];
    return items.filter(f.match);
  }, [items, activeFilter]);

  const markAllRead = () => {
    setItems((cur) => cur.map((n) => ({ ...n, unread: false })));
  };

  if (items.length === 0) {
    return (
      <EmptyState
        tone="success"
        icon={<CheckmarkFilled size={28} aria-hidden />}
        title="Vous êtes à jour"
        description={
          <>
            Aucune notification non lue. Les ANO bailleurs, demandes de clarification UGP,
            échéances et suggestions IA apparaîtront ici dès qu&apos;une action est requise.
          </>
        }
        hint="Configurez vos canaux préférés depuis les préférences"
        actions={[
          {
            label: "Préférences de notification",
            href: "/partenaire/notifications/preferences",
            primary: true,
          },
          { label: "Retour au tableau de bord", href: "/partenaire" },
        ]}
        standalone
      />
    );
  }

  return (
    <>
      <div className={styles.toolbar}>
        <h3>
          Notifications <span className={styles.num}>({filtered.length})</span>
        </h3>
        <div className={styles.tabs}>
          {FILTERS.map((f) => (
            <button
              key={f.id}
              type="button"
              className={`${styles.tab} ${activeFilter === f.id ? styles.tabActive : ""}`}
              onClick={() => setActiveFilter(f.id)}
              aria-pressed={activeFilter === f.id}
            >
              {f.label}
              <span className={styles.tabCount}>{counts[f.id] ?? 0}</span>
            </button>
          ))}
        </div>
        <div className={styles.spacer} />
        <button type="button" className={styles.btnSecondary} onClick={markAllRead}>
          <CheckmarkFilled size={14} aria-hidden /> Tout marquer comme lu
        </button>
        <button type="button" className={styles.btnSecondary}>
          <Filter size={14} aria-hidden /> Filtres
        </button>
      </div>

      <div className={styles.list}>
        {filtered.length === 0 ? (
          <div
            style={{
              padding: "48px 24px",
              textAlign: "center",
              color: "var(--cds-text-helper)",
            }}
          >
            <CheckmarkFilled
              size={32}
              aria-hidden
              style={{ color: "var(--ptn-status-success)", marginBottom: 12 }}
            />
            <div style={{ fontSize: 14, fontWeight: 500, color: "var(--cds-text-primary)", marginBottom: 4 }}>
              Aucune notification dans cette catégorie
            </div>
            <div style={{ fontSize: 12 }}>Vous êtes à jour.</div>
          </div>
        ) : (
          filtered.map((n) => {
            const icoCls =
              n.kind === "ok"
                ? styles.icoOk
                : n.kind === "warn"
                  ? styles.icoWarn
                  : n.kind === "err"
                    ? styles.icoErr
                    : n.kind === "ai"
                      ? styles.icoAi
                      : styles.icoInfo;
            const tagCls =
              n.tag.tone === "warn"
                ? styles.tagWarn
                : n.tag.tone === "ok"
                  ? styles.tagOk
                  : n.tag.tone === "ai"
                    ? styles.tagAi
                    : "";
            return (
              <button
                key={n.id}
                type="button"
                className={`${styles.item} ${n.unread ? styles.itemUnread : ""}`}
                style={{
                  textAlign: "left",
                  font: "inherit",
                  display: "grid",
                  width: "100%",
                }}
                onClick={() => {
                  setItems((cur) => cur.map((x) => (x.id === n.id ? { ...x, unread: false } : x)));
                }}
              >
                <div className={`${styles.ico} ${icoCls}`}>
                  <n.Icon size={16} aria-hidden />
                </div>
                <div className={styles.body}>
                  <div className={styles.head}>
                    <span className={styles.title}>{n.title}</span>
                    <span className={`${styles.tag} ${tagCls}`}>{n.tag.label}</span>
                  </div>
                  <p>{n.desc}</p>
                  <div className={styles.meta}>{n.meta}</div>
                </div>
                <div className={styles.actions}>
                  <span className={styles.when}>{n.when}</span>
                  {n.actionLabel && (
                    <span className={styles.actionLink}>
                      {n.actionLabel} <ArrowRight size={12} aria-hidden />
                    </span>
                  )}
                </div>
              </button>
            );
          })
        )}
      </div>
    </>
  );
}
