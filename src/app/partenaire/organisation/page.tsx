import Link from "next/link";
import { Shell } from "@/components/shell/Shell";
import { PageHeader } from "@/components/ui/PageHeader";
import {
  CheckmarkFilled,
  Edit,
  Add,
  Document,
  TaskApproved,
  Locked,
  Information,
  UserMultiple,
  WatsonHealthMagnify,
  ArrowRight,
  OverflowMenuVertical,
  Earth,
  IbmCloud,
} from "@carbon/icons-react";
import styles from "./organisation.module.scss";

export const metadata = { title: "Organisation · Espace partenaire · PTN-RDC" };

const SIGNATORIES = [
  {
    initials: "MK",
    name: "M. Marie Kabongo",
    role: "Directrice générale ANIE",
    email: "marie.kabongo@anie.gouv.cd",
    status: { label: "Actif", tone: "ok" as const },
    rights: ["Soumission TDR", "Réception ANO", "Signature contrats"],
  },
  {
    initials: "JM",
    name: "J. Mukendi",
    role: "Directeur opérationnel",
    email: "j.mukendi@anie.gouv.cd",
    status: { label: "Actif", tone: "ok" as const },
    rights: ["Soumission TDR", "Suivi proposition"],
  },
  {
    initials: "TS",
    name: "T. Seya",
    role: "Responsable juridique",
    email: "t.seya@anie.gouv.cd",
    status: { label: "Actif", tone: "ok" as const },
    rights: ["Visa juridique", "Co-signataire contrats"],
  },
  {
    initials: "BL",
    name: "B. Lufima",
    role: "Comptable",
    email: "b.lufima@anie.gouv.cd",
    status: { label: "En attente", tone: "warn" as const },
    rights: ["Suivi paiements"],
  },
];

const CHARTERS = [
  {
    name: "Charte de conduite partenaire",
    meta: "Signée le 12 mars 2026 · M. Kabongo · v 2025.06",
    icon: TaskApproved,
  },
  {
    name: "Convention de collaboration ANIE — UGP",
    meta: "Signée le 28 janvier 2026 · DG ANIE + Coord UGP · v 1.0",
    icon: Document,
  },
  {
    name: "Politique RGPD-RDC sur les données personnelles",
    meta: "Acceptée le 12 mars 2026 · Loi 2023-006",
    icon: Locked,
  },
  {
    name: "Engagement EAS-HS · code de conduite",
    meta: "Signé le 12 mars 2026 · CGES PTN-RDC §6.4",
    icon: TaskApproved,
  },
];

const TABS = [
  { id: "general", label: "Informations générales", icon: Information },
  { id: "kyc", label: "KYC institutionnel", icon: WatsonHealthMagnify },
  { id: "signataires", label: "Signataires habilités", icon: UserMultiple },
  { id: "chartes", label: "Chartes & engagements", icon: Document },
  { id: "integrations", label: "Intégrations", icon: IbmCloud },
];

export default function OrganisationPage() {
  return (
    <Shell crumbs={[{ label: "Espace partenaire", href: "/partenaire" }, { label: "Organisation" }]}>
      <PageHeader
        eyebrow="ANIE · PROFIL INSTITUTIONNEL"
        title="Office National d'Identité"
        subtitle="Profil partenaire institutionnel rattaché au MPTN — habilité à proposer des activités au PTN-RDC."
        meta={
          <>
            <span>
              KYC :{" "}
              <strong style={{ color: "var(--ptn-status-success)" }}>Niveau 3 · Vérifié</strong>
            </span>
            <span>·</span>
            <span>
              Référence partenaire : <span className="ptn-mono">PART-RDC-027</span>
            </span>
          </>
        }
        actions={
          <Link
            href="/partenaire/organisation/edit"
            style={{
              background: "var(--cds-layer)",
              border: "1px solid var(--cds-border-subtle)",
              padding: "8px 14px",
              fontSize: 13,
              cursor: "pointer",
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              minHeight: 36,
              textDecoration: "none",
              color: "var(--cds-text-primary)",
            }}
          >
            <Edit size={16} aria-hidden /> Modifier le profil
          </Link>
        }
      />

      <div className={styles.layout}>
        <div>
          <div className={styles.tabs}>
            {TABS.map((t, i) => {
              const Icon = t.icon;
              return (
                <button
                  key={t.id}
                  type="button"
                  className={`${styles.tab} ${i === 0 ? styles.tabActive : ""}`}
                >
                  <Icon size={14} aria-hidden /> {t.label}
                </button>
              );
            })}
          </div>

          <div className={styles.panel}>
            {/* Informations générales */}
            <section className={styles.section}>
              <h3 className={styles.sectionH}>
                <Information size={16} aria-hidden /> Identité légale
              </h3>
              <div className={styles.grid2}>
                <div className={styles.field}>
                  <span className={styles.fieldK}>Raison sociale</span>
                  <span className={styles.fieldV}>Office National d&apos;Identité (ANIE)</span>
                </div>
                <div className={styles.field}>
                  <span className={styles.fieldK}>Sigle</span>
                  <span className={styles.fieldV}>ANIE</span>
                </div>
                <div className={styles.field}>
                  <span className={styles.fieldK}>Statut juridique</span>
                  <span className={styles.fieldV}>
                    Établissement public à caractère administratif
                  </span>
                </div>
                <div className={styles.field}>
                  <span className={styles.fieldK}>Tutelle</span>
                  <span className={styles.fieldV}>Ministère du Numérique (MPTN)</span>
                </div>
                <div className={styles.field}>
                  <span className={styles.fieldK}>RCCM</span>
                  <span className={styles.fieldVMono}>CD/KIN/RCCM/2024-A-00184</span>
                </div>
                <div className={styles.field}>
                  <span className={styles.fieldK}>NIF</span>
                  <span className={styles.fieldVMono}>A0500127K</span>
                </div>
                <div className={styles.field}>
                  <span className={styles.fieldK}>Décret de création</span>
                  <span className={styles.fieldV}>n° 23-027 du 14 mars 2023</span>
                </div>
                <div className={styles.field}>
                  <span className={styles.fieldK}>Site web</span>
                  <span className={`${styles.fieldV} ptn-mono`}>www.anie.gouv.cd</span>
                </div>
              </div>
            </section>

            <div className={styles.divider} />

            <section className={styles.section}>
              <h3 className={styles.sectionH}>
                <Earth size={16} aria-hidden /> Adresse du siège
              </h3>
              <div className={styles.grid2}>
                <div className={styles.field}>
                  <span className={styles.fieldK}>Adresse</span>
                  <span className={styles.fieldV}>
                    Boulevard du 30 juin, immeuble Cobil, 5e étage
                  </span>
                </div>
                <div className={styles.field}>
                  <span className={styles.fieldK}>Province</span>
                  <span className={styles.fieldV}>Kinshasa · Gombe</span>
                </div>
                <div className={styles.field}>
                  <span className={styles.fieldK}>Téléphone</span>
                  <span className={styles.fieldVMono}>+243 81 234 56 78</span>
                </div>
                <div className={styles.field}>
                  <span className={styles.fieldK}>Email institutionnel</span>
                  <span className={styles.fieldVMono}>contact@anie.gouv.cd</span>
                </div>
              </div>
            </section>

            <div className={styles.divider} />

            <section className={styles.section}>
              <h3 className={styles.sectionH}>
                <UserMultiple size={16} aria-hidden /> Signataires habilités
                <span style={{ marginLeft: "auto" }}>
                  <button
                    type="button"
                    className={styles.btnPrimary}
                  >
                    <Add size={12} aria-hidden /> Ajouter
                  </button>
                </span>
              </h3>

              <div className={styles.signatories}>
                {SIGNATORIES.map((s, i) => (
                  <div key={i} className={styles.signatory}>
                    <div className={styles.avatar}>{s.initials}</div>
                    <div className={styles.signatoryInfo}>
                      <div className={styles.signatoryName}>{s.name}</div>
                      <div className={styles.signatoryRole}>{s.role}</div>
                      <div className={styles.signatoryEmail}>{s.email}</div>
                    </div>
                    <span
                      className={`${styles.tag} ${
                        s.status.tone === "ok" ? styles.tagOk : styles.tagWarn
                      }`}
                    >
                      {s.status.tone === "ok" && <CheckmarkFilled size={10} aria-hidden />}
                      {s.status.label}
                    </span>
                    <button type="button" className={styles.btnIcon} aria-label="Actions">
                      <OverflowMenuVertical size={16} aria-hidden />
                    </button>
                  </div>
                ))}
              </div>
            </section>

            <div className={styles.divider} />

            <section className={styles.section}>
              <h3 className={styles.sectionH}>
                <Document size={16} aria-hidden /> Chartes & engagements signés
              </h3>

              <div className={styles.charters}>
                {CHARTERS.map((c, i) => {
                  const Icon = c.icon;
                  return (
                    <div key={i} className={styles.charter}>
                      <div className={styles.charterIco}>
                        <Icon size={16} aria-hidden />
                      </div>
                      <div>
                        <div className={styles.charterName}>{c.name}</div>
                        <div className={styles.charterMeta}>{c.meta}</div>
                      </div>
                      <button type="button" className={styles.btnIcon} aria-label="Télécharger">
                        <ArrowRight size={14} aria-hidden />
                      </button>
                    </div>
                  );
                })}
              </div>
            </section>
          </div>
        </div>

        {/* Side rail */}
        <aside className={styles.rail}>
          <section className={styles.railCard}>
            <div className={styles.identity}>
              <div className={styles.identityLogo}>AN</div>
              <div className={styles.identityName}>ANIE</div>
              <div className={styles.identityFull}>Office National d&apos;Identité</div>
            </div>
          </section>

          <section className={styles.railCard}>
            <h4 className={styles.railH}>KYC institutionnel</h4>
            <div className={styles.kycHeader}>
              <CheckmarkFilled size={14} aria-hidden /> Niveau 3 · Vérifié 12 mars 2026
            </div>
            <div className={styles.kpi}>
              <span className={styles.kpiK}>Documents lég.</span>
              <span className={styles.kpiV}>4 / 4</span>
            </div>
            <div className={styles.kpi}>
              <span className={styles.kpiK}>Signataires</span>
              <span className={styles.kpiV}>4 actifs</span>
            </div>
            <div className={styles.kpi}>
              <span className={styles.kpiK}>Renouvellement</span>
              <span className={styles.kpiV}>12 mars 2027</span>
            </div>
          </section>

          <section className={styles.railCard}>
            <h4 className={styles.railH}>Activité</h4>
            <div className={styles.kpi}>
              <span className={styles.kpiK}>Propositions</span>
              <span className={styles.kpiV}>4 actives</span>
            </div>
            <div className={styles.kpi}>
              <span className={styles.kpiK}>Engagement total</span>
              <span className={styles.kpiV}>11,6 M USD</span>
            </div>
            <div className={styles.kpi}>
              <span className={styles.kpiK}>ANO obtenus</span>
              <span className={styles.kpiV}>1</span>
            </div>
            <div className={styles.kpi}>
              <span className={styles.kpiK}>Délai moyen UGP</span>
              <span className={styles.kpiV}>9 j</span>
            </div>
          </section>

          <section className={styles.railCard}>
            <h4 className={styles.railH}>Actions rapides</h4>
            <div className={styles.actions}>
              <button type="button" className={styles.btnAction}>
                <UserMultiple size={14} aria-hidden /> Inviter un signataire
              </button>
              <button type="button" className={styles.btnAction}>
                <Document size={14} aria-hidden /> Renouveler les chartes
              </button>
              <button type="button" className={styles.btnAction}>
                <IbmCloud size={14} aria-hidden /> Connecter ID national
              </button>
            </div>
          </section>
        </aside>
      </div>
    </Shell>
  );
}
