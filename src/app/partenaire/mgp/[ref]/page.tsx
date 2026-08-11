import { Shell } from "@/components/shell/Shell";
import {
  Voicemail,
  CheckmarkFilled,
  WarningAltFilled,
  Time,
  Send,
  Download,
  Document,
  Events,
  ChatLaunch,
} from "@carbon/icons-react";
import styles from "./plainte-detail.module.scss";

export const metadata = { title: "Détail plainte · MGP · PTN-RDC" };

interface Props {
  params: Promise<{ ref: string }>;
}

const PIPELINE = [
  { label: "Réception", date: "06 mai 14:32", state: "done" as const },
  { label: "Qualification", date: "07 mai 09:15", state: "done" as const },
  { label: "Instruction", date: "en cours", state: "current" as const },
  { label: "Réponse", date: "≤ 16 mai", state: "future" as const },
  { label: "Clôture", date: "—", state: "future" as const },
];

const TIMELINE = [
  {
    kind: "warn" as const,
    who: "K. Tshiala",
    txt: "instruit la plainte — sollicite les équipes terrain Lubumbashi pour vérification",
    when: "il y a 2h",
  },
  {
    kind: "default" as const,
    who: "P. Mbongo",
    txt: "a qualifié la plainte (Qualité de service · niveau 2 · délai 7 j ouvrables)",
    when: "07 mai 09:15",
  },
  {
    kind: "default" as const,
    who: "Système MGP",
    txt: "a attribué la plainte au référent K. Tshiala (Secrétariat MGP)",
    when: "06 mai 14:35",
  },
  {
    kind: "default" as const,
    who: "Système MGP",
    txt: "a accusé réception de la plainte — référence MGP-2026-042 attribuée",
    when: "06 mai 14:32",
  },
];

export default async function PlainteDetailPage({ params }: Props) {
  const { ref } = await params;

  return (
    <Shell
      crumbs={[
        { label: "Espace partenaire", href: "/partenaire" },
        { label: "MGP", href: "/partenaire/mgp" },
        { label: ref },
      ]}
    >
      {/* Header */}
      <div className={styles.headerRow}>
        <div className={styles.metaCol}>
          <div className={styles.eyebrow}>
            <span className="ptn-mono">{ref}</span> · MÉCANISME DE GESTION DES PLAINTES
          </div>
          <h1 className={styles.title}>Coupure d&apos;accès internet sur site Lubumbashi</h1>
          <p className={styles.subtitle}>
            Catégorie <strong>Qualité de service</strong> · Province{" "}
            <strong>Haut-Katanga</strong> · Déposée le{" "}
            <span className="ptn-mono">06 mai 2026</span>
          </p>
        </div>
        <div className={styles.actionsRow}>
          <button type="button" className={styles.btnSecondary}>
            <Download size={16} aria-hidden /> Exporter PDF
          </button>
          <button type="button" className={styles.btnSecondary}>
            <ChatLaunch size={16} aria-hidden /> Suivi par email
          </button>
        </div>
      </div>

      {/* Status banner */}
      <div className={`${styles.statusBanner} ${styles.statusBannerWarn}`}>
        <div className={styles.statusIco}>
          <WarningAltFilled size={24} aria-hidden style={{ color: "var(--ptn-status-warning)" }} />
        </div>
        <div className={styles.statusInfo}>
          <strong>En traitement · étape 3 / 5 · Instruction</strong>
          <p>
            Le référent K. Tshiala instruit votre plainte. Réponse attendue au plus tard le 16 mai
            2026 (J+10 ouvrables).
          </p>
        </div>
        <div className={styles.statusMeta}>
          Délai écoulé · 3 j<br />
          <strong style={{ color: "var(--cds-text-primary)" }}>Reste 7 j</strong>
        </div>
      </div>

      <div className={styles.layout}>
        <div>
          {/* Pipeline */}
          <div className={styles.pipeline}>
            <div className={styles.pipelineH}>Cycle de traitement · MGP-2026-042</div>
            <div className={styles.pipelineSegs}>
              {PIPELINE.map((p, i) => {
                const barCls =
                  p.state === "done"
                    ? styles.pipelineBarDone
                    : p.state === "current"
                      ? styles.pipelineBarCurrent
                      : "";
                return (
                  <div key={i} className={styles.pipelineSeg}>
                    <div className={`${styles.pipelineBar} ${barCls}`} />
                    <div
                      className={`${styles.pipelineLabel} ${
                        p.state !== "future" ? styles.pipelineLabelActive : ""
                      }`}
                    >
                      {p.label}
                    </div>
                    <div className={styles.pipelineDate}>{p.date}</div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className={styles.panel}>
            <section className={styles.section}>
              <h3 className={styles.sectionH}>
                <Document size={16} aria-hidden /> Description
              </h3>
              <div className={styles.sectionBody}>
                <p>
                  Le 06 mai 2026 à 14h00 (heure locale), l&apos;accès internet du site de
                  Lubumbashi (bureau régional ANIE) a été interrompu sans préavis. Plusieurs
                  agents n&apos;ont pas pu accéder aux services en ligne du PTN, notamment la
                  plateforme de soumission TDR et le module de paiement fournisseur. La coupure a
                  duré environ 4h30.
                </p>
                <p>
                  Cette interruption a empêché la soumission d&apos;un livrable critique
                  (PROP-2026-014) dans les délais et a généré un retard sur le calendrier
                  d&apos;arbitrage UGP. Une vérification du SLA contractuel avec le fournisseur
                  télécom est demandée.
                </p>
              </div>
            </section>

            <div className={styles.divider} />

            <section className={styles.section}>
              <h3 className={styles.sectionH}>Informations sur le dépôt</h3>
              <div className={styles.fieldGrid}>
                <div className={styles.field}>
                  <span className={styles.fieldK}>Catégorie</span>
                  <span className={styles.fieldV}>
                    <span className={`${styles.tag} ${styles.tagInfo}`}>Qualité de service</span>
                  </span>
                </div>
                <div className={styles.field}>
                  <span className={styles.fieldK}>Province</span>
                  <span className={styles.fieldV}>Haut-Katanga · Lubumbashi</span>
                </div>
                <div className={styles.field}>
                  <span className={styles.fieldK}>Date du fait</span>
                  <span className={styles.fieldV}>06 mai 2026 · 14h00</span>
                </div>
                <div className={styles.field}>
                  <span className={styles.fieldK}>Proposition liée</span>
                  <span className={styles.fieldV}>
                    <span className="ptn-mono">PROP-2026-014</span>
                  </span>
                </div>
                <div className={styles.field}>
                  <span className={styles.fieldK}>Mode de dépôt</span>
                  <span className={styles.fieldV}>Identifié (M. Marie Kabongo)</span>
                </div>
                <div className={styles.field}>
                  <span className={styles.fieldK}>Canal préféré</span>
                  <span className={styles.fieldV}>Email · marie.kabongo@anie.gouv.cd</span>
                </div>
              </div>
            </section>

            <div className={styles.divider} />

            <section className={styles.section}>
              <h3 className={styles.sectionH}>
                <Events size={16} aria-hidden /> Activité récente
              </h3>
              <ul className={styles.timeline}>
                {TIMELINE.map((t, i) => {
                  const ico =
                    t.kind === "warn" ? styles.tlIcoWarn : "";
                  const Icon = t.kind === "warn" ? WarningAltFilled : Voicemail;
                  return (
                    <li key={i} className={styles.tlItem}>
                      <div className={`${styles.tlIco} ${ico}`}>
                        <Icon size={14} aria-hidden />
                      </div>
                      <div className={styles.tlBody}>
                        <div className={styles.tlTitle}>
                          <span className={styles.tlWho}>{t.who}</span> {t.txt}
                        </div>
                        <div className={styles.tlWhen}>{t.when}</div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </section>

            <div className={styles.divider} />

            <section className={styles.section}>
              <h3 className={styles.sectionH}>Ajouter un message au référent</h3>
              <div className={styles.replyBox}>
                <textarea
                  className={styles.replyInput}
                  placeholder="Ajouter un complément, une pièce jointe, ou une demande d'information…"
                />
                <div className={styles.replyActions}>
                  <button type="button" className={styles.btnSecondary}>
                    Brouillon
                  </button>
                  <button type="button" className={styles.btnPrimary}>
                    <Send size={14} aria-hidden /> Envoyer au référent
                  </button>
                </div>
              </div>
            </section>
          </div>
        </div>

        {/* Side rail */}
        <aside className={styles.rail}>
          <section className={styles.railCard}>
            <h4 className={styles.railH}>
              Synthèse <span className="ptn-mono" style={{ fontSize: 10, color: "var(--cds-text-helper)" }}>{ref}</span>
            </h4>
            <div className={styles.railBody}>
              <div className={styles.railRow}>
                <div className={styles.railK}>Statut</div>
                <div className={styles.railV}>
                  <span className={`${styles.tag} ${styles.tagWarn}`}>En traitement</span>
                </div>
              </div>
              <div className={styles.railRow}>
                <div className={styles.railK}>Catégorie</div>
                <div className={styles.railV}>Qualité de service</div>
              </div>
              <div className={styles.railRow}>
                <div className={styles.railK}>Niveau</div>
                <div className={styles.railV}>2 · Modéré</div>
              </div>
              <div className={styles.railRow}>
                <div className={styles.railK}>SLA</div>
                <div className={`${styles.railV} ${styles.railVMono}`}>10 j ouvrables</div>
              </div>
              <div className={styles.railRow}>
                <div className={styles.railK}>Échéance</div>
                <div className={`${styles.railV} ${styles.railVMono}`}>16 mai 2026</div>
              </div>
              <div className={styles.railRow}>
                <div className={styles.railK}>Étape</div>
                <div className={styles.railV}>3 / 5</div>
              </div>
            </div>
          </section>

          <section className={styles.railCard}>
            <h4 className={styles.railH}>Référent assigné</h4>
            <div className={styles.railBody}>
              <div style={{ fontSize: 13, fontWeight: 500, color: "var(--cds-text-primary)" }}>
                K. Tshiala
              </div>
              <div style={{ fontSize: 11, color: "var(--cds-text-helper)" }}>
                Secrétariat MGP UGP
              </div>
              <div
                className="ptn-mono"
                style={{
                  fontSize: 11,
                  color: "var(--cds-text-helper)",
                  marginTop: 4,
                }}
              >
                mgp@ptn-rdc.cd
              </div>
            </div>
          </section>

          <section className={styles.railCard}>
            <h4 className={styles.railH}>Voies de recours</h4>
            <div className={styles.railBody}>
              <p
                style={{
                  fontSize: 12,
                  color: "var(--cds-text-secondary)",
                  lineHeight: 1.5,
                  margin: "0 0 8px",
                }}
              >
                Si la réponse à J+10 ne vous satisfait pas, escalade possible vers :
              </p>
              <div style={{ fontSize: 12, color: "var(--cds-text-primary)" }}>
                <CheckmarkFilled size={12} aria-hidden style={{ marginRight: 6, color: "var(--ptn-status-success)" }} />
                Coordonnateur UGP
              </div>
              <div style={{ fontSize: 12, color: "var(--cds-text-primary)", marginTop: 4 }}>
                <CheckmarkFilled size={12} aria-hidden style={{ marginRight: 6, color: "var(--ptn-status-success)" }} />
                COPIL semestriel (cf. CGES §6.4)
              </div>
              <div style={{ fontSize: 12, color: "var(--cds-text-primary)", marginTop: 4 }}>
                <CheckmarkFilled size={12} aria-hidden style={{ marginRight: 6, color: "var(--ptn-status-success)" }} />
                Médiateur indépendant Banque mondiale
              </div>
            </div>
          </section>

          <section className={styles.railCard}>
            <h4 className={styles.railH}>
              <Time size={12} aria-hidden style={{ verticalAlign: "middle", marginRight: 4 }} />
              Audit & confidentialité
            </h4>
            <div className={styles.railBody}>
              <p
                style={{
                  fontSize: 11,
                  color: "var(--cds-text-helper)",
                  lineHeight: 1.5,
                  margin: 0,
                }}
              >
                Cette plainte est journalisée et signée HMAC. Conservation 5 ans après clôture
                (Loi RDC 2023-006 + cycle Banque mondiale).
              </p>
            </div>
          </section>
        </aside>
      </div>
    </Shell>
  );
}
