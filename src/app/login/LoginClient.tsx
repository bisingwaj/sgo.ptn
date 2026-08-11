"use client";

/**
 * Login v3 PTN-RDC.
 *
 * Architecture :
 * - Split-screen 50/50 : panneau institutionnel sombre (gauche) + formulaire (droite)
 * - Sélecteur 2 niveaux : 4 familles × N sous-rôles, avec recherche
 * - Multilingue (FR/EN/Lingala/Swahili/Tshiluba/Kikongo)
 * - SSO/OIDC institutionnel + email/password classique
 * - Lien MGP public accessible sans connexion (en bas)
 * - Animation subtile illustration au changement de famille
 *
 * Profils gérés (via ProfileContext) : ugp, mda, partenaire, bailleur,
 * soumissionnaire, sbp, auditeur, gouvernance.
 */

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useProfile } from "@/components/profile/ProfileContext";
import { PROFILES, type ProfileKey } from "@/lib/profiles";
import { PROJECT } from "@/lib/project-data";
import { Illustration } from "@/components/illustrations/Illustration";
import { DRCFlag } from "@/components/chrome/DRCFlag";
import { DonorStrip } from "@/components/chrome/DonorStrip";
import { LanguagePicker } from "@/components/chrome/LanguagePicker";
import { SystemStatusBar } from "@/components/chrome/SystemStatusBar";
import {
  ArrowRight,
  CheckmarkFilled,
  EarthFilled,
  HelpFilled,
  Login as LoginIcon,
  Search,
  Locked,
  WarningAltFilled,
  ChevronDown,
} from "@carbon/icons-react";
import styles from "./login.module.scss";

interface FamilyDef {
  key: "ugp-gov" | "bailleurs" | "beneficiaires" | "controle";
  label: string;
  hint: string;
  /** Profils de cette famille, dans l'ordre d'affichage du combobox */
  profiles: ProfileKey[];
  defaultProfile: ProfileKey;
}

const FAMILIES: FamilyDef[] = [
  {
    key: "ugp-gov",
    label: "UGP / Gouvernement",
    hint: "MPTN, UGP, MDA bénéficiaires, gouvernance COPIL/CTP",
    profiles: ["ugp", "mda", "gouvernance"],
    defaultProfile: "ugp",
  },
  {
    key: "bailleurs",
    label: "Bailleurs",
    hint: "Banque mondiale (IDA), Agence Française de Développement",
    profiles: ["bailleur"],
    defaultProfile: "bailleur",
  },
  {
    key: "beneficiaires",
    label: "Bénéficiaires & Soumissionnaires",
    hint: "Partenaires institutionnels, entreprises, EESU, hubs, startups",
    profiles: ["partenaire", "soumissionnaire", "sbp"],
    defaultProfile: "partenaire",
  },
  {
    key: "controle",
    label: "Contrôle & Vérification",
    hint: "Audit externe, TPM, Cour des Comptes, IGF, ACE",
    profiles: ["auditeur"],
    defaultProfile: "auditeur",
  },
];

interface SubroleOption {
  /** Profil cible (parmi les 8) — détermine l'accent et le homePath */
  profile: ProfileKey;
  /** Libellé du sous-rôle (ex. "Coordonnateur") */
  label: string;
  /** Code mono pour l'affichage (initiales) */
  code: string;
}

function buildSubroleOptions(family: FamilyDef): SubroleOption[] {
  const opts: SubroleOption[] = [];
  family.profiles.forEach((p) => {
    PROFILES[p].subroles.forEach((sr) => {
      const code = sr
        .split(/\s+/)
        .map((w) => w[0])
        .join("")
        .replace(/[^A-Z]/gi, "")
        .toUpperCase()
        .slice(0, 4);
      opts.push({ profile: p, label: sr, code: code || "—" });
    });
  });
  return opts;
}

export function LoginClient() {
  const router = useRouter();
  const { setProfile } = useProfile();
  const [familyKey, setFamilyKey] = useState<FamilyDef["key"]>("ugp-gov");
  const family = useMemo(() => FAMILIES.find((f) => f.key === familyKey)!, [familyKey]);
  const allOptions = useMemo(() => buildSubroleOptions(family), [family]);

  const [subrole, setSubrole] = useState<SubroleOption>(allOptions[0]);

  // Reset subrole when family changes
  useEffect(() => {
    setSubrole(allOptions[0]);
  }, [allOptions]);

  // Apply preview profile to <html data-profile> when subrole changes
  // (so the right side accent + illustration reflect the choice live)
  useEffect(() => {
    document.documentElement.setAttribute("data-profile", subrole.profile);
  }, [subrole.profile]);

  // Subrole dropdown
  const [ddOpen, setDdOpen] = useState(false);
  const [ddQuery, setDdQuery] = useState("");
  const ddRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!ddOpen) return;
    const onClick = (e: MouseEvent) => {
      if (!ddRef.current?.contains(e.target as Node)) setDdOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [ddOpen]);

  const filteredOptions = useMemo(() => {
    const q = ddQuery.trim().toLowerCase();
    if (!q) return allOptions;
    return allOptions.filter((o) => o.label.toLowerCase().includes(q));
  }, [ddQuery, allOptions]);

  // Login form
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [pwdVisible, setPwdVisible] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(null);

    if (!email || !password) {
      setErr("Renseignez votre email institutionnel et votre mot de passe.");
      return;
    }

    setSubmitting(true);
    // Mock authentification (≈600ms)
    await new Promise((r) => setTimeout(r, 600));

    // Persiste le profil
    setProfile(subrole.profile);

    // Première connexion : on aiguille vers l'onboarding du profil.
    // Une fois l'onboarding terminé, l'utilisateur sera redirigé vers son homePath.
    const onboardedKey = `ptn-onboarded:${subrole.profile}`;
    const alreadyOnboarded =
      typeof window !== "undefined" && window.localStorage.getItem(onboardedKey) === "1";

    if (alreadyOnboarded) {
      router.push(PROFILES[subrole.profile].homePath);
    } else {
      router.push(`/onboarding/${subrole.profile}`);
    }
  };

  const profileConfig = PROFILES[subrole.profile];

  return (
    <main className={styles.shell}>
      {/* ============== LEFT (institutional) ============== */}
      <aside className={styles.left} aria-label="Informations institutionnelles">
        <div className={styles.brand}>
          <span className={styles.brandLogo} aria-hidden>PT</span>
          <div className={styles.brandText}>
            <div className={styles.brandTag}>{PROJECT.acronym} · Gouvernance opérationnelle</div>
            <div className={styles.brandPid}>P180495 · IDA + AFD</div>
          </div>
        </div>

        <div className={styles.leftCenter}>
          <div className={styles.eyebrow}>
            <span className={styles.eyebrowDot} aria-hidden />
            Plateforme officielle · Accès restreint
          </div>
          <h1 className={styles.title}>
            Plateforme de gouvernance
            <br />
            PTN-RDC
          </h1>
          <p className={styles.subtitle}>
            Orchestration de la passation de marchés, des TDR, DAO, ANO et de la
            traçabilité immuable du Projet de Transformation Numérique.
          </p>

          <div className={styles.illustrationWrap}>
            <Illustration
              name={profileConfig.illustration as never}
              size="hero"
              animate
              ariaLabel={`Illustration profil ${profileConfig.short}`}
            />
            <div className={styles.illustrationCaption}>
              <span className={`${styles.captionDot} ptn-mono`} style={{ background: profileConfig.accent.base }} />
              <span className={styles.captionLabel}>{profileConfig.label}</span>
              <span className={styles.captionMicro}>{profileConfig.greeting}</span>
            </div>
          </div>

          <DonorStrip variant="dark" />
        </div>

        <div className={styles.leftBottom}>
          <div className={styles.flagBlock}>
            <DRCFlag width={56} height={42} />
            <div className={styles.flagMeta}>
              <span className={styles.flagNation}>République Démocratique du Congo</span>
              <span className={`${styles.flagGov} ptn-mono`}>Unité · Travail · Progrès</span>
            </div>
          </div>
          <div className={`${styles.envMeta} ptn-mono`}>
            ENV · PROD-EU-W3
            <br />
            BUILD 2026.05.07-r512
          </div>
        </div>
      </aside>

      {/* ============== RIGHT (form) ============== */}
      <section className={styles.right} aria-label="Formulaire de connexion">
        <header className={styles.rightTop}>
          <span className={styles.helpLabel}>Besoin d&apos;aide ?</span>
          <Link href="/aide" className={styles.helpLink}>
            <HelpFilled size={14} /> Centre d&apos;assistance
          </Link>
          <LanguagePicker variant="compact" tone="light" />
        </header>

        <div className={styles.formWrap}>
          <div className={styles.formHeader}>
            <h2 className={styles.formTitle}>Connexion</h2>
            <p className={styles.formSubtitle}>
              Sélectionnez votre profil pour accéder à la plateforme.
            </p>
          </div>

          {/* ----- Niveau 1 : familles ----- */}
          <div className={styles.families} role="radiogroup" aria-label="Famille de profil">
            {FAMILIES.map((f) => {
              const active = f.key === familyKey;
              return (
                <button
                  key={f.key}
                  type="button"
                  role="radio"
                  aria-checked={active}
                  onClick={() => setFamilyKey(f.key)}
                  className={`${styles.fam} ${active ? styles.famActive : ""}`}
                >
                  <span className={styles.famHead}>
                    <span className={styles.famLabel}>{f.label}</span>
                    {active && (
                      <CheckmarkFilled size={16} aria-hidden style={{ color: "var(--ptn-accent)" }} />
                    )}
                  </span>
                  <span className={styles.famHint}>{f.hint}</span>
                </button>
              );
            })}
          </div>

          {/* ----- Niveau 2 : sous-rôle (combobox custom Carbon-style) ----- */}
          <div className={styles.subroleBlock} ref={ddRef}>
            <label className={styles.fieldLabel} id="subrole-label">
              Sous-rôle
            </label>
            <button
              type="button"
              className={`${styles.ddTrigger} ${ddOpen ? styles.ddOpen : ""}`}
              onClick={() => setDdOpen((v) => !v)}
              aria-haspopup="listbox"
              aria-expanded={ddOpen}
              aria-labelledby="subrole-label"
            >
              <span className={styles.ddVal}>
                <span className={`${styles.ddCode} ptn-mono`}>{subrole.code}</span>
                <span>{subrole.label}</span>
              </span>
              <ChevronDown size={16} aria-hidden className={styles.ddChev} />
            </button>

            {ddOpen && (
              <div className={styles.ddPanel} role="listbox" aria-labelledby="subrole-label">
                <div className={styles.ddSearch}>
                  <Search size={16} aria-hidden />
                  <input
                    type="text"
                    placeholder="Rechercher un sous-rôle…"
                    value={ddQuery}
                    onChange={(e) => setDdQuery(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Escape") setDdOpen(false);
                      if (e.key === "Enter" && filteredOptions[0]) {
                        setSubrole(filteredOptions[0]);
                        setDdOpen(false);
                      }
                    }}
                    autoFocus
                  />
                </div>
                <ul className={styles.ddList}>
                  {filteredOptions.length === 0 && (
                    <li className={styles.ddEmpty}>Aucun sous-rôle trouvé.</li>
                  )}
                  {filteredOptions.map((o) => {
                    const sel = o.label === subrole.label && o.profile === subrole.profile;
                    return (
                      <li key={`${o.profile}-${o.label}`}>
                        <button
                          type="button"
                          role="option"
                          aria-selected={sel}
                          onClick={() => {
                            setSubrole(o);
                            setDdOpen(false);
                          }}
                          className={`${styles.ddOpt} ${sel ? styles.ddOptSel : ""}`}
                        >
                          <span
                            className={styles.ddOptDot}
                            style={{ background: PROFILES[o.profile].accent.base }}
                            aria-hidden
                          />
                          <span>{o.label}</span>
                          <span
                            className={`${styles.ddOptProfile} ptn-mono`}
                            title={`Profil ${PROFILES[o.profile].short}`}
                          >
                            {PROFILES[o.profile].short.toUpperCase()}
                          </span>
                          <span className={`${styles.ddOptCode} ptn-mono`}>{o.code}</span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </div>
            )}

            <div className={styles.subroleHelp}>
              <Locked size={14} aria-hidden />
              <span>{profileConfig.description}</span>
            </div>
          </div>

          {/* ----- Erreur ----- */}
          {err && (
            <div className={styles.errBox} role="alert">
              <WarningAltFilled size={16} aria-hidden />
              <div>
                <strong>Échec de l&apos;authentification</strong>
                <p>{err}</p>
              </div>
            </div>
          )}

          {/* ----- Formulaire ----- */}
          <form onSubmit={handleSubmit} className={styles.form}>
            <div className={styles.field}>
              <label htmlFor="email" className={styles.fieldLabel}>
                Adresse électronique professionnelle
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="username"
                required
                className={styles.input}
                placeholder="prenom.nom@gov.cd"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>

            <div className={styles.field}>
              <label htmlFor="password" className={styles.fieldLabel}>
                Mot de passe
              </label>
              <div className={styles.inputGroup}>
                <input
                  id="password"
                  name="password"
                  type={pwdVisible ? "text" : "password"}
                  autoComplete="current-password"
                  required
                  className={styles.input}
                  placeholder="••••••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
                <button
                  type="button"
                  className={styles.inputAdornment}
                  onClick={() => setPwdVisible((v) => !v)}
                  aria-label={pwdVisible ? "Masquer le mot de passe" : "Afficher le mot de passe"}
                >
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4">
                    {pwdVisible ? (
                      <>
                        <path d="M2 14l12-12" />
                        <path d="M1.5 8s2.5-5 6.5-5c1.4 0 2.6.6 3.5 1.4M14.5 8s-2.5 5-6.5 5c-1.4 0-2.6-.6-3.5-1.4" />
                        <circle cx="8" cy="8" r="2" />
                      </>
                    ) : (
                      <>
                        <path d="M1.5 8s2.5-5 6.5-5 6.5 5 6.5 5-2.5 5-6.5 5-6.5-5-6.5-5z" />
                        <circle cx="8" cy="8" r="2.5" />
                      </>
                    )}
                  </svg>
                </button>
              </div>
            </div>

            <Link href="/sso/oidc" className={styles.sso}>
              <span className={styles.ssoIcon} aria-hidden>
                <EarthFilled size={20} />
              </span>
              <span className={styles.ssoMeta}>
                <span className={styles.ssoTitle}>
                  Connexion par OIDC / SSO institutionnel
                </span>
                <span className={styles.ssoSub}>
                  Fédération d&apos;identité — agents Gov.CD, BM, AFD
                </span>
              </span>
              <ArrowRight size={16} aria-hidden />
            </Link>

            <button
              type="submit"
              className={styles.submitBtn}
              disabled={submitting}
              data-loading={submitting}
            >
              <span>{submitting ? "Connexion en cours…" : "Se connecter"}</span>
              {!submitting && <LoginIcon size={20} aria-hidden />}
            </button>

            <div className={styles.subLinks}>
              <Link href="/forgot" className={styles.tertiaryLink}>
                Mot de passe oublié ?
              </Link>
              {profileConfig.key === "soumissionnaire" && (
                <span className={styles.signupRow}>
                  <span>Vous représentez une entreprise candidate ?</span>
                  <Link href="/onboarding/soumissionnaire" className={styles.signupLink}>
                    Créer un compte entreprise <ArrowRight size={12} />
                  </Link>
                </span>
              )}
            </div>
          </form>
        </div>

        {/* ----- Footer ----- */}
        <footer className={styles.footer}>
          <div className={styles.footerLeft}>
            <span className={`${styles.version} ptn-mono`}>v 3.0.0</span>
            <span className={styles.dot} aria-hidden />
            <SystemStatusBar tone="light" variant="compact" />
          </div>
          <div className={styles.footerRight}>
            <Link href="/mgp" className={styles.mgpLink}>
              Déposer une plainte (MGP) <ArrowRight size={12} />
            </Link>
            <span className={styles.divider} aria-hidden />
            <Link href="/docs/mep" className={styles.tertiaryLink}>
              Documentation MEP
            </Link>
            <span className={styles.divider} aria-hidden />
            <Link href="/legal" className={styles.tertiaryLink}>
              Mentions légales
            </Link>
          </div>
        </footer>
      </section>
    </main>
  );
}
