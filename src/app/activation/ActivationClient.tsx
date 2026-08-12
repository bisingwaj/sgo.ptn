"use client";

/**
 * Première connexion — définition du mot de passe personnel.
 *
 * Le mot de passe temporaire est connu de l'administrateur qui l'a émis.
 * Tant qu'il n'est pas remplacé, l'API refuse toute autre route : c'est
 * le verrou porté par `PermissionsGuard`. Cet écran est l'une des rares
 * routes marquées `@AllowTempPassword()`.
 */

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/components/auth/AuthContext";
import { ApiError } from "@/lib/api";
import { PROFILES } from "@/lib/profiles";
import { toProfileKey } from "@/components/auth/AuthContext";
import { CheckmarkFilled, Locked, WarningAltFilled } from "@carbon/icons-react";
import styles from "./activation.module.scss";

/** Doit rester aligné sur PASSWORD_PATTERN côté backend. */
const RULES = [
  { test: (v: string) => v.length >= 12, label: "12 caractères minimum" },
  { test: (v: string) => /[a-z]/.test(v), label: "une minuscule" },
  { test: (v: string) => /[A-Z]/.test(v), label: "une majuscule" },
  { test: (v: string) => /\d/.test(v), label: "un chiffre" },
  { test: (v: string) => /[^A-Za-z0-9]/.test(v), label: "un caractère spécial" },
];

export function ActivationClient() {
  const router = useRouter();
  const { user, loading, changePassword } = useAuth();

  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const satisfied = RULES.map((r) => r.test(next));
  const allSatisfied = satisfied.every(Boolean);
  const matches = next.length > 0 && next === confirm;

  if (loading) {
    return <div className={styles.centered}>Chargement de la session…</div>;
  }

  if (!user) {
    return (
      <div className={styles.centered}>
        <Locked size={32} aria-hidden />
        <h1>Session requise</h1>
        <p>Connectez-vous pour définir votre mot de passe.</p>
        <Link href="/login" className={styles.link}>
          Aller à la connexion
        </Link>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!allSatisfied) {
      setError("Le mot de passe ne respecte pas la politique de la plateforme.");
      return;
    }
    if (!matches) {
      setError("Les deux saisies ne correspondent pas.");
      return;
    }

    setSubmitting(true);
    try {
      await changePassword(current, next);
      router.push(PROFILES[toProfileKey(user.profile)].homePath);
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : "Impossible de changer le mot de passe.",
      );
      setSubmitting(false);
    }
  };

  return (
    <main className={styles.shell}>
      <div className={styles.card}>
        <div className={styles.head}>
          <span className={styles.eyebrow}>PREMIÈRE CONNEXION</span>
          <h1>Définissez votre mot de passe</h1>
          <p>
            Bonjour {user.firstName}. Votre habilitation&nbsp;:{" "}
            <strong>{user.subroleLabel}</strong> · {user.organisationName}.
          </p>
        </div>

        <div className={styles.notice}>
          <Locked size={16} aria-hidden />
          <p>
            Le mot de passe temporaire qui vous a été communiqué est connu de
            l&apos;administrateur qui l&apos;a émis. Remplacez-le par un mot de passe que vous
            seul connaissez — c&apos;est la condition pour accéder à la plateforme.
          </p>
        </div>

        <form onSubmit={handleSubmit} className={styles.form}>
          <div className={styles.field}>
            <label htmlFor="current">Mot de passe temporaire</label>
            <input
              id="current"
              type="password"
              autoComplete="current-password"
              required
              value={current}
              onChange={(e) => setCurrent(e.target.value)}
              placeholder="Celui transmis par l’administrateur"
            />
          </div>

          <div className={styles.field}>
            <label htmlFor="next">Nouveau mot de passe</label>
            <input
              id="next"
              type="password"
              autoComplete="new-password"
              required
              value={next}
              onChange={(e) => setNext(e.target.value)}
            />
          </div>

          <ul className={styles.rules} aria-label="Politique de mot de passe">
            {RULES.map((rule, index) => (
              <li key={rule.label} className={satisfied[index] ? styles.ruleOk : ""}>
                <CheckmarkFilled size={14} aria-hidden />
                {rule.label}
              </li>
            ))}
          </ul>

          <div className={styles.field}>
            <label htmlFor="confirm">Confirmation</label>
            <input
              id="confirm"
              type="password"
              autoComplete="new-password"
              required
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              aria-invalid={confirm.length > 0 && !matches}
            />
            {confirm.length > 0 && !matches && (
              <span className={styles.fieldError}>Les deux saisies diffèrent.</span>
            )}
          </div>

          {error && (
            <div className={styles.error} role="alert">
              <WarningAltFilled size={16} aria-hidden />
              <span>{error}</span>
            </div>
          )}

          <button
            type="submit"
            className={styles.submit}
            disabled={submitting || !allSatisfied || !matches}
          >
            {submitting ? "Enregistrement…" : "Définir mon mot de passe"}
          </button>
        </form>

        <p className={styles.foot}>
          Changer votre mot de passe clôt toutes vos autres sessions ouvertes.
        </p>
      </div>
    </main>
  );
}
