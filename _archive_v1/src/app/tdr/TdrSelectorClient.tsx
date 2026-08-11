"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useProfile, PROFILES, type Profile } from "@/lib/profile-context";
import { Tag } from "@/components/ui/Tag";
import { Button } from "@/components/ui/Buttons";
import styles from "./tdr.module.css";

type Origine = "ugp" | "partenaire" | "bailleur" | "sbp";

const ORIGINES: Record<
  Origine,
  { label: string; sub: string; accent: string; canAuthor: boolean; from: Profile }
> = {
  ugp: {
    label: "UGP",
    sub: "Passation classique projet",
    accent: "var(--c-blue-60)",
    canAuthor: true,
    from: "ugp",
  },
  partenaire: {
    label: "Partie prenante",
    sub: "Min. sectoriels, agences (ANIE…), OSC, universités",
    accent: "var(--c-teal-60)",
    canAuthor: true,
    from: "partenaire",
  },
  bailleur: {
    label: "Bailleur",
    sub: "BM / AFD · activités conjointes (consultation seule)",
    accent: "var(--c-purple-60)",
    canAuthor: false,
    from: "bailleur",
  },
  sbp: {
    label: "Bénéficiaire SBP",
    sub: "EESU, hubs, startups (sous-projets)",
    accent: "var(--c-magenta-60)",
    canAuthor: true,
    from: "sbp",
  },
};

interface TdrType {
  key: string;
  label: string;
  family: "passation" | "operations" | "subventions";
  desc: string;
  href?: string;
  hint?: string;
}

const TYPES: TdrType[] = [
  // Passation classique
  {
    key: "travaux",
    label: "Travaux",
    family: "passation",
    desc: "Construction, génie civil, réseaux (BPU, PGES, géotech).",
    href: "/tdr/travaux",
  },
  {
    key: "fournitures",
    label: "Fournitures & biens",
    family: "passation",
    desc: "Équipements, matériels (specs, BoQ, normes).",
    href: "/tdr/fournitures",
  },
  {
    key: "consultants",
    label: "Services consultants",
    family: "passation",
    desc: "Firmes & individuels (SFQC, SBQ, profils-clés).",
    href: "/tdr/consultants",
  },
  {
    key: "non-cons",
    label: "Services non-consultants",
    family: "passation",
    desc: "Logistique, exploitation, maintenance (SLA, KPI).",
    hint: "À venir",
  },
  // Activités opérationnelles
  {
    key: "atelier",
    label: "Atelier / séminaire / conférence",
    family: "operations",
    desc: "Événements multi-institutionnels (ID4Africa…).",
    hint: "À venir",
  },
  {
    key: "formation",
    label: "Formation / renforcement",
    family: "operations",
    desc: "Sessions, programmes, modules certifiants.",
    hint: "À venir",
  },
  {
    key: "mission",
    label: "Mission d'étude / international",
    family: "operations",
    desc: "Délégations, voyages techniques, foires.",
    hint: "À venir",
  },
  {
    key: "etude",
    label: "Étude / diagnostic / évaluation",
    family: "operations",
    desc: "Études prospectives, mid-term, ex-post.",
    hint: "À venir",
  },
  {
    key: "comm",
    label: "Communication / sensibilisation",
    family: "operations",
    desc: "Campagnes, livrables visibilité, MEP § Comm.",
    hint: "À venir",
  },
  // Subventions & contrôles
  {
    key: "sbp",
    label: "Sous-projet / don SBP",
    family: "subventions",
    desc: "Appels à projets EESU, hubs, startups.",
    hint: "À venir",
  },
  {
    key: "audit",
    label: "Audit / contrôle",
    family: "subventions",
    desc: "Mission TPM, audit externe, revue Cour des Comptes.",
    hint: "À venir",
  },
];

const FAMILY_LABELS: Record<TdrType["family"], { l: string; tone: "blue" | "teal" | "magenta" }> = {
  passation: { l: "Passation classique", tone: "blue" },
  operations: { l: "Activités opérationnelles", tone: "teal" },
  subventions: { l: "Subventions & contrôles", tone: "magenta" },
};

export function TdrSelectorClient() {
  const router = useRouter();
  const { profile, setProfile, config } = useProfile();
  const [origine, setOrigine] = useState<Origine>(
    profile === "bailleur" ? "ugp" : (profile as Origine),
  );
  const [type, setType] = useState<string | null>(null);

  const originConf = ORIGINES[origine];
  const canAuthor = originConf.canAuthor;

  function start() {
    if (!type || !canAuthor) return;
    const t = TYPES.find((x) => x.key === type);
    if (!t?.href) return;
    setProfile(originConf.from);
    router.push(t.href);
  }

  return (
    <div className={styles.wrap} style={{ ["--c-accent" as string]: originConf.accent }}>
      <header className={styles.head}>
        <div>
          <div className={styles.eyebrow}>Sélecteur TDR · v2</div>
          <h1 className={styles.h1}>Démarrer un nouveau Terme de Référence</h1>
          <p className={styles.lede}>
            Choisissez l&apos;<strong>origine</strong> du TDR puis le <strong>type
            d&apos;activité</strong>. Le système oriente vers le wizard adapté à votre
            profil.
          </p>
        </div>
        <div className={styles.profileNote}>
          <span className={styles.eyebrow}>Profil actif</span>
          <span className={styles.profilePill} style={{ background: config.accent }}>
            {config.short}
          </span>
        </div>
      </header>

      {/* 4 origines */}
      <section>
        <div className={styles.sectionHead}>
          <h2 className={styles.h2}>1 · Origine du TDR</h2>
          <span className={styles.subtle}>4 origines · workflow distinct</span>
        </div>
        <div className={styles.origines}>
          {(Object.keys(ORIGINES) as Origine[]).map((k) => {
            const o = ORIGINES[k];
            const active = origine === k;
            return (
              <button
                key={k}
                type="button"
                className={`${styles.origine} ${active ? styles.origineActive : ""}`}
                onClick={() => setOrigine(k)}
                style={
                  active
                    ? ({ ["--c-accent" as string]: o.accent } as React.CSSProperties)
                    : undefined
                }
              >
                <div
                  className={styles.origineDot}
                  style={{ background: o.accent }}
                />
                <div className={styles.origineMeta}>
                  <span className={styles.origineLabel}>{o.label}</span>
                  <span className={styles.origineSub}>{o.sub}</span>
                </div>
                {!o.canAuthor && (
                  <Tag tone="gray" size="sm">
                    Lecture
                  </Tag>
                )}
              </button>
            );
          })}
        </div>
      </section>

      {!canAuthor && (
        <div className={styles.banner}>
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
            <circle cx="8" cy="8" r="6.5" />
            <path d="M8 4.5v4M8 11v.01" strokeLinecap="round" />
          </svg>
          <div>
            <strong>Les bailleurs ne rédigent pas de TDR.</strong> Vos prérogatives sont
            la consultation et l&apos;émission d&apos;ANO. Pour rédiger, basculez sur
            UGP, Partenaire ou SBP.
          </div>
        </div>
      )}

      {/* 11 types groupés */}
      <section>
        <div className={styles.sectionHead}>
          <h2 className={styles.h2}>2 · Type d&apos;activité</h2>
          <span className={styles.subtle}>11 types · 3 familles</span>
        </div>

        {(["passation", "operations", "subventions"] as const).map((family) => {
          const items = TYPES.filter((t) => t.family === family);
          return (
            <div key={family} className={styles.familyBlock}>
              <div className={styles.familyHead}>
                <Tag tone={FAMILY_LABELS[family].tone}>
                  {FAMILY_LABELS[family].l}
                </Tag>
                <span className={styles.subtle}>{items.length} types</span>
              </div>
              <div className={styles.types}>
                {items.map((t) => {
                  const active = type === t.key;
                  const disabled = !canAuthor || !!t.hint;
                  return (
                    <button
                      key={t.key}
                      type="button"
                      onClick={() => !disabled && setType(t.key)}
                      disabled={disabled}
                      className={`${styles.type} ${active ? styles.typeActive : ""} ${
                        disabled ? styles.typeDisabled : ""
                      }`}
                    >
                      <div className={styles.typeHead}>
                        <span className={styles.typeLabel}>{t.label}</span>
                        {t.hint && (
                          <Tag tone="gray" size="sm">
                            {t.hint}
                          </Tag>
                        )}
                      </div>
                      <p className={styles.typeDesc}>{t.desc}</p>
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </section>

      <footer className={styles.foot}>
        <div className={styles.footRecap}>
          {origine && (
            <>
              <span>Origine : <strong>{ORIGINES[origine].label}</strong></span>
              {type && (
                <>
                  <span className={styles.footSep} />
                  <span>
                    Type : <strong>{TYPES.find((t) => t.key === type)?.label}</strong>
                  </span>
                </>
              )}
            </>
          )}
        </div>
        <Button
          variant="primary"
          size="lg"
          disabled={!canAuthor || !type || !TYPES.find((t) => t.key === type)?.href}
          onClick={start}
        >
          Démarrer le TDR
        </Button>
      </footer>
    </div>
  );
}
