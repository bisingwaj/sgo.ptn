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
import { useAuth, toProfileKey } from "@/components/auth/AuthContext";
import { ApiError, type FamilyKey } from "@/lib/api";
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
  /** Clé attendue par l'API — détermine l'habilitation activée */
  apiKey: FamilyKey;
  label: string;
  hint: string;
  /** Profils de cette famille, dans l'ordre d'affichage du combobox */
  profiles: ProfileKey[];
  defaultProfile: ProfileKey;
}

const FAMILIES: FamilyDef[] = [
  {
    key: "ugp-gov",
    apiKey: "UGP_GOUV",
    label: "UGP / Gouvernement",
    hint: "MPTN, UGP, MDA bénéficiaires, gouvernance COPIL/CTP",
    profiles: ["ugp", "mda", "gouvernance"],
    defaultProfile: "ugp",
  },
  {
    key: "bailleurs",
    apiKey: "BAILLEURS",
    label: "Bailleurs",
    hint: "Banque mondiale (IDA), Agence Française de Développement",
    profiles: ["bailleur"],
    defaultProfile: "bailleur",
  },
  {
    key: "beneficiaires",
    apiKey: "BENEFICIAIRES",
    label: "Bénéficiaires & Soumissionnaires",
    hint: "Partenaires institutionnels, entreprises, EESU, hubs, startups",
    profiles: ["partenaire", "soumissionnaire", "sbp"],
    defaultProfile: "partenaire",
  },
  {
    key: "controle",
    apiKey: "CONTROLE",
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
  const { login } = useAuth();
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
  const [ended, setEnded] = useState<"expiree" | "inactivite" | null>(null);

  // Lu depuis window plutôt que via useSearchParams : cela éviterait de
  // basculer la page de connexion en rendu dynamique pour un simple
  // message d'information.
  useEffect(() => {
    const reason = new URLSearchParams(window.location.search).get("session");
    if (reason === "expiree" || reason === "inactivite") setEnded(reason);
  }, []);

  /**
   * Authentification réelle.
   *
   * La famille sélectionnée est transmise à l'API : elle détermine
   * l'habilitation activée pour la session, une même personne pouvant en
   * détenir plusieurs. Un compte qui n'en détient aucune dans la famille
   * demandée est refusé, avec le nom de celles qu'il détient réellement.
   *
   * Le sous-rôle, lui, n'est pas transmis : les droits viennent de
   * l'habilitation accordée, pas d'une déclaration à la connexion.
   */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(null);

    if (!email || !password) {
      setErr("Renseignez votre adresse électronique et votre mot de passe.");
      return;
    }

    setSubmitting(true);
    try {
      const result = await login(email.trim(), password, family.apiKey);

      // Prise de fonction inachevée — mot de passe temporaire non remplacé,
      // ou engagements pas encore signés. Dans le premier cas l'API refuse
      // de toute façon les autres routes.
      if (result.user.mustChangePassword || !result.user.onboardingCompleted) {
        router.push("/activation");
        return;
      }

      router.push(PROFILES[toProfileKey(result.user.profile)].homePath);
    } catch (error) {
      setErr(
        error instanceof ApiError
          ? error.message
          : "Service d'authentification injoignable. Vérifiez que l'API est démarrée.",
      );
      setSubmitting(false);
    }
  };

  /**
   * Mode démonstration — parcours des écrans sans compte.
   *
   * Conservé pour les présentations UGP / Banque mondiale : les sept
   * profils autres que l'UGP n'ont pas encore de comptes en base, et
   * leurs écrans resteraient inatteignables autrement. Aucune session
   * n'est ouverte : seul le thème visuel du profil est appliqué.
   */
  const handleDemo = () => {
    setProfile(subrole.profile);
    router.push("/demo");
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
              Sélectionnez la famille sous laquelle vous vous connectez. Vos droits découlent de
              l&apos;habilitation qui vous a été accordée.
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

          {/* ----- Fin de session ----- */}
          {ended && !err && (
            <div className={styles.errBox} role="status" data-tone="info">
              <Locked size={16} aria-hidden />
              <div>
                <strong>
                  {ended === "inactivite" ? "Déconnexion par inactivité" : "Session terminée"}
                </strong>
                <p>
                  {ended === "inactivite"
                    ? "Votre session a été close après 30 minutes sans activité, afin de protéger vos habilitations sur un poste laissé sans surveillance."
                    : "Votre session a expiré ou votre habilitation a été modifiée. Reconnectez-vous pour poursuivre."}
                </p>
              </div>
            </div>
          )}

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
              <button type="button" onClick={handleDemo} className={styles.demoLink}>
                Explorer en mode démonstration
              </button>
              {/* L'inscription en libre-service des entreprises candidates,
                  avec vérification KYC et validation par l'UGP, reste à
                  construire. D'ici là, le message dit la procédure réelle
                  plutôt que de renvoyer vers une page inexistante. */}
              {profileConfig.key === "soumissionnaire" && (
                <span className={styles.signupRow}>
                  <span>
                    Vous représentez une entreprise candidate ? L’ouverture de compte se fait
                    auprès de l’UGP-PTN, qui vous transmettra vos accès après vérification de
                    votre dossier.
                  </span>
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
