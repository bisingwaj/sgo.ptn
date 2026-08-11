/**
 * Bandeau bailleurs : Banque mondiale (IDA), AFD, Gouvernement RDC.
 * Logos stylisés en SVG niveau de gris (cohérent avec le panneau institutionnel sombre).
 */

import styles from "./DonorStrip.module.scss";
import { FINANCING } from "@/lib/project-data";

interface DonorStripProps {
  variant?: "dark" | "light";
}

export function DonorStrip({ variant = "dark" }: DonorStripProps) {
  return (
    <div className={`${styles.strip} ${styles[variant]}`}>
      <div className={styles.label}>Bailleurs &amp; Maître d&apos;ouvrage</div>
      <div className={styles.list}>
        <div className={styles.donor}>
          <div className={styles.logoBox}>
            <svg viewBox="0 0 120 44" width="100%" height="44" aria-label="Banque mondiale">
              <g fill="currentColor">
                <circle cx="14" cy="22" r="10" fill="none" stroke="currentColor" strokeWidth="1.5" />
                <path
                  d="M4 22h20M14 12c4 3 4 17 0 20M14 12c-4 3-4 17 0 20"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1"
                />
                <text x="32" y="20" fontSize="9" fontWeight="500" fill="currentColor">
                  BANQUE
                </text>
                <text x="32" y="32" fontSize="9" fontWeight="500" fill="currentColor">
                  MONDIALE
                </text>
              </g>
            </svg>
          </div>
          <div className={styles.name}>Banque mondiale · IDA</div>
          <div className={`${styles.amount} ptn-mono`}>
            USD {FINANCING.ida.amount} M
          </div>
          <div className={styles.share}>{Math.round(FINANCING.ida.share * 100)} %</div>
        </div>

        <div className={styles.donor}>
          <div className={styles.logoBox}>
            <svg viewBox="0 0 120 44" width="100%" height="44" aria-label="Agence Française de Développement">
              <g fill="currentColor">
                <rect x="2" y="10" width="26" height="24" fill="none" stroke="currentColor" strokeWidth="1.5" />
                <path d="M9 22h12M15 16v12" stroke="currentColor" strokeWidth="1.5" />
                <text x="34" y="20" fontSize="11" fontWeight="600" fill="currentColor">
                  AFD
                </text>
                <text x="34" y="33" fontSize="7" fill="currentColor">
                  Agence française
                </text>
              </g>
            </svg>
          </div>
          <div className={styles.name}>Agence Française de Développement</div>
          <div className={`${styles.amount} ptn-mono`}>
            EUR {FINANCING.afd.originalEur} M
          </div>
          <div className={styles.share}>{Math.round(FINANCING.afd.share * 100)} %</div>
        </div>

        <div className={styles.donor}>
          <div className={styles.logoBox}>
            <svg viewBox="0 0 120 44" width="100%" height="44" aria-label="Gouvernement RDC">
              <g fill="currentColor">
                <path d="M14 6 L22 22 L14 38 L6 22 Z" fill="none" stroke="currentColor" strokeWidth="1.5" />
                <circle cx="14" cy="22" r="3" fill="currentColor" />
                <text x="30" y="20" fontSize="9" fontWeight="500" fill="currentColor">
                  GOUVERNEMENT
                </text>
                <text x="30" y="32" fontSize="9" fontWeight="500" fill="currentColor">
                  RDC
                </text>
              </g>
            </svg>
          </div>
          <div className={styles.name}>Ministère des Postes, Télécom. &amp; Numérique</div>
          <div className={`${styles.amount} ptn-mono`}>Maître d&apos;ouvrage</div>
          <div className={styles.share}>MPTN</div>
        </div>
      </div>
    </div>
  );
}
