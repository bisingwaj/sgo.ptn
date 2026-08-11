"use client";

import { Wizard, type WizardStep } from "@/components/wizard/Wizard";
import { Tag } from "@/components/ui/Tag";
import f from "@/components/wizard/wizard-fields.module.css";

const STEPS: WizardStep[] = [
  {
    num: "01",
    label: "Cadrage projet",
    sub: "Maîtrise d'ouvrage · ligne PTBA · normes",
    visibleFor: ["ugp", "partenaire"],
    render: () => (
      <div className={f.section}>
        <div className={f.fieldGrid + " " + f.cols2}>
          <Field label="Intitulé travaux" value="Backbone fibre optique Goma-Bukavu (180 km)" />
          <Field label="Composante" value="C1 · Accès & Inclusion numériques" select />
          <Field label="Ligne PTBA" value="A1.4.2" />
          <Field label="Méthode passation" value="AOI · Appel d'Offres International" select />
          <Field label="Bailleur ANO" value="BM · IDA" select />
          <Field label="Risque E&S" value="Substantiel" select />
        </div>
        <Textarea
          label="Localisation & contexte technique"
          value="Tracé Goma → Sake → Kavumu → Bukavu. Zones partiellement minées · gestion E&S sensible. Normes ITU-T G.652D / G.657A2 pour fibre. Conformité PGES requise (cours d'eau, communautés Banyamulenge)."
        />
      </div>
    ),
  },
  {
    num: "02",
    label: "Besoins & spécifications",
    sub: "Cahier des clauses techniques",
    visibleFor: ["ugp", "partenaire"],
    render: () => (
      <div className={f.section}>
        <div className={f.sectionTitle}>Spécifications techniques opposables</div>
        <table className={f.tableMatrix}>
          <thead>
            <tr>
              <th>Lot</th>
              <th>Spécification</th>
              <th>Norme</th>
              <th>Quantité</th>
            </tr>
          </thead>
          <tbody>
            {[
              ["L1", "Fibre optique monomode aérienne", "ITU-T G.652D", "180 km"],
              ["L2", "Pylônes & supports", "EN 50341", "240 unités"],
              ["L3", "Génie civil tranchées", "DTU 12.1", "82 km"],
              ["L4", "Boîtiers de jonction étanches", "IP68 · ICOA", "120 unités"],
              ["L5", "Équipements DWDM extrémités", "ITU-T G.694.1", "2 sites"],
            ].map(([l, s, n, q]) => (
              <tr key={l}>
                <td className="mono">{l}</td>
                <td>{s}</td>
                <td>{n}</td>
                <td className="mono">{q}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    ),
  },
  {
    num: "03",
    label: "BPU · Métré · PGES",
    sub: "Bordereau prix unitaires · études géotech · plan E&S",
    visibleFor: ["ugp", "partenaire"],
    render: () => (
      <div className={f.section}>
        <div className={f.sectionTitle}>Bordereau de Prix Unitaires (extrait)</div>
        <table className={f.tableMatrix}>
          <thead>
            <tr>
              <th>Code BPU</th>
              <th>Désignation</th>
              <th>Unité</th>
              <th>Quantité estimée</th>
            </tr>
          </thead>
          <tbody>
            {[
              ["BPU-01", "Fourniture & pose fibre aérienne", "ml", "180 000"],
              ["BPU-02", "Fouille tranchée 0,8 × 1,2 m terrain ordinaire", "ml", "60 000"],
              ["BPU-03", "Fouille tranchée terrain rocheux", "ml", "22 000"],
              ["BPU-04", "Pylône acier galvanisé 12 m", "u", "240"],
              ["BPU-05", "Boîtier de jonction étanche IP68", "u", "120"],
            ].map((r) => (
              <tr key={r[0]}>
                <td className="mono">{r[0]}</td>
                <td>{r[1]}</td>
                <td>{r[2]}</td>
                <td className="mono">{r[3]}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className={f.sectionTitle}>Plan de Gestion Environnementale & Sociale</div>
        {[
          { t: "Étude géotechnique préalable", d: "8 sondages, profil sol/eau, cartographie risques, EIES." },
          { t: "Plan d'engagement parties prenantes", d: "Communautés Banyamulenge, autorités locales, cadre national démining." },
          { t: "Plan de réinstallation involontaire", d: "Cadre RDC + ESF/ESS5 BM. Aucune réinstallation > 50 m corridor." },
          { t: "Mesures EAS-HS chantier", d: "Code de conduite, MGP confidentiel, formation HSE obligatoire." },
        ].map((it) => (
          <label key={it.t} className={f.checkRow}>
            <input type="checkbox" defaultChecked />
            <div>
              <strong>{it.t}</strong>
              {it.d}
            </div>
          </label>
        ))}
      </div>
    ),
  },
  {
    num: "04",
    label: "Calendrier & garanties",
    sub: "Jalons · retenue · pénalités",
    visibleFor: ["ugp", "partenaire"],
    render: () => (
      <div className={f.section}>
        <div className={f.fieldGrid + " " + f.cols2}>
          <Field label="Délai d'exécution" value="14 mois (calendaires)" />
          <Field label="Démarrage prévisionnel" value="01 octobre 2026" />
          <Field label="Garantie de bonne exécution" value="10 % du marché" />
          <Field label="Retenue de garantie" value="5 % · libération à 12 mois après réception" />
          <Field label="Pénalités de retard" value="1 ‰ par jour calendaire · plafond 10 %" />
          <Field label="Garantie travaux" value="24 mois après réception définitive" />
        </div>
        <div className={f.sectionTitle}>Jalons techniques</div>
        <table className={f.tableMatrix}>
          <thead>
            <tr>
              <th>Jalon</th>
              <th>Livrable</th>
              <th>Pourcentage</th>
              <th>Mois</th>
            </tr>
          </thead>
          <tbody>
            {[
              ["J1", "Mobilisation chantier · études détaillées", "10 %", "M+1"],
              ["J2", "Génie civil tranchées 50 %", "30 %", "M+5"],
              ["J3", "Pose fibre aérienne complète", "60 %", "M+10"],
              ["J4", "Tests DWDM bout en bout", "85 %", "M+13"],
              ["J5", "Réception provisoire", "100 %", "M+14"],
            ].map((r) => (
              <tr key={r[0]}>
                <td className="mono">{r[0]}</td>
                <td>{r[1]}</td>
                <td className="mono">{r[2]}</td>
                <td className="mono">{r[3]}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    ),
  },
  {
    num: "05",
    label: "Soumission ANO",
    sub: "Recap · synthèse IA · transmission BM",
    visibleFor: ["ugp", "partenaire"],
    render: () => (
      <div className={f.section}>
        <div className={f.recapGrid}>
          <Recap k="Marché" v="Backbone Goma-Bukavu 180 km" />
          <Recap k="Composante" v="C1 · Accès" />
          <Recap k="Méthode" v="AOI" />
          <Recap k="Bailleur" v="BM · IDA" />
          <Recap k="Budget estimé" v="12,4 M USD" />
          <Recap k="Risque E&S" v="Substantiel" />
        </div>
        <div className={f.aiCard}>
          <div className={f.aiCardHead}>
            <span>Synthèse IA pré-soumission</span>
            <Tag tone="purple" size="sm">Carbon</Tag>
          </div>
          TDR conforme aux exigences MEP & sauvegardes BM. PGES initial validé. EIES en
          cours par bureau Hassan Consult. Aucun débarrement détecté sur les bureaux
          d&apos;études candidats. Délai ANO indicatif : 21 jours (corridor sensible
          minage).
        </div>
      </div>
    ),
  },
];

export function TravauxWizardClient() {
  return (
    <Wizard
      title="TDR · Backbone fibre Goma-Bukavu"
      subtitle="Travaux · génie civil & réseau · AOI"
      reference="TDR-2026-021"
      steps={STEPS}
      finishLabel="Soumettre pour ANO BM"
      helpRail={(ctx) => (
        <>
          <div className={f.aiCard}>
            <div className={f.aiCardHead}>
              <span>Aide IA · Étape {ctx.step + 1}</span>
            </div>
            {ctx.step === 0 && "Tracé sensible — vérifier zones minées + cadre RDC démining (UNMACC)."}
            {ctx.step === 1 && "Pour 180 km de fibre, prévoir 5 à 8 lots techniques distincts pour permettre la concurrence."}
            {ctx.step === 2 && "Le BPU doit couvrir les variations de terrain (rocheux/ordinaire). EIES obligatoire avant DAO."}
            {ctx.step === 3 && "Garantie travaux 24 mois standard BM. Retenue 5 % libérée après réception définitive."}
            {ctx.step === 4 && "Pré-revue UGP requise avant transmission TTL BM. Délai ANO indicatif 21 j."}
          </div>
          <div>
            <div className={f.sectionTitle} style={{ borderBottom: 0, marginBottom: 8 }}>
              Intervenants spécifiques
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 6, fontSize: 12 }}>
              <Contrib who="Spé E&S UGP" status="signé" />
              <Contrib who="Spé VBG/EAS UGP" status="signé" />
              <Contrib who="Bureau géotech" status="à signer" />
              <Contrib who="Maîtrise d'œuvre" status="à signer" />
            </div>
          </div>
        </>
      )}
    />
  );
}

function Field({ label, value, select }: { label: string; value: string; select?: boolean }) {
  return (
    <div className={f.field}>
      <span className={f.label}>{label}</span>
      <span className={f.inputWrap}>
        {select ? <select defaultValue={value}><option>{value}</option></select> : <input defaultValue={value} />}
      </span>
    </div>
  );
}

function Textarea({ label, value }: { label: string; value: string }) {
  return (
    <div className={f.field}>
      <span className={f.label}>{label}</span>
      <span className={f.inputWrap}>
        <textarea defaultValue={value} rows={4} />
      </span>
    </div>
  );
}

function Recap({ k, v }: { k: string; v: string }) {
  return (
    <div className={f.recapTile}>
      <span>{k}</span>
      <strong>{v}</strong>
    </div>
  );
}

function Contrib({ who, status }: { who: string; status: string }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderBottom: "1px solid var(--c-border)" }}>
      <span>{who}</span>
      <span
        className="mono"
        style={{
          fontSize: 11,
          color: status === "signé" ? "var(--c-green-50)" : "var(--c-yellow-30)",
        }}
      >
        {status === "signé" ? "✓ signé" : "⌛ attente"}
      </span>
    </div>
  );
}
