"use client";

import { useState } from "react";
import { useProfile } from "@/lib/profile-context";
import { Tag } from "@/components/ui/Tag";
import { Button } from "@/components/ui/Buttons";
import styles from "./workflow.module.css";

interface Stage {
  key: string;
  label: string;
  actor: string;
  status: "done" | "active" | "future";
  date?: string;
  who?: string;
}

const STAGES: Stage[] = [
  { key: "draft", label: "Brouillon", actor: "Partenaire", status: "done", date: "12 avr.", who: "ANIE · M. Kabongo" },
  { key: "submit", label: "Soumission UGP", actor: "Partenaire", status: "done", date: "21 avr.", who: "ANIE → UGP" },
  { key: "arbitr", label: "Arbitrage UGP", actor: "UGP", status: "active", date: "07 mai", who: "Coord. + RPM" },
  { key: "ppm", label: "Intégration PPM", actor: "UGP", status: "future" },
  { key: "ano", label: "ANO bailleur", actor: "BM/AFD", status: "future" },
  { key: "exec", label: "Exécution", actor: "UGP + Partenaire", status: "future" },
];

interface Comment {
  who: string;
  org: "partenaire" | "ugp" | "bailleur";
  date: string;
  text: string;
  anchor?: string;
}

const COMMENTS: Comment[] = [
  {
    who: "M. Kabongo",
    org: "partenaire",
    date: "21 avr. 14:30",
    text: "TDR initial soumis pour arbitrage UGP. Budget 185 k USD aligné sur barèmes UGP.",
  },
  {
    who: "S. Mbuyi",
    org: "ugp",
    date: "23 avr. 09:15",
    text: "Reçu. La méthode d'évaluation SFQC me semble adaptée mais préciser les profils-clés.",
    anchor: "Étape 3 · profils-clés",
  },
  {
    who: "M. Kabongo",
    org: "partenaire",
    date: "24 avr. 11:42",
    text: "Profils ajoutés : Chef de mission, Architecte ID, Juriste, Expert E&S, Formation. Validez SVP.",
  },
  {
    who: "S. Mbuyi",
    org: "ugp",
    date: "07 mai 09:22",
    text: "Profils OK. J'intègre au PPM Q3. ANO BM à demander cette semaine.",
    anchor: "Arbitrage",
  },
];

interface Activity {
  who: string;
  org: "partenaire" | "ugp" | "bailleur";
  action: string;
  date: string;
}

const ACTIVITY: Activity[] = [
  { who: "ANIE", org: "partenaire", action: "a créé le TDR", date: "12 avr. 09:00" },
  { who: "M. Kabongo", org: "partenaire", action: "a soumis pour revue UGP", date: "21 avr. 14:30" },
  { who: "S. Mbuyi (UGP)", org: "ugp", action: "a accusé réception", date: "21 avr. 14:35" },
  { who: "S. Mbuyi (UGP)", org: "ugp", action: "a commenté Étape 3", date: "23 avr. 09:15" },
  { who: "M. Kabongo", org: "partenaire", action: "a mis à jour profils-clés", date: "24 avr. 11:42" },
  { who: "Coord. UGP", org: "ugp", action: "a validé l'arbitrage", date: "07 mai 09:22" },
  { who: "Système", org: "ugp", action: "a généré le hash registre", date: "07 mai 09:23" },
  { who: "TTL BM", org: "bailleur", action: "lecture en cours (ANO)", date: "07 mai 10:14" },
  { who: "Système", org: "ugp", action: "auto-save brouillon", date: "07 mai 10:15" },
];

const ORG_LABEL: Record<Comment["org"], { l: string; tone: "blue" | "teal" | "purple" }> = {
  ugp: { l: "UGP", tone: "blue" },
  partenaire: { l: "Partenaire", tone: "teal" },
  bailleur: { l: "Bailleur", tone: "purple" },
};

export function WorkflowClient() {
  const { profile, config } = useProfile();
  const [tab, setTab] = useState<"timeline" | "comments" | "activity" | "docs">(
    "timeline",
  );

  const actorView =
    profile === "partenaire"
      ? "Vue Partenaire · ANIE"
      : profile === "ugp"
        ? "Vue UGP · arbitrage"
        : profile === "bailleur"
          ? "Vue Bailleur · ANO"
          : "Vue SBP";

  return (
    <div className={styles.wrap} style={{ ["--c-accent" as string]: config.accent }}>
      <header className={styles.head}>
        <div>
          <div className={styles.eyebrow}>
            <Tag tone="teal" size="sm">Multi-acteurs</Tag>
            <span className={styles.refMono + " mono"}>WF-TDR-2026-019</span>
          </div>
          <h1 className={styles.title}>
            AMOA Plateforme nationale d&apos;identité numérique
          </h1>
          <p className={styles.subtitle}>
            Origine : <strong>ANIE · Partenaire</strong> → UGP → BM ·
            Composante <strong>C2</strong> · Budget estimé 185 k USD
          </p>
        </div>
        <div className={styles.headRight}>
          <span className={styles.eyebrow}>{actorView}</span>
          <div className={styles.actions}>
            <Button variant="secondary" size="md">
              Exporter PDF
            </Button>
            <Button variant="primary">
              {profile === "ugp"
                ? "Valider l'arbitrage"
                : profile === "partenaire"
                  ? "Mettre à jour"
                  : profile === "bailleur"
                    ? "Émettre ANO"
                    : "Suivre"}
            </Button>
          </div>
        </div>
      </header>

      {/* Timeline 6 étapes */}
      <section className={styles.timelineCard}>
        <ol className={styles.timeline}>
          {STAGES.map((s, i) => (
            <li
              key={s.key}
              className={`${styles.tStage} ${
                s.status === "active" ? styles.tActive : ""
              } ${s.status === "done" ? styles.tDone : ""}`}
            >
              <span className={styles.tCircle}>
                {s.status === "done" ? (
                  <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M3 8l3 3 7-7" />
                  </svg>
                ) : (
                  i + 1
                )}
              </span>
              <div className={styles.tMeta}>
                <span className={styles.tLabel}>{s.label}</span>
                <span className={styles.tActor}>{s.actor}</span>
                {s.date && (
                  <span className={`${styles.tDate} mono`}>
                    {s.date}
                    {s.who ? ` · ${s.who}` : ""}
                  </span>
                )}
              </div>
            </li>
          ))}
        </ol>
      </section>

      {/* Body 2 colonnes : tabs + side */}
      <div className={styles.body}>
        <section className={styles.main}>
          <div className={styles.tabs}>
            {(
              [
                { k: "timeline", l: "Aperçu" },
                { k: "comments", l: `Commentaires (${COMMENTS.length})` },
                { k: "activity", l: `Activité (${ACTIVITY.length})` },
                { k: "docs", l: "Documents (8)" },
              ] as const
            ).map((t) => (
              <button
                key={t.k}
                onClick={() => setTab(t.k)}
                className={`${styles.tab} ${tab === t.k ? styles.tabActive : ""}`}
              >
                {t.l}
              </button>
            ))}
          </div>

          <div className={styles.tabBody}>
            {tab === "timeline" && (
              <div>
                <h3 className={styles.h3}>Synthèse de l&apos;arbitrage UGP</h3>
                <p style={{ fontSize: 13, lineHeight: 1.6, color: "var(--c-text-secondary)" }}>
                  L&apos;UGP a accusé réception du TDR et engagé l&apos;arbitrage le 23
                  avril. Profils-clés ajoutés par l&apos;ANIE le 24 avril, validés par
                  la coordination le 7 mai. Intégration au PPM Q3 prévue.
                </p>

                <div className={styles.kvList}>
                  <KV k="Origine" v="ANIE · Partenaire" />
                  <KV k="Type d'activité" v="Services consultants" />
                  <KV k="Composante / Activité PTBA" v="C2 · A2.3.1" />
                  <KV k="Budget barèmes UGP" v="185 k USD (auto-calc.)" />
                  <KV k="Méthode envisagée" v="SFQC 80/20" />
                  <KV k="Risque E&S" v="Substantiel" />
                  <KV k="Bailleur ANO" v="BM · IDA" />
                  <KV k="Hash registre" v="0xae42…d1f9" mono />
                </div>
              </div>
            )}

            {tab === "comments" && (
              <div className={styles.commentsList}>
                {COMMENTS.map((c, i) => (
                  <div
                    key={i}
                    className={`${styles.comment} ${
                      c.org === "partenaire" ? styles.cPart : ""
                    } ${c.org === "ugp" ? styles.cUgp : ""}`}
                  >
                    <div className={styles.commentHead}>
                      <span className={styles.commentWho}>{c.who}</span>
                      <Tag tone={ORG_LABEL[c.org].tone} size="sm">
                        {ORG_LABEL[c.org].l}
                      </Tag>
                      <span className={`${styles.commentDate} mono`}>{c.date}</span>
                      {c.anchor && (
                        <span className={styles.commentAnchor}>↳ {c.anchor}</span>
                      )}
                    </div>
                    <p className={styles.commentText}>{c.text}</p>
                  </div>
                ))}
                <div className={styles.commentNew}>
                  <span className={styles.label}>Ajouter un commentaire</span>
                  <textarea placeholder="Votre commentaire (visible UGP + Partenaire)…" />
                  <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
                    <Button variant="ghost" size="sm">Annuler</Button>
                    <Button variant="primary" size="sm">Publier</Button>
                  </div>
                </div>
              </div>
            )}

            {tab === "activity" && (
              <div className={styles.activityList}>
                {ACTIVITY.map((a, i) => (
                  <div key={i} className={styles.actRow}>
                    <span
                      className={styles.actDot}
                      style={{
                        background:
                          a.org === "ugp"
                            ? "var(--c-blue-60)"
                            : a.org === "partenaire"
                              ? "var(--c-teal-60)"
                              : "var(--c-purple-60)",
                      }}
                    />
                    <span className={styles.actWho}>{a.who}</span>
                    <span className={styles.actAction}>{a.action}</span>
                    <span className={`${styles.actDate} mono`}>{a.date}</span>
                  </div>
                ))}
              </div>
            )}

            {tab === "docs" && (
              <div className={styles.docsGrid}>
                {[
                  { t: "TDR_v1.docx", s: "rédaction ANIE · 12 avr.", o: "partenaire" as const },
                  { t: "Note_methodologique.pdf", s: "annexe technique", o: "partenaire" as const },
                  { t: "Bareme_UGP.xlsx", s: "barème honoraires", o: "ugp" as const },
                  { t: "Profils_cles_v2.docx", s: "5 CV synthétiques", o: "partenaire" as const },
                  { t: "Avis_arbitrage_UGP.pdf", s: "validation Coord.", o: "ugp" as const },
                  { t: "Memo_PPM_Q3.pdf", s: "intégration PPM", o: "ugp" as const },
                  { t: "Lettre_demande_ANO.pdf", s: "transmission BM", o: "ugp" as const },
                  { t: "Hash_chaine_traçabilité.txt", s: "registre immuable", o: "ugp" as const },
                ].map((d) => (
                  <div key={d.t} className={styles.docTile}>
                    <span className={styles.docIco}>
                      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4">
                        <path d="M3 2h7l3 3v9H3z" />
                        <path d="M10 2v3h3" />
                      </svg>
                    </span>
                    <div>
                      <div className={styles.docName}>{d.t}</div>
                      <div className={styles.docSub}>{d.s}</div>
                    </div>
                    <Tag tone={ORG_LABEL[d.o].tone} size="sm">
                      {ORG_LABEL[d.o].l}
                    </Tag>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>

        <aside className={styles.side}>
          <div className={styles.sideCard}>
            <div className={styles.sideTitle}>Acteurs · 6 sur 3 organisations</div>
            <ul className={styles.actorsList}>
              <Actor name="M. Kabongo" role="Coord. ANIE" org="partenaire" />
              <Actor name="A. Mukasa" role="Spé E&S ANIE" org="partenaire" />
              <Actor name="S. Mbuyi" role="RPM UGP" org="ugp" />
              <Actor name="P. Kayembe" role="Coord. UGP" org="ugp" />
              <Actor name="J. Bisimwa" role="Spé E&S UGP" org="ugp" />
              <Actor name="L. Walker" role="TTL BM" org="bailleur" />
            </ul>
          </div>

          <div className={styles.sideCard}>
            <div className={styles.sideTitle}>Workflow · règles</div>
            <ul className={styles.rulesList}>
              <li>UGP arbitre l&apos;intégration PPM avant ANO bailleur</li>
              <li>Partenaire peut éditer jusqu&apos;à intégration PPM</li>
              <li>Bailleur n&apos;édite jamais (ANO uniquement)</li>
              <li>Audit trail registre immuable (hash chaîne)</li>
              <li>EAS-HS confidentiel via canal MGP séparé</li>
            </ul>
          </div>
        </aside>
      </div>
    </div>
  );
}

function KV({ k, v, mono }: { k: string; v: string; mono?: boolean }) {
  return (
    <div className={styles.kv}>
      <span>{k}</span>
      <strong className={mono ? "mono" : ""}>{v}</strong>
    </div>
  );
}

function Actor({
  name,
  role,
  org,
}: {
  name: string;
  role: string;
  org: "partenaire" | "ugp" | "bailleur";
}) {
  return (
    <li>
      <span
        className={styles.actorAva}
        style={{
          background:
            org === "ugp"
              ? "var(--c-blue-60)"
              : org === "partenaire"
                ? "var(--c-teal-60)"
                : "var(--c-purple-60)",
        }}
      >
        {name
          .split(/\s+/)
          .map((w) => w[0])
          .slice(0, 2)
          .join("")}
      </span>
      <div>
        <div style={{ fontSize: 13 }}>{name}</div>
        <div style={{ fontSize: 11, color: "var(--c-text-helper)" }}>{role}</div>
      </div>
    </li>
  );
}
