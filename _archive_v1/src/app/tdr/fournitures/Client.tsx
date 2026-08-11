"use client";

import { Wizard, type WizardStep } from "@/components/wizard/Wizard";
import { Tag } from "@/components/ui/Tag";
import f from "@/components/wizard/wizard-fields.module.css";

const STEPS: WizardStep[] = [
  {
    num: "01",
    label: "Cadrage besoin",
    sub: "Quantités, sites, conditions de livraison",
    visibleFor: ["ugp", "partenaire", "sbp"],
    render: () => (
      <div className={f.section}>
        <div className={f.fieldGrid + " " + f.cols2}>
          <Field label="Intitulé fourniture" value="Stations d'enrôlement biométrique mobiles (lot 200 unités)" />
          <Field label="Composante" value="C2 · Fondations Numériques" select />
          <Field label="Méthode" value="AON · Appel d'Offres National" select />
          <Field label="Bailleur" value="BM · IDA" select />
          <Field label="Sites de livraison" value="26 chefs-lieux provinciaux RDC" />
          <Field label="Incoterm" value="DDP · Kinshasa & 25 chefs-lieux" select />
        </div>
        <Textarea
          label="Contexte & justification"
          value="Déploiement de 200 stations d'enrôlement biométrique mobiles pour la modernisation de l'identité numérique. Conformité ICAO 9303, ANSI/NIST-ITL 1-2011 (empreintes), ISO 19794-5 (faciale). Distribution équilibrée sur les 26 provinces selon population."
        />
      </div>
    ),
  },
  {
    num: "02",
    label: "Spécifications techniques",
    sub: "BoQ · normes ICAO/ANSI/ISO",
    visibleFor: ["ugp", "partenaire", "sbp"],
    render: () => (
      <div className={f.section}>
        <div className={f.sectionTitle}>Bill of Quantities (BoQ)</div>
        <table className={f.tableMatrix}>
          <thead>
            <tr>
              <th>Item</th>
              <th>Désignation</th>
              <th>Norme</th>
              <th>Quantité</th>
            </tr>
          </thead>
          <tbody>
            {[
              ["F1", "Capteur empreintes 10 doigts", "ANSI/NIST-ITL 1-2011", "200"],
              ["F2", "Caméra biométrique faciale", "ISO 19794-5", "200"],
              ["F3", "Lecteur passeport ICAO 9303", "ICAO 9303", "200"],
              ["F4", "Tablette durcie IP65", "MIL-STD-810G", "200"],
              ["F5", "Imprimante badge instant", "ISO 14443", "200"],
              ["F6", "Batterie longue durée 12h + chargeur", "CE / IEC 62133", "400"],
              ["F7", "Mallette de transport rigide", "—", "200"],
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
      </div>
    ),
  },
  {
    num: "03",
    label: "Garantie · SAV · livraison",
    sub: "Conditions contractuelles et logistiques",
    visibleFor: ["ugp", "partenaire", "sbp"],
    render: () => (
      <div className={f.section}>
        <div className={f.fieldGrid + " " + f.cols2}>
          <Field label="Garantie constructeur" value="36 mois · pièces et main d'œuvre" />
          <Field label="Délai d'intervention SAV" value="48h · Kinshasa / 5 j · provinces" />
          <Field label="Stock pièces détachées" value="10 % du parc · 24 mois" />
          <Field label="Formation utilisateurs" value="Inclus · 5 j × 2 sessions" />
          <Field label="Délai livraison" value="120 j calendaires depuis signature" />
          <Field label="Réception" value="Tests fonctionnels + acceptance ICAO" />
        </div>
        <div className={f.sectionTitle}>Conditions logistiques</div>
        {[
          { t: "Transport groupé Kinshasa puis distribution provinciale", d: "Le fournisseur assume jusqu'à DDP chef-lieu provincial." },
          { t: "Conformité douanière & exonérations BM/AFD", d: "L'UGP fournit lettre d'exonération MEP-2026-XX." },
          { t: "Test d'acceptance avant paiement", d: "Comité réception UGP + ANIE · 30 lots aléatoires." },
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
    label: "Critères d'évaluation",
    sub: "Méthode AON · qualité-prix",
    visibleFor: ["ugp", "partenaire"],
    render: () => (
      <div className={f.section}>
        <div className={f.sectionTitle}>Critères d&apos;évaluation</div>
        <table className={f.tableMatrix}>
          <thead>
            <tr>
              <th>Critère</th>
              <th>Pondération</th>
              <th>Mode</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Conformité technique aux specs</td>
              <td className="mono">Éliminatoire</td>
              <td>Tous lots conformes</td>
            </tr>
            <tr>
              <td>Prix offert</td>
              <td className="mono">70 %</td>
              <td>Plus bas conforme</td>
            </tr>
            <tr>
              <td>Garantie & SAV (qualité)</td>
              <td className="mono">15 %</td>
              <td>≥ 36 mois requis</td>
            </tr>
            <tr>
              <td>Délai de livraison</td>
              <td className="mono">10 %</td>
              <td>≤ 120 j</td>
            </tr>
            <tr>
              <td>Références & expérience similaire</td>
              <td className="mono">5 %</td>
              <td>≥ 2 réf. ICAO</td>
            </tr>
          </tbody>
        </table>
      </div>
    ),
  },
  {
    num: "05",
    label: "Soumission ANO",
    sub: "Recap final & transmission",
    visibleFor: ["ugp", "partenaire", "sbp"],
    render: () => (
      <div className={f.section}>
        <div className={f.recapGrid}>
          <Recap k="Marché" v="200 stations enrôlement biométrique" />
          <Recap k="Composante" v="C2 · Fondations" />
          <Recap k="Méthode" v="AON · qualité-prix" />
          <Recap k="Bailleur" v="BM · IDA" />
          <Recap k="Budget estimé" v="5,8 M USD" />
          <Recap k="Délai livraison" v="120 j calendaires" />
        </div>
        <div className={f.aiCard}>
          <div className={f.aiCardHead}>
            <span>Synthèse IA pré-soumission</span>
            <Tag tone="purple" size="sm">Carbon</Tag>
          </div>
          Spécifications cohérentes avec les standards ICAO et ID4D BM. Prévoir
          formation utilisateurs avant déploiement. Un seuil minimum de 2 fabricants
          internationaux assure la concurrence. Délai ANO indicatif : 12 jours.
        </div>
      </div>
    ),
  },
];

export function FournituresWizardClient() {
  return (
    <Wizard
      title="TDR · Stations d'enrôlement biométrique mobiles"
      subtitle="Fournitures & biens · AON · 200 unités"
      reference="TDR-2026-061"
      steps={STEPS}
      helpRail={(ctx) => (
        <div className={f.aiCard}>
          <div className={f.aiCardHead}>
            <span>Aide IA · Étape {ctx.step + 1}</span>
          </div>
          {ctx.step === 0 && "Vérifier la disponibilité des incoterms DDP avec les fournisseurs internationaux."}
          {ctx.step === 1 && "Ne pas mélanger fourniture matérielle et logiciel d'enrôlement (deux marchés distincts recommandés)."}
          {ctx.step === 2 && "La maintenance préventive doit être contractuelle pour les zones distantes."}
          {ctx.step === 3 && "Privilégier le moins-disant conforme pour les fournitures standard."}
          {ctx.step === 4 && "TDR transmis au TTL BM. Délai ANO 12 j. Prévoir DAO dans la foulée."}
        </div>
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
