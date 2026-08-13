"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  ArrowRight,
  Building,
  CheckmarkFilled,
  Currency,
  Education,
  Globe,
  Locked,
  Microphone,
  Network_3,
  PartlyCloudy,
  ShoppingBag,
  ToolBox,
  TrainHeart,
  UserMultiple,
  WatsonHealthMagnify,
  WorkspaceImport,
} from "@carbon/icons-react";
import styles from "./tdr.module.scss";

/**
 * Origines possibles. L'origine est implicite et déduite du compte connecté :
 * - MDA / Ministère bénéficiaire → "partner"
 * - UGP-PTN → "ugp"
 * - Bailleur → "donor"
 * - Bénéficiaire SBP → "sbp"
 * Elle ne se choisit plus à l'écran (le compte le sait déjà).
 */
type OriginKey = "ugp" | "partner" | "donor" | "sbp";

const ORIGIN_LABEL: Record<OriginKey, { name: string; entity: string; tone: "blue" | "teal" }> = {
  ugp: { name: "UGP-PTN", entity: "Unité de gestion du projet", tone: "blue" },
  partner: { name: "Partie prenante", entity: "Ministère du Numérique", tone: "teal" },
  donor: { name: "Bailleur co-financeur", entity: "Banque mondiale / AFD", tone: "blue" },
  sbp: { name: "Bénéficiaire SBP", entity: "Sous-projet PTN", tone: "teal" },
};

const ORIGIN_ICON: Record<OriginKey, React.ComponentType<{ size?: number; "aria-hidden"?: boolean }>> = {
  ugp: Building,
  partner: UserMultiple,
  donor: Globe,
  sbp: WorkspaceImport,
};

interface TypeDef {
  code: string;
  slug: string;
  name: string;
  icoClass: string;
  icon: React.ComponentType<{ size?: number; "aria-hidden"?: boolean }>;
  family: 1 | 2 | 3;
  meta: { label: string; tone?: "warn" | "ok" | "partner" | "ugp" }[];
  defaultMethod?: string;
  /** Type réservé à l'UGP (ex. travaux > 1 M USD) */
  ugpOnly?: boolean;
}

const TYPES: TypeDef[] = [
  // ① Passation classique
  {
    code: "TDR-TX",
    slug: "travaux",
    name: "Travaux",
    icoClass: styles.icoTravaux,
    icon: ToolBox,
    family: 1,
    meta: [{ label: "5 ét." }, { label: "PGES", tone: "warn" }, { label: "UGP", tone: "ugp" }],
    ugpOnly: true,
  },
  {
    code: "TDR-FN",
    slug: "fournitures",
    name: "Fournitures",
    icoClass: styles.icoFourn,
    icon: ShoppingBag,
    family: 1,
    meta: [{ label: "5 ét." }, { label: "BoQ" }, { label: "SAV" }],
  },
  {
    code: "TDR-CS",
    slug: "services-consultants",
    name: "Services consultants",
    icoClass: styles.icoCons,
    icon: UserMultiple,
    family: 1,
    defaultMethod: "Méthode SFQC par défaut",
    meta: [{ label: "5 ét." }, { label: "SFQC 80/20" }, { label: "CV nom." }],
  },
  {
    code: "TDR-SN",
    slug: "services-non-consultants",
    name: "Services non-consultants",
    icoClass: styles.icoNoncons,
    icon: TrainHeart,
    family: 1,
    meta: [{ label: "5 ét." }, { label: "SLA + KPI" }],
  },

  // ② Activités opérationnelles
  {
    code: "TDR-AT",
    slug: "atelier",
    name: "Atelier / séminaire",
    icoClass: styles.icoAtelier,
    icon: Microphone,
    family: 2,
    meta: [{ label: "5 ét." }, { label: "Per diem" }, { label: "Partenaire OK", tone: "partner" }],
  },
  {
    code: "TDR-FO",
    slug: "formation",
    name: "Formation / capacités",
    icoClass: styles.icoFormation,
    icon: Education,
    family: 2,
    meta: [{ label: "5 ét." }, { label: "Curriculum" }, { label: "Partenaire OK", tone: "partner" }],
  },
  {
    code: "TDR-MI",
    slug: "mission",
    name: "Mission / événement",
    icoClass: styles.icoMission,
    icon: PartlyCloudy,
    family: 2,
    meta: [{ label: "4 ét." }, { label: "DSA" }, { label: "Partenaire OK", tone: "partner" }],
  },
  {
    code: "TDR-ET",
    slug: "etude",
    name: "Étude / diagnostic",
    icoClass: styles.icoEtude,
    icon: WatsonHealthMagnify,
    family: 2,
    meta: [{ label: "5 ét." }, { label: "Méthodo" }, { label: "Partenaire OK", tone: "partner" }],
  },
  {
    code: "TDR-CO",
    slug: "communication",
    name: "Communication",
    icoClass: styles.icoCom,
    icon: Network_3,
    family: 2,
    meta: [{ label: "4 ét." }, { label: "Plan média" }, { label: "Partenaire OK", tone: "partner" }],
  },

  // ③ Subventions & contrôles
  {
    code: "TDR-SB",
    slug: "sbp",
    name: "Sous-projet / don SBP",
    icoClass: styles.icoSbp,
    icon: Currency,
    family: 3,
    meta: [{ label: "6 ét." }, { label: "Manuel SBP" }, { label: "Bénéf. SBP", tone: "partner" }],
  },
  {
    code: "TDR-AU",
    slug: "audit",
    name: "Audit / contrôle",
    icoClass: styles.icoAudit,
    icon: Locked,
    family: 3,
    meta: [{ label: "5 ét." }, { label: "ISA" }, { label: "UGP / IGF", tone: "ugp" }],
  },
];

const FAMILY_LABEL: Record<1 | 2 | 3, { num: string; name: string; rule: string }> = {
  1: { num: "①", name: "Passation classique", rule: "Règlement de Passation BM 2024 / Loi 18/019 RDC" },
  2: { num: "②", name: "Activités opérationnelles", rule: "Cadre Operating Costs / Trainings" },
  3: { num: "③", name: "Subventions & contrôles", rule: "Cadre SBP / Audit" },
};

interface TdrSelectorClientProps {
  /** Origine implicite déduite du compte connecté. Par défaut "partner" (MDA). */
  origin?: OriginKey;
}

export function TdrSelectorClient({ origin = "partner" }: TdrSelectorClientProps) {
  const router = useRouter();
  const [typeSlug, setTypeSlug] = useState<string | null>(null);

  const selectedType = typeSlug ? TYPES.find((t) => t.slug === typeSlug) ?? null : null;
  const ctx = ORIGIN_LABEL[origin];
  const CtxIco = ORIGIN_ICON[origin];

  const isTypeDisabled = (t: TypeDef): boolean => {
    return Boolean(t.ugpOnly) && origin !== "ugp";
  };

  const handleContinue = () => {
    if (!selectedType) return;
    // L'origine n'est plus transmise : elle est déduite de la session côté
    // serveur. La passer en paramètre d'URL permettait de la falsifier pour
    // atteindre un type réservé.
    router.push(`/tdr/nouveau?type=${selectedType.code}`);
  };

  const types1 = TYPES.filter((t) => t.family === 1);
  const types2 = TYPES.filter((t) => t.family === 2);
  const types3 = TYPES.filter((t) => t.family === 3);

  return (
    <div className={styles.wrap}>
      {/* Page header compact */}
      <div className={styles.ph}>
        <div className={styles.phLeft}>
          <div className={styles.stepTag}>Étape 1 / 2 · Création TDR</div>
          <h1 className={styles.title}>Quel type de TDR souhaitez-vous rédiger ?</h1>
          <p className={styles.desc}>
            Choisissez le type d&apos;activité. Le wizard s&apos;adaptera : champs spécifiques,
            contributeurs requis, conformité réglementaire, modèles disponibles.
          </p>
        </div>
      </div>

      {/* Context strip — origine implicite, non-modifiable */}
      <div className={styles.ctx}>
        <div className={styles.ctxIco}>
          <CtxIco size={16} aria-hidden />
        </div>
        <div>
          <span className={styles.ctxLbl}>Vous proposez en tant que</span>{" "}
          <strong>{ctx.name}</strong> · {ctx.entity}
        </div>
        <div className={styles.ctxNote}>
          Détecté automatiquement à partir de votre compte. Les types réservés à l&apos;UGP sont
          grisés.
        </div>
      </div>

      {/* Types — 3 familles compactes */}
      <div className={styles.typesBlock}>
        <FamilyGroup
          fam={1}
          types={types1}
          typeSlug={typeSlug}
          setTypeSlug={setTypeSlug}
          disabled={isTypeDisabled}
        />
        <FamilyGroup
          fam={2}
          types={types2}
          typeSlug={typeSlug}
          setTypeSlug={setTypeSlug}
          disabled={isTypeDisabled}
        />
        <FamilyGroup
          fam={3}
          types={types3}
          typeSlug={typeSlug}
          setTypeSlug={setTypeSlug}
          disabled={isTypeDisabled}
        />
      </div>

      {/* Continue bar */}
      <div className={styles.continueBar}>
        <div className={styles.summary}>
          {selectedType ? (
            <>
              Origine <strong>{ctx.name}</strong> · Type{" "}
              <strong>
                {selectedType.name} ({selectedType.code})
              </strong>
              {selectedType.defaultMethod ? ` · ${selectedType.defaultMethod}` : ""}
            </>
          ) : (
            <>
              Origine <strong>{ctx.name}</strong> · Sélectionnez un type d&apos;activité ci-dessus
              pour continuer.
            </>
          )}
        </div>
        <div className={styles.barActions}>
          <Link href="/dashboard" className={styles.btnSecondary}>
            Annuler
          </Link>
          <button
            type="button"
            className={styles.btnPrimary}
            disabled={!selectedType}
            onClick={handleContinue}
          >
            Continuer vers le wizard
            <ArrowRight size={14} aria-hidden />
          </button>
        </div>
      </div>
    </div>
  );
}

function FamilyGroup({
  fam,
  types,
  typeSlug,
  setTypeSlug,
  disabled,
}: {
  fam: 1 | 2 | 3;
  types: TypeDef[];
  typeSlug: string | null;
  setTypeSlug: (s: string | null) => void;
  disabled: (t: TypeDef) => boolean;
}) {
  const f = FAMILY_LABEL[fam];
  return (
    <div className={styles.typeGrp}>
      <div className={styles.grpH}>
        <span>
          <span className="ptn-mono">{f.num}</span> <span className={styles.grpTitle}>{f.name}</span>{" "}
          <span className={styles.grpRule}>· {f.rule}</span>
        </span>
        <span className={styles.count}>{types.length} types</span>
      </div>
      <div className={styles.typeGrid}>
        {types.map((t) => {
          const Ico = t.icon;
          const isOn = typeSlug === t.slug;
          const isDisabled = disabled(t);
          const cls = [
            styles.typeCard,
            isOn && styles.typeCardOn,
            isDisabled && styles.typeCardDisabled,
          ]
            .filter(Boolean)
            .join(" ");
          return (
            <button
              type="button"
              key={t.code}
              className={cls}
              onClick={() => !isDisabled && setTypeSlug(t.slug)}
              disabled={isDisabled}
              aria-pressed={isOn}
            >
              <div className={`${styles.typeIco} ${t.icoClass}`}>
                <Ico size={16} aria-hidden />
              </div>
              <div className={styles.typeBody}>
                <div className={styles.typeHead}>
                  <div className={styles.typeName}>{t.name}</div>
                  <div className={styles.typeCode}>{t.code}</div>
                </div>
                <div className={styles.typeMeta}>
                  {t.meta.map((m, i) => {
                    const toneCls =
                      m.tone === "warn"
                        ? styles.metaTagWarn
                        : m.tone === "ok"
                        ? styles.metaTagOk
                        : m.tone === "partner"
                        ? styles.metaTagPartner
                        : m.tone === "ugp"
                        ? styles.metaTagUgp
                        : "";
                    return (
                      <span key={i} className={`${styles.metaTag} ${toneCls}`}>
                        {m.label}
                      </span>
                    );
                  })}
                </div>
                {isDisabled && (
                  <div className={styles.disabledHint}>Réservé à l&apos;UGP-PTN</div>
                )}
              </div>
              <div className={styles.typeCheck}>
                <CheckmarkFilled size={12} aria-hidden />
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
