import { Shell } from "@/components/shell/Shell";
import { PageHeader } from "@/components/ui/PageHeader";
import { KpiStrip, KpiTile } from "@/components/ui/KpiTile";
import { Card } from "@/components/ui/Card";
import { Tag } from "@/components/ui/Tag";
import { ChartLineSmooth, Activity, Idea } from "@carbon/icons-react";
import { ODP_INDICATORS } from "@/lib/project-data";
import styles from "./cadre.module.scss";

export const metadata = { title: "Cadre de résultats · PTN-RDC" };

interface Indicator {
  code: string;
  label: string;
  baseline: number;
  target: number;
  current: number;
  unit: string;
  level: "ODP" | "Intermédiaire";
  womenTarget?: number;
  womenCurrent?: number;
}

const ALL_INDICATORS: Indicator[] = [
  ...ODP_INDICATORS.map((i) => {
    const tw = "targetWomen" in i ? i.targetWomen : undefined;
    return {
      code: i.code,
      label: i.label,
      baseline: i.baseline,
      target: i.target,
      unit: i.unit,
      current: i.target * 0.45,
      level: "ODP" as const,
      womenCurrent: tw ? tw * 0.45 : undefined,
      womenTarget: tw,
    };
  }),
  { code: "C1-1", label: "FDSU opérationnel", baseline: 0, target: 1, current: 1, unit: "oui/non", level: "Intermédiaire" },
  { code: "C1-2", label: "Prix forfait mobile / RNB par habitant", baseline: 10.3, target: 5.1, current: 7.8, unit: "%", level: "Intermédiaire" },
  { code: "C1-3", label: "Km fibre déployée", baseline: 0, target: 10000, current: 1240, unit: "km", level: "Intermédiaire" },
  { code: "C1-4", label: "Nouvelles communautés couvertes", baseline: 0, target: 650, current: 90, unit: "communautés", level: "Intermédiaire" },
  { code: "C1-5", label: "Institutions publiques connectées", baseline: 0, target: 1000, current: 145, unit: "institutions", level: "Intermédiaire" },
  { code: "C1-6", label: "Capitaux privés mobilisés", baseline: 0, target: 165, current: 22, unit: "M USD", level: "Intermédiaire" },
  { code: "C2-1", label: "Cadre interopérabilité", baseline: 0, target: 1, current: 0, unit: "oui/non", level: "Intermédiaire" },
  { code: "C2-2", label: "Hébergement données gov.", baseline: 0, target: 1, current: 0, unit: "oui/non", level: "Intermédiaire" },
  { code: "C2-3", label: "CSIRT opérationnel", baseline: 0, target: 1, current: 0, unit: "centres", level: "Intermédiaire" },
  { code: "C2-4", label: "Guichet numérique", baseline: 0, target: 1, current: 0, unit: "oui/non", level: "Intermédiaire" },
  { code: "C3-1", label: "Personnes inscrites formations", baseline: 0, target: 6000, current: 1820, unit: "personnes", level: "Intermédiaire" },
  { code: "C3-2", label: "Centres d'innovation", baseline: 0, target: 10, current: 4, unit: "centres", level: "Intermédiaire" },
  { code: "C3-3", label: "Startups soutenues", baseline: 0, target: 100, current: 32, unit: "startups", level: "Intermédiaire", womenTarget: 30, womenCurrent: 12 },
  { code: "C4-1", label: "Griefs MGP traités en ≤ 30 jours", baseline: 0, target: 100, current: 96, unit: "%", level: "Intermédiaire" },
];

export default function CadrePage() {
  const odpAchieved = ALL_INDICATORS.filter((i) => i.level === "ODP" && i.current / i.target >= 0.5).length;
  const interAchieved = ALL_INDICATORS.filter(
    (i) => i.level === "Intermédiaire" && i.current / i.target >= 0.5,
  ).length;
  const odpTotal = ALL_INDICATORS.filter((i) => i.level === "ODP").length;
  const interTotal = ALL_INDICATORS.filter((i) => i.level === "Intermédiaire").length;

  return (
    <Shell crumbs={[{ label: "Accueil", href: "/cockpit" }, { label: "Cadre de résultats" }]}>
      <PageHeader
        eyebrow="UGP · PILOTAGE STRATÉGIQUE"
        title="Cadre de résultats PTN-RDC"
        subtitle={`${ALL_INDICATORS.length} indicateurs suivis · ${odpAchieved}/${odpTotal} ODP atteints à 50 % · ${interAchieved}/${interTotal} intermédiaires.`}
      />

      <KpiStrip cols={4}>
        <KpiTile
          icon={<Activity size={14} />}
          label="Indicateurs ODP atteints"
          value={`${odpAchieved} / ${odpTotal}`}
          unit="≥ 50 %"
          trend={{ direction: "up", label: "+1 ce trim." }}
        />
        <KpiTile
          icon={<ChartLineSmooth size={14} />}
          label="Indicateurs intermédiaires"
          value={`${interAchieved} / ${interTotal}`}
          trend={{ direction: "up", label: "+3 ce trim." }}
        />
        <KpiTile
          label="Couverture femmes"
          value="42"
          unit="%"
          trend={{ direction: "up", label: "+5 pts" }}
        />
        <KpiTile
          icon={<Idea size={14} />}
          label="Note ISR"
          value="MS"
          unit="Modérément Satisfaisant"
        />
      </KpiStrip>

      <Card title="Indicateurs ODP" badge={`${odpTotal} indicateurs · cible 2029`}>
        <ul className={styles.indList}>
          {ALL_INDICATORS.filter((i) => i.level === "ODP").map((ind) => (
            <IndicatorRow key={ind.code} ind={ind} />
          ))}
        </ul>
      </Card>

      <div style={{ marginTop: "var(--ptn-space-04)" }} />

      <Card title="Indicateurs intermédiaires par composante" badge={`${interTotal} indicateurs`}>
        <ul className={styles.indList}>
          {ALL_INDICATORS.filter((i) => i.level === "Intermédiaire").map((ind) => (
            <IndicatorRow key={ind.code} ind={ind} />
          ))}
        </ul>
      </Card>
    </Shell>
  );
}

function IndicatorRow({ ind }: { ind: Indicator }) {
  const pct = Math.round((ind.current / ind.target) * 100);
  const tone = pct >= 80 ? "green" : pct >= 50 ? "yellow" : pct >= 25 ? "blue" : "red";

  return (
    <li className={styles.indItem}>
      <div className={styles.indHead}>
        <Tag tone="gray" size="sm">
          {ind.code}
        </Tag>
        <strong>{ind.label}</strong>
        <Tag tone={tone} size="sm">
          {pct} %
        </Tag>
      </div>
      <div className={styles.indProgress}>
        <span className="ptn-mono">
          {ind.current.toLocaleString("fr-FR")} / {ind.target.toLocaleString("fr-FR")} {ind.unit}
        </span>
        <span className={styles.indBaseline}>
          Baseline : <span className="ptn-mono">{ind.baseline}</span>
        </span>
      </div>
      <div className={styles.indBar}>
        <span style={{ width: `${Math.min(pct, 100)}%` }} className={styles[`bar_${tone}`]} />
      </div>
      {ind.womenCurrent !== undefined && ind.womenTarget !== undefined && (
        <div className={styles.indGender}>
          <span>Dont femmes :</span>
          <span className="ptn-mono">
            {ind.womenCurrent.toLocaleString("fr-FR")} / {ind.womenTarget.toLocaleString("fr-FR")}
          </span>
          <span className={styles.indGenderPct}>
            ({Math.round((ind.womenCurrent / ind.womenTarget) * 100)} %)
          </span>
        </div>
      )}
    </li>
  );
}
