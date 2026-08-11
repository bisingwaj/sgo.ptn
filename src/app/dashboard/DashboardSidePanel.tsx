import {
  CheckmarkFilled,
  WarningAltFilled,
  AiGenerate,
  Document,
  Events,
  ChevronRight,
} from "@carbon/icons-react";
import styles from "./dashboard.module.scss";

export function DashboardSidePanel() {
  return (
    <div className={styles.rp}>
      {/* Activité récente */}
      <section className={styles.rpSection}>
        <h4 className={styles.rpH}>
          Activité récente
          <span className={styles.rpBadge}>12</span>
        </h4>
        <div className={styles.rpBody}>
          <FeedItem
            kind="ok"
            who="Banque mondiale"
            txt={<>a délivré l&apos;ANO sur le DAO <span className={styles.feedRef}>PTN-2026-018</span></>}
            when="il y a 24 min"
          />
          <FeedItem
            kind="ai"
            who="Assistant IA"
            txt={<>a généré un brouillon de TDR pour <span className={styles.feedRef}>PTN-2026-024</span></>}
            when="il y a 2 h"
          />
          <FeedItem
            who="M. Tshibanda"
            txt={<>a soumis le DAO <span className={styles.feedRef}>PTN-2026-021</span> pour revue UGP</>}
            when="il y a 4 h"
          />
          <FeedItem
            kind="warn"
            txt={<>Demande de clarification UGP sur le TDR <span className={styles.feedRef}>PTN-2026-019</span></>}
            when="hier · 16:42"
          />
          <FeedItem
            txt={<>Commission d&apos;évaluation <span className={styles.feedRef}>CE-2026-007</span> constituée — 5 membres</>}
            when="hier · 11:08"
          />
          <FeedItem
            kind="ok"
            txt={<>Marché <span className={styles.feedRef}>PTN-2025-094</span> attribué à <span className={styles.feedWho}>Konnect SARL</span></>}
            when="02 mai · 14:20"
          />
        </div>
      </section>

      {/* Échéances */}
      <section className={styles.rpSection}>
        <h4 className={styles.rpH}>Échéances ≤ 7 jours</h4>
        <div className={styles.rpBody}>
          <Deadline urgent day="09" month="mai" title="Réponse aux clarifications BM" ref_="PTN-2026-019 · TDR plateforme paiement" countdown="J−1" />
          <Deadline day="11" month="mai" title="Clôture des soumissions" ref_="PTN-2026-016 · Datacenter Tier-3" countdown="J−3" />
          <Deadline day="13" month="mai" title="Réunion commission CE-2026-007" ref_="PTN-2026-014 · Identité numérique" countdown="J−5" />
          <Deadline day="15" month="mai" title="Validation comité de pilotage" ref_="PTN-2026-024 · Hub formation" countdown="J−7" />
        </div>
      </section>

      {/* Documents requis */}
      <section className={styles.rpSection}>
        <h4 className={styles.rpH}>
          Documents requis
          <span className={`${styles.rpBadge} ${styles.rpBadgeWarn}`}>4</span>
        </h4>
        <div className={styles.rpBody}>
          <DocItem name="Plan de sauvegarde environnementale" sub="PTN-2026-016 · Datacenter" />
          <DocItem name="Étude de marché actualisée" sub="PTN-2026-024 · Hub formation" />
          <DocItem name="Déclarations CDI commission" sub="CE-2026-007 · Identité numérique" />
          <DocItem name="Rapport semestriel S1 2026" sub="Suivi-évaluation · MinNum" />
        </div>
      </section>
    </div>
  );
}

function FeedItem({
  kind,
  who,
  txt,
  when,
}: {
  kind?: "ai" | "ok" | "warn";
  who?: string;
  txt: React.ReactNode;
  when: string;
}) {
  const icoCls =
    kind === "ai"
      ? styles.feedIcoAi
      : kind === "ok"
      ? styles.feedIcoOk
      : kind === "warn"
      ? styles.feedIcoWarn
      : "";
  const Icon =
    kind === "ai"
      ? AiGenerate
      : kind === "ok"
      ? CheckmarkFilled
      : kind === "warn"
      ? WarningAltFilled
      : Events;
  return (
    <div className={styles.feedItem}>
      <div className={`${styles.feedIco} ${icoCls}`}>
        <Icon size={14} aria-hidden />
      </div>
      <div>
        <div className={styles.feedTxt}>
          {who && <span className={styles.feedWho}>{who} </span>}
          {txt}
        </div>
        <div className={styles.feedWhen}>{when}</div>
      </div>
    </div>
  );
}

function Deadline({
  urgent,
  day,
  month,
  title,
  ref_,
  countdown,
}: {
  urgent?: boolean;
  day: string;
  month: string;
  title: string;
  ref_: string;
  countdown: string;
}) {
  return (
    <div className={`${styles.deadline} ${urgent ? styles.deadlineUrgent : ""}`}>
      <div className={styles.day}>
        <div className={styles.dayD}>{day}</div>
        <div className={styles.dayM}>{month}</div>
      </div>
      <div className={styles.deadlineMeta}>
        <div>{title}</div>
        <div className={styles.deadlineRef}>{ref_}</div>
      </div>
      <div className={styles.countdown}>{countdown}</div>
    </div>
  );
}

function DocItem({ name, sub }: { name: string; sub: string }) {
  return (
    <a className={styles.doc} href="/dashboard/documents">
      <div className={styles.docIco}>
        <Document size={14} aria-hidden />
      </div>
      <div>
        <div className={styles.docName}>{name}</div>
        <div className={styles.docSub}>{sub}</div>
      </div>
      <ChevronRight size={14} aria-hidden />
    </a>
  );
}
