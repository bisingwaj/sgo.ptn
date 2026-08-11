"use client";

import { useState } from "react";
import Link from "next/link";
import { Shell } from "@/components/shell/Shell";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";
import { Tag } from "@/components/ui/Tag";
import { Drawer } from "@/components/ui/Drawer";
import { Catalog, Time, Money, Search, ArrowRight, Idea } from "@carbon/icons-react";
import styles from "./marketplace.module.scss";

interface Tender {
  ref: string;
  title: string;
  componentCode: "C1" | "C2" | "C3" | "C4";
  componentTone: "blue" | "purple" | "teal" | "green";
  method: "AOI" | "AON" | "SFQC" | "SBQ" | "DC";
  donor: "BM" | "AFD" | "BM+AFD";
  budget: string;
  deadline: string;
  daysLeft: number;
  matchScore: number;
  description: string;
  riskES: "Faible" | "Modéré" | "Substantiel" | "Élevé";
  qualifications: string[];
}

const TENDERS: Tender[] = [
  {
    ref: "AO-PTN-058",
    title: "Backbone fibre Goma-Bukavu (180 km)",
    componentCode: "C1",
    componentTone: "blue",
    method: "AOI",
    donor: "BM+AFD",
    budget: "12,4 M USD",
    deadline: "16 mai 2026",
    daysLeft: 8,
    matchScore: 92,
    description: "Travaux 180 km fibre · zones partiellement minées · génie civil + déploiement.",
    riskES: "Substantiel",
    qualifications: ["Travaux", "Géotech", "ITU-T G.652D"],
  },
  {
    ref: "AO-PTN-049",
    title: "PGES Centre données Tier III",
    componentCode: "C2",
    componentTone: "purple",
    method: "SFQC",
    donor: "AFD",
    budget: "3,2 M USD",
    deadline: "23 mai 2026",
    daysLeft: 15,
    matchScore: 78,
    description: "Études PGES + EIES + suivi E&S sur 18 mois.",
    riskES: "Substantiel",
    qualifications: ["Conseil", "E&S", "Cadre RDC"],
  },
  {
    ref: "AO-PTN-061",
    title: "Stations enrôlement biométrique mobiles (200 unités)",
    componentCode: "C2",
    componentTone: "purple",
    method: "AON",
    donor: "BM",
    budget: "5,8 M USD",
    deadline: "31 mai 2026",
    daysLeft: 23,
    matchScore: 65,
    description: "Fournitures · ICAO 9303 · ANSI/NIST · livraison DDP 26 chefs-lieux.",
    riskES: "Faible",
    qualifications: ["Fournitures", "ICAO 9303"],
  },
  {
    ref: "AO-PTN-064",
    title: "Maintenance SOC cybersécurité (48 mois)",
    componentCode: "C2",
    componentTone: "purple",
    method: "SBQ",
    donor: "BM",
    budget: "1,4 M USD",
    deadline: "07 juin 2026",
    daysLeft: 30,
    matchScore: 88,
    description: "Maintenance et exploitation SOC · SLA 24/7 · ANCY.",
    riskES: "Modéré",
    qualifications: ["Conseil", "Cybersécurité"],
  },
  {
    ref: "AO-PTN-067",
    title: "Formation 200 enseignants EESU au numérique",
    componentCode: "C3",
    componentTone: "teal",
    method: "AON",
    donor: "AFD",
    budget: "1,9 M USD",
    deadline: "12 juin 2026",
    daysLeft: 35,
    matchScore: 72,
    description: "Programme 12 mois · 30 % femmes · 8 provinces.",
    riskES: "Faible",
    qualifications: ["Conseil", "Formation"],
  },
];

export default function MarketplacePage() {
  const [search, setSearch] = useState("");
  const [methodFilter, setMethodFilter] = useState<string[]>([]);
  const [selected, setSelected] = useState<Tender | null>(null);

  const filtered = TENDERS.filter((t) => {
    if (methodFilter.length > 0 && !methodFilter.includes(t.method)) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      return t.title.toLowerCase().includes(q) || t.ref.toLowerCase().includes(q);
    }
    return true;
  });

  return (
    <Shell crumbs={[{ label: "Accueil", href: "/soumissionnaire" }, { label: "Marketplace" }]}>
      <PageHeader
        eyebrow="MARKETPLACE · APPELS D'OFFRES PTN-RDC"
        title={`${TENDERS.length} AO ouverts compatibles avec votre profil`}
        subtitle="Score de pertinence calculé automatiquement à partir de votre KYC, certifications et historique."
      />

      <div className={styles.toolbar}>
        <div className={styles.searchWrap}>
          <Search size={14} aria-hidden />
          <input
            type="search"
            placeholder="Rechercher (titre, réf)"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className={styles.searchInput}
          />
        </div>
        <div className={styles.filters}>
          <span className={styles.filterLabel}>Méthode</span>
          {(["AOI", "AON", "SFQC", "SBQ", "DC"] as const).map((m) => {
            const active = methodFilter.includes(m);
            return (
              <button
                key={m}
                type="button"
                onClick={() =>
                  setMethodFilter(active ? methodFilter.filter((x) => x !== m) : [...methodFilter, m])
                }
                className={`${styles.pill} ${active ? styles.pillActive : ""}`}
              >
                {m}
              </button>
            );
          })}
        </div>
      </div>

      <Card noPadding>
        <ul className={styles.list}>
          {filtered.map((t) => (
            <li key={t.ref} className={styles.item} onClick={() => setSelected(t)}>
              <div className={styles.left}>
                <div className={styles.head}>
                  <span className="ptn-mono">{t.ref}</span>
                  <Tag tone={t.componentTone} size="sm">{t.componentCode}</Tag>
                  <Tag tone="gray" size="sm">{t.method}</Tag>
                  <Tag tone={t.donor === "BM" ? "blue" : t.donor === "AFD" ? "purple" : "outline"} size="sm">
                    {t.donor}
                  </Tag>
                </div>
                <strong>{t.title}</strong>
                <p>{t.description}</p>
                <div className={styles.qualifs}>
                  {t.qualifications.map((q) => (
                    <span key={q} className={styles.qualif}>{q}</span>
                  ))}
                </div>
              </div>
              <div className={styles.right}>
                <div className={`${styles.match} ${t.matchScore >= 80 ? styles.matchHigh : t.matchScore >= 65 ? styles.matchMid : ""}`}>
                  <Idea size={14} aria-hidden />
                  <span className="ptn-mono">{t.matchScore} %</span>
                  <span className={styles.matchLabel}>Match IA</span>
                </div>
                <div className={`${styles.budget} ptn-mono`}>{t.budget}</div>
                <div className={`${styles.deadline} ${t.daysLeft <= 10 ? styles.deadlineUrgent : ""}`}>
                  <Time size={12} aria-hidden />
                  <span className="ptn-mono">J−{t.daysLeft}</span>
                </div>
                <ArrowRight size={14} aria-hidden className={styles.arrow} />
              </div>
            </li>
          ))}
        </ul>
      </Card>

      <Drawer
        open={selected !== null}
        onClose={() => setSelected(null)}
        title={selected?.title ?? ""}
        subtitle={
          selected && (
            <span style={{ display: "inline-flex", gap: 8, alignItems: "center" }}>
              <span className="ptn-mono">{selected.ref}</span>
              <Tag tone={selected.componentTone} size="sm">{selected.componentCode}</Tag>
              <Tag tone="gray" size="sm">{selected.method}</Tag>
            </span>
          )
        }
        footer={
          selected && (
            <>
              <button type="button" className={styles.btnSecondary}>Télécharger DAO</button>
              <Link href={`/soumissionnaire/soumissions/${selected.ref}`} className={styles.btnPrimary}>
                Préparer ma soumission <ArrowRight size={14} />
              </Link>
            </>
          )
        }
      >
        {selected && (
          <div className={styles.drawerContent}>
            <p>{selected.description}</p>
            <div className={styles.kvGrid}>
              <Kv label="Budget estimé" value={selected.budget} mono />
              <Kv label="Méthode" value={selected.method} />
              <Kv label="Bailleur" value={selected.donor} />
              <Kv label="Risque E&S" value={selected.riskES} />
              <Kv label="Date limite" value={selected.deadline} />
              <Kv label="Score IA" value={`${selected.matchScore} %`} mono />
            </div>
            <div>
              <h4>Qualifications recherchées</h4>
              <div className={styles.qualifs}>
                {selected.qualifications.map((q) => (
                  <span key={q} className={styles.qualif}>{q}</span>
                ))}
              </div>
            </div>
          </div>
        )}
      </Drawer>
    </Shell>
  );
}

function Kv({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className={styles.kvRow}>
      <span>{label}</span>
      <strong className={mono ? "ptn-mono" : ""}>{value}</strong>
    </div>
  );
}
