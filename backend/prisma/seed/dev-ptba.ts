/**
 * PTN-RDC · Activités PTBA de démonstration — DÉVELOPPEMENT UNIQUEMENT.
 *
 * Séparé de `index.ts` à dessein. Le seed de production crée l'exercice
 * courant sans aucune activité, et c'est volontaire : une ligne de PTBA
 * est opposable. L'inventer reviendrait à ouvrir un rattachement budgétaire
 * qu'aucun COPIL n'a arrêté, et tout TDR qui s'y accrocherait citerait une
 * enveloppe qui n'existe pas.
 *
 *   npm run db:seed:ptba
 *
 * Les onze activités reprises ici sont exactement celles que l'ancien
 * parcours de rédaction portait en dur, réparties sur C1 à C4. Elles ne
 * proviennent pas d'un PTBA officiel : ce sont des données d'écran, et
 * elles servent ici à éprouver le filtre par composante, le contrôle de
 * plafond et le rattachement des TDR.
 *
 * Identifiants déterministes : rejouable sans doublon, et identique chez
 * les deux développeurs.
 */

import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../../generated/prisma/client';
import type { ComponentCode } from '../../generated/prisma/enums';
import { idFor } from './uuid';

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

const YEAR = 2026;

interface DevActivity {
  code: string;
  title: string;
  componentCode: ComponentCode;
  subComponent: string;
  /** En millions USD, comme l'ancien écran les portait. */
  envelopeM: number;
  provinceCode?: string;
}

/**
 * Allocations annuelles de démonstration.
 *
 * Le MEP fixe une dotation de PROJET par composante ; il ne dit pas
 * comment elle se répartit par exercice. Ces montants-là ne proviennent
 * donc d'aucune source officielle — au même titre que les activités
 * ci-dessous, et c'est pourquoi ils vivent dans ce fichier et non dans le
 * seed de production.
 *
 * Chacune laisse volontairement de la marge au-dessus des activités
 * inscrites : c'est ce qui rend le contrôle de plafond éprouvable, en
 * inscrivant une activité de trop.
 *
 * C5 est allouée à zéro, ce qui est exact : la CERC est une réserve non
 * dotée, et aucune activité ne doit pouvoir s'y rattacher.
 */
const DEV_ALLOCATIONS: Record<ComponentCode, number> = {
  C1: 78,
  C2: 45,
  C3: 24,
  C4: 6.5,
  C5: 0,
};

const DEV_ACTIVITIES: DevActivity[] = [
  // --- C1 · Accès et inclusion ---
  { code: 'A1.4.2', title: 'Backbone fibre Goma–Bukavu', componentCode: 'C1', subComponent: '1.4', envelopeM: 12.4, provinceCode: 'NORD_KIVU' },
  { code: 'A1.4.3', title: 'Réseau dernier kilomètre — 145 territoires', componentCode: 'C1', subComponent: '1.4', envelopeM: 28 },
  { code: 'A1.5.1', title: 'Connexion de 1 000 institutions publiques', componentCode: 'C1', subComponent: '1.5', envelopeM: 22 },

  // --- C2 · Fondations numériques ---
  { code: 'A2.3.1', title: 'Plateforme nationale d’identité numérique', componentCode: 'C2', subComponent: '2.3', envelopeM: 8.7 },
  { code: 'A2.5.1', title: 'Centre de données Tier III', componentCode: 'C2', subComponent: '2.5', envelopeM: 18, provinceCode: 'KINSHASA' },
  { code: 'A2.7.2', title: 'SOC national de cybersécurité', componentCode: 'C2', subComponent: '2.7', envelopeM: 14.2 },

  // --- C3 · Compétences et innovation ---
  { code: 'A3.2.1', title: 'Hubs technologiques', componentCode: 'C3', subComponent: '3.2', envelopeM: 5.6 },
  { code: 'A3.4.1', title: 'Formation de 200 enseignants EESU', componentCode: 'C3', subComponent: '3.4', envelopeM: 1.9 },
  { code: 'A3.5.1', title: 'Subventions aux startups (SBP)', componentCode: 'C3', subComponent: '3.5', envelopeM: 13 },

  // --- C4 · Coordination et gestion ---
  { code: 'A4.1.1', title: 'Coordination institutionnelle', componentCode: 'C4', subComponent: '4.1', envelopeM: 5 },
  { code: 'A4.1.4', title: 'Atelier ID4Africa', componentCode: 'C4', subComponent: '4.1', envelopeM: 0.2 },
];

async function main(): Promise<void> {
  if (process.env.NODE_ENV === 'production') {
    throw new Error(
      'Refus d’exécution : ces activités ne proviennent d’aucun PTBA officiel et seraient opposables.',
    );
  }

  const year = await prisma.ptbaYear.findUnique({ where: { year: YEAR } });
  if (!year) {
    throw new Error(`Aucun exercice PTBA ${YEAR}. Lancez d’abord « npm run db:seed ».`);
  }
  if (year.status !== 'BROUILLON') {
    throw new Error(`L’exercice ${YEAR} est ${year.status} : il ne s’enrichit plus.`);
  }

  console.log('\n┌─ PTN-RDC · Activités PTBA de démonstration');
  console.log('│');

  // Contrôles avant écriture, dans l'ordre où le service les applique.
  // Les refaire ici évite un seed à moitié appliqué, et garantit que les
  // données de démonstration respectent les mêmes règles que la saisie.
  const parComposante = new Map<string, number>();
  for (const a of DEV_ACTIVITIES) {
    parComposante.set(a.componentCode, (parComposante.get(a.componentCode) ?? 0) + a.envelopeM);
  }

  for (const [code, allocationM] of Object.entries(DEV_ALLOCATIONS)) {
    const component = await prisma.component.findUniqueOrThrow({
      where: { code: code as ComponentCode },
    });
    // 1. L'allocation tient dans la dotation de projet du MEP.
    if (allocationM > Number(component.totalUsdM)) {
      throw new Error(
        `L’allocation ${allocationM} M USD dépasse la dotation de projet de ${code} ` +
          `(${Number(component.totalUsdM)} M USD).`,
      );
    }
    // 2. Le plan de l'exercice tient dans l'allocation de l'exercice.
    const cumul = parComposante.get(code) ?? 0;
    if (cumul > allocationM) {
      throw new Error(
        `Le cumul ${cumul} M USD dépasse l’allocation ${YEAR} de ${code} (${allocationM} M USD).`,
      );
    }
  }

  // Les allocations d'abord : sans elles, aucune activité n'a de plafond
  // auquel se rapporter, et le service refuserait la saisie.
  for (const [code, allocationM] of Object.entries(DEV_ALLOCATIONS)) {
    const allocationUsd = Math.round(allocationM * 1_000_000);
    await prisma.ptbaYearComponentAllocation.upsert({
      where: {
        ptbaYearId_componentCode: { ptbaYearId: year.id, componentCode: code as ComponentCode },
      },
      update: { allocationUsd, note: 'Allocation de démonstration — hors PTBA officiel.' },
      create: {
        ptbaYearId: year.id,
        componentCode: code as ComponentCode,
        allocationUsd,
        note: 'Allocation de démonstration — hors PTBA officiel.',
      },
    });
    console.log(`  ${code}  allocation ${String(allocationM).padStart(5)} M USD`);
  }
  console.log('│');

  for (const a of DEV_ACTIVITIES) {
    const envelopeUsd = Math.round(a.envelopeM * 1_000_000);
    await prisma.ptbaActivity.upsert({
      where: { ptbaYearId_code: { ptbaYearId: year.id, code: a.code } },
      update: {
        title: a.title,
        componentCode: a.componentCode,
        subComponent: a.subComponent,
        envelopeUsd,
        provinceCode: a.provinceCode ?? null,
        isActive: true,
      },
      create: {
        id: idFor.ptbaActivity(`${YEAR}:${a.code}`),
        ptbaYearId: year.id,
        code: a.code,
        title: a.title,
        componentCode: a.componentCode,
        subComponent: a.subComponent,
        envelopeUsd,
        provinceCode: a.provinceCode ?? null,
      },
    });
    console.log(
      `  ${a.code.padEnd(8)} ${a.componentCode}  ${String(a.envelopeM).padStart(5)} M USD  ${a.title}`,
    );
  }

  console.log('│');
  for (const [code, cumul] of [...parComposante].sort()) {
    const allocationM = DEV_ALLOCATIONS[code as ComponentCode];
    console.log(
      `  ${code} — ${cumul} M USD engagés sur ${allocationM} M USD alloués ` +
        `(reste ${(allocationM - cumul).toFixed(1)} M USD)`,
    );
  }
  console.log(`└─ ${DEV_ACTIVITIES.length} activités · exercice ${YEAR}\n`);
}

main()
  .catch((error: unknown) => {
    console.error('\n✗ Échec du seed PTBA de démonstration :\n', error);
    process.exitCode = 1;
  })
  .finally(() => {
    void prisma.$disconnect();
  });
