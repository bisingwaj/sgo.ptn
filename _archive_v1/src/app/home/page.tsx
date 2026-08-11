import Link from "next/link";
import { Shell } from "@/components/shell/Shell";
import styles from "./home.module.css";

interface ScreenCard {
  title: string;
  href: string;
  category: string;
  description: string;
  badge?: string;
}

const SCREENS: ScreenCard[] = [
  {
    title: "Login v2",
    href: "/login",
    category: "Auth",
    description:
      "Sélecteur 2 niveaux (4 familles × sous-rôles), SSO/OIDC, statut système live.",
  },
  {
    title: "Onboarding UGP",
    href: "/onboarding",
    category: "Auth",
    description: "4 étapes : Profil → Composante → Permissions → Bienvenue.",
  },
  {
    title: "Tableau de bord Entité",
    href: "/dashboard",
    category: "Dashboards",
    description: "Vue ministère bénéficiaire : initiatives, pipeline TDR→ANO, KPIs.",
  },
  {
    title: "Cockpit UGP",
    href: "/cockpit",
    category: "Dashboards",
    description:
      "7 KPIs · IDA/AFD jumelés · 4 composantes 385/95/30/20 · SBP · échéances.",
    badge: "MEP",
  },
  {
    title: "Dashboard Bailleur",
    href: "/bailleur",
    category: "Dashboards",
    description: "Inbox ANO unifiée BM/AFD, conditionnalités, courbe de décaissement.",
  },
  {
    title: "Dashboard Soumissionnaire",
    href: "/soumissionnaire",
    category: "Dashboards",
    description: "Marketplace AO, mes soumissions, contrats, paiements.",
  },
  {
    title: "Dashboard Auditeur",
    href: "/auditeur",
    category: "Dashboards",
    description:
      "Plan d'audit, échantillonnage stratifié, pistes d'audit, vérif. terrain TPM.",
  },
  {
    title: "PPM",
    href: "/ppm",
    category: "Cycle",
    description: "Plan annuel, vue Gantt, méthodes passation, ANO bailleur, scénarios.",
  },
  {
    title: "Sélecteur TDR v2",
    href: "/tdr",
    category: "TDR",
    description:
      "4 origines × 11 types regroupés en 3 familles (passation / activités / SBP).",
    badge: "Multi-acteurs",
  },
  {
    title: "Wizard TDR Travaux",
    href: "/tdr/travaux",
    category: "TDR",
    description:
      "Wizard 5 étapes : cadrage → besoins → BPU/PGES → calendrier → ANO. No-scroll.",
  },
  {
    title: "Wizard TDR Fournitures",
    href: "/tdr/fournitures",
    category: "TDR",
    description: "Specs, BoQ, normes ICAO/ANSI, garantie, livraison. No-scroll.",
  },
  {
    title: "Wizard TDR Services consultants v2",
    href: "/tdr/consultants",
    category: "TDR",
    description:
      "SFQC/SBQ/SCBD/SMC, profils-clés, livrables, KYC/COI, budget. No-scroll.",
  },
  {
    title: "Workflow TDR multi-acteurs",
    href: "/tdr/workflow",
    category: "TDR",
    description:
      "Timeline 6 étapes Brouillon → Soumission UGP → Arbitrage → PPM → ANO → Exécution.",
    badge: "Partenaire",
  },
];

const CATEGORIES = ["Auth", "Dashboards", "Cycle", "TDR"] as const;

export default function HomePage() {
  return (
    <Shell crumbs={[{ label: "Accueil", href: "/home" }, { label: "Index des écrans" }]}>
      <div className={styles.wrap}>
        <header className={styles.head}>
          <div>
            <div className={styles.eyebrow}>PTN-RDC · Plateforme</div>
            <h1>Index des écrans implémentés</h1>
            <p className={styles.lede}>
              13 écrans Carbon Design System couvrant l&apos;authentification, les
              tableaux de bord par profil et le cycle de passation des marchés. Le
              sélecteur de profil dans le header bascule la navigation et les droits
              (UGP / Partenaire / Bailleur / SBP).
            </p>
          </div>
        </header>

        <div className={styles.grid}>
          {CATEGORIES.map((cat) => (
            <section key={cat} className={styles.cat}>
              <div className={styles.catHead}>
                <span className={`${styles.catTag} ${styles[`cat_${cat.toLowerCase()}`]}`}>
                  {cat}
                </span>
                <span className={styles.catCount}>
                  {SCREENS.filter((s) => s.category === cat).length} écrans
                </span>
              </div>
              <ul className={styles.list}>
                {SCREENS.filter((s) => s.category === cat).map((s) => (
                  <li key={s.href} className={styles.card}>
                    <Link href={s.href} className={styles.cardLink}>
                      <div className={styles.cardTop}>
                        <span className={styles.cardTitle}>{s.title}</span>
                        {s.badge && (
                          <span className={styles.cardBadge}>{s.badge}</span>
                        )}
                      </div>
                      <p className={styles.cardDesc}>{s.description}</p>
                      <div className={styles.cardFoot}>
                        <span className={`${styles.cardHref} mono`}>{s.href}</span>
                        <svg
                          width="14"
                          height="14"
                          viewBox="0 0 16 16"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="1.4"
                        >
                          <path d="M3 8h10M9 4l4 4-4 4" />
                        </svg>
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      </div>
    </Shell>
  );
}
