"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useProfile } from "@/lib/profile-context";
import styles from "./login.module.css";

type FamilyKey = "ugp" | "bailleurs" | "benef" | "controle";

interface FamilyConfig {
  label: string;
  sub: string;
  help: string;
  helpStrong: string;
  color: string;
  signup: boolean;
  roles: string[];
  destinationProfile: "ugp" | "bailleur" | "sbp" | "partenaire";
}

const FAMILIES: Record<FamilyKey, FamilyConfig> = {
  ugp: {
    label: "UGP / Gouvernement",
    sub: "MPTN, UGP, MDA",
    helpStrong: "Unité de Gestion du Projet (UGP) / MPTN.",
    help: "Coordination, exécution, supervision technique et fiduciaire du PTN-RDC. Arrêté CAB/MIN/PT&N/AKIM/KL/Kbs/017/2025.",
    color: "#0f62fe",
    signup: false,
    destinationProfile: "ugp",
    roles: [
      "Coordonnateur",
      "Coordonnateur Adjoint",
      "Auditeur Interne",
      "Responsable Composante 1",
      "Responsable Composante 2",
      "Responsable Composante 3",
      "RAF",
      "Comptable",
      "Caissier",
      "Logisticien",
      "RPM",
      "Chargé PM",
      "Spé Environnement",
      "Spé Dév Social",
      "Spé VBG/EAS",
      "Spé S&E",
      "Spé Communication",
      "IT",
      "Membre COPIL",
      "Membre CTP",
      "Agent de liaison provincial",
    ],
  },
  bailleurs: {
    label: "Bailleurs",
    sub: "Banque mondiale · AFD",
    helpStrong: "Bailleurs (BM · AFD).",
    help: "Avis de Non-Objection, supervision stratégique. IDA 400 M USD (79 %) + AFD 110 M USD (21 %).",
    color: "#0043ce",
    signup: false,
    destinationProfile: "bailleur",
    roles: [
      "TTL Banque mondiale",
      "Spécialiste BM",
      "AFD Référent",
      "AFD Spécialiste",
    ],
  },
  benef: {
    label: "Bénéf. & Soum.",
    sub: "MDA, entreprises, EESU",
    helpStrong: "Bénéficiaires & Soumissionnaires.",
    help: "Entités bénéficiaires (MDA), entreprises soumissionnaires, et bénéficiaires SBP (EESU, hubs, startups).",
    color: "#24a148",
    signup: true,
    destinationProfile: "sbp",
    roles: [
      "Entité / Ministère bénéficiaire (MDA)",
      "Entreprise soumissionnaire",
      "EESU bénéficiaire SBP",
      "Hub technologique bénéficiaire SBP",
      "Startup numérique bénéficiaire SBP",
    ],
  },
  controle: {
    label: "Contrôle & Vérif.",
    sub: "Audit ext., TPM, ACE, IGF",
    helpStrong: "Contrôle & Vérification.",
    help: "Lecture seule structurée, audit trail consultable, exports signés. Aucune action d'édition.",
    color: "#525252",
    signup: false,
    destinationProfile: "bailleur",
    roles: [
      "Auditeur externe",
      "TPM (Tierce Partie Monitoring)",
      "ACE",
      "Cour des Comptes / IGF",
    ],
  },
};

function codeOf(name: string): string {
  return name
    .split(/\s+/)
    .map((w) => w[0])
    .join("")
    .slice(0, 3)
    .toUpperCase();
}

export function LoginClient() {
  const router = useRouter();
  const { setProfile } = useProfile();

  const [family, setFamily] = useState<FamilyKey>("ugp");
  const [role, setRole] = useState<string>(FAMILIES.ugp.roles[0]);
  const [ddOpen, setDdOpen] = useState(false);
  const [ddSearch, setDdSearch] = useState("");
  const [showError, setShowError] = useState(false);
  const [systemOk, setSystemOk] = useState(true);
  const [pwdVisible, setPwdVisible] = useState(false);
  const [tweaksOpen, setTweaksOpen] = useState(false);

  const conf = FAMILIES[family];

  useEffect(() => {
    setRole(FAMILIES[family].roles[0]);
  }, [family]);

  const filteredRoles = useMemo(() => {
    const q = ddSearch.trim().toLowerCase();
    if (!q) return conf.roles;
    return conf.roles.filter((r) => r.toLowerCase().includes(q));
  }, [ddSearch, conf.roles]);

  const ddRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!ddOpen) return;
    function onClickOutside(e: MouseEvent) {
      if (!ddRef.current?.contains(e.target as Node)) setDdOpen(false);
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, [ddOpen]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setProfile(conf.destinationProfile);
    if (conf.destinationProfile === "ugp") router.push("/onboarding");
    else if (conf.destinationProfile === "bailleur") router.push("/bailleur");
    else if (conf.destinationProfile === "sbp") router.push("/soumissionnaire");
    else router.push("/dashboard");
  }

  return (
    <div className={styles.shell} style={{ ["--c-accent" as string]: conf.color }}>
      {/* ============== LEFT ============== */}
      <aside className={styles.left}>
        <div className={styles.brandMark}>
          <div className={styles.brandLogo}>PT</div>
          <div className={styles.brandProduct}>
            PTN-RDC · Gouvernance opérationnelle
          </div>
        </div>

        <div className={styles.leftContent}>
          <div className={styles.eyebrow}>
            <span className={styles.eyebrowDot} />
            Plateforme officielle · Accès restreint
          </div>
          <h1 className={styles.title}>
            Plateforme de gouvernance
            <br />
            PTN-RDC
          </h1>
          <p className={styles.subtitle}>
            Projet de Transformation Numérique{" "}
            <span className={`mono ${styles.pid}`}>· P180495</span>
            <br />
            Orchestration de la passation de marchés, des TDR, DAO, ANO et de la
            traçabilité immuable.
          </p>

          <div className={styles.funders}>
            <div className={styles.fundersLabel}>Bailleurs &amp; Maître d&apos;ouvrage</div>
            <div className={styles.funderList}>
              <FunderBM />
              <FunderAFD />
              <FunderRDC />
            </div>
          </div>
        </div>

        <div className={styles.leftBottom}>
          <div className={styles.flagBlock}>
            <DRCFlag />
            <div className={styles.flagMeta}>
              <span className={styles.nation}>République Démocratique du Congo</span>
              <span className={`${styles.gov} mono`}>Unité · Travail · Progrès</span>
            </div>
          </div>
          <div className={`${styles.leftMeta} mono`}>
            ENV · PROD-EU-W3
            <br />
            BUILD 2026.05.04-r418
          </div>
        </div>
      </aside>

      {/* ============== RIGHT ============== */}
      <section className={styles.right}>
        <div className={styles.rightTop}>
          <span>Besoin d&apos;aide ?</span>
          <a href="#">Centre d&apos;assistance</a>
          <div className={styles.lang} role="group" aria-label="Langue">
            <button type="button" className={styles.langActive}>
              FR
            </button>
            <button type="button">EN</button>
          </div>
        </div>

        <div className={styles.formWrap}>
          <header className={styles.formHeader}>
            <h2>Connexion</h2>
            <p>Sélectionnez votre profil pour accéder à la plateforme.</p>
          </header>

          {/* Famille (niveau 1) */}
          <div className={styles.families} role="radiogroup" aria-label="Famille de profil">
            {(Object.keys(FAMILIES) as FamilyKey[]).map((k) => {
              const f = FAMILIES[k];
              const active = k === family;
              return (
                <button
                  key={k}
                  type="button"
                  role="radio"
                  aria-checked={active}
                  onClick={() => setFamily(k)}
                  className={`${styles.fam} ${active ? styles.famActive : ""}`}
                  style={
                    active
                      ? ({ ["--c-accent" as string]: f.color } as React.CSSProperties)
                      : undefined
                  }
                >
                  <span className={styles.famIco}>
                    <FamIcon kind={k} />
                  </span>
                  <span className={styles.famMeta}>
                    <span className={styles.famTitle}>{f.label}</span>
                    <span className={styles.famSub}>{f.sub}</span>
                  </span>
                </button>
              );
            })}
          </div>

          {/* Sous-rôle (niveau 2) */}
          <div className={styles.subroleWrap} ref={ddRef}>
            <label htmlFor="subroleBtn">Sous-rôle</label>
            <button
              type="button"
              id="subroleBtn"
              className={`${styles.ddTrigger} ${ddOpen ? styles.ddOpen : ""}`}
              aria-haspopup="listbox"
              aria-expanded={ddOpen}
              onClick={() => setDdOpen((o) => !o)}
            >
              <span className={styles.ddVal}>{role}</span>
              <span className={styles.ddChev}>
                <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4">
                  <path d="M3 6l5 5 5-5" />
                </svg>
              </span>
            </button>

            {ddOpen && (
              <div className={styles.ddPanel} role="listbox">
                <input
                  type="text"
                  className={styles.ddSearch}
                  placeholder="Rechercher un rôle…"
                  value={ddSearch}
                  onChange={(e) => setDdSearch(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Escape") setDdOpen(false);
                    if (e.key === "Enter" && filteredRoles[0]) {
                      setRole(filteredRoles[0]);
                      setDdOpen(false);
                    }
                  }}
                  autoFocus
                />
                <div className={styles.ddList}>
                  {filteredRoles.length === 0 ? (
                    <div className={styles.ddEmpty}>Aucun rôle trouvé</div>
                  ) : (
                    filteredRoles.map((r) => {
                      const sel = r === role;
                      return (
                        <button
                          key={r}
                          type="button"
                          className={`${styles.ddOpt} ${sel ? styles.ddSel : ""}`}
                          onClick={() => {
                            setRole(r);
                            setDdOpen(false);
                          }}
                        >
                          <span>{r}</span>
                          <span className={`${styles.ddCode} mono`}>{codeOf(r)}</span>
                        </button>
                      );
                    })
                  )}
                </div>
              </div>
            )}
          </div>

          <div className={styles.personaHelp}>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.2">
              <circle cx="8" cy="8" r="6.5" />
              <path d="M8 7v4M8 5v.01" strokeLinecap="round" />
            </svg>
            <div>
              <strong>{conf.helpStrong}</strong> {conf.help}
            </div>
          </div>

          {showError && (
            <div className={styles.notif} role="alert">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
                <circle cx="8" cy="8" r="6.5" />
                <path d="M8 4.5v4M8 11v.01" strokeLinecap="round" />
              </svg>
              <div className={styles.notifBody}>
                <strong>Échec de l&apos;authentification</strong>
                Identifiants invalides ou compte désactivé. Après 5 tentatives, votre
                compte sera verrouillé pendant 30 minutes.
              </div>
              <button
                className={styles.notifClose}
                aria-label="Fermer"
                onClick={() => setShowError(false)}
              >
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.2">
                  <path d="M3 3l10 10M13 3L3 13" />
                </svg>
              </button>
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div className={styles.field}>
              <label htmlFor="email">Adresse électronique professionnelle</label>
              <div className={styles.fieldInput}>
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="username"
                  defaultValue="jean.bisingwa@gov.cd"
                />
              </div>
            </div>

            <div className={styles.field}>
              <label htmlFor="password">Mot de passe</label>
              <div className={styles.fieldInput}>
                <input
                  id="password"
                  type={pwdVisible ? "text" : "password"}
                  autoComplete="current-password"
                  defaultValue="••••••••••••"
                />
                <button
                  type="button"
                  className={styles.togglePwd}
                  aria-label="Afficher / masquer le mot de passe"
                  onClick={() => setPwdVisible((v) => !v)}
                >
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.2">
                    <path d="M1.5 8s2.5-5 6.5-5 6.5 5 6.5 5-2.5 5-6.5 5-6.5-5-6.5-5z" />
                    <circle cx="8" cy="8" r="2" />
                  </svg>
                </button>
              </div>
            </div>

            <a href="#" className={styles.sso}>
              <span className={styles.ssoIco}>
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.2">
                  <circle cx="6" cy="10" r="3" />
                  <circle cx="14" cy="6" r="2" />
                  <circle cx="14" cy="14" r="2" />
                  <path d="M8.5 8.5L12.5 6.5M8.5 11.5L12.5 13.5" />
                </svg>
              </span>
              <span className={styles.ssoMeta}>
                <span className={styles.ssoTitle}>
                  Connexion par OIDC / SSO institutionnel
                </span>
                <span className={styles.ssoSub}>
                  Fédération d&apos;identité — agents Gov.CD, BM, AFD
                </span>
              </span>
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.2">
                <path d="M6 3l5 5-5 5" />
              </svg>
            </a>

            <button type="submit" className={styles.btnPrimary}>
              <span>Se connecter</span>
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.2">
                <path d="M4 10h12M11 5l5 5-5 5" />
              </svg>
            </button>

            <div className={styles.subLinks}>
              <a href="#">
                Mot de passe oublié ?
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.2">
                  <path d="M4 2l4 4-4 4" />
                </svg>
              </a>
              {conf.signup && (
                <div className={styles.signupRow}>
                  <span>Vous représentez une entreprise candidate ?</span>
                  <a href="#">
                    Créer un compte entreprise
                    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.2">
                      <path d="M4 2l4 4-4 4" />
                    </svg>
                  </a>
                </div>
              )}
            </div>
          </form>
        </div>

        <footer className={styles.rightFooter}>
          <div className={styles.footerLeft}>
            <span className="mono">v 2.4.1</span>
            <span className={styles.footerDivider} />
            <div className={styles.status}>
              <span
                className={`${styles.statusDot} ${systemOk ? "" : styles.statusWarn}`}
              />
              <span>
                {systemOk
                  ? "Tous les services opérationnels"
                  : "Maintenance partielle · Module ANO ralenti"}
              </span>
            </div>
          </div>
          <div className={styles.footerRight}>
            <a href="#">Documentation MEP</a>
            <span className={styles.footerDivider} />
            <a href="#">Conditions d&apos;utilisation</a>
            <span className={styles.footerDivider} />
            <a href="#">Mentions légales</a>
          </div>
        </footer>
      </section>

      <button
        type="button"
        className={styles.tweaksFab}
        onClick={() => setTweaksOpen((v) => !v)}
        aria-label="Tweaks démo"
        title="Panneau démo"
      >
        <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.2">
          <circle cx="4" cy="4" r="1.5" />
          <circle cx="4" cy="12" r="1.5" />
          <circle cx="12" cy="8" r="1.5" />
          <path d="M4 5.5v5M5.5 4l5 4M5.5 12l5-4" />
        </svg>
      </button>
      {tweaksOpen && (
        <div className={styles.tweaks}>
          <div className={styles.tweaksTitle}>
            <span>Tweaks démo</span>
            <button onClick={() => setTweaksOpen(false)} aria-label="Fermer">
              ×
            </button>
          </div>
          <div className={styles.tweaksRow}>
            <label>État d&apos;erreur</label>
            <button
              type="button"
              className={`${styles.toggle} ${showError ? styles.toggleOn : ""}`}
              onClick={() => setShowError((v) => !v)}
            />
          </div>
          <div className={styles.tweaksRow}>
            <label>Statut système</label>
            <button
              type="button"
              className={`${styles.toggle} ${systemOk ? styles.toggleOn : ""}`}
              onClick={() => setSystemOk((v) => !v)}
            />
          </div>
        </div>
      )}
    </div>
  );
}

/* ====== Petits sous-composants visuels ====== */

function FamIcon({ kind }: { kind: FamilyKey }) {
  const common = {
    width: 14,
    height: 14,
    viewBox: "0 0 16 16",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.4,
  } as const;
  switch (kind) {
    case "ugp":
      return (
        <svg {...common}>
          <path d="M2 14V6l6-4 6 4v8M6 14V9h4v5" />
        </svg>
      );
    case "bailleurs":
      return (
        <svg {...common}>
          <circle cx="8" cy="8" r="6" />
          <path d="M2 8h12M8 2c2 2 2 10 0 12M8 2c-2 2-2 10 0 12" />
        </svg>
      );
    case "benef":
      return (
        <svg {...common}>
          <rect x="2.5" y="3.5" width="11" height="9" />
          <path d="M2.5 6.5h11" />
        </svg>
      );
    case "controle":
      return (
        <svg {...common}>
          <circle cx="7" cy="7" r="4" />
          <path d="M10 10l4 4" />
        </svg>
      );
  }
}

function FunderBM() {
  return (
    <div className={styles.funder}>
      <div className={styles.logoBox}>
        <svg viewBox="0 0 120 44" width="100%" height="44">
          <g fill="currentColor">
            <circle cx="14" cy="22" r="10" fill="none" stroke="currentColor" strokeWidth="1.5" />
            <path
              d="M4 22h20M14 12c4 3 4 17 0 20M14 12c-4 3-4 17 0 20"
              fill="none"
              stroke="currentColor"
              strokeWidth="1"
            />
            <text x="32" y="20" fontSize="9" fontWeight="500">
              BANQUE
            </text>
            <text x="32" y="32" fontSize="9" fontWeight="500">
              MONDIALE
            </text>
          </g>
        </svg>
      </div>
      <div className={styles.funderName}>Banque mondiale · IDA</div>
      <div className={`${styles.funderAmount} mono`}>USD 400 M</div>
    </div>
  );
}

function FunderAFD() {
  return (
    <div className={styles.funder}>
      <div className={styles.logoBox}>
        <svg viewBox="0 0 120 44" width="100%" height="44">
          <g fill="currentColor">
            <rect x="2" y="10" width="26" height="24" fill="none" stroke="currentColor" strokeWidth="1.5" />
            <path d="M9 22h12M15 16v12" stroke="currentColor" strokeWidth="1.5" />
            <text x="34" y="20" fontSize="11" fontWeight="600">
              AFD
            </text>
            <text x="34" y="33" fontSize="7">
              Agence française
            </text>
          </g>
        </svg>
      </div>
      <div className={styles.funderName}>Agence Française de Développement</div>
      <div className={`${styles.funderAmount} mono`}>EUR 100 M</div>
    </div>
  );
}

function FunderRDC() {
  return (
    <div className={styles.funder}>
      <div className={styles.logoBox}>
        <svg viewBox="0 0 120 44" width="100%" height="44">
          <g fill="currentColor">
            <path d="M14 6 L22 22 L14 38 L6 22 Z" fill="none" stroke="currentColor" strokeWidth="1.5" />
            <circle cx="14" cy="22" r="3" />
            <text x="30" y="20" fontSize="9" fontWeight="500">
              GOUVERNEMENT
            </text>
            <text x="30" y="32" fontSize="9" fontWeight="500">
              RDC
            </text>
          </g>
        </svg>
      </div>
      <div className={styles.funderName}>Ministère du Numérique · RDC</div>
      <div className={`${styles.funderAmount} mono`}>Maître d&apos;ouvrage</div>
    </div>
  );
}

function DRCFlag() {
  return (
    <svg className={styles.flagSvg} viewBox="0 0 64 48" aria-label="Drapeau RDC">
      <rect width="64" height="48" fill="#007FFF" />
      <path d="M0 38 L64 6" stroke="#DA1E28" strokeWidth="4" />
      <path d="M0 36 L64 4" stroke="#FFE800" strokeWidth="0.5" />
      <path d="M0 40 L64 8" stroke="#FFE800" strokeWidth="0.5" />
      <g transform="translate(10,10)">
        <polygon
          points="0,-6 1.4,-1.8 6,-1.8 2.3,1 3.7,5.7 0,3 -3.7,5.7 -2.3,1 -6,-1.8 -1.4,-1.8"
          fill="#FFE800"
        />
      </g>
    </svg>
  );
}
