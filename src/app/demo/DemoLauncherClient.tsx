"use client";

/**
 * Lanceur de démonstration.
 *
 * Reprend la galerie des huit profils qui servait d'accueil à l'ancien
 * parcours d'onboarding. Elle n'avait rien d'un accueil — c'était un
 * sélecteur —, mais elle reste utile pour parcourir les espaces lors des
 * présentations à l'UGP et aux bailleurs.
 *
 * Aucune session n'est ouverte ici : seul le thème visuel du profil est
 * appliqué, et les écrans affichent des données d'exemple.
 */

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight } from "@carbon/icons-react";
import { PROFILES, PROFILE_KEYS, type ProfileKey } from "@/lib/profiles";
import { Illustration } from "@/components/illustrations/Illustration";
import { useProfile } from "@/components/profile/ProfileContext";
import { useAuth } from "@/components/auth/AuthContext";
import styles from "./demo.module.scss";

export function DemoLauncherClient() {
  const router = useRouter();
  const { setProfile } = useProfile();
  const { user } = useAuth();

  const enter = (key: ProfileKey) => {
    setProfile(key);
    router.push(PROFILES[key].homePath);
  };

  return (
    <div className={styles.shell}>
      <header className={styles.header}>
        <Link href="/login" className={styles.backLink}>
          <ArrowLeft size={14} aria-hidden /> Retour à la connexion
        </Link>
      </header>

      <main className={styles.main}>
        <div className={styles.intro}>
          <div className={styles.eyebrow}>Mode démonstration · 8 espaces</div>
          <h1 className={styles.title}>Explorer les espaces</h1>
          <p className={styles.lede}>
            Chaque profil dispose de son espace, de ses droits et de ses livrables. Ouvrez celui de
            votre choix pour le parcourir.
          </p>

          <div className={styles.notice} role="note">
            Aucune session n’est ouverte en mode démonstration : les écrans affichent des données
            d’exemple et les actions ne sont pas enregistrées. Pour travailler réellement,{" "}
            <Link href="/login">connectez-vous avec votre compte</Link>.
          </div>

          {user && (
            <div className={styles.sessionNotice} role="status">
              Vous êtes connecté en tant que {user.firstName} {user.lastName} —{" "}
              {user.subroleLabel}. Explorer un autre espace ne modifie pas vos droits réels.
            </div>
          )}
        </div>

        <div className={styles.grid}>
          {PROFILE_KEYS.map((key) => {
            const p = PROFILES[key];
            return (
              <button
                key={key}
                type="button"
                onClick={() => enter(key)}
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
                    Ouvrir l’espace <ArrowRight size={14} aria-hidden />
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </main>
    </div>
  );
}
