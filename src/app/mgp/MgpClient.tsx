"use client";

/**
 * MGP — Mécanisme de Gestion des Plaintes (PUBLIC).
 *
 * Page accessible SANS connexion. Indicateur ODP officiel : 100 % des griefs traités en ≤ 30 jours.
 *
 * Conformité MEP § 8.6.7-8 :
 * - 4 modes de dépôt (web, SMS numéro vert, email, point focal)
 * - 5 catégories : technique, fiduciaire, E&S, conduite du personnel, autre
 * - Catégorie EAS/HS bascule vers canal confidentiel séparé (page distincte sécurisée)
 * - Multilingue (FR + 4 langues locales)
 */

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  ArrowRight,
  ArrowLeft,
  CheckmarkFilled,
  Email,
  Enterprise,
  HelpFilled,
  Locked,
  Phone,
  WarningAltFilled,
} from "@carbon/icons-react";
import { LanguagePicker } from "@/components/chrome/LanguagePicker";
import { ALL_PROVINCES } from "@/lib/project-data";
import styles from "./mgp.module.scss";

type ComplaintCategory =
  | "technique"
  | "fiduciaire"
  | "es"
  | "conduite"
  | "eas-hs"
  | "autre";

interface CategoryDef {
  key: ComplaintCategory;
  label: string;
  description: string;
  color: string;
  routesToConfidential?: boolean;
}

const CATEGORIES: CategoryDef[] = [
  {
    key: "technique",
    label: "Technique",
    description: "Problèmes liés aux infrastructures, services numériques, qualité des prestations.",
    color: "var(--ptn-status-info)",
  },
  {
    key: "fiduciaire",
    label: "Fiduciaire",
    description: "Préoccupations de gestion financière, marchés, paiements, transparence.",
    color: "var(--ptn-status-warning)",
  },
  {
    key: "es",
    label: "Environnement & Social",
    description: "Impacts E&S des sous-projets : terre, eau, populations, peuples autochtones.",
    color: "var(--ptn-status-success)",
  },
  {
    key: "conduite",
    label: "Conduite du personnel",
    description: "Conduite inappropriée d'un agent du projet ou d'un prestataire (hors EAS/HS).",
    color: "var(--cds-text-secondary)",
  },
  {
    key: "eas-hs",
    label: "EAS / HS — Canal confidentiel",
    description: "Exploitation, abus sexuels, harcèlement sexuel. Canal séparé ultra-confidentiel.",
    color: "var(--ptn-status-danger)",
    routesToConfidential: true,
  },
  {
    key: "autre",
    label: "Autre",
    description: "Toute autre préoccupation que les catégories ci-dessus.",
    color: "var(--cds-text-helper)",
  },
];

type Step = "category" | "form" | "submitted";

export function MgpClient() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("category");
  const [category, setCategory] = useState<ComplaintCategory | null>(null);
  const [referenceNumber, setReferenceNumber] = useState<string>("");

  const [description, setDescription] = useState("");
  const [province, setProvince] = useState<string>("");
  const [contact, setContact] = useState("");
  const [anonymous, setAnonymous] = useState(false);

  const handleCategoryChoice = (cat: CategoryDef) => {
    if (cat.routesToConfidential) {
      // EAS/HS → redirige vers page confidentielle
      router.push("/mgp/confidentiel");
      return;
    }
    setCategory(cat.key);
    setStep("form");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    // Mock submission
    const ref = `MGP-${new Date().getFullYear()}-${String(Math.floor(Math.random() * 10000)).padStart(4, "0")}`;
    setReferenceNumber(ref);
    setStep("submitted");
  };

  const currentCategory = CATEGORIES.find((c) => c.key === category);

  return (
    <div className={styles.shell}>
      {/* ===== Header ===== */}
      <header className={styles.header}>
        <Link href="/login" className={styles.backLink}>
          <ArrowLeft size={14} aria-hidden /> Retour à la plateforme
        </Link>
        <div className={styles.headerRight}>
          <LanguagePicker variant="compact" tone="light" />
        </div>
      </header>

      {/* ===== Hero ===== */}
      <section className={styles.hero}>
        <div className={styles.eyebrow}>
          <span className={styles.eyebrowDot} aria-hidden /> Mécanisme de Gestion des Plaintes (MGP)
        </div>
        <h1 className={styles.title}>
          Votre voix compte.
          <br />
          Réponse garantie sous 30 jours.
        </h1>
        <p className={styles.lede}>
          Le PTN-RDC s&apos;engage à traiter chaque plainte ou signalement de façon transparente,
          équitable et rapide. Indicateur ODP officiel : <strong>100 % des griefs traités en ≤ 30 jours</strong>.
        </p>

        <div className={styles.channels}>
          <div className={styles.channel}>
            <Enterprise size={20} aria-hidden />
            <div>
              <strong>Formulaire web</strong>
              <span>Vous êtes ici. Cliquez sur une catégorie ci-dessous.</span>
            </div>
          </div>
          <div className={styles.channel}>
            <Phone size={20} aria-hidden />
            <div>
              <strong>SMS / Numéro vert</strong>
              <span className="ptn-mono">+243 81 000 0000 (gratuit)</span>
            </div>
          </div>
          <div className={styles.channel}>
            <Email size={20} aria-hidden />
            <div>
              <strong>Email</strong>
              <span className="ptn-mono">mgp@ptn-rdc.gov.cd</span>
            </div>
          </div>
          <div className={styles.channel}>
            <HelpFilled size={20} aria-hidden />
            <div>
              <strong>Point focal physique</strong>
              <span>Bureaux UGP-PTN ou comités territoriaux par province</span>
            </div>
          </div>
        </div>
      </section>

      {/* ===== Step content ===== */}
      <main className={styles.main}>
        {step === "category" && (
          <section aria-labelledby="step-category-title">
            <h2 id="step-category-title" className={styles.stepTitle}>
              1. Choisissez la catégorie de votre plainte
            </h2>
            <p className={styles.stepDesc}>
              Si votre signalement concerne une situation d&apos;exploitation, d&apos;abus sexuel
              ou de harcèlement (EAS/HS), choisissez la catégorie dédiée — vous serez orienté
              vers un canal confidentiel séparé, avec un référencement immédiat sous 24h vers
              des prestataires de soutien (médical, psychosocial, juridique).
            </p>
            <div className={styles.categoryGrid}>
              {CATEGORIES.map((cat) => (
                <button
                  key={cat.key}
                  type="button"
                  className={`${styles.categoryCard} ${cat.routesToConfidential ? styles.confidentialCard : ""}`}
                  onClick={() => handleCategoryChoice(cat)}
                >
                  <span
                    className={styles.categoryDot}
                    style={{ background: cat.color }}
                    aria-hidden
                  />
                  <strong className={styles.categoryLabel}>{cat.label}</strong>
                  <p className={styles.categoryDesc}>{cat.description}</p>
                  <span className={styles.categoryArrow}>
                    {cat.routesToConfidential ? (
                      <Locked size={16} aria-hidden />
                    ) : (
                      <ArrowRight size={16} aria-hidden />
                    )}
                  </span>
                </button>
              ))}
            </div>
          </section>
        )}

        {step === "form" && currentCategory && (
          <section aria-labelledby="step-form-title">
            <button
              type="button"
              onClick={() => setStep("category")}
              className={styles.linkBackToStep}
            >
              <ArrowLeft size={14} aria-hidden /> Changer de catégorie
            </button>
            <h2 id="step-form-title" className={styles.stepTitle}>
              2. Décrivez votre situation —{" "}
              <span style={{ color: currentCategory.color }}>{currentCategory.label}</span>
            </h2>

            <form onSubmit={handleSubmit} className={styles.form}>
              <div className={styles.field}>
                <label htmlFor="description" className={styles.label}>
                  Description détaillée *
                </label>
                <textarea
                  id="description"
                  required
                  rows={6}
                  className={styles.textarea}
                  placeholder="Expliquez ce qui s'est passé, où, quand, et qui est concerné. Soyez aussi précis que possible — vos informations restent confidentielles."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
                <span className={styles.hint}>
                  Vos informations sont protégées. Seuls les membres habilités du MGP UGP-PTN
                  y auront accès.
                </span>
              </div>

              <div className={styles.row}>
                <div className={styles.field}>
                  <label htmlFor="province" className={styles.label}>
                    Province / Localisation
                  </label>
                  <select
                    id="province"
                    className={styles.select}
                    value={province}
                    onChange={(e) => setProvince(e.target.value)}
                  >
                    <option value="">— Sélectionner —</option>
                    {ALL_PROVINCES.map((p) => (
                      <option key={p} value={p}>
                        {p}
                      </option>
                    ))}
                  </select>
                </div>

                <div className={styles.field}>
                  <label className={styles.label}>Identité</label>
                  <label className={styles.checkboxRow}>
                    <input
                      type="checkbox"
                      checked={anonymous}
                      onChange={(e) => setAnonymous(e.target.checked)}
                    />
                    <span>Déposer cette plainte de façon anonyme</span>
                  </label>
                  <span className={styles.hint}>
                    Anonyme : pas de retour personnalisé possible mais traitement assuré.
                  </span>
                </div>
              </div>

              {!anonymous && (
                <div className={styles.field}>
                  <label htmlFor="contact" className={styles.label}>
                    Contact (téléphone ou email)
                  </label>
                  <input
                    id="contact"
                    type="text"
                    className={styles.input}
                    placeholder="Ex. +243 81 234 56 78 ou nom@email.cd"
                    value={contact}
                    onChange={(e) => setContact(e.target.value)}
                  />
                  <span className={styles.hint}>
                    Permet au MGP de revenir vers vous avec la décision et toute clarification.
                  </span>
                </div>
              )}

              <div className={styles.formFooter}>
                <p className={styles.disclaimer}>
                  En soumettant ce formulaire, vous attestez que les informations fournies sont
                  exactes au mieux de votre connaissance. Le PTN-RDC accusera réception sous 24h
                  ouvrées et fournira une réponse motivée sous 30 jours maximum.
                </p>
                <button type="submit" className={styles.submitBtn}>
                  Soumettre ma plainte <ArrowRight size={16} aria-hidden />
                </button>
              </div>
            </form>
          </section>
        )}

        {step === "submitted" && (
          <section className={styles.successWrap} aria-labelledby="step-success-title">
            <div className={styles.successIcon}>
              <CheckmarkFilled size={48} />
            </div>
            <h2 id="step-success-title" className={styles.stepTitle}>
              Plainte enregistrée. Merci.
            </h2>
            <p className={styles.lede}>
              Votre signalement a été reçu et est désormais en cours d&apos;instruction par le
              MGP UGP-PTN.
            </p>
            <div className={styles.refBox}>
              <span className={styles.refLabel}>Numéro de référence</span>
              <span className={`${styles.refValue} ptn-mono`}>{referenceNumber}</span>
              <span className={styles.refHint}>
                Conservez ce numéro. Il vous sera demandé pour suivre l&apos;évolution.
              </span>
            </div>
            <div className={styles.successActions}>
              <Link href={`/mgp/suivi?ref=${referenceNumber}`} className={styles.primaryAction}>
                Suivre cette plainte <ArrowRight size={16} aria-hidden />
              </Link>
              <Link href="/login" className={styles.tertiaryAction}>
                Retour à la plateforme
              </Link>
            </div>
            <div className={styles.successInfo}>
              <WarningAltFilled size={16} aria-hidden />
              <p>
                Vous recevrez un accusé de réception sous 24h ouvrées. Le délai maximum de
                traitement est de 30 jours, conformément aux engagements du Projet.
              </p>
            </div>
          </section>
        )}
      </main>

      {/* ===== Footer ===== */}
      <footer className={styles.footer}>
        <span className="ptn-mono">PTN-RDC · P180495</span>
        <span className={styles.footerSep} aria-hidden />
        <span>
          Indicateur ODP : <strong>100 % en ≤ 30 jours</strong>
        </span>
        <span className={styles.footerSep} aria-hidden />
        <Link href="/legal" className={styles.footerLink}>
          Confidentialité &amp; protection des données
        </Link>
      </footer>
    </div>
  );
}
