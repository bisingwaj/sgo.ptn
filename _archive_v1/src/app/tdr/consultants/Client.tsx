"use client";

import { Wizard, type WizardStep } from "@/components/wizard/Wizard";
import { Tag } from "@/components/ui/Tag";
import f from "@/components/wizard/wizard-fields.module.css";

const STEPS: WizardStep[] = [
  {
    num: "01",
    label: "Cadrage & justification",
    sub: "Référentiel projet · composante · ligne PTBA",
    visibleFor: ["ugp", "partenaire", "sbp"],
    render: (ctx) => (
      <div className={f.section}>
        <div className={f.fieldGrid + " " + f.cols2}>
          <Field label="Intitulé du marché/Activité" value="AMOA Plateforme nationale d'identité numérique" />
          <Field label="Composante" value="C2 · Fondations Numériques" select />
          <Field label="Ligne PTBA" value="A2.3.1" />
          <Field label="Activité PTBA" value="Identité numérique nationale" />
          <Field label="Méthode envisagée" value="SFQC · Sélection fondée Qualité-Coût" select />
          <Field label="Bailleur ANO" value={ctx.profile === "partenaire" ? "À déterminer par UGP" : "BM · IDA"} select disabled={ctx.profile === "partenaire"} />
        </div>
        <Textarea
          label="Justification & contexte"
          value="Le PTN-RDC vise à doter la République Démocratique du Congo d'une plateforme d'identité numérique inclusive, conforme aux standards ICAO et alignée sur les principes ID4D de la Banque mondiale. La présente AMOA accompagnera l'ANIE dans la conception et la mise en œuvre. Risque E&S : Substantiel."
          help="Rattachez le besoin à un objectif de la composante. Citez les standards et les jalons MEP applicables."
        />
        {ctx.profile === "partenaire" && (
          <div className={f.aiCard}>
            <div className={f.aiCardHead}>
              <span>Espace partie prenante · ANIE</span>
            </div>
            Vous proposez ce TDR à l&apos;UGP. Les sections de passation détaillées seront complétées par l&apos;UGP après arbitrage.
          </div>
        )}
      </div>
    ),
  },
  {
    num: "02",
    label: "Méthodologie & livrables",
    sub: "Approche · jalons · critères d'acceptation",
    visibleFor: ["ugp", "partenaire", "sbp"],
    render: () => (
      <div className={f.section}>
        <div className={f.sectionTitle}>Livrables avec critères d&apos;acceptation</div>
        <table className={f.tableMatrix}>
          <thead>
            <tr>
              <th style={{ width: 40 }}>#</th>
              <th>Livrable</th>
              <th style={{ width: 220 }}>Critère d&apos;acceptation opposable</th>
              <th style={{ width: 100 }}>Échéance</th>
            </tr>
          </thead>
          <tbody>
            {[
              ["L1", "Note de cadrage méthodologique", "Validation comité · 7 j", "S+2"],
              ["L2", "Rapport diagnostic et benchmark international", "≥ 30 pages · 5 cas pays", "S+6"],
              ["L3", "Architecture cible & schéma directeur", "Conforme ICAO 9303", "S+12"],
              ["L4", "Cahier des charges fonctionnel", "Validé ANIE + UGP", "S+18"],
              ["L5", "Plan de mise en œuvre & gouvernance", "Roadmap 36 mois", "S+22"],
              ["L6", "Rapport final & transfert de compétences", "30 % staff formés", "S+24"],
            ].map(([n, t, c, s]) => (
              <tr key={n}>
                <td className="mono">{n}</td>
                <td>{t}</td>
                <td>{c}</td>
                <td className="mono">{s}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    ),
  },
  {
    num: "03",
    label: "SFQC & profils-clés",
    sub: "Grille pondérée · 100 points",
    visibleFor: ["ugp", "partenaire"],
    render: () => (
      <div className={f.section}>
        <div className={f.sectionTitle}>Grille SFQC · 80 % qualité / 20 % coût</div>
        <table className={`${f.tableMatrix} ${f.criteriaTable}`}>
          <thead>
            <tr>
              <th>Critère</th>
              <th style={{ width: 80 }}>Pondération</th>
              <th>Sous-critères</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Expérience générale du Consultant</td>
              <td className="mono">10</td>
              <td>Projets similaires (≥ 5 réf. ID numérique)</td>
            </tr>
            <tr>
              <td>Adéquation de la méthodologie</td>
              <td className="mono">30</td>
              <td>Compréhension TDR · approche · plan de travail</td>
            </tr>
            <tr>
              <td>Qualifications & profils-clés</td>
              <td className="mono">40</td>
              <td>Chef de mission, archi ID, juriste, expert E&amp;S</td>
            </tr>
            <tr>
              <td>Transfert de connaissances</td>
              <td className="mono">10</td>
              <td>Formations, mentorat, livrables transférables</td>
            </tr>
            <tr className={f.criteriaTotal}>
              <td>Sous-total qualité</td>
              <td className="mono">90</td>
              <td>Note technique minimale : 75 / 90</td>
            </tr>
            <tr className={f.criteriaTotal}>
              <td>Coût</td>
              <td className="mono">10</td>
              <td>Évalué après ouverture des plis financiers</td>
            </tr>
          </tbody>
        </table>

        <div className={f.sectionTitle}>5 profils-clés évalués nominativement</div>
        <div className={f.fieldGrid} style={{ gap: 8 }}>
          {[
            ["Chef de mission · ID numérique", "Master · 12 ans · 5 projets"],
            ["Architecte solution biométrique", "ICAO 9303 · ABIS"],
            ["Juriste protection données", "RGPD + cadre RDC"],
            ["Expert E&S · sauvegardes BM", "ESF / EAS-HS"],
            ["Expert formation & transfert", "≥ 3 missions similaires"],
          ].map(([n, q]) => (
            <div key={n} style={{ display: "flex", justifyContent: "space-between", padding: "8px 12px", background: "var(--c-bg)", fontSize: 12 }}>
              <strong style={{ fontWeight: 500 }}>{n}</strong>
              <span style={{ color: "var(--c-text-helper)" }}>{q}</span>
            </div>
          ))}
        </div>
      </div>
    ),
  },
  {
    num: "04",
    label: "KYC / COI & Conformité",
    sub: "Déclarations · sauvegardes · code de conduite",
    visibleFor: ["ugp", "partenaire"],
    render: () => (
      <div className={f.section}>
        <div className={f.sectionTitle}>Déclarations à exiger des soumissionnaires</div>
        {[
          { t: "KYC entreprise & bénéficiaires effectifs", d: "Statuts, n° ICA, attestation fiscale, organigramme actionnariat ≥ 25 %." },
          { t: "Déclaration de conflits d'intérêts (COI)", d: "Auto-déclaration nominative · revue par UGP avant ouverture." },
          { t: "Attestation de non-débarrement BM/AFD", d: "Vérification dans la base débarrement BM (Cross-Debarment)." },
          { t: "Code de conduite EAS-HS signé", d: "Engagement chaîne contractuelle · MGP confidentiel." },
          { t: "Plan E&S préliminaire si applicable", d: "Activités à risque : PGES initial requis." },
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
    num: "05",
    label: "Budget · calendrier · ANO",
    sub: "Soumission au cycle ANO bailleur",
    visibleFor: ["ugp", "partenaire", "sbp"],
    render: (ctx) => (
      <div className={f.section}>
        <div className={f.recapGrid}>
          <Recap k="Budget estimé" v="8,7 M USD" />
          <Recap k="Bailleur" v={ctx.profile === "partenaire" ? "À déterminer" : "BM · IDA"} />
          <Recap k="Durée mission" v="24 semaines" />
          <Recap k="Méthode" v="SFQC · 80/20" />
          <Recap k="Risque E&S" v="Substantiel" />
          <Recap k="Origine" v={ctx.profile === "ugp" ? "UGP" : ctx.profile === "partenaire" ? "ANIE (partenaire)" : "SBP"} />
        </div>

        <div className={f.aiCard}>
          <div className={f.aiCardHead}>
            <span>Synthèse IA pré-soumission</span>
            <Tag tone="purple" size="sm">Carbon</Tag>
          </div>
          TDR conforme aux exigences MEP § 5.2 et standards BM. La grille SFQC 80/20 est
          appropriée pour ce profil consultatif. Revue COI à finaliser avant
          ouverture des plis. Aucune anomalie détectée par les vérifications
          automatiques.
        </div>

        <div className={f.docList}>
          {[
            { t: "TDR_Identite_Numerique_v2.pdf", s: "auto-généré · 24 pages" },
            { t: "Grille_SFQC_AMOA.xlsx", s: "5 critères · 100 pts" },
            { t: "Decl_KYC_COI_template.docx", s: "annexe officielle BM" },
          ].map((d) => (
            <div key={d.t} className={f.docItem}>
              <span style={{ width: 24, height: 24, background: "var(--c-bg-2)", display: "grid", placeItems: "center" }}>
                <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4">
                  <path d="M3 2h7l3 3v9H3z" />
                  <path d="M10 2v3h3" />
                </svg>
              </span>
              <div>
                <strong>{d.t}</strong>
                <span>{d.s}</span>
              </div>
              <span className="mono" style={{ fontSize: 11, color: "var(--c-blue-60)" }}>
                Télécharger
              </span>
            </div>
          ))}
        </div>
      </div>
    ),
  },
];

export function ConsultantsWizardClient() {
  return (
    <Wizard
      title="TDR · AMOA Plateforme nationale d'identité numérique"
      subtitle="Services consultants · firmes (SFQC) · profil PTN-RDC"
      reference="TDR-2026-019 · v2"
      steps={STEPS}
      finishLabel="Soumettre pour ANO BM"
      helpRail={(ctx) => (
        <>
          <div className={f.aiCard}>
            <div className={f.aiCardHead}>
              <span>Aide IA · Étape {ctx.step + 1}</span>
              <Tag tone="purple" size="sm">Carbon</Tag>
            </div>
            {ctx.step === 0 &&
              "Reliez le besoin à la composante C2 · Fondations Numériques. La méthode SFQC est cohérente pour les services consultants à enjeu qualité élevé."}
            {ctx.step === 1 &&
              "Chaque livrable doit avoir un critère d'acceptation opposable au contractant (volume, validation, métrique)."}
            {ctx.step === 2 &&
              "La grille 80/20 (qualité/coût) est recommandée pour les missions à fort enjeu d'expertise. Note technique min. 75/90."}
            {ctx.step === 3 &&
              "Pensez au cross-debarment BM pour vérifier l'éligibilité. Le code de conduite EAS-HS est obligatoire."}
            {ctx.step === 4 &&
              "Le TDR sera transmis au TTL Banque mondiale après validation interne UGP. Délai ANO indicatif : 14 jours."}
          </div>

          <div>
            <div className={f.sectionTitle} style={{ borderBottom: 0, marginBottom: 8 }}>
              Contributeurs requis
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 6, fontSize: 12 }}>
              <Contrib who="Chargé passation UGP" status="signé" />
              <Contrib who="Spé E&S UGP" status="à signer" />
              <Contrib who="Juriste UGP" status="signé" />
              <Contrib who="Coordonnateur" status="à signer" />
            </div>
          </div>

          <div>
            <div className={f.sectionTitle} style={{ borderBottom: 0, marginBottom: 8 }}>
              Conformité MEP
            </div>
            <ul style={{ listStyle: "none", display: "flex", flexDirection: "column", gap: 6, fontSize: 11, color: "var(--c-text-secondary)" }}>
              <li>§ 5.2.3 Méthode SFQC</li>
              <li>§ 5.2.8 Conflits d&apos;intérêts</li>
              <li>§ 7.4 Code conduite EAS-HS</li>
            </ul>
          </div>
        </>
      )}
    />
  );
}

function Field({
  label,
  value,
  select,
  disabled,
}: {
  label: string;
  value: string;
  select?: boolean;
  disabled?: boolean;
}) {
  return (
    <div className={f.field}>
      <span className={f.label}>{label}</span>
      <span className={f.inputWrap}>
        {select ? (
          <select defaultValue={value} disabled={disabled}>
            <option>{value}</option>
          </select>
        ) : (
          <input defaultValue={value} disabled={disabled} />
        )}
      </span>
    </div>
  );
}

function Textarea({ label, value, help }: { label: string; value: string; help?: string }) {
  return (
    <div className={f.field}>
      <span className={f.label}>{label}</span>
      <span className={f.inputWrap}>
        <textarea defaultValue={value} rows={4} />
      </span>
      {help && <span className={f.help}>{help}</span>}
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
