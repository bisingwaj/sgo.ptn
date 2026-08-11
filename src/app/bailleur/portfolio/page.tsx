import { Shell } from "@/components/shell/Shell";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";
import { Tag } from "@/components/ui/Tag";
import { COMPONENTS } from "@/lib/project-data";
import styles from "./portfolio.module.scss";

export const metadata = { title: "Portfolio · Bailleur · PTN-RDC" };

export default function PortfolioPage() {
  return (
    <Shell crumbs={[{ label: "Dashboard", href: "/bailleur" }, { label: "Portfolio" }]}>
      <PageHeader
        eyebrow="WORLD BANK · PORTFOLIO BREAKDOWN"
        title="Portfolio by component"
        subtitle="510 M USD total · IDA 400 M USD (79 %) + AFD 110 M USD (21 %) · 165 M USD private capital target."
      />

      <div className={styles.grid}>
        {(["C1", "C2", "C3", "C4"] as const).map((k) => {
          const c = COMPONENTS[k];
          const disbursed = c.total * 0.28;
          const pct = Math.round((disbursed / c.total) * 100);
          return (
            <Card
              key={k}
              title={`Component ${k} · ${c.short}`}
              badge={<Tag tone="gray" size="sm">{c.label.split("·")[0]}</Tag>}
            >
              <div className={styles.cardBody}>
                <div className={styles.amounts}>
                  <div>
                    <span className={styles.amountLabel}>Total commitment</span>
                    <span className={`${styles.amountValue} ptn-mono`}>{c.total} M</span>
                  </div>
                  <div>
                    <span className={styles.amountLabel}>Disbursed</span>
                    <span className={`${styles.amountValue} ptn-mono`}>
                      {disbursed.toFixed(1)} M
                    </span>
                  </div>
                  <div>
                    <span className={styles.amountLabel}>Coverage</span>
                    <span className={`${styles.amountValue} ptn-mono`}>{pct} %</span>
                  </div>
                </div>
                <div className={styles.bar} style={{ background: c.color + "33" }}>
                  <span style={{ width: `${pct}%`, background: c.color }} />
                </div>
                <div className={styles.split}>
                  <div className={styles.splitItem}>
                    <span>IDA</span>
                    <strong className="ptn-mono">{c.ida} M</strong>
                  </div>
                  <div className={styles.splitItem}>
                    <span>AFD</span>
                    <strong className="ptn-mono">{c.afd} M</strong>
                  </div>
                  {c.privateCapital > 0 && (
                    <div className={styles.splitItem}>
                      <span>Private</span>
                      <strong className="ptn-mono">{c.privateCapital} M</strong>
                    </div>
                  )}
                </div>
                {c.subComponents.length > 0 && (
                  <div className={styles.sub}>
                    <h4>Sub-components</h4>
                    <ul>
                      {c.subComponents.map((sc) => (
                        <li key={sc.code}>
                          <span className="ptn-mono">{sc.code}</span>
                          <span>{sc.label}</span>
                          <span className="ptn-mono">{sc.amount} M</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </Card>
          );
        })}
      </div>
    </Shell>
  );
}
