"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import styles from "./onboarding.module.css";

interface Step {
  num: string;
  label: string;
  sub: string;
}

const STEPS: Step[] = [
  { num: "01", label: "Profil", sub: "Identité & langue" },
  { num: "02", label: "Composante", sub: "Affectation projet" },
  { num: "03", label: "Permissions", sub: "Rôles demandés" },
  { num: "04", label: "Bienvenue", sub: "Accès tableau de bord" },
];

interface Composante {
  key: "C1" | "C2" | "C3" | "C4";
  label: string;
  amount: string;
  activities: string;
  desc: string;
}

const COMPOSANTES: Composante[] = [
  {
    key: "C1",
    label: "Accès & Inclusion numériques",
    amount: "385",
    activities: "12",
    desc: "Backbone fibre, haut débit rural, connexion universelle.",
  },
  {
    key: "C2",
    label: "Fondations Numériques",
    amount: "95",
    activities: "9",
    desc: "Identité numérique, services en ligne, paiements.",
  },
  {
    key: "C3",
    label: "Compétences & Innovation",
    amount: "30",
    activities: "6",
    desc: "Hubs, EESU, formations, accélérateurs SBP.",
  },
  {
    key: "C4",
    label: "Coordination & Gestion projet",
    amount: "20",
    activities: "4",
    desc: "UGP, audit, communication, S&E, fiduciaire.",
  },
];

interface Role {
  key: string;
  label: string;
  desc: string;
  level: "Lecture" | "Édition" | "Validation";
}

const ROLES: Role[] = [
  {
    key: "lecteur",
    label: "Lecteur",
    desc: "Consultation des documents et indicateurs de la composante.",
    level: "Lecture",
  },
  {
    key: "contrib",
    label: "Contributeur TDR",
    desc: "Rédaction et co-rédaction des termes de référence.",
    level: "Édition",
  },
  {
    key: "valid",
    label: "Validateur",
    desc: "Validation interne avant transmission ANO bailleur.",
    level: "Validation",
  },
  {
    key: "commis",
    label: "Membre commission",
    desc: "Membre des commissions d'évaluation des offres.",
    level: "Validation",
  },
  {
    key: "respc",
    label: "Responsable composante",
    desc: "Pilotage opérationnel de la composante PTN-RDC.",
    level: "Validation",
  },
  {
    key: "admin",
    label: "Admin",
    desc: "Administration des utilisateurs et permissions UGP.",
    level: "Validation",
  },
];

export function OnboardingClient() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [done, setDone] = useState<Set<number>>(new Set());

  const [firstName, setFirstName] = useState("Jean");
  const [lastName, setLastName] = useState("Bisingwa");
  const [phone, setPhone] = useState("+243 81 234 56 78");
  const [lang, setLang] = useState<"fr" | "en" | "ln">("fr");

  const [composante, setComposante] = useState<Composante["key"] | null>("C2");
  const [roles, setRoles] = useState<Set<string>>(new Set(["lecteur", "contrib"]));

  const [phoneError, setPhoneError] = useState<string | null>(null);

  function goNext() {
    if (step === 1) {
      if (!firstName || !lastName) return;
      if (!/^\+?[\d\s().-]{8,}$/.test(phone)) {
        setPhoneError("Format téléphone invalide.");
        return;
      }
      setPhoneError(null);
    }
    if (step === 2 && !composante) return;
    if (step === 3 && roles.size === 0) return;
    setDone((d) => new Set(d).add(step));
    setStep(Math.min(step + 1, STEPS.length));
  }

  function goBack() {
    setStep(Math.max(1, step - 1));
  }

  function jumpTo(n: number) {
    if (done.has(n) || n === step) setStep(n);
  }

  function toggleRole(key: string) {
    setRoles((s) => {
      const next = new Set(s);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  return (
    <div className={styles.shell}>
      {/* Header simplifié */}
      <header className={styles.header}>
        <div className={styles.brand}>
          <span className={styles.logo}>PT</span>
          <span className={styles.pname}>PTN-RDC · Onboarding nouvel utilisateur</span>
        </div>
        <div className={styles.spacer} />
        <span className={`${styles.pid} mono`}>P180495</span>
      </header>

      {/* ProgressIndicator */}
      <div className={styles.progressWrap}>
        <ol className={styles.progress}>
          {STEPS.map((s, i) => {
            const n = i + 1;
            const isDone = done.has(n);
            const isActive = step === n;
            return (
              <li
                key={s.num}
                className={`${styles.step} ${isActive ? styles.stepActive : ""} ${
                  isDone ? styles.stepDone : ""
                } ${isDone || isActive ? styles.stepClick : ""}`}
                onClick={() => jumpTo(n)}
              >
                <span className={styles.circle}>
                  {isDone ? (
                    <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M3 8l3 3 7-7" />
                    </svg>
                  ) : (
                    n
                  )}
                </span>
                <span className={styles.meta}>
                  <span className={`${styles.num} mono`}>{s.num}</span>
                  <span className={styles.label}>{s.label}</span>
                  <span className={styles.sub}>{s.sub}</span>
                </span>
              </li>
            );
          })}
        </ol>
      </div>

      {/* Contenu */}
      <div className={styles.content}>
        {step === 1 && (
          <section className={styles.panel}>
            <header className={styles.panelHead}>
              <h2>Profil</h2>
              <p>Vos informations personnelles et préférences linguistiques.</p>
            </header>
            <div className={styles.panelBody}>
              <div className={styles.uploaderRow}>
                <div className={styles.avatar}>
                  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4">
                    <circle cx="12" cy="9" r="3.5" />
                    <path d="M5 20c1.5-3 4-4.5 7-4.5s5.5 1.5 7 4.5" />
                  </svg>
                </div>
                <div className={styles.uploaderHelp}>
                  <strong>Photo de profil</strong>
                  <span>JPG ou PNG, 400 × 400 px min. Recommandé : portrait professionnel.</span>
                  <button className={styles.btnGhost}>Téléverser une photo</button>
                </div>
              </div>

              <div className={styles.grid2}>
                <Field label="Prénom" required>
                  <input
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                  />
                </Field>
                <Field label="Nom" required>
                  <input
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                  />
                </Field>
                <Field label="Email institutionnel (lecture seule)">
                  <input
                    value="jean.bisingwa@ptn-rdc.gov.cd"
                    readOnly
                    className={styles.readonly}
                  />
                </Field>
                <Field label="Téléphone" required error={phoneError}>
                  <input
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+243 …"
                  />
                </Field>
              </div>

              <Field label="Langue préférée">
                <div className={styles.radioRow}>
                  {[
                    { k: "fr", label: "Français" },
                    { k: "en", label: "English" },
                    { k: "ln", label: "Lingala" },
                  ].map((o) => (
                    <button
                      key={o.k}
                      type="button"
                      onClick={() => setLang(o.k as typeof lang)}
                      className={`${styles.segBtn} ${
                        lang === o.k ? styles.segBtnActive : ""
                      }`}
                    >
                      {o.label}
                    </button>
                  ))}
                </div>
              </Field>
            </div>
          </section>
        )}

        {step === 2 && (
          <section className={styles.panel}>
            <header className={styles.panelHead}>
              <h2>Composante d&apos;affectation</h2>
              <p>
                Choisissez votre composante PTN-RDC. Les montants sont issus du MEP du
                23 juin 2025 (USD M).
              </p>
            </header>
            <div className={styles.panelBody}>
              <div className={styles.tiles}>
                {COMPOSANTES.map((c) => {
                  const active = composante === c.key;
                  return (
                    <button
                      key={c.key}
                      type="button"
                      className={`${styles.tile} ${active ? styles.tileActive : ""}`}
                      onClick={() => setComposante(c.key)}
                    >
                      <div className={styles.tileHead}>
                        <span className={`${styles.tileTag} mono`}>{c.key}</span>
                        {active && (
                          <span className={styles.tileCheck}>
                            <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2">
                              <path d="M3 8l3 3 7-7" />
                            </svg>
                          </span>
                        )}
                      </div>
                      <div className={styles.tileLabel}>{c.label}</div>
                      <div className={styles.tileDesc}>{c.desc}</div>
                      <div className={styles.tileMetrics}>
                        <span>
                          <strong className="mono">{c.amount}</strong> M USD
                        </span>
                        <span className={styles.tileBullet}>·</span>
                        <span>
                          <strong className="mono">{c.activities}</strong> activités PTBA
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </section>
        )}

        {step === 3 && (
          <section className={`${styles.panel} ${styles.panel2col}`}>
            <header className={styles.panelHead}>
              <h2>Permissions demandées</h2>
              <p>Cochez les rôles dont vous aurez besoin. L&apos;admin UGP validera.</p>
            </header>
            <div className={styles.panelBody2col}>
              <div className={styles.rolesList}>
                {ROLES.map((r) => {
                  const checked = roles.has(r.key);
                  return (
                    <label
                      key={r.key}
                      className={`${styles.roleRow} ${checked ? styles.roleChecked : ""}`}
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggleRole(r.key)}
                      />
                      <div className={styles.roleMeta}>
                        <div className={styles.roleHead}>
                          <span className={styles.roleLabel}>{r.label}</span>
                          <span
                            className={`${styles.roleLevel} ${
                              r.level === "Validation"
                                ? styles.levelValid
                                : r.level === "Édition"
                                  ? styles.levelEdit
                                  : styles.levelRead
                            }`}
                          >
                            {r.level}
                          </span>
                        </div>
                        <span className={styles.roleDesc}>{r.desc}</span>
                      </div>
                    </label>
                  );
                })}
              </div>
              <aside className={styles.summaryAside}>
                <div className={styles.warnBox}>
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <path d="M8 1.5L15 14H1z" />
                    <path d="M8 6v4M8 12v.01" strokeLinecap="round" />
                  </svg>
                  <div>
                    <strong>Permissions provisoires</strong>
                    <span>
                      Les permissions définitives sont attribuées par l&apos;admin
                      UGP après validation.
                    </span>
                  </div>
                </div>
                <div className={styles.summaryBox}>
                  <div className={styles.summaryTitle}>Résumé</div>
                  <ul className={styles.summaryList}>
                    <li>
                      <span>Identité</span>
                      <strong>
                        {firstName} {lastName}
                      </strong>
                    </li>
                    <li>
                      <span>Composante</span>
                      <strong>
                        {composante ?? "—"} ·{" "}
                        {COMPOSANTES.find((c) => c.key === composante)?.label}
                      </strong>
                    </li>
                    <li>
                      <span>Rôles demandés</span>
                      <strong>{roles.size}</strong>
                    </li>
                  </ul>
                </div>
              </aside>
            </div>
          </section>
        )}

        {step === 4 && (
          <section className={`${styles.panel} ${styles.panelWelcome}`}>
            <header className={styles.panelHead}>
              <h2>Bienvenue, {firstName} 👋</h2>
              <p>Votre dossier d&apos;onboarding a été soumis à l&apos;admin UGP.</p>
            </header>
            <div className={styles.welcomeGrid}>
              <div className={styles.recapTile}>
                <div className={styles.recapTitle}>Profil</div>
                <div className={styles.recapName}>
                  {firstName} {lastName}
                </div>
                <div className={styles.recapMeta}>
                  jean.bisingwa@ptn-rdc.gov.cd · {phone} ·{" "}
                  {lang === "fr"
                    ? "Français"
                    : lang === "en"
                      ? "English"
                      : "Lingala"}
                </div>
              </div>
              <div className={styles.recapTile}>
                <div className={styles.recapTitle}>Composante</div>
                <div className={styles.recapName}>
                  {composante} ·{" "}
                  {COMPOSANTES.find((c) => c.key === composante)?.label}
                </div>
                <div className={styles.recapMeta}>
                  {COMPOSANTES.find((c) => c.key === composante)?.amount} M USD ·{" "}
                  {COMPOSANTES.find((c) => c.key === composante)?.activities}{" "}
                  activités PTBA
                </div>
              </div>
              <div className={styles.recapTile}>
                <div className={styles.recapTitle}>Permissions demandées</div>
                <div className={styles.recapTags}>
                  {ROLES.filter((r) => roles.has(r.key)).map((r) => (
                    <span key={r.key} className={styles.recapTag}>
                      {r.label}
                    </span>
                  ))}
                </div>
                <div className={styles.recapMeta}>
                  En attente de validation par l&apos;admin UGP.
                </div>
              </div>
            </div>
            <button
              className={styles.bigCTA}
              onClick={() => router.push("/cockpit")}
            >
              <span>Accéder à mon tableau de bord</span>
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.2">
                <path d="M4 10h12M11 5l5 5-5 5" />
              </svg>
            </button>
            <ConfettiBurst />
          </section>
        )}
      </div>

      {/* Footer fixe */}
      <footer className={styles.footer}>
        <div className={styles.footLeft}>
          <a href="/login" className={styles.linkTertiary}>
            Annuler
          </a>
          <span className={`${styles.draft} mono`}>
            ● Brouillon enregistré · il y a 12 s
          </span>
        </div>
        <div className={styles.footRight}>
          {step > 1 && (
            <button onClick={goBack} className={styles.btnGhost}>
              Précédent
            </button>
          )}
          {step < STEPS.length && (
            <button onClick={goNext} className={styles.btnPrimary}>
              Suivant
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4">
                <path d="M3 8h10M8 3l5 5-5 5" />
              </svg>
            </button>
          )}
        </div>
      </footer>
    </div>
  );
}

function Field({
  label,
  required,
  error,
  children,
}: {
  label: string;
  required?: boolean;
  error?: string | null;
  children: React.ReactNode;
}) {
  return (
    <label className={styles.field}>
      <span className={styles.fieldLabel}>
        {label}
        {required && <span className={styles.req}>*</span>}
      </span>
      <span
        className={`${styles.fieldInput} ${
          error ? styles.fieldInputError : ""
        }`}
      >
        {children}
      </span>
      {error && <span className={styles.fieldError}>{error}</span>}
    </label>
  );
}

function ConfettiBurst() {
  const pieces = Array.from({ length: 24 });
  return (
    <div className={styles.confetti} aria-hidden>
      {pieces.map((_, i) => (
        <span
          key={i}
          style={{
            left: `${(i * 4.1) % 100}%`,
            animationDelay: `${(i % 6) * 0.12}s`,
            background:
              i % 4 === 0
                ? "var(--c-blue-60)"
                : i % 4 === 1
                  ? "var(--c-green-50)"
                  : i % 4 === 2
                    ? "var(--c-yellow-30)"
                    : "var(--c-purple-60)",
          }}
        />
      ))}
    </div>
  );
}
