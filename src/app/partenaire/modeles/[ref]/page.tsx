import Link from "next/link";
import { Shell } from "@/components/shell/Shell";
import {
  Download,
  TaskApproved,
  Bookmark,
} from "@carbon/icons-react";
import { TemplatePreviewClient } from "./TemplatePreviewClient";
import styles from "./template-preview.module.scss";

export const metadata = { title: "Aperçu modèle TDR · Espace partenaire · PTN-RDC" };

interface Props {
  params: Promise<{ ref: string }>;
}

const TEMPLATES: Record<string, {
  type: string;
  title: string;
  desc: string;
  composante: string;
  budget: string;
  duration: string;
  anoTime: string;
  reused: number;
  ai: boolean;
}> = {
  "TPL-AMOA-01": {
    type: "AMOA",
    title: "AMOA Identité numérique — modèle ID4D",
    desc: "Modèle de TDR pour assistance à maîtrise d'ouvrage sur projet d'identité numérique. Aligné cadre ID4D Banque mondiale et standards ICAO 9303.",
    composante: "C2 · Fond.",
    budget: "5–12 M USD",
    duration: "9–12 mois",
    anoTime: "9 j",
    reused: 7,
    ai: true,
  },
};

export default async function TemplatePreviewPage({ params }: Props) {
  const { ref } = await params;
  const t = { ref, ...(TEMPLATES[ref] ?? TEMPLATES["TPL-AMOA-01"]) };

  return (
    <Shell
      crumbs={[
        { label: "Espace partenaire", href: "/partenaire" },
        { label: "Modèles TDR", href: "/partenaire/modeles" },
        { label: ref },
      ]}
    >
      <div className={styles.headerRow}>
        <div className={styles.metaCol}>
          <div className={styles.eyebrow}>
            <span className="ptn-mono">{ref}</span> · MODÈLE {t.type} · ÉPROUVÉ ANO BANQUE MONDIALE
          </div>
          <h1 className={styles.title}>{t.title}</h1>
          <p className={styles.subtitle}>{t.desc}</p>
        </div>
        <div className={styles.actionsRow}>
          <button type="button" className={styles.btnSecondary}>
            <Bookmark size={16} aria-hidden /> Favori
          </button>
          <button type="button" className={styles.btnSecondary}>
            <Download size={16} aria-hidden /> Télécharger DOCX
          </button>
          <Link
            href={`/partenaire/propositions/nouveau?modele=${ref}`}
            className={styles.btnPrimary}
          >
            <TaskApproved size={16} aria-hidden /> Utiliser ce modèle
          </Link>
        </div>
      </div>

      <div className={styles.metricsRow}>
        <div className={styles.metric}>
          <div className={styles.metricK}>Budget type</div>
          <div className={styles.metricV}>{t.budget}</div>
        </div>
        <div className={styles.metric}>
          <div className={styles.metricK}>Durée</div>
          <div className={styles.metricV}>{t.duration}</div>
        </div>
        <div className={styles.metric}>
          <div className={styles.metricK}>Délai ANO moyen</div>
          <div className={`${styles.metricV} ${styles.metricVOk}`}>{t.anoTime}</div>
          <div className={styles.metricSub}>vs 38 j hors modèle</div>
        </div>
        <div className={styles.metric}>
          <div className={styles.metricK}>Réutilisé</div>
          <div className={styles.metricV}>{t.reused}×</div>
          <div className={styles.metricSub}>tous validés ANO</div>
        </div>
      </div>

      <TemplatePreviewClient template={t} />
    </Shell>
  );
}
