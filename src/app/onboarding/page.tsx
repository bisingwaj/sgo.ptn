import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, ArrowRight } from "@carbon/icons-react";
import { PROFILES, PROFILE_KEYS } from "@/lib/profiles";
import { Illustration } from "@/components/illustrations/Illustration";
import styles from "./onboarding-index.module.scss";

export const metadata: Metadata = {
  title: "Choisir un parcours d'onboarding · PTN-RDC",
};

export default function OnboardingIndex() {
  return (
    <div className={styles.shell}>
      <header className={styles.header}>
        <Link href="/login" className={styles.backLink}>
          <ArrowLeft size={14} aria-hidden /> Retour à la connexion
        </Link>
      </header>

      <main className={styles.main}>
        <div className={styles.intro}>
          <div className={styles.eyebrow}>Onboarding · 8 parcours</div>
          <h1 className={styles.title}>Configurez votre profil</h1>
          <p className={styles.lede}>
            La plateforme PTN-RDC propose un parcours d&apos;onboarding adapté à chaque
            profil utilisateur. Sélectionnez le vôtre pour commencer la configuration en
            3 à 5 étapes.
          </p>
        </div>

        <div className={styles.grid}>
          {PROFILE_KEYS.map((key) => {
            const p = PROFILES[key];
            return (
              <Link
                key={key}
                href={`/onboarding/${key}`}
                className={styles.card}
                data-profile={key}
              >
                <div className={styles.cardIllu}>
                  <Illustration name={p.illustration as never} size="card" />
                </div>
                <div className={styles.cardBody}>
                  <span className={styles.cardLabel}>{p.label}</span>
                  <p className={styles.cardDesc}>{p.description}</p>
                  <span className={styles.cardCta}>
                    Commencer le parcours <ArrowRight size={14} aria-hidden />
                  </span>
                </div>
              </Link>
            );
          })}
        </div>
      </main>
    </div>
  );
}
