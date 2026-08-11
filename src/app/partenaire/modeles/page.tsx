import Link from "next/link";
import { Shell } from "@/components/shell/Shell";
import { PageHeader } from "@/components/ui/PageHeader";
import {
  Search,
  Filter,
  Document,
  AiGenerate,
  CheckmarkFilled,
  Time,
  ArrowRight,
  Bookmark,
  Folders,
  TaskApproved,
  Catalog,
} from "@carbon/icons-react";
import styles from "./modeles.module.scss";

export const metadata = { title: "Modèles de TDR · Espace partenaire · PTN-RDC" };

const CATEGORIES = [
  { id: "all", label: "Tous les modèles", icon: Folders, count: 24, active: true },
  { id: "amoa", label: "AMOA", icon: Document, count: 6 },
  { id: "etude", label: "Études & consultance", icon: Document, count: 7 },
  { id: "biens", label: "Biens IT", icon: Catalog, count: 4 },
  { id: "travaux", label: "Travaux & génie civil", icon: Document, count: 3 },
  { id: "formation", label: "Formation & ateliers", icon: Document, count: 4 },
];

interface Template {
  ref: string;
  type: string;
  title: string;
  desc: string;
  composante: string;
  amount: string;
  duration: string;
  anoTime: string;
  reused: number;
  ai: boolean;
  recommended?: boolean;
}

const TEMPLATES: Template[] = [
  {
    ref: "TPL-AMOA-01",
    type: "AMOA",
    title: "AMOA Identité numérique — modèle ID4D",
    desc: "Modèle de TDR pour assistance à maîtrise d'ouvrage sur projet d'identité numérique. Aligné cadre ID4D Banque mondiale et standards ICAO 9303.",
    composante: "C2 · Fond.",
    amount: "5–12 M USD",
    duration: "9–12 mois",
    anoTime: "9 j",
    reused: 7,
    ai: true,
    recommended: true,
  },
  {
    ref: "TPL-AMOA-02",
    type: "AMOA",
    title: "AMOA Datacenter Tier-3",
    desc: "Conception, passation et pilotage de la construction d'un datacenter Tier-3 — inclut PGES intégré et exigences sécurité physique.",
    composante: "C2 · Fond.",
    amount: "3–8 M USD",
    duration: "6–9 mois",
    anoTime: "11 j",
    reused: 4,
    ai: false,
  },
  {
    ref: "TPL-ETUDE-01",
    type: "ÉTUDE",
    title: "Étude de marché numérique national",
    desc: "Cartographie de l'écosystème numérique, analyse de la demande de services digitaux, ciblage des bénéficiaires.",
    composante: "C1 · Accès",
    amount: "150–400 k USD",
    duration: "3–4 mois",
    anoTime: "7 j",
    reused: 9,
    ai: true,
  },
  {
    ref: "TPL-ETUDE-02",
    type: "ÉTUDE",
    title: "Étude PGES — infrastructure télécom",
    desc: "Plan de gestion environnementale et sociale pour déploiement d'infrastructures télécom (fibre, antennes, datacenters).",
    composante: "C2 · Fond.",
    amount: "180–350 k USD",
    duration: "2–3 mois",
    anoTime: "8 j",
    reused: 6,
    ai: false,
  },
  {
    ref: "TPL-BIENS-01",
    type: "BIENS",
    title: "Acquisition équipements réseau (switches, routeurs)",
    desc: "DAO standard pour acquisition d'équipements actifs réseau avec garantie 5 ans et formation technique.",
    composante: "C2 · Fond.",
    amount: "1–3 M USD",
    duration: "4–6 mois",
    anoTime: "12 j",
    reused: 5,
    ai: false,
  },
  {
    ref: "TPL-FORMATION-01",
    type: "FORMATION",
    title: "Formation des agents publics — ENA digital",
    desc: "Cycle de formation continue pour agents administratifs sur les services publics dématérialisés. Modules adaptables.",
    composante: "C3 · Compét.",
    amount: "200–500 k USD",
    duration: "6 mois",
    anoTime: "6 j",
    reused: 11,
    ai: true,
    recommended: true,
  },
];

export default function ModelesPage() {
  return (
    <Shell crumbs={[{ label: "Espace partenaire", href: "/partenaire" }, { label: "Modèles TDR" }]}>
      <PageHeader
        eyebrow="ANIE · BIBLIOTHÈQUE DE TDR ÉPROUVÉS"
        title="Modèles de TDR — moteur de similarité"
        subtitle="TDR ayant obtenu un ANO Banque mondiale, indexés par composante et type. Cas d'usage IA #3."
        meta={
          <>
            <span>
              <strong>24 modèles</strong> · 18 ANO obtenus · 6 en révision
            </span>
            <span>·</span>
            <span>
              Délai ANO moyen : <span className="ptn-mono">9,4 j</span> (vs 38 j hors modèle)
            </span>
          </>
        }
      />

      <div className={styles.aiBanner}>
        <div className={styles.aiIco}>
          <AiGenerate size={16} aria-hidden />
        </div>
        <div>
          <div className={styles.aiTitle}>
            Recommandation IA <span className={styles.aiBadge}>✦ IA</span>
          </div>
          <div className={styles.aiText}>
            D&apos;après votre profil ANIE et vos propositions actives, 2 modèles sont
            particulièrement adaptés à votre prochain TDR identité numérique :
            <strong> TPL-AMOA-01</strong> (réutilisé 7×, ANO moyen 9 j) et
            <strong> TPL-FORMATION-01</strong> pour le volet capacitation. Confiance 92 %.
          </div>
        </div>
      </div>

      <div className={styles.layout}>
        <aside className={styles.sidebar}>
          <div className={styles.sideTitle}>Catégories</div>
          {CATEGORIES.map((c) => {
            const Icon = c.icon;
            return (
              <button
                key={c.id}
                type="button"
                className={`${styles.sideItem} ${c.active ? styles.sideItemActive : ""}`}
              >
                <Icon size={16} aria-hidden /> {c.label}
                <span className={styles.sideCount}>{c.count}</span>
              </button>
            );
          })}
        </aside>

        <div>
          <div className={styles.toolbar}>
            <h3>
              Tous les modèles <span className={styles.num}>(24)</span>
            </h3>
            <div className={styles.spacer} />
            <div className={styles.search}>
              <Search size={14} aria-hidden />
              <input type="search" placeholder="Rechercher un modèle…" />
            </div>
            <button type="button" className={styles.btnSecondary}>
              <Filter size={14} aria-hidden /> Filtres
            </button>
            <button type="button" className={styles.btnSecondary}>
              <Time size={14} aria-hidden /> Trier · ANO ↑
            </button>
          </div>

          <div className={styles.grid}>
            {TEMPLATES.map((t) => (
              <article key={t.ref} className={styles.card}>
                <div className={styles.cardHead}>
                  <div className={styles.cardMain}>
                    <div className={styles.cardEyebrow}>
                      {t.type} · {t.ref}
                    </div>
                    <h3 className={styles.cardTitle}>{t.title}</h3>
                  </div>
                  <button
                    type="button"
                    style={{
                      background: "transparent",
                      border: 0,
                      color: "var(--cds-text-helper)",
                      cursor: "pointer",
                      padding: 4,
                    }}
                    aria-label="Marquer favori"
                  >
                    <Bookmark size={16} aria-hidden />
                  </button>
                </div>

                <p className={styles.cardDesc}>{t.desc}</p>

                <div className={styles.cardMetrics}>
                  <div className={styles.metric}>
                    <span className={styles.metricK}>Budget type</span>
                    <span className={styles.metricV}>{t.amount}</span>
                  </div>
                  <div className={styles.metric}>
                    <span className={styles.metricK}>Durée</span>
                    <span className={styles.metricV}>{t.duration}</span>
                  </div>
                  <div className={styles.metric}>
                    <span className={styles.metricK}>ANO moyen</span>
                    <span className={`${styles.metricV} ${styles.metricVOk}`}>{t.anoTime}</span>
                  </div>
                  <div className={styles.metric}>
                    <span className={styles.metricK}>Réutilisé</span>
                    <span className={styles.metricV}>{t.reused}×</span>
                  </div>
                </div>

                <div className={styles.cardFoot}>
                  <span className={`${styles.tag} ${styles.tagComp}`}>{t.composante}</span>
                  {t.ai && (
                    <span className={`${styles.tag} ${styles.tagAi}`}>
                      <AiGenerate size={10} aria-hidden /> Compatible IA
                    </span>
                  )}
                  {t.recommended && (
                    <span className={styles.tag}>
                      <CheckmarkFilled
                        size={10}
                        aria-hidden
                        style={{ color: "var(--ptn-status-success)" }}
                      />{" "}
                      Recommandé
                    </span>
                  )}
                  <div className={styles.cardActions}>
                    <Link
                      href={`/partenaire/modeles/${t.ref}`}
                      className={styles.btnGhost}
                    >
                      Aperçu
                    </Link>
                    <Link
                      href="/partenaire/propositions/nouveau"
                      className={styles.btnPrimary}
                    >
                      <TaskApproved size={12} aria-hidden /> Utiliser{" "}
                      <ArrowRight size={12} aria-hidden />
                    </Link>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </div>
      </div>
    </Shell>
  );
}
