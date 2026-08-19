import { Shell } from "@/components/shell/Shell";
import { PageHeader } from "@/components/ui/PageHeader";
import {
  Locked,
  WarningAltFilled,
  TaskApproved,
  Time,
  UserMultiple,
} from "@carbon/icons-react";
import styles from "@/styles/ugp-shared.module.scss";

export const metadata = { title: "Canal EAS-HS confidentiel · UGP · PTN-RDC" };

interface Case {
  ref: string;
  receivedDate: string;
  category: "VBG" | "HS" | "EAS" | "Autre";
  province: string;
  status: "received" | "triage" | "investigation" | "resolved";
  referent: string;
  slaDays: number;
}

const CASES: Case[] = [
  { ref: "EAS-2026-***-4", receivedDate: "05 mai 2026", category: "HS", province: "***", status: "investigation", referent: "Pool habilité", slaDays: 5 },
  { ref: "EAS-2026-***-3", receivedDate: "28 avr. 2026", category: "VBG", province: "***", status: "investigation", referent: "Pool habilité", slaDays: 12 },
  { ref: "EAS-2026-***-2", receivedDate: "12 avr. 2026", category: "EAS", province: "***", status: "resolved", referent: "Pool habilité", slaDays: 0 },
  { ref: "EAS-2026-***-1", receivedDate: "08 mars 2026", category: "HS", province: "***", status: "resolved", referent: "Pool habilité", slaDays: 0 },
];

function CategoryTag({ cat }: { cat: Case["category"] }) {
  return (
    <span
      className={`${styles.tag}`}
      style={{
        background: "var(--ptn-status-danger-surface)",
        color: "var(--ptn-status-danger)",
      }}
    >
      {cat}
    </span>
  );
}

function StatusTag({ status }: { status: Case["status"] }) {
  const map = {
    received: { cls: styles.tagInfo, label: "Reçu" },
    triage: { cls: styles.tagWarn, label: "Triage" },
    investigation: { cls: styles.tagWarn, label: "Investigation" },
    resolved: { cls: styles.tagOk, label: "Résolu" },
  };
  const { cls, label } = map[status];
  return <span className={`${styles.tag} ${cls}`}>{label}</span>;
}

export default function MgpEasHsPage() {
  return (
    <Shell
      crumbs={[
        { label: "Cockpit UGP", href: "/cockpit" },
        { label: "MGP · Canal EAS-HS confidentiel" },
      ]}
      /* L'assistant est retiré de cet écran, et de lui seul.
         Le corpus interdit formellement l'IA générative sur le canal
         EAS/HS — c'est le seul endroit où il l'écrit deux fois. L'assistant
         refuse déjà le sujet si on l'interroge, mais le refuser après
         l'avoir proposé n'est pas la même chose que ne pas le proposer :
         une personne qui vient signaler un fait de cette nature n'a pas à
         voir, sur l'écran qui lui promet le cloisonnement, une invitation
         à en parler à une machine. */
      hideAssistant
    >
      <PageHeader
        eyebrow="UGP · CANAL EAS-HS CONFIDENTIEL · ACCÈS RESTREINT"
        title="Canal de gestion des signalements EAS-HS"
        subtitle="Exploitation, Abus, Harcèlement Sexuel · Violence Basée sur le Genre · canal séparé du MGP standard · anonymat garanti."
        meta={
          <>
            <span>
              <Locked
                size={12}
                aria-hidden
                style={{ verticalAlign: "middle", marginRight: 4, color: "var(--ptn-status-danger)" }}
              />
              <strong style={{ color: "var(--ptn-status-danger)" }}>
                Accès restreint
              </strong>{" "}
              · 3 personnes habilitées
            </span>
            <span>·</span>
            <span>
              Cadre : <strong>NES 1 + 10 · CGES §6.4</strong>
            </span>
          </>
        }
      />

      <div
        style={{
          background: "var(--ptn-status-danger-surface)",
          border: "1px solid var(--ptn-status-danger)",
          padding: "14px 18px",
          marginBottom: 12,
          display: "flex",
          gap: 12,
          alignItems: "flex-start",
        }}
        data-confidential="true"
      >
        <Locked
          size={20}
          aria-hidden
          style={{ color: "var(--ptn-status-danger)", flexShrink: 0, marginTop: 2 }}
        />
        <div style={{ fontSize: 13, lineHeight: 1.55, color: "var(--cds-text-primary)" }}>
          <strong>Confidentialité absolue.</strong> Les références sont masquées (✱✱✱) pour
          tous les utilisateurs y compris l&apos;administrateur. Seul le pool habilité (3
          personnes : 1 référent VBG + 1 médecin conseil + 1 juriste assermenté) peut accéder
          aux dossiers nominatifs. Audit trail HMAC isolé sur instance dédiée. Aucune
          impression possible. Aucune trace dans la messagerie standard ni dans le MGP général.
        </div>
      </div>

      <div className={styles.kpis}>
        <div className={styles.kpi}>
          <div className={styles.kpiK}>
            <WarningAltFilled size={14} aria-hidden /> Cas en cours
          </div>
          <div className={styles.kpiV} style={{ color: "var(--ptn-status-danger)" }}>
            2
          </div>
          <div className={styles.kpiU}>+ 2 résolus 2026</div>
        </div>
        <div className={styles.kpi}>
          <div className={styles.kpiK}>
            <Time size={14} aria-hidden /> Délai moyen
          </div>
          <div className={styles.kpiV}>8,4 j</div>
          <div className={styles.kpiU}>cible 14 j · cadre NES 10</div>
        </div>
        <div className={styles.kpi}>
          <div className={styles.kpiK}>
            <UserMultiple size={14} aria-hidden /> Pool habilité
          </div>
          <div className={styles.kpiV}>3</div>
          <div className={styles.kpiU}>
            Référent VBG · Médecin · Juriste
          </div>
        </div>
        <div className={styles.kpi}>
          <div className={styles.kpiK}>
            <TaskApproved size={14} aria-hidden /> Audit signé
          </div>
          <div className={styles.kpiV} style={{ color: "var(--ptn-status-success)" }}>
            100 %
          </div>
          <div className={styles.kpiU}>HMAC isolé · accès tracé</div>
        </div>
      </div>

      <div className={styles.layout}>
        <div className={styles.tableCard} data-confidential="true">
          <div className={styles.toolbar}>
            <h3>
              <Locked size={12} aria-hidden /> Dossiers confidentiels{" "}
              <span className={styles.num}>({CASES.length})</span>
            </h3>
            <div className={styles.spacer} />
            <span
              style={{
                fontSize: 10,
                color: "var(--ptn-status-danger)",
                fontFamily: "var(--font-ibm-plex-mono)",
                textTransform: "uppercase",
                letterSpacing: "0.32px",
              }}
            >
              ✱ identifiants masqués
            </span>
          </div>
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <colgroup>
                <col style={{ width: "20%" }} />
                <col style={{ width: "15%" }} />
                <col style={{ width: "12%" }} />
                <col style={{ width: "15%" }} />
                <col style={{ width: "20%" }} />
                <col style={{ width: "18%" }} />
              </colgroup>
              <thead>
                <tr>
                  <th>Réf masquée</th>
                  <th>Reçu le</th>
                  <th>Catégorie</th>
                  <th>Province</th>
                  <th>Statut</th>
                  <th>SLA / progression</th>
                </tr>
              </thead>
              <tbody>
                {CASES.map((c) => (
                  <tr key={c.ref}>
                    <td>
                      <span className={styles.ref}>{c.ref}</span>
                    </td>
                    <td className={styles.date}>{c.receivedDate}</td>
                    <td>
                      <CategoryTag cat={c.category} />
                    </td>
                    <td>{c.province}</td>
                    <td>
                      <StatusTag status={c.status} />
                    </td>
                    <td className={styles.date}>
                      {c.status === "resolved" ? "Clôturé" : `J−${c.slaDays}`}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <aside className={styles.rail}>
          <section className={styles.railCard}>
            <h4 className={styles.railH}>
              <Locked size={12} aria-hidden /> Pool habilité
            </h4>
            <div className={styles.railBody}>
              <div className={styles.railRow}>
                <div className={styles.railK}>Référent VBG</div>
                <div className={styles.railV}>M. *** *** *** </div>
              </div>
              <div className={styles.railRow}>
                <div className={styles.railK}>Médecin conseil</div>
                <div className={styles.railV}>Dr. *** *** ***</div>
              </div>
              <div className={styles.railRow}>
                <div className={styles.railK}>Juriste assermenté</div>
                <div className={styles.railV}>Me. *** *** ***</div>
              </div>
            </div>
          </section>

          <section className={styles.railCard}>
            <h4 className={styles.railH}>Cadre juridique</h4>
            <div className={styles.railBody}>
              <div className={styles.railRow}>
                <div className={styles.railK}>CGES</div>
                <div className={`${styles.railV} ${styles.railVMono}`}>§6.4 · v2.3</div>
              </div>
              <div className={styles.railRow}>
                <div className={styles.railK}>NES BM</div>
                <div className={styles.railV}>NES 1 + NES 10</div>
              </div>
              <div className={styles.railRow}>
                <div className={styles.railK}>Loi RDC</div>
                <div className={styles.railV}>06/018 · 09 juill. 2006</div>
              </div>
              <div className={styles.railRow}>
                <div className={styles.railK}>Référence BM</div>
                <div className={styles.railV}>Good Practice Note 2020</div>
              </div>
            </div>
          </section>

          <section className={styles.railCard}>
            <h4 className={styles.railH}>
              <Locked size={12} aria-hidden /> Sécurité technique
            </h4>
            <div className={styles.railBody}>
              <p
                style={{
                  fontSize: 11,
                  color: "var(--cds-text-secondary)",
                  lineHeight: 1.5,
                  margin: 0,
                }}
              >
                Instance dédiée · chiffrement AES-256 au repos · TLS 1.3 mTLS pour le pool ·
                logs anonymisés · pas de cache navigateur · pas d&apos;impression possible
                (CSS print masque les contenus marqués <code>data-confidential</code>).
              </p>
            </div>
          </section>
        </aside>
      </div>
    </Shell>
  );
}
