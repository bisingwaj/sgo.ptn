import type { Money } from "@/lib/schemas/common";

/**
 * PTN-RDC · Mise en forme localisée.
 *
 * Contrepartie de la règle « l'API transporte des données » : tout le rendu
 * passe par ici, avec la locale en paramètre. C'est ce qui rend le passage
 * FR ↔ EN possible sans réécrire les écrans — en français « 8,7 M USD », en
 * anglais « USD 8.7M », séparateurs compris.
 */

export type Locale = "fr" | "en";

/* ------------------------------------------------------------------ */
/* Montants                                                            */
/* ------------------------------------------------------------------ */

/** Repasse des unités mineures (cents) à l'unité principale. */
export function toMajor(money: Money): number {
  return money.minor / 100;
}

/**
 * Montant complet : « 8 700 000,00 USD ».
 * À réserver aux écrans où le centime compte (fiduciaire, décaissements).
 */
export function formatMoney(money: Money, locale: Locale = "fr"): string {
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency: money.currency,
    currencyDisplay: "code",
  }).format(toMajor(money));
}

/**
 * Montant abrégé : « 8,7 M USD ».
 *
 * Utilisé dans les tableaux et les KPI, où la lisibilité d'une colonne prime
 * sur la précision au dollar près. `maximumFractionDigits: 1` évite
 * « 8,70 M » — un zéro sans information qui allonge la colonne.
 */
export function formatMoneyCompact(money: Money, locale: Locale = "fr"): string {
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency: money.currency,
    currencyDisplay: "code",
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(toMajor(money));
}

/**
 * Montant en USD entiers, abrégé : « 8,7 M USD ».
 *
 * Doublon assumé de `formatMoneyCompact` : les enveloppes du PTBA circulent
 * en USD entiers et non en unités mineures — ce sont des dotations
 * budgétaires, jamais des écritures comptables au centime.
 *
 * Passer par `Intl` plutôt que par une division corrige au passage le
 * séparateur : l'écran écrivait « 12.4 M » à un lecteur francophone.
 */
export function formatUsdCompact(usd: number, locale: Locale = "fr"): string {
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency: "USD",
    currencyDisplay: "code",
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(usd);
}

/** Même chose sans le code devise, pour les colonnes déjà intitulées. */
export function formatUsdCompactBare(usd: number, locale: Locale = "fr"): string {
  return new Intl.NumberFormat(locale, {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(usd);
}

/**
 * Montant en USD entiers, au chiffre près et groupé : « 23 009 880 USD ».
 *
 * Pour les écrans où l'on SAISIT et où l'on vérifie, quand l'abrégé ne suffit
 * plus : « 23,0 M » et « 23,9 M » se ressemblent, et une suite de neuf
 * chiffres non groupés ne se lit pas — distinguer 100000000 de 1000000000
 * demande de compter, ce que personne ne fait deux fois.
 *
 * Aucune décimale : ces montants circulent en dollars entiers, et un « ,00 »
 * promettrait une précision au centime que la donnée n'a pas.
 */
export function formatUsd(usd: number, locale: Locale = "fr"): string {
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency: "USD",
    currencyDisplay: "code",
    maximumFractionDigits: 0,
  }).format(usd);
}

/** Idem sans le code devise — champs de saisie, colonnes déjà intitulées. */
export function formatUsdBare(usd: number, locale: Locale = "fr"): string {
  return new Intl.NumberFormat(locale, { maximumFractionDigits: 0 }).format(usd);
}

/**
 * Les chiffres d'une saisie, débarrassés de tout le reste.
 *
 * L'auteur colle un montant venu d'un tableur, et il arrive sous toutes les
 * formes : « 23 009 880 », « 23,009,880 », « 23 009 880,00 USD ».
 *
 * Une queue de décimales est retirée AVANT le reste, sinon elle se recolle
 * aux entiers et « 23 009 880,00 » devient vingt-trois milliards. On ne
 * retire que un ou deux chiffres en fin de chaîne : au-delà, c'est un groupe
 * de milliers — « 23,009,880 » à l'anglaise n'a pas de décimales.
 *
 * Le code devise part en premier, sans quoi la queue de décimales n'est plus
 * en fin de chaîne et passe au travers : c'est exactement le cas d'un montant
 * copié depuis un tableau de cet écran.
 *
 * Le résultat n'est jamais arrondi : la donnée est en dollars entiers, une
 * partie décimale n'y a pas de place.
 */
export function digitsOnly(saisie: string): string {
  return saisie
    .replace(/[^\d.,]+$/, "")
    .replace(/[.,]\d{1,2}$/, "")
    .replace(/\D/g, "")
    .replace(/^0+(?=\d)/, "");
}

/* ------------------------------------------------------------------ */
/* Dates                                                               */
/* ------------------------------------------------------------------ */

export function formatDate(iso: string, locale: Locale = "fr"): string {
  return new Intl.DateTimeFormat(locale, {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(iso));
}

export function formatDateTime(iso: string, locale: Locale = "fr"): string {
  return new Intl.DateTimeFormat(locale, {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));
}

/**
 * Écart relatif : « il y a 2 jours », « dans 4 jours ».
 *
 * Calculé au rendu et jamais stocké — c'était le défaut de `lastAction:
 * "il y a 2h"` dans les anciennes données : intraduisible, et faux dès le
 * lendemain sur un onglet resté ouvert, ce qui est la norme sur un poste de
 * bureau où l'application tourne toute la journée.
 */
export function formatRelative(
  iso: string,
  locale: Locale = "fr",
  now: Date = new Date(),
): string {
  const diffMs = new Date(iso).getTime() - now.getTime();
  const rtf = new Intl.RelativeTimeFormat(locale, { numeric: "auto" });

  const units: Array<[Intl.RelativeTimeFormatUnit, number]> = [
    ["year", 31_536_000_000],
    ["month", 2_592_000_000],
    ["day", 86_400_000],
    ["hour", 3_600_000],
    ["minute", 60_000],
  ];

  for (const [unit, ms] of units) {
    if (Math.abs(diffMs) >= ms) {
      return rtf.format(Math.round(diffMs / ms), unit);
    }
  }
  return rtf.format(0, "minute");
}

/**
 * Jours entiers restants avant une échéance. Négatif si dépassée.
 *
 * Comparaison faite à minuit UTC des deux côtés : sans cela, une échéance
 * « aujourd'hui » consultée à 23 h basculerait à −1 selon l'heure locale.
 */
export function daysUntil(dateOnly: string, now: Date = new Date()): number {
  const due = Date.parse(`${dateOnly}T00:00:00.000Z`);
  const today = Date.parse(`${now.toISOString().slice(0, 10)}T00:00:00.000Z`);
  return Math.round((due - today) / 86_400_000);
}

/* ------------------------------------------------------------------ */
/* Fichiers                                                            */
/* ------------------------------------------------------------------ */

export function formatBytes(bytes: number, locale: Locale = "fr"): string {
  const units = ["o", "Ko", "Mo", "Go"];
  let value = bytes;
  let unit = 0;
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024;
    unit += 1;
  }
  return `${new Intl.NumberFormat(locale, { maximumFractionDigits: 1 }).format(value)} ${units[unit]}`;
}

/* ------------------------------------------------------------------ */
/* Libellés métier                                                     */
/* ------------------------------------------------------------------ */

/**
 * Libellés lisibles des énumérations.
 *
 * Provisoirement en français seulement. Ces tables migreront telles quelles
 * dans les catalogues next-intl lors du passage FR+EN : elles sont regroupées
 * ici précisément pour que cette extraction soit mécanique et sans risque.
 */
export const LABELS = {
  anoStatus: {
    SOUMIS: "Soumis",
    EN_INSTRUCTION: "En instruction",
    CLARIFICATION: "Clarification demandée",
    DELIVRE: "Délivré",
    REJETE: "Rejeté",
    RETIRE: "Retiré",
  },
  objectType: {
    TDR: "TDR",
    DAO: "DAO",
    PV_EVALUATION: "PV d'évaluation",
    CONTRAT: "Contrat",
    AVENANT: "Avenant",
  },
  donor: {
    IDA: "Banque mondiale",
    AFD: "AFD",
  },
  risk: {
    FAIBLE: "Faible",
    MODERE: "Modéré",
    SUBSTANTIEL: "Substantiel",
    ELEVE: "Élevé",
  },
  stage: {
    INITIATIVE: "Initiative",
    TDR: "TDR",
    REVUE_UGP: "Revue UGP",
    ANO: "ANO",
    DAO: "DAO",
    EVALUATION: "Évaluation",
    ATTRIBUTION: "Attribution",
  },
} as const;
