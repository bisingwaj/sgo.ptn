import { Shell } from "@/components/shell/Shell";
import { PageHeader } from "@/components/ui/PageHeader";
import Link from "next/link";
import {
  Voicemail,
  Add,
  Locked,
  WarningAltFilled,
  CheckmarkFilled,
  Time,
  Phone,
  Email,
  Information,
} from "@carbon/icons-react";
import { MgpListClient, type Plainte } from "./MgpListClient";
import styles from "./mgp.module.scss";

export const metadata = { title: "Mécanisme de gestion des plaintes · Espace partenaire · PTN-RDC" };

const PLAINTES: Plainte[] = [
  {
    ref: "MGP-2026-042",
    title: "Coupure d'accès internet sur site Lubumbashi",
    category: "Qualité de service",
    status: { label: "En traitement", tone: "warn" },
    province: "Haut-Katanga",
    date: "06 mai 2026",
    delay: "J+3",
  },
  {
    ref: "MGP-2026-038",
    title: "Demande d'information sur calendrier de déploiement",
    category: "Information",
    status: { label: "Résolue", tone: "ok" },
    province: "Kinshasa",
    date: "29 avr. 2026",
    delay: "5 j",
  },
  {
    ref: "MGP-2026-034",
    title: "Remarque sur consultation publique TDR PROP-2026-019",
    category: "Consultation",
    status: { label: "Reçue", tone: "info" },
    province: "Nord-Kivu",
    date: "24 avr. 2026",
    delay: "J+1",
  },
  {
    ref: "MGP-2026-029",
    title: "Réclamation sur paiement fournisseur",
    category: "Fiduciaire",
    status: { label: "Escaladée UGP", tone: "err" },
    province: "Kongo-Central",
    date: "18 avr. 2026",
    delay: "J+12",
  },
  {
    ref: "MGP-2026-022",
    title: "Suggestion d'amélioration plateforme",
    category: "Amélioration",
    status: { label: "Résolue", tone: "ok" },
    province: "Kinshasa",
    date: "12 avr. 2026",
    delay: "8 j",
  },
];

export default function MgpPage() {
  return (
    <Shell crumbs={[{ label: "Espace partenaire", href: "/partenaire" }, { label: "MGP" }]}>
      <PageHeader
        eyebrow="ANIE · MÉCANISME DE GESTION DES PLAINTES"
        title="Mécanisme de gestion des plaintes (MGP)"
        subtitle="Canal officiel pour les plaintes, suggestions et demandes d'information liées aux activités du partenaire — conforme CGES PTN-RDC §6."
        meta={
          <>
            <span>
              SLA UGP : <span className="ptn-mono">10 j ouvrables</span>
            </span>
            <span>·</span>
            <span>
              Cadre : <strong>CGES PTN-RDC</strong> · MEP §6.3
            </span>
          </>
        }
        actions={
          <Link href="/partenaire/mgp/nouvelle" className={styles.btnPrimary}>
            <Add size={16} aria-hidden /> Nouvelle plainte
          </Link>
        }
      />

      <div className={styles.intro}>
        <div className={styles.introIco}>
          <Voicemail size={20} aria-hidden />
        </div>
        <div>
          <h2 className={styles.introH}>Comment ça marche</h2>
          <p className={styles.introP}>
            Toute partie prenante (citoyen, fournisseur, agent, organisation de la société civile)
            peut déposer une plainte ou une suggestion par ce canal — anonymement ou en clair.
            Chaque plainte est tracée, attribuée à un référent UGP, et traitée sous un délai
            indicatif de <strong>10 jours ouvrables</strong>. Les plaintes EAS-HS (exploitation,
            abus, harcèlement sexuel) doivent passer par le canal confidentiel dédié.
          </p>
        </div>
      </div>

      <div className={styles.kpis}>
        <div className={styles.kpi}>
          <div className={styles.kpiK}>
            <Voicemail size={14} aria-hidden /> Plaintes ouvertes
          </div>
          <div className={styles.kpiV}>3</div>
          <div className={styles.kpiU}>+1 cette semaine</div>
        </div>
        <div className={styles.kpi}>
          <div className={styles.kpiK}>
            <Time size={14} aria-hidden /> Délai moyen
          </div>
          <div className={styles.kpiV}>6,8 j</div>
          <div className={styles.kpiU}>cible 10 j · −32 %</div>
        </div>
        <div className={styles.kpi}>
          <div className={styles.kpiK}>
            <CheckmarkFilled size={14} aria-hidden /> Résolues 2026
          </div>
          <div className={styles.kpiV} style={{ color: "var(--ptn-status-success)" }}>
            42
          </div>
          <div className={styles.kpiU}>89 % satisfaction</div>
        </div>
        <div className={styles.kpi}>
          <div className={styles.kpiK}>
            <WarningAltFilled size={14} aria-hidden /> Escaladées
          </div>
          <div className={styles.kpiV} style={{ color: "var(--ptn-status-danger)" }}>
            2
          </div>
          <div className={styles.kpiU}>vers Coord UGP</div>
        </div>
      </div>

      <div className={styles.layout}>
        <MgpListClient plaintes={PLAINTES} />

        {/* Side rail */}
        <aside className={styles.rail}>
          <section className={styles.eassCard}>
            <div className={styles.eassH}>
              <Locked size={14} aria-hidden /> Canal EAS-HS confidentiel
            </div>
            <p className={styles.eassP}>
              Pour toute violence basée sur le genre, harcèlement sexuel ou abus / exploitation, un
              canal séparé garantit anonymat et confidentialité absolue. Aucune trace dans la
              messagerie standard.
            </p>
            <a href="/mgp-eas-hs" className={styles.btnDanger}>
              <Locked size={14} aria-hidden /> Accéder au canal confidentiel
            </a>
          </section>

          <section className={styles.railCard}>
            <h4 className={styles.railH}>Cycle de traitement</h4>
            <div className={styles.steps}>
              <div className={styles.step}>
                <div className={styles.stepN}>1</div>
                <div>
                  <strong>Réception</strong> sous 24h · accusé de réception automatique avec n° de
                  référence MGP-AAAA-NNN.
                </div>
              </div>
              <div className={styles.step}>
                <div className={styles.stepN}>2</div>
                <div>
                  <strong>Qualification</strong> sous 48h par le secrétariat UGP — catégorisation,
                  attribution référent, niveau d&apos;urgence.
                </div>
              </div>
              <div className={styles.step}>
                <div className={styles.stepN}>3</div>
                <div>
                  <strong>Instruction</strong> 5–7 j · le référent collecte les éléments, sollicite
                  les parties si besoin.
                </div>
              </div>
              <div className={styles.step}>
                <div className={styles.stepN}>4</div>
                <div>
                  <strong>Réponse</strong> au plus tard à J+10 · résolution proposée, escalade
                  Coord UGP si désaccord.
                </div>
              </div>
              <div className={styles.step}>
                <div className={styles.stepN}>5</div>
                <div>
                  <strong>Clôture</strong> · signature numérique du plaignant ou délai 14 j sans
                  contestation.
                </div>
              </div>
            </div>
          </section>

          <section className={styles.railCard}>
            <h4 className={styles.railH}>Référents MGP</h4>
            <div className={styles.contacts}>
              <div className={styles.contact}>
                <div>
                  <div className={styles.contactName}>K. Tshiala</div>
                  <div className={styles.contactRole}>Secrétariat MGP UGP</div>
                  <div className={styles.contactInfo}>
                    <Email size={10} aria-hidden /> mgp@ptn-rdc.cd
                  </div>
                </div>
              </div>
              <div className={styles.contact}>
                <div>
                  <div className={styles.contactName}>P. Mbongo</div>
                  <div className={styles.contactRole}>Référent E&S</div>
                  <div className={styles.contactInfo}>
                    <Phone size={10} aria-hidden /> +243 81 234 56 79
                  </div>
                </div>
              </div>
            </div>
          </section>

          <section className={styles.railCard}>
            <h4 className={styles.railH}>
              <Information size={12} aria-hidden style={{ marginRight: 4, verticalAlign: "middle" }} />
              Cadre juridique
            </h4>
            <p className={styles.railP}>
              <strong>CGES PTN-RDC</strong> · §6.3 Mécanisme de gestion des plaintes <br />
              <strong>NES 10</strong> Banque mondiale · Mobilisation des parties prenantes <br />
              <strong>Loi 2023-006 RDC</strong> · Protection des données personnelles
            </p>
          </section>
        </aside>
      </div>
    </Shell>
  );
}
